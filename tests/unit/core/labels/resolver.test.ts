/**
 * Unit tests for semantic label resolution
 */

import { CatalystError } from '../../../../src/core/errors';
import { resolveLabel } from '../../../../src/core/labels/resolver';
import type { RepoLabel } from '../../../../src/core/labels/types';

const l = (name: string, usage = 0): RepoLabel => ({ name, usage });

describe('resolveLabel', () => {
  // @req FR:pr-labels/resolve.@function
  // @req FR:pr-labels/resolve.existing
  it('returns the existing matching label name', () => {
    expect(resolveLabel('wip', [l('Status: 🚧 WIP', 4)])).toEqual({
      id: 'wip',
      name: 'Status: 🚧 WIP',
      exists: true,
    });
  });

  // @req FR:pr-labels/resolve.existing
  it('returns the existing label even when its style differs from the discovered one', () => {
    const labels = [l('Status: Ready ▶️', 40), l('wip', 1)];
    expect(resolveLabel('wip', labels).name).toBe('wip');
  });

  // @req FR:pr-labels/resolve.existing.most-used
  it('returns the most used label when several match', () => {
    const labels = [l('wip', 2), l('Status: 🚧 WIP', 9)];
    expect(resolveLabel('wip', labels).name).toBe('Status: 🚧 WIP');
  });

  // @req FR:pr-labels/resolve.existing.most-used
  it('prefers the label already named as the target', () => {
    const labels = [l('Status: 🚧 WIP', 9), l('Status: WIP 🚧', 1), l('Status: Ready ▶️', 20)];
    expect(resolveLabel('wip', labels).name).toBe('Status: WIP 🚧');
  });

  // @req FR:pr-labels/resolve.target
  it('formats the target in the discovered style when no label exists', () => {
    expect(resolveLabel('paused', [l('Status: WIP 🚧', 3)])).toEqual({
      id: 'paused',
      name: 'Status: Paused ⏸️',
      exists: false,
    });
    expect(resolveLabel('paused', [l('wip', 30)])).toMatchObject({ name: 'paused', exists: false });
  });

  // @req FR:pr-labels/resolve.input
  it('lets the style input override discovery', () => {
    expect(resolveLabel('paused', [l('wip', 30)], { style: 'key-value' }).name).toBe(
      'Status: Paused ⏸️',
    );
  });

  // @req FR:pr-labels/resolve.unknown
  it('fails with LabelUnknown listing valid ids', () => {
    try {
      resolveLabel('nope', []);
      throw new Error('expected failure');
    } catch (error) {
      expect(error).toBeInstanceOf(CatalystError);
      expect((error as CatalystError).code).toBe('LabelUnknown');
      expect((error as CatalystError).guidance).toContain('needs-review');
    }
  });

  // @req FR:pr-labels/resolve.output
  // @req FR:pr-labels/$resolved-label
  it('returns the ResolvedLabel shape', () => {
    expect(Object.keys(resolveLabel('wip', [])).sort()).toEqual(['exists', 'id', 'name']);
  });
});
