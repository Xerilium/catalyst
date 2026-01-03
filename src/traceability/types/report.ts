/**
 * Types for traceability reports and coverage analysis.
 */

import type { RequirementId, RequirementState, RequirementPriority } from './requirement.js';

/**
 * Implementation status derived from annotations.
 * @req FR:req-traceability/report.output
 * @req FR:req-traceability/report.content
 * @req FR:req-traceability/analysis.coverage
 * @req FR:req-traceability/analysis.coverage.leaf-only
 * @req FR:req-traceability/priority.reporting
 */
export type CoverageStatus =
  | 'missing' // Active requirement with no code annotation
  | 'implemented' // Has code annotation(s)
  | 'implemented-partial' // Has only partial implementation annotation(s)
  | 'tested' // Has test annotation(s)
  | 'deferred' // Spec state is deferred
  | 'deprecated' // Spec state is deprecated
  | 'exempt' // Spec state is exempt (human convention, excluded from coverage metrics)
  | 'parent'; // Parent requirement (has children, excluded from coverage metrics)

/**
 * Coverage data for a single requirement.
 * @req FR:req-traceability/report.content.spec-text
 * @req FR:req-traceability/priority.reporting
 */
export interface RequirementCoverage {
  /** Spec location and text */
  spec: {
    file: string;
    line: number;
    text: string;
  };
  /** Current lifecycle state */
  state: RequirementState;
  /** Priority classification (P1-P5) */
  priority: RequirementPriority;
  /** Code implementation locations */
  implementations: Array<{
    file: string;
    line: number;
    partial: boolean;
  }>;
  /** Test locations */
  tests: Array<{
    file: string;
    line: number;
  }>;
  /** Derived coverage status */
  coverageStatus: CoverageStatus;
}

/**
 * Orphaned annotation (references non-existent requirement).
 * @req FR:req-traceability/analysis.orphan
 */
export interface OrphanedAnnotation {
  /** The invalid requirement ID string */
  id: string;
  /** File locations where this ID was found */
  locations: string[];
}

/**
 * Task with requirement references from tasks.md.
 * @req FR:req-traceability/scan.tasks
 */
export interface TaskReference {
  /** Task ID (e.g., 'T003') */
  taskId: string;
  /** Path to tasks.md file */
  file: string;
  /** Line number (1-indexed) */
  line: number;
  /** Task description */
  description: string;
  /** Referenced requirements (fully qualified) */
  requirements: RequirementId[];
}

/**
 * Priority counts for coverage breakdown.
 * @req FR:req-traceability/priority.reporting
 */
export interface PriorityCounts {
  P1: number;
  P2: number;
  P3: number;
  P4: number;
  P5: number;
}

/**
 * Summary statistics for coverage report.
 * @req FR:req-traceability/report.content.metrics
 * @req FR:req-traceability/priority.reporting
 */
export interface CoverageSummary {
  /** Total requirements defined */
  total: number;
  /** Active requirements (not deferred/deprecated) */
  active: number;
  /** Requirements with code annotations (source files) */
  implemented: number;
  /** Requirements with test annotations (test files) */
  tested: number;
  /** Requirements with any annotation (code OR test) - union of implemented and tested */
  covered: number;
  /** Requirements with no annotations (gaps) */
  uncovered: number;
  /** Deferred requirements */
  deferred: number;
  /** Deprecated requirements */
  deprecated: number;
  /** Exempt requirements (human conventions excluded from coverage) */
  exempt: number;
  /** Implementation coverage percentage (of active) */
  implementationCoverage: number;
  /** Test coverage percentage (of active) */
  testCoverage: number;
  /** Overall coverage percentage (of active) - any annotation */
  overallCoverage: number;
  /** Task coverage percentage (of active) */
  taskCoverage: number;
  /** Number of tasks without @req references */
  tasksWithoutRequirements: number;
  /** Count of requirements by priority level */
  byPriority: PriorityCounts;
  /** Coverage percentage by priority level (based on overall coverage) */
  coverageByPriority: PriorityCounts;
  /**
   * Coverage score: % of requirements within threshold that are covered.
   * @req FR:req-traceability/report.content.scores.coverage
   */
  coverageScore: number;
  /**
   * Completeness score: weighted coverage across all priorities.
   * Requirements beyond threshold count at half weight.
   * @req FR:req-traceability/report.content.scores.completeness
   */
  completenessScore: number;
  /**
   * Priority threshold used for score calculations (e.g., 'P3').
   */
  priorityThreshold: RequirementPriority;
}

/**
 * Report metadata.
 */
export interface ReportMetadata {
  /** ISO timestamp of scan */
  scanTime: string;
  /** Number of files scanned */
  filesScanned: number;
  /** Scan duration in milliseconds */
  scanDurationMs: number;
}

/**
 * Complete traceability report.
 * @req FR:req-traceability/report.output.json
 */
export interface TraceabilityReport {
  /** Scan metadata */
  metadata: ReportMetadata;
  /** Per-requirement coverage data */
  requirements: Map<string, RequirementCoverage>;
  /** Orphaned annotations */
  orphaned: OrphanedAnnotation[];
  /** Task references */
  tasks: Map<string, TaskReference>;
  /** Summary statistics */
  summary: CoverageSummary;
}
