/**
 * @req FR:req-traceability/id.format
 * @req FR:req-traceability/state.values
 * @req FR:req-traceability/severity.levels
 *
 * Types for requirement identifiers and definitions.
 */

/**
 * Type prefix for requirements.
 * - FR: Functional Requirement
 * - NFR: Non-Functional Requirement
 * - REQ: General Requirement
 */
export type RequirementType = 'FR' | 'NFR' | 'REQ';

/**
 * Severity classification for requirements.
 * @req FR:req-traceability/severity.levels
 *
 * - S1 (Critical): Core functionality, security, data integrity - MUST have code + tests
 * - S2 (Important): Key features, error handling, integration points - MUST have code
 * - S3 (Standard): Regular functionality, validation, formatting - SHOULD have code (default)
 * - S4 (Minor): Convenience features, optimizations, edge cases - MAY have code
 * - S5 (Informational): Documentation, process, non-code deliverables - No code tracing expected
 */
export type RequirementSeverity = 'S1' | 'S2' | 'S3' | 'S4' | 'S5';

/**
 * Parsed requirement identifier.
 * @req FR:req-traceability/id.format
 */
export interface RequirementId {
  /** Requirement type (FR, NFR, REQ) */
  type: RequirementType;
  /** Feature/initiative scope (empty for short-form) */
  scope: string;
  /** Dot-separated hierarchical path (up to 5 levels) */
  path: string;
  /** Full qualified form: {TYPE}:{scope}/{path} */
  qualified: string;
  /** Short form: {TYPE}:{path} */
  short: string;
}

/**
 * Lifecycle state of a requirement.
 * @req FR:req-traceability/state.values
 */
export type RequirementState = 'active' | 'deferred' | 'deprecated';

/**
 * Requirement extracted from a spec file.
 * @req FR:req-traceability/scan.features
 * @req FR:req-traceability/scan.initiatives
 * @req FR:req-traceability/severity.levels
 */
export interface RequirementDefinition {
  /** Parsed requirement identifier */
  id: RequirementId;
  /** Current lifecycle state */
  state: RequirementState;
  /** Severity classification (S1-S5, defaults to S3) */
  severity: RequirementSeverity;
  /** Full requirement text from spec */
  text: string;
  /** Path to spec file */
  specFile: string;
  /** Line number in spec file */
  specLine: number;
  /** Replacement ID if deprecated */
  deprecatedTarget?: string;
}
