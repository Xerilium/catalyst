/**
 * Labels command: set up, plan, and resolve standard PR labels.
 */

import {
  createGhLabelAdapter,
  createTerminalPrompt,
  discoverPattern,
  planLabels,
  resolveLabel,
  setupLabels,
  type LabelAdapter,
  type LabelStyle,
  type SetupResult,
} from '../../core/labels';
import type { LabelsOptions } from '../types';

function parseStyle(value: string | undefined): LabelStyle | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === 'simple' || value === 'key-value') {
    return value;
  }
  throw new Error(`Invalid --style '${value}'; use 'simple' or 'key-value'`);
}

/**
 * Render a setup result as console lines.
 *
 * @req FR:pr-labels/setup.rename.report
 * @req FR:pr-labels/setup.output
 */
export function formatSetupResult(result: SetupResult): string[] {
  if (result.skipped) {
    return [`Skipped PR label setup: ${result.skipped}`];
  }
  const lines: string[] = [];
  if (result.created.length > 0) {
    lines.push(`Created ${result.created.length} label(s): ${result.created.join(', ')}`);
  }
  for (const { from, to } of result.renamed) {
    lines.push(`Renamed ${from} -> ${to}`);
  }
  if (result.pendingRenames.length > 0) {
    lines.push(
      `${result.pendingRenames.length} rename(s) not applied (run \`catalyst labels setup --rename\`):`,
      ...result.pendingRenames.map(r => `  ${r.from} -> ${r.to} (${r.reason})`),
    );
  }
  if (lines.length === 0) {
    lines.push(`PR labels already standard (${result.style} style)`);
  }
  return lines;
}

/**
 * @req FR:pr-labels/setup.@cli
 */
export async function labelsSetupCommand(
  options: LabelsOptions,
  adapter: LabelAdapter = createGhLabelAdapter(),
): Promise<void> {
  const prompt = options.nonInteractive ? undefined : createTerminalPrompt();
  try {
    const result = await setupLabels(adapter, {
      style: parseStyle(options.style),
      nonInteractive: options.nonInteractive,
      rename: options.rename,
      prompt,
    });
    if (options.json) {
      console.log(JSON.stringify(result));
    } else if (!options.quiet) {
      console.log(formatSetupResult(result).join('\n'));
    }
  } finally {
    prompt?.close();
  }
}

/**
 * @req FR:pr-labels/plan.@cli
 * @req FR:pr-labels/plan.output.cli
 */
export async function labelsPlanCommand(
  options: LabelsOptions,
  adapter: LabelAdapter = createGhLabelAdapter(),
): Promise<void> {
  const labels = await adapter.list();
  const pattern = discoverPattern(labels);
  const plan = planLabels(labels, parseStyle(options.style) ?? pattern.style);
  console.log(JSON.stringify({ pattern, plan }, null, options.json ? undefined : 2));
}

/**
 * @req FR:pr-labels/resolve.@cli
 * @req FR:pr-labels/resolve.output.cli
 */
export async function labelsResolveCommand(
  id: string,
  options: LabelsOptions,
  adapter: LabelAdapter = createGhLabelAdapter(),
): Promise<void> {
  const resolved = resolveLabel(id, await adapter.list(), { style: parseStyle(options.style) });
  console.log(options.json ? JSON.stringify(resolved) : resolved.name);
}
