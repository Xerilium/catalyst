/**
 * Run selected rules over the documents in scope.
 * @req FR:cli-check/check.execute
 */

import { loadSpecs } from './documents';
import { selectRules } from './registry';
import { loadSeverityConfig, resolveSeverity } from './severity';
import type { Finding } from './types';

export interface CheckRequest {
  root: string;
  /** Feature ID, or `*` / `?` glob; all features when omitted */
  feature?: string;
  /** Rule IDs or `{namespace}.*` wildcards; all rules when omitted */
  patterns?: string[];
}

export interface CheckResult {
  /** Documents in scope */
  documents: number;
  /** Sorted by file, line, then rule */
  findings: Finding[];
}

/**
 * @req FR:cli-check/severity.disable
 */
export async function runChecks({ root, feature, patterns }: CheckRequest): Promise<CheckResult> {
  const config = await loadSeverityConfig(root);
  const docs = loadSpecs(root, feature);
  const findings: Finding[] = [];
  for (const rule of selectRules(patterns)) {
    const severity = resolveSeverity(rule.id, config);
    if (severity === 'disable') {continue;}
    for (const doc of docs) {
      for (const f of rule.check(doc)) {
        findings.push({ file: doc.path, line: f.line, rule: rule.id, severity, text: f.text });
      }
    }
  }
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule));
  return { documents: docs.length, findings };
}
