/**
 * Deps command implementation — cross-feature dependency analysis.
 * @req FR:cli-engine/deps.execute
 * @req FR:cli-engine/deps.output
 */

import type { DepsOptions } from '../types';
import { LogManager } from '../../core/logging';
import { runDependencyAnalysis } from '../../traceability/runner.js';
import {
  generateDependencyTextReport,
  generateDependencyJsonReport,
  generateDependencyMermaidReport,
} from '../../traceability/reports/dependency-reporter.js';

/**
 * Execute the deps command.
 *
 * Runs dependency analysis and outputs the result in the requested format.
 *
 * @req FR:cli-engine/deps.execute
 */
export async function depsCommand(
  featureArg: string | undefined,
  options: DepsOptions
): Promise<void> {
  const logger = LogManager.current();

  logger.info('CLI', 'Deps', `Analyzing dependencies${featureArg ? ` for ${featureArg}` : ''}...`);

  const report = await runDependencyAnalysis();

  const format = options.format ?? 'text';
  const reportOptions = {
    reverse: options.reverse,
    feature: featureArg,
  };

  switch (format) {
    case 'json':
      // @req FR:cli-engine/deps.output
      console.log(generateDependencyJsonReport(report));
      break;
    case 'mermaid':
      // @req FR:cli-engine/deps.output
      console.log(generateDependencyMermaidReport(report, reportOptions));
      break;
    default:
      // @req FR:cli-engine/deps.output
      console.log(generateDependencyTextReport(report, reportOptions));
      break;
  }

  // Exit non-zero if validation errors exist (standard linter/checker pattern)
  if (report.validations.length > 0) {
    process.exit(1);
  }
}
