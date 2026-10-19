/**
 * Setup plan: what to create and rename (pure)
 */

import { LABEL_CATALOG } from './catalog';
import { classifyLabel, labelName, matchLabel } from './naming';
import type { LabelPlan, LabelStyle, RenameReason, RepoLabel } from './types';

function renameReason(from: string, style: LabelStyle): RenameReason {
  const current = classifyLabel(from);
  if (current.style !== style) {
    return 'style';
  }
  return current.emoji === 'leading' ? 'emoji-placement' : 'format';
}

/**
 * @req FR:pr-labels/plan.@function
 * @req FR:pr-labels/plan.input
 * @req FR:pr-labels/plan.create
 * @req FR:pr-labels/plan.create.optional
 * @req FR:pr-labels/plan.rename
 * @req FR:pr-labels/plan.rename.reason
 * @req FR:pr-labels/plan.rename.optional
 * @req FR:pr-labels/plan.duplicates
 * @req FR:pr-labels/plan.duplicates.primary
 * @req FR:pr-labels/plan.output
 */
export function planLabels(labels: RepoLabel[], style: LabelStyle): LabelPlan {
  const plan: LabelPlan = { style, creates: [], renames: [], duplicates: [] };

  for (const definition of LABEL_CATALOG) {
    const target = labelName(definition, style);
    const matches = labels.filter(l => matchLabel(l.name)?.id === definition.id);

    if (matches.length === 0) {
      if (definition.required) {
        plan.creates.push({ ...definition, name: target });
      }
      continue;
    }

    const primary =
      matches.find(l => l.name === target) ?? matches.reduce((a, b) => (b.usage > a.usage ? b : a));
    const extras = matches.filter(l => l !== primary).map(l => l.name);
    if (extras.length > 0) {
      plan.duplicates.push({ id: definition.id, names: extras });
    }
    if (primary.name !== target) {
      plan.renames.push({
        id: definition.id,
        from: primary.name,
        to: target,
        reason: renameReason(primary.name, style),
      });
    }
  }
  return plan;
}
