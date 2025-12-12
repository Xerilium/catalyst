/**
 * @req FR:req-traceability/id.format
 * @req FR:req-traceability/state.values
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
 */
export interface RequirementDefinition {
  /** Parsed requirement identifier */
  id: RequirementId;
  /** Current lifecycle state */
  state: RequirementState;
  /** Full requirement text from spec */
  text: string;
  /** Path to spec file */
  specFile: string;
  /** Line number in spec file */
  specLine: number;
  /** Replacement ID if deprecated */
  deprecatedTarget?: string;
}
