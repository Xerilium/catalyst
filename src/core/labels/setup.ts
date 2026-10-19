/**
 * Label setup: discover, ask once if needed, create, and offer renames
 */

import { CatalystError } from '../errors';
import { discoverPattern } from './pattern';
import { planLabels } from './plan';
import type { Prompt } from './prompt';
import type { LabelAdapter, LabelStyle, RepoLabel, SetupResult } from './types';

export type { Prompt } from './prompt';

export interface SetupOptions {
  style?: LabelStyle;
  nonInteractive?: boolean;
  rename?: boolean;
  prompt?: Prompt;
}

const STYLES: LabelStyle[] = ['key-value', 'simple'];

/**
 * @req FR:pr-labels/setup.@function
 * @req FR:pr-labels/setup.input
 * @req FR:pr-labels/setup.style
 * @req FR:pr-labels/setup.create
 * @req FR:pr-labels/setup.rename
 * @req FR:pr-labels/setup.rename.report
 * @req FR:pr-labels/setup.idempotent
 * @req FR:pr-labels/setup.no-delete
 * @req FR:pr-labels/setup.skip
 * @req FR:pr-labels/setup.output
 * @req FR:pr-labels/ask.trigger
 * @req FR:pr-labels/ask.cli
 * @req FR:pr-labels/ask.non-interactive
 */
export async function setupLabels(
  adapter: LabelAdapter,
  options: SetupOptions = {},
): Promise<SetupResult> {
  const prompt = options.nonInteractive ? undefined : options.prompt;

  let labels: RepoLabel[];
  try {
    labels = await adapter.list();
  } catch (error) {
    if (error instanceof CatalystError && error.code === 'LabelGitHubUnavailable') {
      // Source: GitHub adapter
      // Reason: gh missing, unauthenticated, or no GitHub remote; init must not fail on it
      // Action: report the skip with remediation guidance and change nothing
      return {
        style: options.style ?? 'key-value',
        created: [],
        renamed: [],
        pendingRenames: [],
        skipped: `${error.message}. ${error.guidance}`,
      };
    }
    throw error;
  }

  const pattern = discoverPattern(labels);
  let style = options.style ?? pattern.style;
  if (!options.style && pattern.needsChoice && planLabels(labels, style).creates.length > 0) {
    style = prompt
      ? ((await prompt.choose(
          'Which label naming style does this repository use? (existing labels give no clear signal)',
          STYLES,
          'key-value',
        )) as LabelStyle)
      : 'key-value';
  }

  const plan = planLabels(labels, style);
  const result: SetupResult = { style, created: [], renamed: [], pendingRenames: [] };

  for (const label of plan.creates) {
    await adapter.create({ name: label.name, color: label.color, description: label.description });
    result.created.push(label.name);
  }

  if (plan.renames.length > 0) {
    const apply =
      options.rename === true ||
      (prompt !== undefined &&
        (await prompt.confirm(
          `Rename ${plan.renames.length} label(s) to the standard form (assignments are kept)?`,
        )));
    if (apply) {
      for (const { from, to } of plan.renames) {
        await adapter.rename(from, to);
        result.renamed.push({ from, to });
      }
    } else {
      result.pendingRenames = plan.renames;
    }
  }

  return result;
}
