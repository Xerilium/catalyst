/**
 * Unit tests for the label setup plan
 */

import { LABEL_CATALOG } from '../../../../src/core/labels/catalog';
import { planLabels } from '../../../../src/core/labels/plan';
import type { RepoLabel } from '../../../../src/core/labels/types';

const l = (name: string, usage = 0): RepoLabel => ({ name, usage });
const required = LABEL_CATALOG.filter(d => d.required);

describe('planLabels', () => {
  // @req FR:pr-labels/plan.@function
  // @req FR:pr-labels/plan.input
  // @req FR:pr-labels/plan.create
  it('plans every required label in an empty repo, named in the target style', () => {
    const plan = planLabels([], 'key-value');
    expect(plan.creates).toHaveLength(required.length);
    expect(plan.creates.find(c => c.id === 'wip')?.name).toBe('Status: WIP 🚧');
    expect(plan.renames).toEqual([]);
    expect(planLabels([], 'simple').creates.find(c => c.id === 'wip')?.name).toBe('wip');
  });

  // @req FR:pr-labels/plan.create
  it('does not plan a label that already has a match', () => {
    const plan = planLabels([l('Status: 🚧 WIP'), l('paused')], 'key-value');
    expect(plan.creates.map(c => c.id)).not.toContain('wip');
    expect(plan.creates.map(c => c.id)).not.toContain('paused');
  });

  // @req FR:pr-labels/plan.create.optional
  it('never plans creation of optional labels', () => {
    const ids = planLabels([], 'key-value').creates.map(c => c.id);
    expect(ids).not.toContain('needs-triage');
    expect(ids).not.toContain('release-stretch');
  });

  // @req FR:pr-labels/plan.rename
  // @req FR:pr-labels/plan.rename.reason
  it('renames leading emoji to trailing with reason emoji-placement', () => {
    const plan = planLabels([l('Status: 🚧 WIP', 4)], 'key-value');
    expect(plan.renames).toEqual([
      { id: 'wip', from: 'Status: 🚧 WIP', to: 'Status: WIP 🚧', reason: 'emoji-placement' },
    ]);
  });

  // @req FR:pr-labels/plan.rename.reason
  it('tags a style change as style and other differences as format', () => {
    const plan = planLabels([l('wip'), l('Status: Paused'), l('status: ready ▶️')], 'key-value');
    const by = Object.fromEntries(plan.renames.map(r => [r.id, r.reason]));
    expect(by).toEqual({ wip: 'style', paused: 'format', ready: 'format' });
    expect(planLabels([l('Status: WIP 🚧')], 'simple').renames[0]).toMatchObject({
      to: 'wip',
      reason: 'style',
    });
  });

  // @req FR:pr-labels/plan.rename
  it('plans nothing for labels already in the target form', () => {
    const plan = planLabels([l('Status: WIP 🚧'), l('Help wanted ✨')], 'key-value');
    expect(plan.renames).toEqual([]);
  });

  // @req FR:pr-labels/plan.rename.optional
  it('plans renames for matching optional labels', () => {
    const plan = planLabels([l('Release: Stretch 🍒'), l('Needs: 🔍 Triage')], 'key-value');
    expect(plan.renames).toEqual([
      {
        id: 'needs-triage',
        from: 'Needs: 🔍 Triage',
        to: 'Needs: Triage 🔍',
        reason: 'emoji-placement',
      },
    ]);
  });

  // @req FR:pr-labels/plan.duplicates
  // @req FR:pr-labels/plan.duplicates.primary
  it('keeps the most used as primary and reports the rest as duplicates', () => {
    const plan = planLabels([l('wip', 2), l('Status: 🚧 WIP', 9)], 'key-value');
    expect(plan.renames).toEqual([
      { id: 'wip', from: 'Status: 🚧 WIP', to: 'Status: WIP 🚧', reason: 'emoji-placement' },
    ]);
    expect(plan.duplicates).toEqual([{ id: 'wip', names: ['wip'] }]);
  });

  // @req FR:pr-labels/plan.duplicates.primary
  it('treats the label already named as the target as primary', () => {
    const plan = planLabels([l('Status: 🚧 WIP', 9), l('Status: WIP 🚧', 0)], 'key-value');
    expect(plan.renames).toEqual([]);
    expect(plan.duplicates).toEqual([{ id: 'wip', names: ['Status: 🚧 WIP'] }]);
  });

  // @req FR:pr-labels/plan.output
  // @req FR:pr-labels/$label-plan
  it('returns the LabelPlan shape', () => {
    expect(Object.keys(planLabels([], 'simple')).sort()).toEqual([
      'creates',
      'duplicates',
      'renames',
      'style',
    ]);
  });
});
