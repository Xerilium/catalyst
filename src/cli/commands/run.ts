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

/** Playbook input parameter from the what-if output */
interface WhatIfInput {
  name: string;
  type: string;
}

/** Step entry from the engine's what-if summary tree */
interface WhatIfStep {
  stepName: string;
  actionType: string;
  inputVarRefs: string[];
  hasExplicitName: boolean;
  children?: Record<string, WhatIfStep[]>;
}

/**
 * Compute global column widths across inputs and the entire step tree.
 * - name: widest name among inputs and root-level named steps
 * - actionCol: widest (indent + label) across inputs and all step depths
 */
function computeGlobalWidths(
  inputs: WhatIfInput[],
  steps: WhatIfStep[],
  depth: number,
  isRoot: boolean = true
): { name: number; actionCol: number } {
  let name = 0;
  let actionCol = 0;

  // Include inputs in column width calculations
  if (isRoot) {
    for (const input of inputs) {
      name = Math.max(name, input.name.length);
      actionCol = Math.max(actionCol, input.type.length);
    }
  }

  for (const step of steps) {
    if (isRoot && step.hasExplicitName) {
      name = Math.max(name, step.stepName.length);
    }
    // Nested named steps render as "name = action" within the action column
    const label = (!isRoot && step.hasExplicitName)
      ? `${step.stepName} = ${step.actionType}`
      : step.actionType;
    actionCol = Math.max(actionCol, depth * 2 + label.length);
    if (step.children) {
      for (const [, childSteps] of Object.entries(step.children)) {
        const child = computeGlobalWidths([], childSteps, depth + 2, false);
        name = Math.max(name, child.name);
        actionCol = Math.max(actionCol, child.actionCol);
      }
    }
  }
  return { name, actionCol };
}

/**
 * Print the inputs section of a what-if summary.
 * Uses the same column layout as steps: name = type
 */
function printWhatIfInputs(
  inputs: WhatIfInput[],
  nameColWidth: number,
  actionColWidth: number
): void {
  for (const input of inputs) {
    const nameCol = input.name + ' '.repeat(nameColWidth - input.name.length) + ' = ';
    const actionPad = actionColWidth - input.type.length;
    const actionCol = input.type + ' '.repeat(Math.max(0, actionPad));
    console.log(`${nameCol}${actionCol}`);
  }
}

/**
 * Print a what-if summary tree with three columns:
 *   1. Name     — fixed-width, not indented (blank for unnamed steps)
 *   2. Action   — indented by depth
 *   3. ← Params — aligned to a single global column
 *
 * Format:
 *   product-md = file-read    ← path
 *                if           ← condition
 *                  then:
 *                    script   ← code
 *   repo       = github-repo
 *                return       ← outputs
 *
 * @req FR:catalyst-cli/run.what-if
 */
function printWhatIfTree(
  steps: WhatIfStep[],
  depth: number,
  nameColWidth: number,
  actionColWidth: number,
  isRoot: boolean = true
): void {
  const indent = '  '.repeat(depth);
  const nameGutter = nameColWidth > 0 ? nameColWidth + 3 : 0;

  for (const step of steps) {
    let nameCol = '';
    let label: string;

    if (isRoot) {
      // Root-level: name in its own column, action separate
      if (nameColWidth > 0) {
        nameCol = step.hasExplicitName
          ? step.stepName + ' '.repeat(nameColWidth - step.stepName.length) + ' = '
          : ' '.repeat(nameGutter);
      }
      label = step.actionType;
    } else {
      // Nested: name rendered inline as "name = action"
      nameCol = ' '.repeat(nameGutter);
      label = step.hasExplicitName
        ? `${step.stepName} = ${step.actionType}`
        : step.actionType;
    }

    // Pad label to global action column width
    const actionPad = actionColWidth - depth * 2 - label.length;
    const actionCol = label + ' '.repeat(Math.max(0, actionPad));

    // Params suffix
    const params = step.inputVarRefs.length > 0
      ? ` \u2190 ${step.inputVarRefs.join(', ')}`
      : '';

    console.log(`${nameCol}${indent}${actionCol}${params}`);

    if (step.children) {
      for (const [childLabel, childSteps] of Object.entries(step.children)) {
        console.log(`${' '.repeat(nameGutter)}${indent}  ${childLabel}:`);
        printWhatIfTree(childSteps, depth + 2, nameColWidth, actionColWidth, false);
      }
    }
  }
}

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
 * @req FR:catalyst-cli/run.what-if
 * @req FR:catalyst-cli/cli.dynamic.what-if
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
    const result = await engine.run(playbook, inputs, options.whatIf ? { mode: 'what-if' } : {});

    if (result.status === 'completed') {
      // What-if mode: display step summary
      if (options.whatIf && result.outputs?.summary) {
        if (options.json) {
          console.log(JSON.stringify(result.outputs));
        } else {
          const playbookInputs = (result.outputs.inputs || []) as WhatIfInput[];
          const summary = result.outputs.summary as WhatIfStep[];
          const widths = computeGlobalWidths(playbookInputs, summary, 0);
          console.log(`\nWhat-if: ${playbook.name}\n`);
          if (playbookInputs.length > 0) {
            console.log('Inputs:');
            printWhatIfInputs(playbookInputs, widths.name, widths.actionCol);
            console.log('\nSteps:');
          }
          printWhatIfTree(summary, 0, widths.name, widths.actionCol);
        }
      } else if (result.outputs && Object.keys(result.outputs).length > 0) {
        // Display outputs if any
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
