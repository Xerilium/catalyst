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

/** Template tokens that never belong in a finished spec; generic tokens such as `{value}` are legitimate in message formats. */
const TEMPLATE_PLACEHOLDERS = [
  '{feature-name}',
  '{scenario-id}',
  '{scenario-name}',
  '{sub-id}',
  '{actor} needs to',
  '{behavior-name}',
  '{interface-kind}',
];
const FRONTMATTER_PLACEHOLDER = /\[(?:feature-id|feature-name|dependent-feature-ids|one-line [^\]]*)\]/;

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

/**
 * Requirement prose to scan for references. Entity type notes are slot notation, so only slots may carry them.
 * @req FR:cli-check/spec.refs.entity-type
 */
const refProse = (r: Requirement): string =>
  SLOT.test(r.id) ? stripCode(r.body) : r.body.replace(/`[^`]*`/g, '``');

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

/** Plain ASCII (code unit) comparison, independent of locale. */
const ascii = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** A list entry's sort key: the value without the dash, quotes, or a trailing comment. */
const depKey = (item: string): string =>
  item.trim().replace(/^-\s*/, '').replace(/\s+#.*$/, '').trim().replace(/^(['"])(.*)\1$/, '$2');

interface DepsList {
  /** 0-based index of the `dependencies:` line */
  keyIndex: number;
  /** Flow list items when written `dependencies: [a, b]` */
  flow?: string[];
  /** Trailing comment after a flow list, kept on fix */
  tail?: string;
  /** 0-based indexes of block list item lines */
  block: number[];
}

/** The frontmatter `dependencies` list, read from lines split on `\n` (any `\r` stays on the line). */
function depsList(lines: string[]): DepsList | undefined {
  if (lines[0]?.trim() !== '---') {return undefined;}
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end === -1) {return undefined;}
  for (let i = 1; i < end; i++) {
    const m = /^dependencies:\s*(.*?)\s*$/.exec(lines[i]);
    if (!m) {continue;}
    const flow = /^\[(.*)\](\s+#.*)?$/.exec(m[1]);
    if (flow) {
      return { keyIndex: i, block: [], tail: flow[2] ?? '', flow: flow[1].split(',').map((s) => s.trim()).filter(Boolean) };
    }
    const block: number[] = [];
    for (let j = i + 1; j < lines.length && /^\s*-\s/.test(lines[j]); j++) {block.push(j);}
    return { keyIndex: i, block };
  }
  return undefined;
}

const sortedByKey = (items: string[]): string[] => [...items].sort((a, b) => ascii(depKey(a), depKey(b)));

/** @req FR:cli-check/spec.ste-sentence */
export const MAX_FR_WORDS = 20;
const RATIONALE = /\b(?:so that|so|rather than|because|in order to)\b/i;
const words = (text: string): number => stripCode(text).split(/\s+/).filter(Boolean).length;

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
        .filter((r) => PROSE_REF.test(refProse(r)))
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
  {
    id: 'spec.deps-sorted',
    description: 'Frontmatter dependencies are in ASCII order',
    documents: 'spec',
    // @req FR:cli-check/spec.deps-sorted
    check: ({ content }: Document) => {
      const lines = content.split('\n');
      const deps = depsList(lines);
      if (!deps) {return [];}
      if (deps.flow) {
        const keys = deps.flow.map(depKey);
        const unsorted = keys.some((k, i) => i > 0 && ascii(keys[i - 1], k) > 0);
        return unsorted ? [finding(deps.keyIndex + 1, lines[deps.keyIndex])] : [];
      }
      const { block } = deps;
      const at = block.findIndex((j, i) => i > 0 && ascii(depKey(lines[block[i - 1]]), depKey(lines[j])) > 0);
      return at === -1 ? [] : [finding(block[at] + 1, lines[block[at]])];
    },
    // @req FR:cli-check/spec.deps-sorted.fix
    fix: ({ content }: Document) => {
      const lines = content.split('\n');
      const deps = depsList(lines);
      if (!deps) {return content;}
      if (deps.flow) {
        const { flow } = deps;
        const sorted = sortedByKey(flow);
        if (sorted.every((s, i) => s === flow[i])) {return content;}
        const cr = lines[deps.keyIndex].endsWith('\r') ? '\r' : '';
        lines[deps.keyIndex] = `dependencies: [${sorted.join(', ')}]${deps.tail ?? ''}${cr}`;
      } else {
        const sorted = sortedByKey(deps.block.map((j) => lines[j]));
        deps.block.forEach((j, i) => (lines[j] = sorted[i]));
      }
      return lines.join('\n');
    },
  },
  {
    id: 'spec.ste-sentence',
    description: `A requirement is one sentence of ${MAX_FR_WORDS} words or fewer`,
    documents: 'spec',
    // @req FR:cli-check/spec.ste-sentence
    check: ({ content }: Document) =>
      requirements(content)
        .filter((r) => !SLOT.test(r.id) && (words(r.body) > MAX_FR_WORDS || /[.!?]\s+\S/.test(stripCode(r.body))))
        .map((r) => finding(r.n, r.raw)),
  },
  {
    id: 'spec.ste-rationale',
    description: 'Requirement prose carries no rationale clause',
    documents: 'spec',
    // @req FR:cli-check/spec.ste-rationale
    check: ({ content }: Document) =>
      requirements(content)
        .filter((r) => !SLOT.test(r.id) && RATIONALE.test(stripCode(r.body).replace(/"[^"]*"/g, '""')))
        .map((r) => finding(r.n, r.raw)),
  },
  {
    id: 'spec.instructions',
    description: 'No leftover [INSTRUCTIONS] template blocks',
    documents: 'spec',
    // @req FR:cli-check/spec.instructions
    check: ({ content }: Document) =>
      proseLines(content)
        .filter((l) => stripCode(l.raw).includes('[INSTRUCTIONS]'))
        .map((l) => finding(l.n, l.raw)),
  },
  {
    id: 'spec.placeholder',
    description: 'No unfilled template placeholders',
    documents: 'spec',
    // @req FR:cli-check/spec.placeholder
    check: ({ content }: Document) => {
      const found: RawFinding[] = proseLines(content)
        .filter((l) => TEMPLATE_PLACEHOLDERS.some((t) => stripCode(l.raw).includes(t)))
        .map((l) => finding(l.n, l.raw));
      const lines = content.split(/\r?\n/);
      if (lines[0]?.trim() === '---') {
        for (let i = 1; i < lines.length && lines[i].trim() !== '---'; i++) {
          if (FRONTMATTER_PLACEHOLDER.test(lines[i])) {found.push(finding(i + 1, lines[i]));}
        }
      }
      return found.sort((a, b) => a.line - b.line);
    },
  },
];
