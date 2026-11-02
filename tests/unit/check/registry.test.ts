/**
 * Tests for the check rule registry.
 */

import { RULES, getRule, selectRules, validateRules } from '../../../src/check/registry';
import type { Rule } from '../../../src/check/types';

const rule = (id: string): Rule => ({ id, description: 'x', documents: 'spec', check: () => [] });

describe('registry', () => {
  // @req FR:cli-check/registry.id
  it('registers every rule under a {namespace}.{rule} kebab-case ID', () => {
    for (const r of RULES) expect(r.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*\.[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(validateRules(RULES)).toEqual([]);
  });

  // @req FR:cli-check/registry.id
  it.each(['nodot', 'Spec.actor', 'spec.Actor', 'a.b.c', 'spec.'])('rejects malformed ID %s', (id) => {
    expect(validateRules([rule(id)])).toHaveLength(1);
  });

  // @req FR:cli-check/registry.id
  it('rejects duplicate IDs', () => {
    expect(validateRules([rule('spec.a'), rule('spec.a')])).toHaveLength(1);
  });

  // @req FR:cli-check/registry.reserved
  it('rejects the reserved traceability namespace', () => {
    expect(validateRules([rule('traceability.gap')])).toHaveLength(1);
    expect(RULES.some((r) => r.id.startsWith('traceability.'))).toBe(false);
  });

  // @req FR:cli-check/registry.pure
  it('runs every rule on content alone', () => {
    for (const r of RULES) {
      expect(() => r.check({ path: 'nowhere/spec.md', content: '' })).not.toThrow();
    }
  });

  // @req FR:cli-check/spec.one-req
  it('looks up a rule by ID', () => {
    expect(getRule('spec.one-req')?.id).toBe('spec.one-req');
    expect(getRule('spec.none')).toBeUndefined();
  });

  // @req FR:cli-check/check.rules
  it('selects by exact ID, namespace wildcard, and comma list', () => {
    expect(selectRules(undefined)).toEqual(RULES);
    expect(selectRules(['spec.actor']).map((r) => r.id)).toEqual(['spec.actor']);
    expect(selectRules(['spec.*']).length).toBe(RULES.filter((r) => r.id.startsWith('spec.')).length);
    expect(selectRules(['spec.actor', 'spec.refs']).map((r) => r.id).sort()).toEqual(['spec.actor', 'spec.refs']);
    expect(selectRules(['nope.*'])).toEqual([]);
  });
});
