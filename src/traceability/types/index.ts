/**
 * Barrel export for all traceability types.
 */

export type {
  RequirementType,
  RequirementId,
  RequirementState,
  RequirementPriority,
  RequirementDefinition,
} from './requirement.js';

export type {
  AnnotationLocation,
  RequirementAnnotation,
  ScanOptions,
} from './annotation.js';

export type {
  CoverageStatus,
  RequirementCoverage,
  OrphanedAnnotation,
  TaskReference,
  PriorityCounts,
  CoverageSummary,
  ReportMetadata,
  TraceabilityReport,
} from './report.js';
