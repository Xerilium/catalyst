/**
 * Rollout rules: rollouts are gitignored scratch, deleted when done, so a finished tracked one is a mistake.
 * The loader hands rules only git-tracked rollouts, never `rollout-blueprint.md`.
 */

import type { Rule } from '../types';

const UNCHECKED_TASK = /^\s*[-*]\s+\[ \]/m;

/** Content outside the `## Final Review` section; its sign-off tasks are often left unchecked. */
const withoutFinalReview = (content: string): string =>
  content.replace(/^## Final Review\s*$[\s\S]*?(?=^## |(?![\s\S]))/m, '');

export const ROLLOUT_RULES: Rule[] = [
  {
    id: 'rollout.committed',
    description: 'A finished rollout plan is deleted, never committed',
    documents: 'rollout',
    // @req FR:cli-check/rollout.committed
    check: ({ content }) =>
      UNCHECKED_TASK.test(withoutFinalReview(content))
        ? []
        : [{ line: 1, text: 'Rollout plan has no unchecked tasks but is tracked by git; delete it or git rm --cached' }],
  },
];
