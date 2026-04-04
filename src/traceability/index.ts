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
 * // Analyze coverage
 * const analyzer = new CoverageAnalyzer();
 * const report = analyzer.analyze(requirements, annotations);
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
  FileLevelAnnotation,
  TestCoverageGap,
  CoverageSummary,
  ReportMetadata,
  TraceabilityReport,
  SpecDependency,
  FeatureDependencies,
  DependencyValidation,
  DependencyReport,
} from './types/index.js';

// Parsers
export { SpecParser } from './parsers/spec-parser.js';
export { AnnotationScanner } from './parsers/annotation-scanner.js';
export { DependencyScanner } from './parsers/dependency-scanner.js';
export {
  parseRequirementId,
  parseShortFormId,
  parseQualifiedId,
  buildQualifiedId,
  isValidRequirementId,
} from './parsers/id-parser.js';

// Analysis
export { CoverageAnalyzer } from './analysis/coverage-analyzer.js';
export { DependencyAnalyzer } from './analysis/dependency-analyzer.js';

// Reports
export { generateJsonReport } from './reports/json-reporter.js';
export {
  generateTerminalReport,
  formatFeatureSummaryLine,
  formatFeatureDetail,
  formatFeatureSummary,
  renderProgressBar,
  renderSegmentedBar,
  stripFeaturePrefix,
  truncateList,
} from './reports/terminal-reporter.js';
export type { TerminalReportOptions } from './reports/terminal-reporter.js';
export {
  generateDependencyTextReport,
  generateDependencyJsonReport,
  generateDependencyMermaidReport,
} from './reports/dependency-reporter.js';
export type { DependencyReportOptions } from './reports/dependency-reporter.js';

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
export { runTraceabilityAnalysis, runDependencyAnalysis } from './runner.js';
export type {
  TraceabilityRunOptions,
  TraceabilityRunResult,
  DependencyRunOptions,
} from './runner.js';
