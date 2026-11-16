/**
 * Run selected rules over the documents in scope.
 * @req FR:cli-check/check.execute
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadSpecs, loadTrackedRollouts } from './documents';
import { selectRules } from './registry';
import { loadSeverityConfig, resolveSeverity } from './severity';
import type { Finding, Rule, Severity } from './types';

export interface CheckRequest {
  root: string;
  /** Feature ID, or `*` / `?` glob; all features when omitted */
  feature?: string;
  /** Rule IDs or `{namespace}.*` wildcards; all rules when omitted */
  patterns?: string[];
  /** Apply fixes from fixable rules before reporting */
  fix?: boolean;
}

export interface CheckResult {
  /** Documents in scope */
  documents: number;
  /** Sorted by file, line, then rule */
  findings: Finding[];
}

/**
 * @req FR:cli-check/severity.disable
 * @req FR:cli-check/check.fix
 * @req FR:cli-check/check.fix.report
 */
export async function runChecks({ root, feature, patterns, fix }: CheckRequest): Promise<CheckResult> {
  const config = await loadSeverityConfig(root);
  const specs = loadSpecs(root, feature);
  const rollouts = feature ? [] : loadTrackedRollouts(root);
  const docsByKind = { spec: specs, rollout: rollouts };
  const active = selectRules(patterns)
    .map((rule) => ({ rule, severity: resolveSeverity(rule.id, config) }))
    .filter((r): r is { rule: Rule; severity: Exclude<Severity, 'disable'> } => r.severity !== 'disable');

  if (fix) {
    for (const { rule } of active) {
      if (!rule.fix) {continue;}
      for (const doc of docsByKind[rule.documents]) {
        const fixed = rule.fix(doc);
        if (fixed !== doc.content) {
          fs.writeFileSync(path.join(root, doc.path), fixed);
          doc.content = fixed;
        }
      }
    }
  }

  const findings: Finding[] = [];
  for (const { rule, severity } of active) {
    for (const doc of docsByKind[rule.documents]) {
      for (const f of rule.check(doc)) {
        findings.push({ file: doc.path, line: f.line, rule: rule.id, severity, text: f.text });
      }
    }
  }
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule));
  return { documents: specs.length + rollouts.length, findings };
}
