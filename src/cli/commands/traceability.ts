/**
 * Traceability command implementation
 * @req FR:catalyst-cli/traceability.execute
 * @req FR:catalyst-cli/traceability.output
 * @req FR:catalyst-cli/traceability.priority
 * @req FR:catalyst-cli/traceability.thresholds
 */

import * as fs from 'fs';
import type { TraceabilityOptions } from '../types';
import type { RequirementPriority } from '../../traceability/types/index.js';
import {
  createInvalidPriorityError,
  createTraceabilityAnalysisFailedError
} from '../utils/errors';
import { LoggerSingleton } from '../../core/logging';
import {
  runTraceabilityAnalysis,
  generateJsonReport,
  generateTerminalReport,
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
    await runAndOutput(featureFilter, minPriority, options);
    return;
  }

  // Multiple features from wildcard — run each separately
  logger.info('CLI', 'Traceability', `Running traceability analysis for ${featureFilters.length} features matching "${parsedFeature}"...`);
  let anyThresholdFailed = false;

  for (const featureFilter of featureFilters) {
    try {
      const failed = await runAndOutput(featureFilter, minPriority, options, true);
      if (failed) {
        anyThresholdFailed = true;
      }
    } catch (error) {
      // For wildcard mode, report the error but continue with remaining features
      const reason = error instanceof Error ? error.message : String(error);
      logger.error('CLI', 'Traceability', `Failed for ${featureFilter}: ${reason}`);
      anyThresholdFailed = true;
    }
  }

  if (anyThresholdFailed) {
    process.exit(1);
  }
}

/**
 * Run traceability analysis for a single feature (or all) and output the report.
 *
 * Returns true if thresholds were not met. When suppressExit is false (default),
 * calls process.exit(1) directly on threshold failure.
 */
async function runAndOutput(
  featureFilter: string | undefined,
  minPriority: RequirementPriority | undefined,
  options: TraceabilityOptions,
  suppressExit: boolean = false
): Promise<boolean> {
  let result;
  try {
    result = await runTraceabilityAnalysis({
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

  // Output report
  if (!options.quiet) {
    if (options.json) {
      console.log(generateJsonReport(result.report));
    } else {
      if (featureFilter) {
        console.log(`Traceability Report: ${featureFilter}`);
        console.log('='.repeat(40 + featureFilter.length));
        console.log();
      }
      console.log(generateTerminalReport(result.report));
    }
  }

  // Handle thresholds
  // @req FR:catalyst-cli/traceability.thresholds
  if (!result.thresholdsMet) {
    if (!suppressExit) {
      process.exit(1);
    }
    return true;
  }
  return false;
}
