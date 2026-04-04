/**
 * Types for cross-feature dependency tracking.
 * @req FR:req-traceability/deps.scan
 * @req FR:req-traceability/deps.frontmatter-validation
 */

/**
 * A single FR-level dependency link parsed from a spec blockquote.
 * @req FR:req-traceability/deps.scan
 */
export interface SpecDependency {
  /** Feature containing the @req link */
  sourceFeature: string;
  /** Parent FR under which the link appears */
  sourceFR: string;
  /** Referenced feature */
  targetFeature: string;
  /** Referenced FR path */
  targetFR: string;
  /** File where the link was found */
  specFile: string;
  /** Line number (1-indexed) */
  specLine: number;
}

/**
 * Dependency data for a single feature.
 * @req FR:req-traceability/deps.scan
 */
export interface FeatureDependencies {
  /** Feature ID (directory name) */
  featureId: string;
  /** Outgoing FR-level dependency links */
  dependencies: SpecDependency[];
  /** Feature IDs from YAML frontmatter `dependencies:` */
  frontmatterDeps: string[];
}

/**
 * Validation warning from frontmatter cross-referencing.
 * @req FR:req-traceability/deps.frontmatter-validation
 */
export interface DependencyValidation {
  /** Feature that has the inconsistency */
  featureId: string;
  /** Type of inconsistency */
  type: 'missing-frontmatter' | 'unused-frontmatter';
  /** Human-readable warning message */
  message: string;
  /** Which feature/FR triggered the warning */
  detail: string;
}

/**
 * Complete dependency analysis result.
 * @req FR:req-traceability/deps.output
 */
export interface DependencyReport {
  /** Per-feature dependency data */
  features: FeatureDependencies[];
  /** Frontmatter validation warnings */
  validations: DependencyValidation[];
  /** Feature → features it depends on */
  graph: Map<string, string[]>;
  /** Feature → features that depend on it */
  reverseGraph: Map<string, string[]>;
}
