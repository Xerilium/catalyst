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
   * - `true`: Required (opted-in). Code coverage gaps become errors.
   * - `false`: Disabled (opted-out). Code coverage gaps excluded from report.
   * - `undefined`: Default behavior. Code coverage gaps are warnings.
   */
  code?: boolean;
  /**
   * Test traceability mode for this feature.
   * - `true`: Required (opted-in). Test coverage gaps become errors.
   * - `false`: Disabled (opted-out). Test coverage gaps excluded from report.
   * - `undefined`: Default behavior. Test coverage gaps are warnings.
   */
  test?: boolean;
}

/**
 * Project-level traceability mode configuration from catalyst.json.
 * @req FR:req-traceability/scan.traceability-mode.config
 * @req FR:req-traceability/scan.traceability-mode.config.input
 */
export interface TraceabilityModeConfig {
  /** Project-wide defaults for traceability modes */
  default?: TraceabilityMode;
  /** Per-feature overrides keyed by feature ID */
  features?: Record<string, TraceabilityMode>;
}

/**
 * Severity level for coverage gaps.
 * @req FR:req-traceability/scan.traceability-mode.required
 * @req FR:req-traceability/scan.traceability-mode.disabled
 */
export type GapSeverity = 'warning' | 'error';
