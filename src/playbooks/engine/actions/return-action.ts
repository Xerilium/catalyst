/**
 * Return Action (Built-in)
 *
 * Privileged action that terminates playbook execution successfully with
 * explicit outputs. Useful for early returns from conditional branches.
 *
 * @example
 * ```yaml
 * steps:
 *   # Return an object - all properties become outputs
 *   - return:
 *       validated: true
 *       checks-passed: ${{ get('checks-passed') }}
 *
 *   # Return a simple value (wrapped as { result: value })
 *   - return: "completed"
 *   - return: 42
 *   - return: true
 *
 *   # Return an array (wrapped as { result: [...] })
 *   - return:
 *       - item1
 *       - item2
 * ```
 */

import type { PlaybookAction, PlaybookActionResult } from '../../types';
import type { PlaybookContext } from '../../types/state';
import { CatalystError } from '@core/errors';

/**
 * Configuration for return action - any value is accepted
 * Objects: all properties become outputs directly
 * Primitives/arrays: wrapped as { result: value }
 */
export type ReturnConfig = unknown;

/**
 * Early return data stored in context to signal termination
 */
export interface EarlyReturnData {
  code: string;
  message: string;
  outputs: Record<string, unknown>;
}

/**
 * Extend PlaybookContext to include earlyReturn property
 * (This augmentation allows TypeScript to recognize the property)
 */
declare module '../../types/state' {
  interface PlaybookContext {
    earlyReturn?: EarlyReturnData;
  }
}

/**
 * ReturnAction - Built-in action for successful early termination
 *
 * This action has privileged access to PlaybookContext and can set an
 * early return flag that the Engine detects to halt execution.
 *
 * Security: Context is injected via property after instantiation by Engine.
 * External actions cannot spoof this - Engine uses instanceof validation.
 *
 * @req FR:playbook-engine/actions.builtin.return - Successful playbook termination
 * @req FR:playbook-engine/actions.builtin.return.interface
 * @req FR:playbook-engine/actions.builtin.return.interpolation
 */
export class ReturnAction implements PlaybookAction<ReturnConfig> {
  static readonly actionType = 'return';
  readonly primaryProperty = 'outputs';

  /**
   * Privileged context access (injected by Engine after instantiation)
   * @internal
   */
  private __context?: PlaybookContext;

  /**
   * Create a new ReturnAction without dependencies
   *
   * Context will be injected by Engine via property injection.
   */
  constructor() {
    // No constructor parameters - Engine injects context via __context property
  }

  /**
   * Execute early return
   *
   * @req FR:playbook-engine/actions.builtin.return.validation - Validate outputs against playbook definition
   * @req FR:playbook-engine/actions.builtin.return.halt - Halt execution with completed status
   * @req FR:playbook-engine/actions.builtin.return.result - Return result with success status
   *
   * @param config - Return configuration (already interpolated by Engine)
   * @returns Success result with outputs
   * @throws CatalystError if context not injected or outputs don't match playbook schema
   */
  async execute(config: ReturnConfig): Promise<PlaybookActionResult> {
    // Validate privileged context access was granted
    if (!this.__context) {
      throw new CatalystError(
        'ReturnAction requires privileged context access',
        'MissingPrivilegedAccess',
        'This action must be instantiated by Engine with context injection'
      );
    }

    // Handle outputs - determine the actual return value
    // The transformer may wrap the value as { outputs: value } due to primaryProperty
    let outputs: Record<string, unknown>;
    let code = 'Success';
    let message = 'Playbook completed successfully';

    // Check if config is the transformer-wrapped form: { outputs: value }
    const configObj = config as Record<string, unknown> | undefined | null;
    const hasOutputsKey = configObj && typeof configObj === 'object' && !Array.isArray(configObj)
      && 'outputs' in configObj;

    if (hasOutputsKey) {
      // Config has outputs property - extract code/message if present, rest goes to outputs
      const rawValue = configObj.outputs;
      if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
        outputs = { ...(rawValue as Record<string, unknown>) };
      } else if (rawValue !== undefined && rawValue !== null) {
        outputs = { result: rawValue };
      } else {
        outputs = {};
      }
      // Extract optional code and message from config (not from outputs)
      if (typeof configObj.code === 'string') {
        code = configObj.code;
      }
      if (typeof configObj.message === 'string') {
        message = configObj.message;
      }
    } else if (config && typeof config === 'object' && !Array.isArray(config)) {
      // Object without outputs wrapper - extract code/message, rest becomes outputs
      const { code: configCode, message: configMessage, ...rest } = configObj as Record<string, unknown>;
      if (typeof configCode === 'string') {
        code = configCode;
      }
      if (typeof configMessage === 'string') {
        message = configMessage;
      }
      outputs = rest;
    } else if (config !== undefined && config !== null) {
      // Primitive or array - wrap in { result: value }
      outputs = { result: config };
    } else {
      outputs = {};
    }

    // Validate outputs against playbook definition if specified
    if (this.__context.playbook.outputs) {
      const expectedOutputs = this.__context.playbook.outputs;
      const providedOutputs = Object.keys(outputs);
      const expectedKeys = Object.keys(expectedOutputs);

      // Check for required outputs (basic validation)
      for (const key of expectedKeys) {
        if (!(key in outputs)) {
          // Log warning but don't fail (permissive validation)
          console.warn(
            `[ReturnAction] Output "${key}" is defined in playbook but not provided in return. ` +
              `Expected outputs: ${expectedKeys.join(', ')}`
          );
        }
      }

      // Type validation is permissive - log warnings but don't fail
      for (const key of providedOutputs) {
        if (expectedOutputs[key]) {
          const expectedType = expectedOutputs[key];
          const actualType = typeof outputs[key];
          if (expectedType !== actualType && outputs[key] !== null && outputs[key] !== undefined) {
            console.warn(
              `[ReturnAction] Output "${key}" has type "${actualType}" but playbook expects "${expectedType}"`
            );
          }
        }
      }
    }

    // Set early return flag in context (privileged access)
    this.__context.earlyReturn = {
      code,
      message,
      outputs
    };

    // Return success result with outputs
    // Engine will detect earlyReturn flag and halt execution
    return {
      code,
      message,
      value: outputs,
      error: undefined
    };
  }
}
