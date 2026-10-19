/**
 * Pattern discovery from label usage (pure)
 */

import { classifyLabel, matchLabel } from './naming';
import type { LabelPattern, RepoLabel } from './types';

/** Simple labels used fewer times than this in total are not trusted as the convention. */
export const LOW_USE_THRESHOLD = 5;

/**
 * @req FR:pr-labels/discovery.@function
 * @req FR:pr-labels/discovery.input
 * @req FR:pr-labels/discovery.usage
 * @req FR:pr-labels/discovery.winner
 * @req FR:pr-labels/discovery.key-value-present
 * @req FR:pr-labels/discovery.low-use
 * @req FR:pr-labels/discovery.none
 * @req FR:pr-labels/discovery.output
 */
export function discoverPattern(labels: RepoLabel[]): LabelPattern {
  const usage = { simple: 0, keyValue: 0 };
  let keyValueCount = 0;
  let matched = 0;
  for (const label of labels) {
    if (!matchLabel(label.name)) {
      continue;
    }
    matched++;
    if (classifyLabel(label.name).style === 'simple') {
      usage.simple += label.usage;
    } else {
      usage.keyValue += label.usage;
      keyValueCount++;
    }
  }

  if (matched === 0) {
    return { style: 'key-value', basis: 'none', needsChoice: false, usage };
  }

  if (usage.simple + usage.keyValue === 0) {
    return keyValueCount > 0
      ? { style: 'key-value', basis: 'present', needsChoice: false, usage }
      : { style: 'simple', basis: 'low-use', needsChoice: true, usage };
  }

  if (usage.keyValue >= usage.simple) {
    return { style: 'key-value', basis: 'usage', needsChoice: false, usage };
  }
  return usage.simple < LOW_USE_THRESHOLD
    ? { style: 'simple', basis: 'low-use', needsChoice: true, usage }
    : { style: 'simple', basis: 'usage', needsChoice: false, usage };
}
