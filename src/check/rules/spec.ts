/**
 * Spec shape rules: mechanical template mistakes a regex settles without judgment.
 * Whether an actor is the right owner, or a Purpose is vision-stable, stays a review call.
 *
 * Ported from allytehq/finops-hubs PR 893 (infra/scripts/spec-shape.mjs).
 */

import type { Document, RawFinding, Rule } from '../types';

/** @req FR:cli-check/spec.sections */
export const REQUIRED_SECTIONS = [
  'Purpose',
  'Scenarios',
  'Data Model',
  'Architecture Constraints',
  'External Dependencies',
];

/** @req FR:cli-check/spec.description */
export const MAX_DESCRIPTION = 120;

const FENCE = /^\s*(```|~~~)/;
const SCENARIO = /^###\s+FR:[^:\s]+:/;
const REQUIREMENT = /^\s*[-*]\s+\*\*N?FR:([^*]+)\*\*(?:\s*\(P[1-5]\))?:?\s*(.*)$/;
const NORMATIVE = /\b(?:MUST|SHOULD|MAY)\b/g;
const STORY = /\bneeds?\b.+\bso\b/;
const SYSTEM_ACTOR = /^System\s+(?:MUST|SHOULD|MAY)\b/;
const PROSE_REF = /\bFR:[$@a-z0-9]|@req\b/;
// A scenario slot sits one level under the scenario (`x.input`); `x.y.schema` is a behavior named schema.
const SLOT = /(?:^|\.)@[a-z0-9-]+$|^[^.]+\.(?:input|output|schema)$/;
// The template's slot notation types a value by entity: `Hub (@req FR:$hub)`.
const ENTITY_TYPE = /\(@req\s+FR:(?:[a-z0-9/-]+\/)?\$[^)]*\)/g;

/** Prose with code spans and entity type notes blanked, so neither reads as a prose reference. */
const stripCode = (text: string): string => text.replace(/`[^`]*`/g, '``').replace(ENTITY_TYPE, '()');

const finding = (line: number, text: string): RawFinding => ({ line, text: text.trim().slice(0, 100) });

interface Line {
  n: number;
  raw: string;
}

/**
 * Lines outside fenced code blocks.
 * @req FR:cli-check/spec.fences
 */
function proseLines(content: string): Line[] {
  const lines: Line[] = [];
  let inFence = false;
  content.split(/\r?\n/).forEach((raw, i) => {
    if (FENCE.test(raw)) {
      inFence = !inFence;
    } else if (!inFence) {
      lines.push({ n: i + 1, raw });
    }
  });
  return lines;
}

interface Requirement extends Line {
  id: string;
  body: string;
}

/**
 * Requirement lines outside fences. Deprecated ones start with `~~`, so the pattern never matches them.
 * @req FR:cli-check/spec.deprecated
 */
function requirements(content: string): Requirement[] {
  const found: Requirement[] = [];
  for (const line of proseLines(content)) {
    const m = REQUIREMENT.exec(line.raw);
    if (m) {found.push({ ...line, id: m[1], body: m[2] });}
  }
  return found;
}

/** The first prose line under each scenario heading, skipping blanks and blockquotes. */
function scenarioOpeners(content: string): Line[] {
  const openers: Line[] = [];
  let waiting = false;
  for (const line of proseLines(content)) {
    if (SCENARIO.test(line.raw)) {
      waiting = true;
    } else if (waiting && line.raw.trim() !== '' && !line.raw.trimStart().startsWith('>')) {
      openers.push(line);
      waiting = false;
    }
  }
  return openers;
}

/** The frontmatter `description` and its line, or undefined when absent. */
function descriptionOf(content: string): { value: string; line: number } | undefined {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {return undefined;}
  for (let i = 1; i < lines.length && lines[i].trim() !== '---'; i++) {
    const m = /^description:\s*(.*)$/.exec(lines[i]);
    if (m) {return { value: m[1].replace(/^(['"])(.*)\1$/, '$2'), line: i + 1 };}
  }
  return undefined;
}

const normativeCount = (body: string): number => stripCode(body).match(NORMATIVE)?.length ?? 0;

export const SPEC_RULES: Rule[] = [
  {
    id: 'spec.one-req',
    description: 'A requirement carries one MUST, SHOULD, or MAY',
    documents: 'spec',
    // @req FR:cli-check/spec.one-req
    check: ({ content }: Document) =>
      requirements(content)
        .filter((r) => !SLOT.test(r.id) && normativeCount(r.body) > 1)
        .map((r) => finding(r.n, r.raw)),
  },
  {
    id: 'spec.actor',
    description: 'A requirement names its owner, not the generic "System"',
    documents: 'spec',
    // @req FR:cli-check/spec.actor
    check: ({ content }: Document) =>
      requirements(content)
        .filter((r) => SYSTEM_ACTOR.test(r.body))
        .map((r) => finding(r.n, r.raw)),
  },
  {
    id: 'spec.opener',
    description: 'A scenario opens with a "needs … so that …" story',
    documents: 'spec',
    // @req FR:cli-check/spec.opener
    check: ({ content }: Document) =>
      scenarioOpeners(content)
        .filter((l) => !STORY.test(l.raw))
        .map((l) => finding(l.n, l.raw)),
  },
  {
    id: 'spec.refs',
    description: 'Requirement IDs and @req stay out of prose',
    documents: 'spec',
    // @req FR:cli-check/spec.refs
    // @req FR:cli-check/spec.refs.entity-type
    check: ({ content }: Document) => [
      ...scenarioOpeners(content)
        .filter((l) => PROSE_REF.test(stripCode(l.raw)))
        .map((l) => finding(l.n, l.raw)),
      ...requirements(content)
        .filter((r) => PROSE_REF.test(stripCode(r.body)))
        .map((r) => finding(r.n, r.raw)),
    ],
  },
  {
    id: 'spec.slots',
    description: 'Interface, input, output, and schema requirements carry no MUST, SHOULD, or MAY',
    documents: 'spec',
    // @req FR:cli-check/spec.slots
    check: ({ content }: Document) =>
      requirements(content)
        .filter((r) => SLOT.test(r.id) && normativeCount(r.body) > 0)
        .map((r) => finding(r.n, r.raw)),
  },
  {
    id: 'spec.description',
    description: `Frontmatter description is present and at most ${MAX_DESCRIPTION} characters`,
    documents: 'spec',
    // @req FR:cli-check/spec.description
    check: ({ content }: Document) => {
      const d = descriptionOf(content);
      if (!d || !d.value) {return [finding(d?.line ?? 1, 'missing')];}
      return d.value.length > MAX_DESCRIPTION ? [finding(d.line, `${d.value.length} chars`)] : [];
    },
  },
  {
    id: 'spec.sections',
    description: 'All five required H2 sections are present',
    documents: 'spec',
    // @req FR:cli-check/spec.sections
    check: ({ content }: Document) => {
      const present = new Set<string>();
      for (const { raw } of proseLines(content)) {
        const h2 = /^##\s+(.+?)\s*$/.exec(raw);
        if (h2) {present.add(h2[1]);}
      }
      return REQUIRED_SECTIONS.filter((s) => !present.has(s)).map((s) => finding(1, `missing ## ${s}`));
    },
  },
];
