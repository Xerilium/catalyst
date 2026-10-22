/**
 * Check command implementation.
 *
 * @req FR:cli-check/check.@cli
 * @req FR:cli-check/check.input
 * @req FR:cli-check/check.execute
 * @req FR:cli-check/check.rules
 * @req FR:cli-check/check.exit
 * @req FR:cli-check/check.quiet
 * @req FR:cli-check/check.json
 * @req FR:cli-check/check.output
 */

import pc from 'picocolors';
import type { CheckOptions } from '../types';
import type { Finding } from '../../check/types';
import { runChecks } from '../../check/runner';
import { CatalystError } from '../../core/errors';
import { parseFeatureArgument } from './traceability';

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

const formatFinding = (f: Finding): string => {
  const severity = f.severity === 'error' ? pc.red(f.severity) : pc.yellow(f.severity);
  return `${pc.dim(`${f.file}:${f.line}`)}  ${severity}  ${f.rule}  ${f.text}`;
};

/**
 * Execute the check command.
 *
 * Prints one line per finding, then a summary. Exits 1 when any finding is an error.
 */
export async function checkCommand(featureArg: string | undefined, options: CheckOptions): Promise<void> {
  const feature = parseFeatureArgument(featureArg);
  const patterns = options.rules
    ?.split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const { documents, findings } = await runChecks({ root: process.cwd(), feature, patterns });
  if (feature && documents === 0) {
    throw new CatalystError(
      `No features matching "${feature}"`,
      'InvalidInput',
      'Pass a feature ID, a spec path, or a wildcard such as "cli-*".'
    );
  }

  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.length - errors;

  if (options.json) {
    console.log(JSON.stringify({ findings, summary: { errors, warnings } }, null, 2));
  } else if (options.quiet) {
    for (const f of findings.filter((x) => x.severity === 'error')) {console.log(formatFinding(f));}
  } else {
    for (const f of findings) {console.log(formatFinding(f));}
    console.log(
      findings.length === 0
        ? pc.green('✓ No findings')
        : `${plural(errors, 'error')} · ${plural(warnings, 'warning')}`
    );
  }

  if (errors > 0) {
    process.exit(1);
  }
}
