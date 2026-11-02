/**
 * Rule registry: rules are data, so a new check costs one entry, not a new command.
 * @req FR:cli-check/registry.id
 * @req FR:cli-check/registry.reserved
 * @req FR:cli-check/check.rules
 */

import { SPEC_RULES } from './rules/spec';
import type { Rule } from './types';

/** Namespaces no registry rule may use. `catalyst traceability` keeps its own command. */
export const RESERVED_NAMESPACES = ['traceability'];

const RULE_ID = /^[a-z0-9]+(-[a-z0-9]+)*\.[a-z0-9]+(-[a-z0-9]+)*$/;

/** Problems with a rule set; empty when valid. */
export function validateRules(rules: Rule[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const { id } of rules) {
    if (!RULE_ID.test(id)) {problems.push(`Rule ID "${id}" must be {namespace}.{rule} in lowercase kebab-case`);}
    else if (RESERVED_NAMESPACES.includes(id.split('.')[0])) {problems.push(`Rule "${id}" uses a reserved namespace`);}
    if (seen.has(id)) {problems.push(`Rule ID "${id}" is registered twice`);}
    seen.add(id);
  }
  return problems;
}

export const RULES: Rule[] = [...SPEC_RULES];

const problems = validateRules(RULES);
if (problems.length > 0) {
  throw new Error(`Invalid check registry: ${problems.join('; ')}`);
}

export const getRule = (id: string): Rule | undefined => RULES.find((r) => r.id === id);

/** True when `pattern` is the rule ID or a `{namespace}.*` style wildcard. */
export const matchesPattern = (id: string, pattern: string): boolean =>
  pattern.endsWith('*') ? id.startsWith(pattern.slice(0, -1)) : id === pattern;

/** Rules matching any of `patterns`; all rules when none given. */
export function selectRules(patterns: string[] | undefined): Rule[] {
  if (!patterns || patterns.length === 0) {return RULES;}
  return RULES.filter((r) => patterns.some((p) => matchesPattern(r.id, p)));
}
