/**
 * Rollout rules: rollouts are untracked scratch, so a tracked one is a mistake.
 * The loader hands rules only git-tracked rollouts.
 */

import type { Rule } from '../types';

export const ROLLOUT_RULES: Rule[] = [
  {
    id: 'rollout.committed',
    description: 'Rollout plans are working files and are never committed',
    documents: 'rollout',
    // @req FR:cli-check/rollout.committed
    check: () => [{ line: 1, text: 'Rollout plan is tracked by git; delete it or git rm --cached' }],
  },
];
