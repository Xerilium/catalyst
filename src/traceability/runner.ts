/**
 * Traceability runner - High-level API for running traceability analysis.
 *
 * @req FR:req-traceability/scan.code
 * @req FR:req-traceability/scan.tests
 * @req FR:req-traceability/scan.features
 * @req FR:req-traceability/scan.tasks
 * @req FR:req-traceability/scan.feature-filter
 * @req FR:req-traceability/severity.filtering
 * @req FR:req-traceability/analysis.coverage
 * @req FR:req-traceability/report.output
 */

import * as fs from 'fs';
import type { RequirementSeverity, TraceabilityReport } from './types/index.js';
import { SpecParser } from './parsers/spec-parser.js';
import { AnnotationScanner } from './parsers/annotation-scanner.js';
import { TaskParser } from './parsers/task-parser.js';
import { CoverageAnalyzer } from './analysis/coverage-analyzer.js';

/**
 * Options for running traceability analysis.
 */
export interface TraceabilityRunOptions {
  /**
   * Filter analysis to a single feature by its ID.
   * @example 'ai-provider-claude'
   */
  featureFilter?: string;

  /**
   * Minimum severity level to include in coverage calculations.
   * Requirements below this severity are excluded from metrics.
   * @default 'S3'
   */
  minSeverity?: RequirementSeverity;

  /**
   * Root directory for .xe features/initiatives.
   * @default '.xe'
   */
  xeRoot?: string;

  /**
   * Source directories to scan for @req annotations.
   * @default ['src/']
   */
  sourceDirs?: string[];

  /**
   * Glob patterns to exclude from annotation scanning.
   * @default ['** /node_modules/**', '** /*.d.ts', '** /*.js']
   */
  excludePatterns?: string[];

  /**
   * Directories considered as test directories.
   * @default ['tests/']
   */
  testDirs?: string[];

  /**
   * Whether to respect .gitignore when scanning.
   * @default true
   */
  respectGitignore?: boolean;
}

/**
 * Result of running traceability analysis.
 */
export interface TraceabilityRunResult {
  /**
   * The full traceability report.
   */
  report: TraceabilityReport;

  /**
   * Whether coverage thresholds are met (if applicable).
   */
  thresholdsMet: boolean;

  /**
   * Summary message suitable for logging.
   */
  summaryMessage: string;
}

const SEVERITY_ORDER: RequirementSeverity[] = ['S1', 'S2', 'S3', 'S4', 'S5'];

/**
 * Check if a severity meets the minimum threshold.
 * @req FR:req-traceability/severity.filtering
 */
function meetsSeverityThreshold(
  severity: RequirementSeverity,
  minSeverity: RequirementSeverity
): boolean {
  return SEVERITY_ORDER.indexOf(severity) <= SEVERITY_ORDER.indexOf(minSeverity);
}

/**
 * Run traceability analysis with the given options.
 *
 * This is the primary high-level API for running traceability analysis.
 * It handles:
 * - Parsing spec files from features/initiatives
 * - Scanning source code for @req annotations
 * - Parsing tasks.md files for requirement references
 * - Analyzing coverage and generating a report
 *
 * @param options - Configuration options for the analysis
 * @returns The traceability report and metadata
 *
 * @example
 * ```typescript
 * // Run analysis for all features
 * const result = await runTraceabilityAnalysis();
 * console.log(result.report.summary);
 *
 * // Run analysis for a single feature
 * const result = await runTraceabilityAnalysis({
 *   featureFilter: 'ai-provider-claude',
 * });
 *
 * // Run with custom severity threshold
 * const result = await runTraceabilityAnalysis({
 *   minSeverity: 'S2',
 * });
 * ```
 *
 * @req FR:req-traceability/scan.code
 * @req FR:req-traceability/scan.tests
 * @req FR:req-traceability/scan.features
 * @req FR:req-traceability/scan.tasks
 * @req FR:req-traceability/scan.feature-filter
 * @req FR:req-traceability/severity.filtering
 */
export async function runTraceabilityAnalysis(
  options: TraceabilityRunOptions = {}
): Promise<TraceabilityRunResult> {
  const {
    featureFilter,
    minSeverity,
    xeRoot = '.xe',
    sourceDirs = ['src/'],
    excludePatterns = ['**/node_modules/**', '**/*.d.ts', '**/*.js'],
    testDirs = ['tests/'],
    respectGitignore = true,
  } = options;

  // Determine feature directory
  const featuresDir = `${xeRoot}/features/`;
  const featureDir = featureFilter
    ? `${featuresDir}${featureFilter}/`
    : featuresDir;

  // Validate feature directory exists if filtering
  if (featureFilter) {
    if (!fs.existsSync(featureDir)) {
      const availableFeatures = fs.existsSync(featuresDir)
        ? fs.readdirSync(featuresDir).filter((f: string) => {
            return fs.statSync(`${featuresDir}${f}`).isDirectory();
          })
        : [];

      throw new Error(
        `Feature directory not found: ${featureDir}\n` +
          `Available features: ${availableFeatures.join(', ') || '(none)'}`
      );
    }
  }

  // Parse specs from features (and initiatives if not filtering)
  const specParser = new SpecParser();
  let requirements;

  if (featureFilter) {
    // For single feature, parse spec.md directly
    requirements = await specParser.parseFile(`${featureDir}spec.md`);
  } else {
    // For all features, scan directories
    requirements = await specParser.parseDirectory(featuresDir);

    // Also check initiatives if they exist
    const initiativesDir = `${xeRoot}/initiatives/`;
    try {
      if (fs.existsSync(initiativesDir)) {
        const initiativeReqs = await specParser.parseDirectory(initiativesDir);
        requirements.push(...initiativeReqs);
      }
    } catch {
      // No initiatives directory or parse error, that's fine
    }
  }

  // Filter requirements by severity if specified
  // @req FR:req-traceability/severity.filtering
  if (minSeverity) {
    requirements = requirements.filter((r) =>
      meetsSeverityThreshold(r.severity, minSeverity)
    );
  }

  // Scan source code for @req annotations
  const scanner = new AnnotationScanner();
  let annotations = await scanner.scanDirectory(sourceDirs[0], {
    exclude: excludePatterns,
    testDirs,
    respectGitignore,
  });

  // Scan additional source directories if specified
  for (let i = 1; i < sourceDirs.length; i++) {
    const additionalAnnotations = await scanner.scanDirectory(sourceDirs[i], {
      exclude: excludePatterns,
      testDirs,
      respectGitignore,
    });
    annotations.push(...additionalAnnotations);
  }

  // Scan test directories for @req annotations
  // @req FR:req-traceability/scan.tests
  for (const testDir of testDirs) {
    const testAnnotations = await scanner.scanDirectory(testDir, {
      exclude: excludePatterns,
      testDirs,
      respectGitignore,
    });
    annotations.push(...testAnnotations);
  }

  // Filter annotations to only those referencing the filtered feature
  if (featureFilter) {
    annotations = annotations.filter((a) => a.id.scope === featureFilter);
  }

  // Parse tasks for @req references
  const taskParser = new TaskParser();
  let tasks;

  if (featureFilter) {
    // For single feature, parse tasks.md directly
    tasks = await taskParser.parseFile(`${featureDir}tasks.md`);
  } else {
    // For all features, scan directories
    tasks = await taskParser.parseDirectory(featuresDir);
  }

  // Analyze coverage
  const analyzer = new CoverageAnalyzer();
  const report = analyzer.analyze(requirements, annotations, tasks);

  // Check thresholds (only when not filtering to a single feature)
  const thresholdsMet =
    !!featureFilter ||
    requirements.length === 0 ||
    report.summary.implementationCoverage >= 50;

  // Build summary message
  const summaryMessage = buildSummaryMessage(report, featureFilter);

  return {
    report,
    thresholdsMet,
    summaryMessage,
  };
}

/**
 * Build a human-readable summary message.
 */
function buildSummaryMessage(
  report: TraceabilityReport,
  featureFilter?: string
): string {
  const { summary } = report;
  const lines: string[] = [];

  if (featureFilter) {
    lines.push(`Traceability: ${featureFilter}`);
  } else {
    lines.push('Traceability Summary');
  }

  lines.push(
    `  Requirements: ${summary.total} total, ${summary.active} active`
  );
  lines.push(`  Implementation: ${summary.implementationCoverage}%`);
  lines.push(`  Test coverage: ${summary.testCoverage}%`);

  if (summary.uncovered > 0) {
    lines.push(`  Uncovered: ${summary.uncovered} requirements`);
  }

  if (report.orphaned.length > 0) {
    lines.push(`  Orphaned annotations: ${report.orphaned.length}`);
  }

  return lines.join('\n');
}
