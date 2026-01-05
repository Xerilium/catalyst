/**
 * Types for requirement identifiers and definitions.
 */

/**
 * Type prefix for requirements.
 * - FR: Functional Requirement
 * - NFR: Non-Functional Requirement
 * - REQ: General Requirement
 * @req FR:req-traceability/id.format
 * @req FR:req-traceability/state.values
 * @req FR:req-traceability/priority.levels
 */
export type RequirementType = 'FR' | 'NFR' | 'REQ';

/**
 * Priority classification for requirements.
 * @req FR:req-traceability/priority.levels
 *
 * - P1 (Critical): Core functionality, security, data integrity - MUST have code + tests
 * - P2 (Important): Key features, error handling, integration points - MUST have code
 * - P3 (Standard): Regular functionality, validation, formatting - SHOULD have code (default)
 * - P4 (Minor): Convenience features, optimizations, edge cases - MAY have code
 * - P5 (Informational): Documentation, process, non-code deliverables - No code tracing expected
 */
export type RequirementPriority = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

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
export type RequirementState = 'active' | 'deferred' | 'deprecated' | 'exempt';

/**
 * Requirement extracted from a spec file.
 * @req FR:req-traceability/scan.features
 * @req FR:req-traceability/scan.initiatives
 * @req FR:req-traceability/priority.levels
 */
export interface RequirementDefinition {
  /** Parsed requirement identifier */
  id: RequirementId;
  /** Current lifecycle state */
  state: RequirementState;
  /** Priority classification (P1-P5, defaults to P3) */
  priority: RequirementPriority;
  /** Full requirement text from spec */
  text: string;
  /** Path to spec file */
  specFile: string;
  /** Line number in spec file */
  specLine: number;
  /** Replacement ID if deprecated */
  deprecatedTarget?: string;
  /** Reason for exemption if state is 'exempt' */
  exemptReason?: string;
}
