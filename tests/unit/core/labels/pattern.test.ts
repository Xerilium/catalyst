/**
 * Unit tests for label pattern discovery
 */

import { discoverPattern, LOW_USE_THRESHOLD } from '../../../../src/core/labels/pattern';
import type { RepoLabel } from '../../../../src/core/labels/types';

const l = (name: string, usage = 0): RepoLabel => ({ name, usage });

describe('discoverPattern', () => {
  // @req FR:pr-labels/discovery.@function
  it('is exported with the low-use threshold of 5', () => {
    expect(typeof discoverPattern).toBe('function');
    expect(LOW_USE_THRESHOLD).toBe(5);
  });

  // @req FR:pr-labels/discovery.usage
  // @req FR:pr-labels/discovery.input
  it('counts usage only on labels that match the catalog', () => {
    const p = discoverPattern([l('Status: WIP 🚧', 7), l('wip', 2), l('bug', 900)]);
    expect(p.usage).toEqual({ simple: 2, keyValue: 7 });
  });

  // @req FR:pr-labels/discovery.winner
  it('reports the style with the higher usage', () => {
    const p = discoverPattern([l('wip', 30), l('paused', 10), l('Status: Ready ▶️', 4)]);
    expect(p).toMatchObject({ style: 'simple', basis: 'usage', needsChoice: false });
    const q = discoverPattern([l('wip', 3), l('Status: WIP 🚧', 12)]);
    expect(q).toMatchObject({ style: 'key-value', basis: 'usage', needsChoice: false });
  });

  // @req FR:pr-labels/discovery.winner
  it('prefers key-value on a usage tie', () => {
    const p = discoverPattern([l('wip', 8), l('Status: Ready ▶️', 8)]);
    expect(p.style).toBe('key-value');
  });

  // @req FR:pr-labels/discovery.key-value-present
  it('trusts unused key/value labels over unused simple labels', () => {
    const p = discoverPattern([l('help wanted'), l('Status: WIP 🚧'), l('wip')]);
    expect(p).toMatchObject({ style: 'key-value', basis: 'present', needsChoice: false });
  });

  // @req FR:pr-labels/discovery.low-use
  it('asks when only unused simple labels exist', () => {
    const p = discoverPattern([l('help wanted'), l('bug', 50)]);
    expect(p).toMatchObject({ style: 'simple', basis: 'low-use', needsChoice: true });
  });

  // @req FR:pr-labels/discovery.low-use
  it('asks when simple labels win with fewer than 5 uses', () => {
    const p = discoverPattern([l('wip', 3), l('help wanted', 1)]);
    expect(p).toMatchObject({ style: 'simple', basis: 'low-use', needsChoice: true });
  });

  // @req FR:pr-labels/discovery.low-use
  it('does not ask when simple labels reach 5 uses', () => {
    const p = discoverPattern([l('wip', 5)]);
    expect(p).toMatchObject({ style: 'simple', basis: 'usage', needsChoice: false });
  });

  // @req FR:pr-labels/discovery.none
  it('defaults to key-value when nothing matches', () => {
    expect(discoverPattern([l('bug', 10)])).toMatchObject({
      style: 'key-value',
      basis: 'none',
      needsChoice: false,
    });
    expect(discoverPattern([]).basis).toBe('none');
  });

  // @req FR:pr-labels/discovery.output
  // @req FR:pr-labels/$label-pattern
  it('returns the LabelPattern shape', () => {
    expect(Object.keys(discoverPattern([])).sort()).toEqual([
      'basis',
      'needsChoice',
      'style',
      'usage',
    ]);
  });
});
