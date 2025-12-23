/**
 * CLI error handling utilities
 * @req FR:errors.PlaybookNotFound
 * @req FR:errors.InvalidInput
 * @req FR:errors.MissingPlaybookId
 * @req FR:errors.PlaybookExecutionFailed
 * @req FR:exit.codes
 */

import { CatalystError } from '../../core/errors';

/**
 * Exit codes mapping for CLI errors
 * @req FR:exit.codes
 */
const EXIT_CODES: Record<string, number> = {
  // General errors (exit code 1)
  PlaybookNotFound: 1,
  PlaybookExecutionFailed: 1,

  // Usage errors (exit code 2)
  InvalidInput: 2,
  MissingPlaybookId: 2
};

/**
 * Create a PlaybookNotFound error
 * @req FR:errors.PlaybookNotFound
 */
export function createPlaybookNotFoundError(playbookId: string): CatalystError {
  return new CatalystError(
    `Playbook "${playbookId}" not found`,
    'PlaybookNotFound',
    `Check playbook ID or specify the full path. Run 'catalyst run --help' to see discovery paths.`
  );
}

/**
 * Create an InvalidInput error
 * @req FR:errors.InvalidInput
 */
export function createInvalidInputError(value: string): CatalystError {
  return new CatalystError(
    `Invalid input format: "${value}"`,
    'InvalidInput',
    `Playbook inputs must be in key=value format. Example: --input name=value`
  );
}

/**
 * Create a MissingPlaybookId error
 * @req FR:errors.MissingPlaybookId
 */
export function createMissingPlaybookIdError(): CatalystError {
  return new CatalystError(
    'No playbook ID provided',
    'MissingPlaybookId',
    `Usage: catalyst run <playbook-id> [--input key=value...]`
  );
}

/**
 * Create a PlaybookExecutionFailed error
 * @req FR:errors.PlaybookExecutionFailed
 */
export function createPlaybookExecutionFailedError(
  playbookId: string,
  reason: string,
  cause?: Error
): CatalystError {
  return new CatalystError(
    `Playbook "${playbookId}" failed: ${reason}`,
    'PlaybookExecutionFailed',
    'Check playbook output above for details.',
    cause
  );
}

/**
 * Build error chain entries from outer to inner
 * Returns array of { message, code } for each error in chain
 */
function collectErrorChain(error: CatalystError): Array<{ message: string; code: string }> {
  const chain: Array<{ message: string; code: string }> = [];
  let current: Error | undefined = error;

  while (current) {
    if (current instanceof CatalystError) {
      chain.push({ message: current.message, code: current.code });
    }
    current = (current as CatalystError).cause;
  }

  return chain;
}

/**
 * Format a CatalystError for terminal output
 * Shows stack-trace style error chain with each error on its own line
 * @req FR:errors.format
 */
export function formatError(error: CatalystError): string {
  const chain = collectErrorChain(error);
  const lines: string[] = [];

  // First error (outermost) - full message with code
  lines.push(`${chain[0].message} (${chain[0].code})`);

  // Nested errors - indented with "Caused by:" prefix
  for (let i = 1; i < chain.length; i++) {
    const indent = '  '.repeat(i);
    lines.push(`${indent}↳ ${chain[i].message} (${chain[i].code})`);
  }

  // Add guidance from outermost error
  lines.push('');
  lines.push(error.guidance);

  return lines.join('\n');
}

/**
 * Get the exit code for a CatalystError
 * @req FR:exit.codes
 */
export function getExitCode(error: CatalystError): number {
  return EXIT_CODES[error.code] ?? 1;
}
