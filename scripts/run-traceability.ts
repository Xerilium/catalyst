#!/usr/bin/env npx tsx
/**
 * Run traceability analysis and generate a report.
 *
 * Usage: npx tsx scripts/run-traceability.ts [feature-path-or-id] [--json] [--min-priority <P1-P5>]
 *
 * Arguments:
 *   feature-path-or-id      Filter to a single feature by path or ID (e.g., .xe/features/error-handling or error-handling)
 *
 * Options:
 *   --json                  Output JSON format instead of terminal summary
 *   --min-priority <P1-P5>  Only report requirements at or above this priority level
 */

import type { RequirementPriority } from '../src/traceability/types/index.js';
import {
  runTraceabilityAnalysis,
  generateJsonReport,
  generateTerminalReport,
} from '../src/traceability/index.js';

type CliArgs = {
  json: boolean;
  feature?: string;
  minPriority?: RequirementPriority;
};

const PRIORITY_ORDER: RequirementPriority[] = ['P1', 'P2', 'P3', 'P4', 'P5'];

/**
 * Parse command-line arguments.
 * @req FR:req-traceability/scan.feature-filter
 * @req FR:req-traceability/priority.filtering
 */
function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = { json: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--json') {
      result.json = true;
    } else if (arg === '--min-priority' && args[i + 1]) {
      const pri = args[i + 1].toUpperCase() as RequirementPriority;
      if (PRIORITY_ORDER.includes(pri)) {
        result.minPriority = pri;
      } else {
        console.error(`Invalid priority: ${args[i + 1]}. Must be one of: ${PRIORITY_ORDER.join(', ')}`);
        process.exit(1);
      }
      i++; // Skip the priority value
    } else if (!arg.startsWith('--')) {
      // Positional argument - treat as feature path or ID
      let featureId = arg;

      // Extract feature ID from path if full path provided
      if (featureId.includes('/')) {
        // Handle paths like .xe/features/error-handling or .xe/features/error-handling/spec.md
        const match = featureId.match(/features\/([^/]+)/);
        if (match) {
          featureId = match[1];
        }
      }

      result.feature = featureId;
    }
  }

  return result;
}

/**
 * Main CLI entry point.
 * @req FR:req-traceability/scan.feature-filter
 * @req FR:req-traceability/priority.filtering
 */
async function main() {
  const { json: outputJson, feature: featureFilter, minPriority } = parseArgs();

  // Run traceability analysis using the library function
  const { report, thresholdsMet } = await runTraceabilityAnalysis({
    featureFilter,
    minPriority,
  });

  // Output
  if (outputJson) {
    console.log(generateJsonReport(report));
  } else {
    if (featureFilter) {
      console.log(`Traceability Report: ${featureFilter}`);
      console.log('='.repeat(40 + featureFilter.length));
      console.log();
    }
    console.log(generateTerminalReport(report));
  }

  // Exit with error if coverage thresholds not met
  if (!thresholdsMet) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Traceability scan failed:', error);
  process.exit(1);
});
