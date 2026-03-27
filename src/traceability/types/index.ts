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
  FileLevelAnnotation,
  TestCoverageGap,
  CodeCoverageGap,
  TaskReference,
  PriorityCounts,
  CoverageSummary,
  ReportMetadata,
  TraceabilityReport,
} from './report.js';

export type {
  TraceabilityModeValue,
  TraceabilityMode,
  TraceabilityModeConfig,
  GapSeverity,
} from './traceability-mode.js';

export { parseTraceabilityModeValue } from './traceability-mode.js';
