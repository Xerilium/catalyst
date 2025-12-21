/**
 * ForEachAction - Array iteration action
 *
 * Iterates over an array and executes steps for each item.
 * Uses StepExecutor from base class to execute nested steps with variable overrides.
 */

import { PlaybookActionWithSteps } from '../../types/action';
import type { PlaybookActionResult } from '../../types';
import type { ForEachConfig, ForEachResult } from './types';
import { ForEachErrors } from './errors';
import { validateStepArray } from './validation';
import { LoggerSingleton } from '@core/logging';

/**
 * Array iteration action
 *
 * Iterates over array and executes steps for each item with scoped variables.
 * Provides `item` (or custom name) and `index` (or custom name) variables to nested steps.
 *
 * @example
 * ```typescript
 * const action = new ForEachAction(stepExecutor);
 * const result = await action.execute({
 *   in: [1, 2, 3],
 *   item: 'number',
 *   index: 'position',
 *   steps: [{ action: 'bash', config: { code: 'echo {{number}}' } }]
 * });
 * ```
 */
export class ForEachAction extends PlaybookActionWithSteps<ForEachConfig> {
  /**
   * Action type identifier for registry
   */
  static readonly actionType = 'for-each';

  /**
   * Primary property for YAML shorthand syntax
   * Enables: `for-each: item` (with 'in' as secondary required property)
   * This makes the variable name explicit and reads naturally
   */
  readonly primaryProperty = 'item';

  /**
   * Default isolation mode for nested step execution
   * For-each iterations share parent scope by default so variables propagate back
   * (Note: loop variables item/index are always scoped via variableOverrides)
   */
  readonly isolated = false;

  /**
   * Execute iteration logic
   *
   * @param config - ForEach action configuration
   * @returns Promise resolving to action result with iteration statistics
   */
  async execute(config: ForEachConfig): Promise<PlaybookActionResult> {
    const logger = LoggerSingleton.getInstance();

    // Step 1: Validate configuration
    this.validateConfig(config);

    // Step 2: Get array to iterate over
    const array = this.resolveArray(config.in);

    // Step 3: Get variable names (with defaults)
    const itemVarName = config.item ?? 'item';
    const indexVarName = config.index ?? 'index';

    logger.verbose('Starting for-each loop', { itemCount: array.length, itemVar: itemVarName, indexVar: indexVarName });

    // Step 4: Handle empty array case
    if (array.length === 0) {
      logger.verbose('For-each: empty array, no iterations');
      return {
        code: 'Success',
        message: 'No iterations (empty array)',
        value: {
          iterations: 0,
          completed: 0,
          failed: 0
        }
      };
    }

    // Step 5: Iterate over array
    let completed = 0;
    let failed = 0;

    for (let i = 0; i < array.length; i++) {
      const item = array[i];
      logger.debug(`For-each iteration ${i + 1}/${array.length}`, { [itemVarName]: item });

      // Create variable overrides for this iteration
      const variableOverrides = {
        [itemVarName]: item,
        [indexVarName]: i
      };

      try {
        // Execute steps with scoped variables
        await this.stepExecutor.executeSteps(config.steps, variableOverrides);
        completed++;
      } catch (err) {
        // Re-throw error to stop iteration (default fail-fast behavior)
        failed++;
        throw err;
      }
    }

    // Step 6: Return result
    const result: ForEachResult = {
      iterations: array.length,
      completed,
      failed
    };

    logger.verbose('For-each completed', { iterations: array.length, completed, failed });

    return {
      code: 'Success',
      message: `Completed ${completed} of ${array.length} iterations`,
      value: result
    };
  }

  /**
   * Validate for-each action configuration
   *
   * @param config - Configuration to validate
   * @throws CatalystError if configuration is invalid
   */
  private validateConfig(config: ForEachConfig): void {
    // Validate 'in' property exists
    if (config.in === undefined) {
      throw ForEachErrors.configInvalid('in property is required');
    }

    // Validate steps exists and is valid
    if (!config.steps) {
      throw ForEachErrors.configInvalid('steps property is required');
    }

    if (config.steps.length === 0) {
      throw ForEachErrors.configInvalid('steps must contain at least one step');
    }

    validateStepArray(config.steps, 'ForEach', 'steps');
  }

  /**
   * Resolve the array to iterate over
   *
   * @param value - Value from 'in' property
   * @returns Array to iterate over
   * @throws CatalystError if value is not an array
   */
  private resolveArray(value: unknown[] | string): unknown[] {
    // If it's already an array, return it
    if (Array.isArray(value)) {
      return value;
    }

    // Otherwise, it's invalid (string should have been template-interpolated to array)
    throw ForEachErrors.invalidArray(value);
  }
}
