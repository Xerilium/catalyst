/**
 * Function Invocation Action
 *
 * Dynamically created by Engine when a step references a registered function name.
 * Maps inputs (named or positional), executes the function's steps via StepExecutor,
 * and extracts return values from the final step result.
 *
 * This action has no static `actionType` — it is never registered in the action catalog.
 * The Engine creates instances on-the-fly when dispatch finds a matching function definition.
 *
 * Dependencies: Only uses types from playbook-definition (InputParameter, StepExecutor, etc.).
 * Raw YAML input parsing is handled at definition time by FunctionAction, so this class
 * works exclusively with typed InputParameter objects.
 *
 * @req FR:playbook-engine/actions.builtin.function.invocation - Function callable as action type
 * @req FR:playbook-engine/actions.builtin.function.inputs - Typed input parameters
 * @req FR:playbook-engine/actions.builtin.function.return - Return values via return action
 */

import type { PlaybookActionResult, StepExecutor } from '../../types';
import { PlaybookActionWithSteps } from '../../types';
import type { FunctionDefinition } from './function-action';
import { CatalystError } from '@core/errors';

/**
 * FunctionInvocationAction - Dynamic action for calling registered functions
 *
 * Created by Engine dispatch when a step's action type matches a registered function.
 * Not catalog-registered — has no static actionType.
 *
 * @req FR:playbook-engine/actions.builtin.function.invocation
 */
export class FunctionInvocationAction extends PlaybookActionWithSteps<unknown> {
  constructor(
    stepExecutor: StepExecutor,
    private readonly functionDef: FunctionDefinition
  ) {
    super(stepExecutor);
  }

  /**
   * Execute the function with input mapping and return value extraction
   *
   * @req FR:playbook-engine/actions.builtin.function.inputs - Input mapping (named + positional)
   * @req FR:playbook-engine/actions.builtin.function.return - Return value from last step
   *
   * @param config - Named object or positional array of input values
   * @returns Success result with return value from executed steps
   */
  async execute(config: unknown): Promise<PlaybookActionResult> {
    const inputOverrides = this.mapInputs(config);

    const results = await this.stepExecutor.executeSteps(
      this.functionDef.steps,
      inputOverrides
    );

    // Extract return value from last step result (same pattern as PlaybookRunAction)
    const value = results.length > 0 ? results[results.length - 1].value : {};

    return {
      code: 'Success',
      message: `Function "${this.functionDef.name}" completed`,
      value,
      error: undefined
    };
  }

  /**
   * Map config to variable overrides based on function input definitions
   *
   * Supports two input forms:
   * - Named: `{ emoji: "X", title: "Y" }` → mapped by key
   * - Positional: `["X", "Y"]` → mapped by index to input parameter names
   *
   * @req FR:playbook-engine/actions.builtin.function.inputs
   */
  private mapInputs(config: unknown): Record<string, unknown> {
    const inputs = this.functionDef.inputs;

    // No config or null/undefined → empty overrides
    if (config === null || config === undefined) {
      return {};
    }

    // Unwrap transformer's fallback wrapper: { value: [...] } → [...]
    // When a function action isn't in ACTION_CATALOG (dynamic registration),
    // the YAML transformer wraps array values as { value: array } since there's
    // no primaryProperty defined. Unwrap so positional invocation works.
    let effectiveConfig: unknown = config;
    if (
      typeof config === 'object' && !Array.isArray(config) && config !== null
      && Object.keys(config as Record<string, unknown>).length === 1
      && Array.isArray((config as Record<string, unknown>).value)
    ) {
      effectiveConfig = (config as Record<string, unknown>).value;
    }

    // No input definitions → pass config through as-is if object, else empty
    if (!inputs || inputs.length === 0) {
      if (typeof effectiveConfig === 'object' && !Array.isArray(effectiveConfig)) {
        return effectiveConfig as Record<string, unknown>;
      }
      return {};
    }

    // Positional array form
    if (Array.isArray(effectiveConfig)) {
      if (effectiveConfig.length > inputs.length) {
        throw new CatalystError(
          `Function "${this.functionDef.name}" accepts ${inputs.length} input(s) but received ${effectiveConfig.length}`,
          'FunctionInputInvalid',
          `Provide at most ${inputs.length} positional argument(s)`
        );
      }

      const overrides: Record<string, unknown> = {};
      for (let i = 0; i < inputs.length; i++) {
        if (i < effectiveConfig.length) {
          overrides[inputs[i].name] = effectiveConfig[i];
        } else if (inputs[i].default !== undefined) {
          overrides[inputs[i].name] = inputs[i].default;
        }
      }
      return overrides;
    }

    // Named object form
    const namedConfig = effectiveConfig as Record<string, unknown>;
    const overrides: Record<string, unknown> = {};

    for (const input of inputs) {
      if (namedConfig[input.name] !== undefined) {
        overrides[input.name] = namedConfig[input.name];
      } else if (input.default !== undefined) {
        overrides[input.name] = input.default;
      } else if (input.required) {
        throw new CatalystError(
          `Function "${this.functionDef.name}" requires input "${input.name}"`,
          'FunctionInputInvalid',
          `Provide a value for required input "${input.name}"`
        );
      }
    }

    return overrides;
  }
}
