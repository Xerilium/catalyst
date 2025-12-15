/**
 * Run command implementation
 * @req FR:run.execute
 * @req FR:run.output
 */

import type { RunOptions } from '../types';
import {
  createInvalidInputError,
  createMissingPlaybookIdError,
  createPlaybookNotFoundError,
  createPlaybookExecutionFailedError
} from '../utils/errors';
import { formatInfo, formatSuccess, formatErrorMessage } from '../utils/output';
import { CatalystError } from '../../core/errors';
import { PlaybookProvider } from '../../playbooks/registry/playbook-provider';
import { Engine } from '../../playbooks/engine/engine';

/**
 * Parse --input key=value flags into a Record
 * @req FR:run.execute
 */
export function parseInputs(inputs: string[] | undefined): Record<string, string> {
  if (!inputs || !Array.isArray(inputs)) {
    return {};
  }

  const result: Record<string, string> = {};

  for (const input of inputs) {
    const equalsIndex = input.indexOf('=');
    if (equalsIndex === -1) {
      throw createInvalidInputError(input);
    }

    const key = input.substring(0, equalsIndex);
    const value = input.substring(equalsIndex + 1);
    result[key] = value;
  }

  return result;
}

/**
 * Validate that a playbook ID is provided
 * @req FR:run.execute
 */
export function validatePlaybookId(playbookId: string | undefined): void {
  if (!playbookId || playbookId.trim() === '') {
    throw createMissingPlaybookIdError();
  }
}

/**
 * Execute the run command
 * @req FR:run.execute
 * @req FR:run.output
 */
export async function runCommand(
  playbookId: string,
  options: RunOptions
): Promise<void> {
  const quiet = options.quiet ?? false;

  // Parse and validate inputs
  const inputs = parseInputs(options.input);
  validatePlaybookId(playbookId);

  // Display start message
  if (!quiet) {
    console.log(formatInfo(`Running playbook: ${playbookId}...`));
  }

  // Load playbook
  const provider = PlaybookProvider.getInstance();
  let playbook;
  try {
    playbook = await provider.loadPlaybook(playbookId);
  } catch (error) {
    if (error instanceof CatalystError && error.code === 'PlaybookNotFound') {
      throw createPlaybookNotFoundError(playbookId);
    }
    throw error;
  }

  // Execute playbook
  const engine = new Engine();
  try {
    const result = await engine.run(playbook, inputs);

    if (result.status === 'completed') {
      if (!quiet) {
        console.log(formatSuccess(`Playbook "${playbookId}" completed successfully`));
      }
    } else if (result.status === 'failed') {
      const reason = result.error?.message || 'Unknown error';
      throw createPlaybookExecutionFailedError(playbookId, reason, result.error);
    } else if (result.status === 'paused') {
      if (!quiet) {
        console.log(formatInfo(`Playbook "${playbookId}" paused at checkpoint`));
      }
    }
  } catch (error) {
    if (error instanceof CatalystError) {
      throw error;
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw createPlaybookExecutionFailedError(
      playbookId,
      reason,
      error instanceof Error ? error : undefined
    );
  }
}
