/**
 * The repository's Autopilot label name. Keep in sync with
 * `get-pull-request-labels.yaml` and FR:repo-labels/catalog.autopilot.
 * @req FR:autonomy/autopilot.apply.name
 */

const STANDARD = 'Status: 🤖 Autopilot';
const SIMPLE = 'autopilot';

/** `labels.names.autopilot`, else the simple name when `labels.style` is `simple`, else the standard name. */
export function autopilotLabelName(configText: string | undefined): string {
  let labels: { style?: unknown; names?: Record<string, unknown> } = {};
  try {
    labels = (JSON.parse(configText || '{}') as { labels?: typeof labels }).labels ?? {};
  } catch {
    // Unreadable config: standard name
  }
  const custom = labels.names?.autopilot;
  if (typeof custom === 'string' && custom) {return custom;}
  return labels.style === 'simple' ? SIMPLE : STANDARD;
}
