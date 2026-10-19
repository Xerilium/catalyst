/**
 * Unit tests for the PR label catalog
 */

import { LABEL_CATALOG, findDefinition } from '../../../../src/core/labels/catalog';

const REQUIRED = [
  'wip',
  'paused',
  'blocked',
  'autopilot',
  'ready',
  'needs-attention',
  'needs-review',
  'help-wanted',
];
const KNOWN = [
  'finalized',
  'needs-triage',
  'release-blocker',
  'release-priority',
  'release-stretch',
];

describe('label catalog', () => {
  // @req FR:pr-labels/catalog.@function
  it('exports the catalog and a lookup by id', () => {
    expect(findDefinition('wip')).toBe(LABEL_CATALOG.find(d => d.id === 'wip'));
    expect(findDefinition('nope')).toBeUndefined();
  });

  // @req FR:pr-labels/catalog.required
  it('marks exactly the core ids required', () => {
    const required = LABEL_CATALOG.filter(d => d.required).map(d => d.id);
    expect(required.sort()).toEqual([...REQUIRED].sort());
  });

  // @req FR:pr-labels/catalog.known
  it('defines the optional known labels', () => {
    const optional = LABEL_CATALOG.filter(d => !d.required).map(d => d.id);
    expect(optional.sort()).toEqual([...KNOWN].sort());
  });

  // @req FR:pr-labels/catalog.ids
  it('gives every definition a unique kebab-case id', () => {
    const ids = LABEL_CATALOG.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  // @req FR:pr-labels/$label-definition
  // @req FR:pr-labels/catalog.schema
  it('carries every LabelDefinition field', () => {
    for (const d of LABEL_CATALOG) {
      expect(d.value).toBeTruthy();
      expect(d.simple).toBe(d.simple.toLowerCase());
      expect(d.emoji).toBeTruthy();
      expect(d.color).toMatch(/^[0-9a-f]{6}$/);
      expect(d.description).toBeTruthy();
      expect(typeof d.required).toBe('boolean');
    }
  });
});
