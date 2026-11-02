/**
 * Per-rule severity from `.xe/config/catalyst.json`, key `check.rules`.
 * @req FR:cli-check/severity.@json
 * @req FR:cli-check/severity.input
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { CatalystError } from '../core/errors';
import type { Severity } from './types';

export type SeverityConfig = Record<string, Severity>;

const SEVERITIES: Severity[] = ['error', 'warning', 'disable'];

/**
 * Severity for a rule: exact entry, else the longest matching wildcard, else `warning`.
 * @req FR:cli-check/severity.default
 * @req FR:cli-check/severity.precedence
 * @req FR:cli-check/severity.precedence.wildcard
 */
export function resolveSeverity(ruleId: string, config: SeverityConfig): Severity {
  if (Object.prototype.hasOwnProperty.call(config, ruleId)) {return config[ruleId];}
  const wildcard = Object.keys(config)
    .filter((k) => k.endsWith('*') && ruleId.startsWith(k.slice(0, -1)))
    .sort((a, b) => b.length - a.length)[0];
  return wildcard ? config[wildcard] : 'warning';
}

const invalid = (message: string): CatalystError =>
  new CatalystError(
    message,
    'InvalidInput',
    'In .xe/config/catalyst.json, set check.rules entries to "error", "warning", or "disable".'
  );

/**
 * Load `check.rules`; empty when the file or key is absent.
 * @req FR:cli-check/severity.invalid
 */
export async function loadSeverityConfig(projectRoot: string): Promise<SeverityConfig> {
  const file = path.join(projectRoot, '.xe', 'config', 'catalyst.json');
  let text: string;
  try {
    text = await fs.readFile(file, 'utf-8');
  } catch {
    return {};
  }
  let json: { check?: { rules?: Record<string, unknown> } };
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw invalid(`Invalid JSON in .xe/config/catalyst.json: ${(e as Error).message}`);
  }
  const rules = json.check?.rules ?? {};
  for (const [entry, value] of Object.entries(rules)) {
    if (!SEVERITIES.includes(value as Severity)) {
      throw invalid(`Invalid severity "${String(value)}" for check rule "${entry}"`);
    }
  }
  return rules as SeverityConfig;
}
