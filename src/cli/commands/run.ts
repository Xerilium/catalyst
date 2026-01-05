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
import { formatSuccess } from '../utils/output';
import { CatalystError } from '../../core/errors';
import { PlaybookProvider } from '../../playbooks/registry/playbook-provider';
import { Engine } from '../../playbooks/engine/engine';
import { LoggerSingleton } from '../../core/logging';

/**
 * Parse --input key=value flags into a Record
 *
 * All values are kept as strings. Type coercion happens later in the engine
 * based on the playbook's input type declarations.
 *
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
  const logger = LoggerSingleton.getInstance();

  // Parse and validate inputs
  const inputs = parseInputs(options.input);
  validatePlaybookId(playbookId);

  // Display start message
  logger.info('CLI', 'Run', `Running playbook: ${playbookId}...`);
  logger.debug('CLI', 'Run', 'Playbook inputs', inputs);

  // Load playbook
  const provider = PlaybookProvider.getInstance();
  let playbook;
  try {
    playbook = await provider.loadPlaybook(playbookId);
    logger.verbose('CLI', 'Run', 'Playbook loaded', { name: playbook.name });
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
      // Display outputs if any
      if (result.outputs && Object.keys(result.outputs).length > 0) {
        const outputs = result.outputs;
        const keys = Object.keys(outputs);

        // Single 'result' key with primitive value: print directly
        if (keys.length === 1 && keys[0] === 'result') {
          const value = outputs.result;
          if (typeof value === 'string') {
            console.log(value);
          } else if (typeof value === 'number' || typeof value === 'boolean') {
            console.log(String(value));
          } else {
            // Object/array: output as JSON
            console.log(options.json ? JSON.stringify(value) : JSON.stringify(value, null, 2));
          }
        } else {
          // Multiple keys or non-result key: output entire object as JSON
          console.log(options.json ? JSON.stringify(outputs) : JSON.stringify(outputs, null, 2));
        }
      } else {
        logger.info('CLI', 'Run', formatSuccess(`Playbook "${playbookId}" completed successfully`));
      }
    } else if (result.status === 'failed') {
      const reason = result.error?.message || 'Unknown error';
      throw createPlaybookExecutionFailedError(playbookId, reason, result.error);
    } else if (result.status === 'paused') {
      logger.info('CLI', 'Run', `Playbook "${playbookId}" paused at checkpoint`);
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
