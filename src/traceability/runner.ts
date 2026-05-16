/**
 * Traceability runner - High-level API for running traceability analysis.
 */

import * as fs from 'fs';
import type { RequirementAnnotation, RequirementDefinition, RequirementPriority, TraceabilityMode, TraceabilityReport } from './types/index.js';
import type { DependencyReport } from './types/dependency.js';
import { SpecParser } from './parsers/spec-parser.js';
import { AnnotationScanner } from './parsers/annotation-scanner.js';
import { expandPathPatterns } from './parsers/path-expander.js';
import { CoverageAnalyzer } from './analysis/coverage-analyzer.js';
import { DependencyScanner } from './parsers/dependency-scanner.js';
import { DependencyAnalyzer } from './analysis/dependency-analyzer.js';
import { loadConfig, resolveTraceabilityMode } from './config/traceability-config.js';

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
   * Minimum priority level to include in coverage calculations.
   * Requirements below this priority are excluded from metrics.
   * @default 'P3'
   */
  minPriority?: RequirementPriority;

  /**
   * Root directory for .xe features/initiatives.
   * @default '.xe'
   */
  xeRoot?: string;

  /**
   * Directory prefixes or glob patterns for source (non-test) files.
   * @default ['src/']
   */
  codePaths?: string[];

  /**
   * Glob patterns to exclude from annotation scanning.
   * @default ['** /node_modules/**', '** /*.d.ts', '** /*.js']
   */
  excludePatterns?: string[];

  /**
   * Directory prefixes or glob patterns identifying test files.
   * @default ['tests/', '**\/*.test.*', '**\/*.spec.*']
   */
  testPaths?: string[];

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

  /**
   * Present when the requested featureFilter directory does not exist.
   * Contains the list of available feature IDs and any rename candidates.
   * @req FR:req-traceability/analysis.orphan
   */
  missingFeature?: {
    availableFeatures: string[];
    renameCandidates: string[];
  };
}

const PRIORITY_ORDER: RequirementPriority[] = ['P1', 'P2', 'P3', 'P4', 'P5'];

/**
 * Check if a priority meets the minimum threshold.
 * @req FR:req-traceability/priority.filtering
 */
function meetsPriorityThreshold(
  priority: RequirementPriority,
  minPriority: RequirementPriority
): boolean {
  return PRIORITY_ORDER.indexOf(priority) <= PRIORITY_ORDER.indexOf(minPriority);
}

/**
 * Run traceability analysis with the given options.
 *
 * This is the primary high-level API for running traceability analysis.
 * It handles:
 * - Parsing spec files from features/initiatives
 * - Scanning source code for @req annotations
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
 * // Run with custom priority threshold
 * const result = await runTraceabilityAnalysis({
 *   minPriority: 'S2',
 * });
 * ```
 *
 * @req FR:req-traceability/scan.code
 * @req FR:req-traceability/scan.tests
 * @req FR:req-traceability/scan.features
 * @req FR:req-traceability/scan.feature-filter
 * @req FR:req-traceability/priority.filtering
 * @req FR:req-traceability/analysis.coverage
 * @req FR:req-traceability/report.output
 */
export async function runTraceabilityAnalysis(
  options: TraceabilityRunOptions = {}
): Promise<TraceabilityRunResult> {
  // Load project config and merge with defaults
  const projectConfig = await loadConfig(process.cwd());

  const {
    featureFilter,
    minPriority,
    xeRoot = '.xe',
    codePaths = projectConfig.scan.codePaths,
    excludePatterns = projectConfig.scan.exclude,
    testPaths = projectConfig.scan.testPaths,
    respectGitignore = projectConfig.scan.respectGitignore,
  } = options;

  // Determine feature directory
  const featuresDir = `${xeRoot}/features/`;
  const featureDir = featureFilter
    ? `${featuresDir}${featureFilter}/`
    : featuresDir;

  // When filtering to a specific feature, check if its directory exists.
  // If missing, proceed with an empty requirement set so that any @req annotations
  // referencing the feature surface as orphans rather than hiding behind a hard error.
  // @req FR:req-traceability/analysis.orphan
  // @req FR:req-traceability/analysis.orphan.missing-feature
  let featureMissingInfo: { availableFeatures: string[] } | undefined;
  if (featureFilter && !fs.existsSync(featureDir)) {
    const availableFeatures = fs.existsSync(featuresDir)
      ? fs.readdirSync(featuresDir)
          .filter((f: string) => fs.statSync(`${featuresDir}${f}`).isDirectory())
          .sort()
      : [];
    featureMissingInfo = { availableFeatures };
  }

  // Track scan timing
  const scanStart = Date.now();

  // Parse specs from features (and initiatives if not filtering)
  const specParser = new SpecParser();
  let requirements: RequirementDefinition[];

  if (featureFilter) {
    // For single feature, parse spec.md directly (if dir exists)
    requirements = featureMissingInfo
      ? []
      : await specParser.parseFile(`${featureDir}spec.md`);
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

  // Filter requirements by priority if specified
  // @req FR:req-traceability/priority.filtering
  if (minPriority) {
    requirements = requirements.filter((r) =>
      meetsPriorityThreshold(r.priority, minPriority)
    );
  }

  const scanOpts = { exclude: excludePatterns, codePaths, testPaths, respectGitignore };

  // Scan source code for @req annotations
  // @req FR:req-traceability/scan.code
  const scanner = new AnnotationScanner();
  let annotations: RequirementAnnotation[] = [];
  const resolvedCodePaths = await expandPathPatterns(codePaths);
  for (const dir of resolvedCodePaths) {
    const moreAnnotations = await scanner.scanDirectory(dir, scanOpts);
    annotations.push(...moreAnnotations);
  }

  // Scan test directories for @req annotations
  // @req FR:req-traceability/scan.tests
  const resolvedTestPaths = await expandPathPatterns(testPaths);
  for (const dir of resolvedTestPaths) {
    const testAnnotations = await scanner.scanDirectory(dir, scanOpts);
    annotations.push(...testAnnotations);
  }

  // Filter annotations to only those referencing the filtered feature
  if (featureFilter) {
    annotations = annotations.filter((a) => a.id.scope === featureFilter);
  }

  // Resolve per-feature traceability modes
  // @req FR:req-traceability/scan.traceability-mode.precedence
  const featureTraceabilityModes = await resolveFeatureTraceabilityModes(
    specParser,
    featuresDir,
    featureFilter,
    projectConfig.traceabilityModes
  );

  // Analyze coverage
  const analyzer = new CoverageAnalyzer();
  const report = analyzer.analyze(requirements, annotations, featureTraceabilityModes);

  // Populate scan metadata (CoverageAnalyzer leaves these as 0)
  const uniqueFiles = new Set(annotations.map((a) => a.file));
  report.metadata.filesScanned = uniqueFiles.size;
  report.metadata.scanDurationMs = Date.now() - scanStart;

  // Check thresholds (only when not filtering to a single feature)
  const thresholdsMet =
    !!featureFilter ||
    requirements.length === 0 ||
    report.summary.implementationCoverage >= 50;

  // When the feature dir was missing, search existing features for FR path matches
  // to suggest a rename candidate.
  // @req FR:req-traceability/analysis.orphan
  let renameCandidates: string[] | undefined;
  if (featureMissingInfo && featureFilter) {
    renameCandidates = await findRenameCandidates(
      featureFilter,
      report.orphaned.map((o) => o.id),
      featuresDir,
      featureMissingInfo.availableFeatures
    );
  }

  // Build summary message
  const summaryMessage = buildSummaryMessage(
    report,
    featureFilter,
    featureMissingInfo,
    renameCandidates
  );

  return {
    report,
    thresholdsMet,
    summaryMessage,
    ...(featureMissingInfo && {
      missingFeature: {
        availableFeatures: featureMissingInfo.availableFeatures,
        renameCandidates: renameCandidates ?? [],
      },
    }),
  };
}

/**
 * Resolve traceability modes for all features in scope.
 * Combines frontmatter settings with config file settings using precedence chain.
 * @req FR:req-traceability/scan.traceability-mode.precedence
 */
async function resolveFeatureTraceabilityModes(
  specParser: SpecParser,
  featuresDir: string,
  featureFilter: string | undefined,
  configModes: import('./types/index.js').TraceabilityModeConfig | undefined
): Promise<Map<string, TraceabilityMode> | undefined> {
  // Parse frontmatter from spec files
  let frontmatterMap;
  if (featureFilter) {
    const metadata = await specParser.parseFeatureMetadata(
      `${featuresDir}${featureFilter}/spec.md`
    );
    frontmatterMap = new Map([[featureFilter, metadata]]);
  } else {
    frontmatterMap = await specParser.parseDirectoryMetadata(featuresDir);
  }

  // If no frontmatter and no config modes, return undefined (default behavior)
  if (frontmatterMap.size === 0 && !configModes) {
    return undefined;
  }

  // Resolve modes per feature
  const resolvedModes = new Map<string, TraceabilityMode>();

  // Process features with frontmatter
  for (const [featureId, metadata] of frontmatterMap) {
    const mode = resolveTraceabilityMode(featureId, metadata, configModes);
    if (mode) {
      resolvedModes.set(featureId, mode);
    }
  }

  // Process features from config that don't have frontmatter
  if (configModes?.features) {
    for (const featureId of Object.keys(configModes.features)) {
      if (!resolvedModes.has(featureId)) {
        const mode = resolveTraceabilityMode(featureId, undefined, configModes);
        if (mode) {
          resolvedModes.set(featureId, mode);
        }
      }
    }
  }

  return resolvedModes.size > 0 ? resolvedModes : undefined;
}

/**
 * Options for running dependency analysis.
 */
export interface DependencyRunOptions {
  /**
   * Root directory for .xe features.
   * @default '.xe'
   */
  xeRoot?: string;
}

/**
 * Run cross-feature dependency analysis.
 *
 * Scans spec files for blockquote @req links, builds a dependency graph,
 * and validates consistency with frontmatter dependencies.
 *
 * Separate from runTraceabilityAnalysis to keep dependency tracking
 * decoupled from coverage analysis.
 *
 * @req FR:req-traceability/deps.scan
 * @req FR:req-traceability/deps.no-coverage
 */
export async function runDependencyAnalysis(
  options: DependencyRunOptions = {}
): Promise<DependencyReport> {
  const { xeRoot = '.xe' } = options;
  const featuresDir = `${xeRoot}/features/`;

  const scanner = new DependencyScanner();
  const analyzer = new DependencyAnalyzer();

  const features = await scanner.scanDirectory(featuresDir);

  // Always analyze all features so the reverse graph is complete.
  // Filtering is done at the report/CLI layer, not here.
  return analyzer.analyze(features);
}

/**
 * Search existing features for likely rename candidates given a missing feature ID.
 *
 * Two signals, ordered by confidence:
 * 1. FR-path match (ranked first): extract dot-path portions from orphaned annotation IDs
 *    (e.g. "init.pwsh") and grep each existing feature's spec.md for that substring.
 *    Catches renames where the feature name changed but the FR paths stayed the same.
 * 2. Token match (ranked second): split the queried feature ID by "-" and find existing
 *    features whose name contains any of those tokens (e.g. "deployment" → "devops-deployment").
 *
 * @req FR:req-traceability/analysis.orphan
 * @req FR:req-traceability/analysis.orphan.rename-hint
 */
async function findRenameCandidates(
  missingFeatureId: string,
  orphanedIds: string[],
  featuresDir: string,
  availableFeatures: string[]
): Promise<string[]> {
  if (availableFeatures.length === 0) {
    return [];
  }

  // Signal 1: FR-path fragment match in spec files — ranked first (strongest signal)
  const frPathMatches = new Set<string>();
  if (orphanedIds.length > 0) {
    const pathFragments = orphanedIds
      .map((id) => {
        const slashIdx = id.indexOf('/');
        return slashIdx !== -1 ? id.slice(slashIdx + 1) : null;
      })
      .filter((p): p is string => p !== null && p.length > 0);

    if (pathFragments.length > 0) {
      const fsPromises = await import('fs/promises');
      for (const featureId of availableFeatures) {
        try {
          const content = await fsPromises.readFile(`${featuresDir}${featureId}/spec.md`, 'utf-8');
          if (pathFragments.some((fragment) => content.includes(fragment))) {
            frPathMatches.add(featureId);
          }
        } catch {
          // Spec unreadable — skip
        }
      }
    }
  }

  // Signal 2: token-based name match — ranked after FR-path matches.
  // Match at token boundaries only (split by "-") to avoid substring false positives
  // like "ai" matching "traceability" inside "cli-engine".
  const tokenMatches = new Set<string>();
  const tokens = missingFeatureId.split('-').filter((t) => t.length > 1);
  for (const featureId of availableFeatures) {
    const featureTokens = new Set(featureId.split('-'));
    if (!frPathMatches.has(featureId) && tokens.some((token) => featureTokens.has(token))) {
      tokenMatches.add(featureId);
    }
  }

  return [...Array.from(frPathMatches).sort(), ...Array.from(tokenMatches).sort()];
}

/**
 * Build a human-readable summary message.
 * When featureMissingInfo is provided, includes a note that the feature was not found
 * along with available features and any rename candidates found via path-fragment search.
 * @req FR:req-traceability/analysis.orphan
 */
function buildSummaryMessage(
  report: TraceabilityReport,
  featureFilter?: string,
  featureMissingInfo?: { availableFeatures: string[] },
  renameCandidates?: string[]
): string {
  const { summary } = report;
  const lines: string[] = [];

  if (featureFilter) {
    lines.push(`Traceability: ${featureFilter}`);
  } else {
    lines.push('Traceability Summary');
  }

  if (featureMissingInfo) {
    lines.push(`  Feature directory not found: "${featureFilter}"`);
    if (featureMissingInfo.availableFeatures.length > 0) {
      lines.push(`  Available features: ${featureMissingInfo.availableFeatures.join(', ')}`);
    }
    if (report.orphaned.length > 0) {
      lines.push(`  ${report.orphaned.length} stale annotation(s) found — feature may have been renamed`);
      if (renameCandidates && renameCandidates.length > 0) {
        lines.push(`  Possible rename target(s): ${renameCandidates.join(', ')}`);
      }
    }
    return lines.join('\n');
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
