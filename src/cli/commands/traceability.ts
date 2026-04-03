/**
 * Traceability command implementation
 * @req FR:catalyst-cli/traceability.execute
 * @req FR:catalyst-cli/traceability.output
 * @req FR:catalyst-cli/traceability.priority
 * @req FR:catalyst-cli/traceability.thresholds
 */

import * as fs from 'fs';
import pc from 'picocolors';
import type { TraceabilityOptions } from '../types';
import type { RequirementPriority } from '../../traceability/types/index.js';
import type { TraceabilityReport, TerminalReportOptions } from '../../traceability/index.js';
import {
  createInvalidPriorityError,
  createTraceabilityAnalysisFailedError
} from '../utils/errors';
import { LoggerSingleton } from '../../core/logging';
import {
  runTraceabilityAnalysis,
  generateJsonReport,
  generateTerminalReport,
  formatFeatureSummaryLine,
  formatFeatureDetail,
  renderSegmentedBar,
} from '../../traceability/index.js';

const VALID_PRIORITIES: RequirementPriority[] = ['P1', 'P2', 'P3', 'P4', 'P5'];

/**
 * Parse a feature argument, extracting the feature ID from a path if needed.
 *
 * Accepts plain IDs ("ai-provider") or paths (".xe/features/ai-provider/spec.md")
 * and extracts the feature ID portion.
 *
 * @req FR:catalyst-cli/traceability.execute
 */
export function parseFeatureArgument(arg: string | undefined): string | undefined {
  if (!arg) {
    return undefined;
  }

  // If it contains a path separator, try to extract feature ID from path
  if (arg.includes('/')) {
    const match = arg.match(/features\/([^/]+)/);
    if (match) {
      return match[1];
    }
  }

  return arg;
}

/**
 * Validate and normalize a priority string to a RequirementPriority.
 *
 * @req FR:catalyst-cli/traceability.priority
 */
export function validatePriority(priority: string): RequirementPriority {
  const normalized = priority.toUpperCase() as RequirementPriority;
  if (!VALID_PRIORITIES.includes(normalized)) {
    throw createInvalidPriorityError(priority);
  }
  return normalized;
}

/**
 * Resolve a feature filter pattern to matching feature IDs.
 *
 * Supports wildcard patterns (e.g., "ai-provider*") by matching against
 * feature directories in .xe/features/. Returns undefined for no filter
 * (all features), or an array of matching feature IDs.
 *
 * @req FR:catalyst-cli/traceability.execute
 */
export function resolveFeatureFilters(
  pattern: string | undefined,
  featuresDir: string = '.xe/features'
): string[] | undefined {
  if (!pattern) {
    return undefined;
  }

  // No wildcard — return as single-element array
  if (!pattern.includes('*') && !pattern.includes('?')) {
    return [pattern];
  }

  // Convert glob pattern to regex
  const regexStr = '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
  const regex = new RegExp(regexStr);

  // Scan features directory for matches
  if (!fs.existsSync(featuresDir)) {
    return [pattern]; // Let the runner handle the error
  }

  const entries = fs.readdirSync(featuresDir).filter((entry: string) => {
    const fullPath = `${featuresDir}/${entry}`;
    return fs.statSync(fullPath).isDirectory() && regex.test(entry);
  });

  if (entries.length === 0) {
    const available = fs.readdirSync(featuresDir)
      .filter((e: string) => fs.statSync(`${featuresDir}/${e}`).isDirectory())
      .sort();
    throw createTraceabilityAnalysisFailedError(
      `No features matching pattern "${pattern}"\nAvailable features: ${available.join(', ')}`
    );
  }

  return entries.sort();
}

/** Result of running traceability analysis for a single feature. */
interface FeatureResult {
  featureName: string;
  report: TraceabilityReport;
  thresholdsMet: boolean;
}

/**
 * Execute the traceability command.
 *
 * Runs traceability analysis and outputs a report in the requested format.
 * Exits with code 1 if coverage thresholds are not met.
 *
 * @req FR:catalyst-cli/traceability.execute
 * @req FR:catalyst-cli/traceability.output
 * @req FR:catalyst-cli/traceability.thresholds
 */
export async function traceabilityCommand(
  featureArg: string | undefined,
  options: TraceabilityOptions
): Promise<void> {
  const logger = LoggerSingleton.getInstance();

  // Parse feature argument and resolve wildcards
  const parsedFeature = parseFeatureArgument(featureArg);
  const featureFilters = resolveFeatureFilters(parsedFeature);

  // Validate priority if provided
  let minPriority: RequirementPriority | undefined;
  if (options.minPriority) {
    minPriority = validatePriority(options.minPriority);
  }

  // No filter or single feature — run once
  if (!featureFilters || featureFilters.length <= 1) {
    const featureFilter = featureFilters?.[0];
    logger.info('CLI', 'Traceability', `Running traceability analysis${featureFilter ? ` for ${featureFilter}` : ''}...`);
    await runSingleFeature(featureFilter, minPriority, options);
    return;
  }

  // Multiple features from wildcard — collect-then-compose
  // @req FR:catalyst-cli/traceability.output
  logger.info('CLI', 'Traceability', `Running traceability analysis for ${featureFilters.length} features matching "${parsedFeature}"...`);
  await runMultipleFeatures(featureFilters, minPriority, options, parsedFeature);
}

/**
 * Run traceability analysis for a single feature and output the report.
 * @req FR:catalyst-cli/traceability.output
 */
async function runSingleFeature(
  featureFilter: string | undefined,
  minPriority: RequirementPriority | undefined,
  options: TraceabilityOptions
): Promise<void> {
  const result = await runAnalysis(featureFilter, minPriority);

  if (!options.quiet) {
    if (options.json) {
      console.log(generateJsonReport(result.report));
    } else {
      const termOptions: TerminalReportOptions = {
        verbose: options.verbose,
        featureName: featureFilter,
      };
      console.log(generateTerminalReport(result.report, termOptions));
    }
  }

  // @req FR:catalyst-cli/traceability.thresholds
  if (!result.thresholdsMet) {
    process.exit(1);
  }
}

/**
 * Run traceability analysis for multiple features and output aggregate report.
 * @req FR:catalyst-cli/traceability.output
 */
async function runMultipleFeatures(
  featureFilters: string[],
  minPriority: RequirementPriority | undefined,
  options: TraceabilityOptions,
  filterPattern?: string
): Promise<void> {
  const logger = LoggerSingleton.getInstance();
  const results: FeatureResult[] = [];
  let anyThresholdFailed = false;

  // Collect all results
  for (const featureName of featureFilters) {
    try {
      const result = await runAnalysis(featureName, minPriority);
      results.push({
        featureName,
        report: result.report,
        thresholdsMet: result.thresholdsMet,
      });
      if (!result.thresholdsMet) {
        anyThresholdFailed = true;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logger.error('CLI', 'Traceability', `Failed for ${featureName}: ${reason}`);
      anyThresholdFailed = true;
    }
  }

  // Output composed report
  if (!options.quiet && results.length > 0) {
    if (options.json) {
      // JSON mode: output each report as a separate JSON object
      for (const result of results) {
        console.log(generateJsonReport(result.report));
      }
    } else {
      outputMultiFeatureReport(results, options, filterPattern);
    }
  }

  if (anyThresholdFailed) {
    process.exit(1);
  }
}

/**
 * Compose and output the multi-feature terminal report.
 *
 * Layout:
 * 1. Per-feature detail sections (only for features with issues)
 * 2. Double separator
 * 3. Feature summary table (one line per feature)
 * 4. Single separator
 * 5. Aggregate metrics line
 * 6. Combined scan metadata
 *
 * @req FR:catalyst-cli/traceability.output
 */
function outputMultiFeatureReport(
  results: FeatureResult[],
  options: TraceabilityOptions,
  filterPattern?: string
): void {
  const termOptions: TerminalReportOptions = { verbose: options.verbose };
  const maxNameWidth = Math.max(24, ...results.map(r => r.featureName.length)) + 2;
  const lines: string[] = [];

  // Layer 2: Feature detail for each feature with issues
  for (const result of results) {
    const detail = formatFeatureDetail(result.report, result.featureName, {
      ...termOptions,
      featureName: result.featureName,
    });
    if (detail) {
      lines.push(detail);
    }
  }

  // Layer 3: Aggregate summary
  const doubleSep = pc.dim('═'.repeat(60));
  lines.push(`  ${doubleSep}`);

  // Separate healthy and unhealthy features
  const unhealthy = results.filter(r => {
    const s = r.report.summary;
    return s.uncovered > 0 || r.report.codeCoverageGaps.length > 0 || r.report.testCoverageGaps.length > 0;
  });
  const healthy = results.filter(r => {
    const s = r.report.summary;
    return s.uncovered === 0 && r.report.codeCoverageGaps.length === 0 && r.report.testCoverageGaps.length === 0;
  });

  // Feature summary table: unhealthy features listed individually
  for (const result of unhealthy) {
    lines.push(formatFeatureSummaryLine(result.report, result.featureName, maxNameWidth, termOptions));
  }

  // Healthy features collapsed into a single line
  if (healthy.length > 0) {
    const healthyReqs = healthy.reduce((sum, r) => sum + r.report.summary.active, 0);
    lines.push(`  ${pc.green('✓')} ${pc.dim(`${healthy.length} features   ${healthyReqs} reqs   all at 100% coverage`)}`);
  }

  // Single separator
  const singleSep = pc.dim('─'.repeat(60));
  lines.push(`  ${singleSep}`);

  // Aggregate metrics
  const totalFeatures = results.length;
  const totalReqs = results.reduce((sum, r) => sum + r.report.summary.active, 0);
  const totalImpl = results.reduce((sum, r) => sum + r.report.summary.implemented, 0);
  const totalTested = results.reduce((sum, r) => sum + r.report.summary.tested, 0);
  const totalCovered = results.reduce((sum, r) => sum + r.report.summary.covered, 0);
  const totalUncovered = results.reduce((sum, r) => sum + r.report.summary.uncovered, 0);
  const totalCodeGaps = results.reduce((sum, r) => sum + r.report.codeCoverageGaps.length, 0);
  const totalTestGaps = results.reduce((sum, r) => sum + r.report.testCoverageGaps.length, 0);
  const totalOrphaned = results.reduce((sum, r) => sum + r.report.orphaned.length, 0);
  const totalDeferred = results.reduce((sum, r) => sum + r.report.summary.deferred, 0);
  const totalDeprecated = results.reduce((sum, r) => sum + r.report.summary.deprecated, 0);

  const totalCoveredWeight = results.reduce((sum, r) => sum + r.report.summary.coverageScore * r.report.summary.active, 0);
  const totalCompWeight = results.reduce((sum, r) => sum + r.report.summary.completenessScore * r.report.summary.active, 0);
  const weightedCoverage = totalReqs > 0 ? Math.round(totalCoveredWeight / totalReqs) : 100;
  const weightedCompleteness = totalReqs > 0 ? Math.round(totalCompWeight / totalReqs) : 100;
  const implPct = totalReqs > 0 ? Math.round((totalImpl / totalReqs) * 100) : 0;
  const testPct = totalReqs > 0 ? Math.round((totalTested / totalReqs) * 100) : 0;

  // Bar segments: green = both code+test, yellow = one only, red = uncovered
  const both = totalImpl + totalTested - totalCovered;
  const partial = totalCovered - both;
  const greenPct = totalReqs > 0 ? (both / totalReqs) * 100 : 0;
  const yellowPct = totalReqs > 0 ? (partial / totalReqs) * 100 : 0;
  const redPct = totalReqs > 0 ? (totalUncovered / totalReqs) * 100 : 0;

  const barWidth = 38;
  const pctColWidth = 4;
  const lineWidth = 60;

  // Row 1: Header (left) + completeness (right, dim)
  const isGlobAll = !filterPattern || filterPattern === '*';
  const headerName = isGlobAll ? 'All features' : filterPattern;
  const headerVisible = `${headerName} (${totalFeatures})`;
  const compText = `${weightedCompleteness}% completeness`;
  const headerPad = Math.max(0, lineWidth - headerVisible.length - compText.length);
  lines.push(`  ${pc.bold(headerName)} ${pc.dim(`(${totalFeatures})`)}${' '.repeat(headerPad)}${pc.dim(compText)}`);
  lines.push('');

  // Row 2: "NN% coverage" + padding + "XXX requirements" (total width = barWidth) + deferred
  const covPct = `${weightedCoverage}%`.padStart(pctColWidth);
  const covLabel = `${covPct} coverage`;
  const reqText = `${totalReqs} requirements`;
  const reqPad = barWidth - covLabel.length - reqText.length;
  const deferredNum = totalDeferred > 0 ? String(totalDeferred) : '';
  const deferredText = deferredNum ? `   ${pc.dim('·')}   ${pc.dim(deferredNum)} ${pc.dim('deferred')}` : '';
  lines.push(`  ${covLabel}${' '.repeat(Math.max(0, reqPad))}${reqText}${deferredText}`);

  // Row 3: Bar (same width as row 2, left-aligned) + deprecated
  const covBar = renderSegmentedBar(greenPct, yellowPct, redPct, barWidth);
  const deprecatedNum = totalDeprecated > 0 ? String(totalDeprecated) : '';
  const deprecatedText = deprecatedNum ? `   ${pc.dim('·')}   ${pc.dim(deprecatedNum)} ${pc.dim('deprecated')}` : '';
  lines.push(`  ${covBar}${deprecatedText}`);

  // Row 4: Code % → gaps + uncovered
  const codePct = `${implPct}%`.padStart(pctColWidth);
  const codeGaps = totalCodeGaps;
  const codeArrow = codeGaps > 0 ? pc.dim('→') : ' ';
  const codeGapNum = codeGaps > 0 ? String(codeGaps) : '';
  const codeGapText = codeGapNum ? ` ${codeGapNum} ${pc.dim('gaps')}` : '';
  const uncoveredNum = totalUncovered > 0 ? String(totalUncovered) : '';
  const uncoveredText = uncoveredNum ? `  ${pc.dim('·')}  ${pc.dim(uncoveredNum)} ${pc.dim('uncovered')}` : '';
  lines.push(`  ${codePct} code ${codeArrow}${codeGapText}${uncoveredText}`);

  // Row 5: Test % → gaps + orphaned
  const testPctFormatted = `${testPct}%`.padStart(pctColWidth);
  const testGaps = totalTestGaps;
  const testArrow = testGaps > 0 ? pc.dim('→') : ' ';
  const testGapNum = testGaps > 0 ? String(testGaps) : '';
  const testGapText = testGapNum ? ` ${testGapNum} ${pc.dim('gaps')}` : '';
  const orphanedNum = totalOrphaned > 0 ? String(totalOrphaned) : '';
  const orphanedText = orphanedNum ? `  ${pc.dim('·')}  ${pc.dim(orphanedNum)} ${pc.dim('orphaned')}` : '';
  lines.push(`  ${testPctFormatted} test ${testArrow}${testGapText}${orphanedText}`);

  // Combined scan metadata
  const totalFiles = results.reduce((sum, r) => sum + r.report.metadata.filesScanned, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.report.metadata.scanDurationMs, 0);
  const durationSec = (totalDuration / 1000).toFixed(1);
  lines.push('');
  lines.push(`  ${pc.dim(`Scanned ${totalFiles} files in ${durationSec}s`)}`);

  console.log(lines.join('\n'));
}

/**
 * Run traceability analysis and return the result.
 * Wraps the runner with proper error handling.
 */
async function runAnalysis(
  featureFilter: string | undefined,
  minPriority: RequirementPriority | undefined
) {
  try {
    return await runTraceabilityAnalysis({
      featureFilter,
      minPriority,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw createTraceabilityAnalysisFailedError(
      reason,
      error instanceof Error ? error : undefined
    );
  }
}
