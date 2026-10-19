/**
 * Semantic label id to repository label name
 */

import { CatalystError } from '../errors';
import { LABEL_CATALOG, findDefinition } from './catalog';
import { labelName, matchLabel } from './naming';
import { discoverPattern } from './pattern';
import type { LabelStyle, RepoLabel, ResolvedLabel } from './types';

/**
 * @req FR:pr-labels/resolve.@function
 * @req FR:pr-labels/resolve.input
 * @req FR:pr-labels/resolve.existing
 * @req FR:pr-labels/resolve.existing.most-used
 * @req FR:pr-labels/resolve.target
 * @req FR:pr-labels/resolve.unknown
 * @req FR:pr-labels/resolve.output
 */
export function resolveLabel(
  id: string,
  labels: RepoLabel[],
  options: { style?: LabelStyle } = {},
): ResolvedLabel {
  const definition = findDefinition(id);
  if (!definition) {
    throw new CatalystError(
      `Unknown label id '${id}'`,
      'LabelUnknown',
      `Use one of: ${LABEL_CATALOG.map(d => d.id).join(', ')}`,
    );
  }

  const target = labelName(definition, options.style ?? discoverPattern(labels).style);
  const matches = labels.filter(l => matchLabel(l.name)?.id === id);
  if (matches.length === 0) {
    return { id, name: target, exists: false };
  }

  const best =
    matches.find(l => l.name === target) ?? matches.reduce((a, b) => (b.usage > a.usage ? b : a));
  return { id, name: best.name, exists: true };
}
