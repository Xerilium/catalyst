#!/usr/bin/env npx tsx
/**
 * Run traceability analysis and generate a report.
 *
 * Usage: npx tsx scripts/run-traceability.ts [--json] [--feature <feature-id>] [--min-severity <S1-S5>]
 *
 * Options:
 *   --json                  Output JSON format instead of terminal summary
 *   --feature <id>          Filter to a single feature (e.g., --feature ai-provider-claude)
 *   --min-severity <S1-S5>  Only report requirements at or above this severity level
 *
 * @req FR:req-traceability/scan.feature-filter
 * @req FR:req-traceability/severity.filtering
 */

import type { RequirementSeverity } from '../src/traceability/types/index.js';
import {
  runTraceabilityAnalysis,
  generateJsonReport,
  generateTerminalReport,
} from '../src/traceability/index.js';

type CliArgs = {
  json: boolean;
  feature?: string;
  minSeverity?: RequirementSeverity;
};

const SEVERITY_ORDER: RequirementSeverity[] = ['S1', 'S2', 'S3', 'S4', 'S5'];

/**
 * Parse command-line arguments.
 * @req FR:req-traceability/scan.feature-filter
 * @req FR:req-traceability/severity.filtering
 */
function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = { json: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') {
      result.json = true;
    } else if (args[i] === '--feature' && args[i + 1]) {
      result.feature = args[i + 1];
      i++; // Skip the feature value
    } else if (args[i] === '--min-severity' && args[i + 1]) {
      const sev = args[i + 1].toUpperCase() as RequirementSeverity;
      if (SEVERITY_ORDER.includes(sev)) {
        result.minSeverity = sev;
      } else {
        console.error(`Invalid severity: ${args[i + 1]}. Must be one of: ${SEVERITY_ORDER.join(', ')}`);
        process.exit(1);
      }
      i++; // Skip the severity value
    }
  }

  return result;
}

/**
 * Main CLI entry point.
 * @req FR:req-traceability/scan.feature-filter
 * @req FR:req-traceability/severity.filtering
 */
async function main() {
  const { json: outputJson, feature: featureFilter, minSeverity } = parseArgs();

  // Run traceability analysis using the library function
  const { report, thresholdsMet } = await runTraceabilityAnalysis({
    featureFilter,
    minSeverity,
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
