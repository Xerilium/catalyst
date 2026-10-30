/**
 * Check command implementation — lint spec authoring rules.
 *
 * @req FR:cli-engine/check.@cli
 * @req FR:cli-engine/check.input
 * @req FR:cli-engine/check.actor
 * @req FR:cli-engine/check.inline-ref
 * @req FR:cli-engine/check.instructions
 * @req FR:cli-engine/check.placeholder
 * @req FR:cli-engine/check.output
 */

import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import type { CheckOptions } from '../types';

export type CheckRule = 'actor' | 'inline-ref' | 'instructions' | 'placeholder';

export interface CheckIssue {
  file: string;
  line: number;
  rule: CheckRule;
  message: string;
}

/** Template placeholders that never belong in a finished spec (generic tokens like {value} are legit in message formats). */
const TEMPLATE_PLACEHOLDERS = [
  '{feature-name}',
  '{scenario-id}',
  '{scenario-name}',
  '{sub-id}',
  '{actor} needs to',
  '{behavior-name}',
  '{interface-kind}',
];

const FR_LINE = /^\s*-\s+\*\*(N?FR:[^*]+)\*\*/;
const DEPRECATED_LINE = /^\s*-\s+~~\*\*N?FR:/;
const FRONTMATTER_PLACEHOLDER = /\[(feature-id|feature-name|dependent-feature-ids|one-line [^\]]*)\]/;

/** Remove inline code spans so examples in backticks are not linted. */
function stripCode(line: string): string {
  return line.replace(/`[^`]*`/g, '');
}

/**
 * Lint a single spec's content. Pure: no I/O.
 */
export function checkSpec(content: string, file: string): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const lines = content.split(/\r?\n/);
  let inFrontmatter = lines[0] === '---';
  let inFence = false;
  let inFr = false;

  lines.forEach((raw, i) => {
    const line = i + 1;
    const add = (rule: CheckRule, message: string) => issues.push({ file, line, rule, message });

    if (inFrontmatter) {
      if (i > 0 && raw === '---') {
        inFrontmatter = false;
      } else if (i > 0 && FRONTMATTER_PLACEHOLDER.test(raw)) {
        add('placeholder', `Unfilled frontmatter placeholder: ${raw.trim()}`);
      }
      return;
    }
    if (/^\s*```/.test(raw)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;

    const text = stripCode(raw);
    if (text.includes('[INSTRUCTIONS]')) {
      add('instructions', 'Leftover [INSTRUCTIONS] block');
    }

    for (const token of TEMPLATE_PLACEHOLDERS) {
      if (text.includes(token)) add('placeholder', `Unfilled template placeholder ${token}`);
    }

    // Track FR bodies: an FR bullet plus its indented, non-blank continuation lines
    const fr = FR_LINE.exec(raw);
    if (fr) {
      inFr = true;
    } else if (DEPRECATED_LINE.test(raw) || /^\S/.test(raw) || raw.trim() === '') {
      inFr = false;
    }
    if (!inFr || /^\s*>/.test(raw)) return;

    const body = fr ? stripCode(raw.slice(raw.indexOf(fr[0]) + fr[0].length)) : text;
    if (fr && /\bSystem\s+(MUST|SHOULD|MAY)\b/.test(body)) {
      add('actor', `${fr[1]} uses generic "System" actor; name the implementing owner`);
    }
    if (/\bN?FR:[\w$@./-]+/.test(body)) {
      add('inline-ref', 'Inline FR reference; use a nested `> - @req` blockquote instead');
    }
  });

  return issues;
}

function findSpecs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findSpecs(full));
    else if (entry.name === 'spec.md') out.push(full);
  }
  return out.sort();
}

/**
 * Execute the check command. Exits 1 when any issue is found.
 */
export async function checkCommand(feature: string | undefined, options: CheckOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const featuresDir = path.join(cwd, '.xe', 'features');
  let specs: string[];

  if (feature) {
    const spec = path.join(featuresDir, ...feature.split('/'), 'spec.md');
    if (!fs.existsSync(spec)) {
      console.error(`No spec found for feature '${feature}' at ${spec}`);
      process.exit(2);
    }
    specs = [spec];
  } else {
    specs = findSpecs(featuresDir);
  }

  const issues = specs.flatMap(spec =>
    checkSpec(fs.readFileSync(spec, 'utf-8'), path.relative(cwd, spec))
  );

  if (options.json) {
    console.log(JSON.stringify({ specs: specs.length, issues }));
  } else if (!options.quiet || issues.length > 0) {
    for (const issue of issues) {
      console.log(`${issue.file}:${issue.line} ${pc.yellow(`[${issue.rule}]`)} ${issue.message}`);
    }
    const summary = `${issues.length} issue${issues.length === 1 ? '' : 's'} in ${specs.length} spec${specs.length === 1 ? '' : 's'}`;
    console.log(issues.length > 0 ? pc.red(`✗ ${summary}`) : pc.green(`✓ ${summary}`));
  }

  if (issues.length > 0) process.exit(1);
}
