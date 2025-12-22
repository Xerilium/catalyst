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
 * Format a CatalystError for terminal output
 * Format: "{message} ({code})"
 * @req FR:errors.format
 */
export function formatError(error: CatalystError): string {
  const lines = [
    `${error.message} (Code: ${error.code})`,
    '',
    error.guidance
  ];

  return lines.join('\n');
}

/**
 * Get the exit code for a CatalystError
 * @req FR:exit.codes
 */
export function getExitCode(error: CatalystError): number {
  return EXIT_CODES[error.code] ?? 1;
}
