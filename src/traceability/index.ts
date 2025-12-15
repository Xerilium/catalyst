/**
 * Requirement Traceability - Public API
 *
 * This module provides bidirectional linking between requirements defined
 * in spec files and their implementations in code/tests.
 *
 * @example
 * ```typescript
 * import {
 *   SpecParser,
 *   AnnotationScanner,
 *   TaskParser,
 *   CoverageAnalyzer,
 *   generateJsonReport,
 *   generateTerminalReport,
 * } from '@catalyst/traceability';
 *
 * // Parse all specs
 * const specParser = new SpecParser();
 * const requirements = await specParser.parseDirectory('.xe/features/');
 *
 * // Scan source code
 * const scanner = new AnnotationScanner();
 * const annotations = await scanner.scanDirectory('src/', {
 *   exclude: ['** /node_modules/**'],
 *   testDirs: ['tests/'],
 *   respectGitignore: true,
 * });
 *
 * // Parse tasks (optional)
 * const taskParser = new TaskParser();
 * const tasks = await taskParser.parseDirectory('.xe/features/');
 *
 * // Analyze coverage
 * const analyzer = new CoverageAnalyzer();
 * const report = analyzer.analyze(requirements, annotations, tasks);
 *
 * // Output
 * console.log(generateTerminalReport(report));
 * ```
 */

// Types
export type {
  RequirementType,
  RequirementId,
  RequirementState,
  RequirementDefinition,
  AnnotationLocation,
  RequirementAnnotation,
  ScanOptions,
  CoverageStatus,
  RequirementCoverage,
  OrphanedAnnotation,
  TaskReference,
  CoverageSummary,
  ReportMetadata,
  TraceabilityReport,
} from './types/index.js';

// Parsers
export { SpecParser } from './parsers/spec-parser.js';
export { AnnotationScanner } from './parsers/annotation-scanner.js';
export { TaskParser } from './parsers/task-parser.js';
export {
  parseRequirementId,
  parseShortFormId,
  parseQualifiedId,
  buildQualifiedId,
  isValidRequirementId,
} from './parsers/id-parser.js';

// Analysis
export { CoverageAnalyzer } from './analysis/coverage-analyzer.js';

// Reports
export { generateJsonReport } from './reports/json-reporter.js';
export { generateTerminalReport } from './reports/terminal-reporter.js';

// Config
export {
  loadConfig,
  getDefaultScanOptions,
  checkThresholds,
} from './config/traceability-config.js';
export type {
  TraceabilityConfig,
  ThresholdConfig,
} from './config/traceability-config.js';

// Runner (high-level API)
export { runTraceabilityAnalysis } from './runner.js';
export type {
  TraceabilityRunOptions,
  TraceabilityRunResult,
} from './runner.js';
