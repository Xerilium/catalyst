/**
 * @req FR:req-traceability/report.output
 * @req FR:req-traceability/report.content
 * @req FR:req-traceability/analysis.coverage
 *
 * Types for traceability reports and coverage analysis.
 */

import type { RequirementId, RequirementState } from './requirement.js';

/**
 * Implementation status derived from annotations.
 * @req FR:req-traceability/analysis.coverage
 */
export type CoverageStatus =
  | 'missing' // Active requirement with no code annotation
  | 'implemented' // Has code annotation(s)
  | 'implemented-partial' // Has only partial implementation annotation(s)
  | 'tested' // Has test annotation(s)
  | 'deferred' // Spec state is deferred
  | 'deprecated'; // Spec state is deprecated

/**
 * Coverage data for a single requirement.
 * @req FR:req-traceability/report.content.spec-text
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
 * Summary statistics for coverage report.
 * @req FR:req-traceability/report.content.metrics
 */
export interface CoverageSummary {
  /** Total requirements defined */
  total: number;
  /** Active requirements (not deferred/deprecated) */
  active: number;
  /** Requirements with code annotations */
  implemented: number;
  /** Requirements with test annotations */
  tested: number;
  /** Requirements with no annotations */
  missing: number;
  /** Deferred requirements */
  deferred: number;
  /** Deprecated requirements */
  deprecated: number;
  /** Implementation coverage percentage (of active) */
  implementationCoverage: number;
  /** Test coverage percentage (of active) */
  testCoverage: number;
  /** Task coverage percentage (of active) */
  taskCoverage: number;
  /** Number of tasks without @req references */
  tasksWithoutRequirements: number;
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
