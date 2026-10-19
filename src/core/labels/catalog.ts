/**
 * Standard PR label catalog
 */

import type { LabelDefinition } from './types';

/**
 * @req FR:pr-labels/catalog.@function
 * @req FR:pr-labels/catalog.schema
 * @req FR:pr-labels/catalog.required
 * @req FR:pr-labels/catalog.known
 * @req FR:pr-labels/catalog.ids
 */
export const LABEL_CATALOG: readonly LabelDefinition[] = [
  {
    id: 'wip',
    group: 'Status',
    value: 'WIP',
    simple: 'wip',
    emoji: '🚧',
    color: 'fbca04',
    description: 'Work in progress; automation skips it',
    required: true,
  },
  {
    id: 'paused',
    group: 'Status',
    value: 'Paused',
    simple: 'paused',
    emoji: '⏸️',
    color: 'c5def5',
    description: 'Deliberately on hold; automation skips it',
    required: true,
  },
  {
    id: 'blocked',
    group: 'Status',
    value: 'Blocked',
    simple: 'blocked',
    emoji: '⛔',
    color: 'b60205',
    description: 'Cannot proceed until an external dependency clears',
    required: true,
  },
  {
    id: 'autopilot',
    group: 'Status',
    value: 'Autopilot',
    simple: 'autopilot',
    emoji: '🤖',
    color: '5319e7',
    description: 'An AI agent is driving this toward merge',
    required: true,
  },
  {
    id: 'ready',
    group: 'Status',
    value: 'Ready',
    simple: 'ready',
    emoji: '▶️',
    color: '0e8a16',
    description: 'Ready for review or merge',
    required: true,
  },
  {
    id: 'needs-attention',
    group: 'Needs',
    value: 'Attention',
    simple: 'needs attention',
    emoji: '👋',
    color: 'd93f0b',
    description: 'The owner must act',
    required: true,
  },
  {
    id: 'needs-review',
    group: 'Needs',
    value: 'Review',
    simple: 'needs review',
    emoji: '👀',
    color: '1d76db',
    description: 'Waiting on a reviewer',
    required: true,
  },
  {
    id: 'help-wanted',
    value: 'Help wanted',
    simple: 'help wanted',
    emoji: '✨',
    color: '008672',
    description: 'Open for contribution',
    required: true,
  },
  {
    id: 'finalized',
    group: 'Status',
    value: 'Finalized',
    simple: 'finalized',
    emoji: '🤖',
    color: '5319e7',
    description: 'Autopilot finished; awaiting human sign-off',
    required: false,
  },
  {
    id: 'needs-triage',
    group: 'Needs',
    value: 'Triage',
    simple: 'needs triage',
    emoji: '🔍',
    color: 'fef2c0',
    description: 'Needs triage',
    required: false,
  },
  {
    id: 'release-blocker',
    group: 'Release',
    value: 'Blocker',
    simple: 'release blocker',
    emoji: '⛔',
    color: 'b60205',
    description: 'Blocks the next release',
    required: false,
  },
  {
    id: 'release-priority',
    group: 'Release',
    value: 'Priority',
    simple: 'release priority',
    emoji: '⭐',
    color: 'fbca04',
    description: 'Planned for the next release',
    required: false,
  },
  {
    id: 'release-stretch',
    group: 'Release',
    value: 'Stretch',
    simple: 'release stretch',
    emoji: '🍒',
    color: 'bfd4f2',
    description: 'Included in the next release if time allows',
    required: false,
  },
];

export function findDefinition(id: string): LabelDefinition | undefined {
  return LABEL_CATALOG.find(d => d.id === id);
}
