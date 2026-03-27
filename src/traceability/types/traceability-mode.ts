/**
 * Per-feature traceability mode value.
 *
 * - `'error'`: Gaps are errors (fail tests).
 * - `'warning'`: Gaps are warnings (reported but don't fail).
 * - `'inherit'`: Enabled — inherit severity from parent config level.
 * - `'disable'`: Disabled — no gaps reported.
 * - `undefined`: Not set — fall through to parent config level.
 *
 * @req FR:req-traceability/scan.traceability-mode.frontmatter.input
 * @req FR:req-traceability/scan.traceability-mode.config.input
 */
export type TraceabilityModeValue = 'error' | 'warning' | 'inherit' | 'disable';

const VALID_MODE_VALUES = new Set<string>(['error', 'warning', 'inherit', 'disable']);

/**
 * Parse a raw traceability mode value.
 * Returns the value if valid, undefined otherwise.
 */
export function parseTraceabilityModeValue(value: unknown): TraceabilityModeValue | undefined {
  return typeof value === 'string' && VALID_MODE_VALUES.has(value)
    ? (value as TraceabilityModeValue)
    : undefined;
}

/**
 * Per-feature traceability mode configuration.
 * Controls which traceability types (code, test) are active for a feature.
 *
 * @req FR:req-traceability/scan.traceability-mode.frontmatter.output
 * @req FR:req-traceability/scan.traceability-mode.config.output
 */
export interface TraceabilityMode {
  /**
   * Code traceability mode for this feature.
   * - `'error'`: Code coverage gaps are errors (fail tests).
   * - `'warning'`: Code coverage gaps are warnings (don't fail).
   * - `'inherit'`: Enabled — inherit severity from parent config level.
   * - `'disable'`: Disabled — code coverage gaps excluded from report.
   * - `undefined`: Not set — fall through to parent config level.
   */
  code?: TraceabilityModeValue;
  /**
   * Test traceability mode for this feature.
   * - `'error'`: Test coverage gaps are errors (fail tests).
   * - `'warning'`: Test coverage gaps are warnings (don't fail).
   * - `'inherit'`: Enabled — inherit severity from parent config level.
   * - `'disable'`: Disabled — test coverage gaps excluded from report.
   * - `undefined`: Not set — fall through to parent config level.
   */
  test?: TraceabilityModeValue;
}

/**
 * Project-level traceability mode configuration from catalyst.json.
 * @req FR:req-traceability/scan.traceability-mode.config
 * @req FR:req-traceability/scan.traceability-mode.config.input
 */
export interface TraceabilityModeConfig {
  /** Project-wide defaults for traceability modes */
  default?: TraceabilityMode;
  /** Per-feature overrides keyed by feature ID (supports * wildcards) */
  features?: Record<string, TraceabilityMode>;
}

/**
 * Severity level for coverage gaps.
 * @req FR:req-traceability/scan.traceability-mode.required
 * @req FR:req-traceability/scan.traceability-mode.disabled
 */
export type GapSeverity = 'warning' | 'error';
