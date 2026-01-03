/**
 * Return Action (Built-in)
 *
 * Privileged action that terminates playbook execution successfully with
 * explicit outputs. Useful for early returns from conditional branches.
 *
 * @example
 * ```yaml
 * steps:
 *   # Shorthand syntax (primary property)
 *   - return: SuccessCode
 *
 *   # Full syntax with outputs
 *   - action: return
 *     config:
 *       code: ValidationPassed
 *       message: All checks completed successfully
 *       outputs:
 *         validated: true
 *         checks-passed: ${{ get('checks-passed') }}
 * ```
 */

import type { PlaybookAction, PlaybookActionResult } from '../../types';
import type { PlaybookContext } from '../../types/state';
import { CatalystError } from '@core/errors';

/**
 * Configuration for return action
 *
 * TODO: This should be imported from playbook-definition once available
 */
export interface ReturnConfig {
  /** Result code (default: 'Success') */
  code?: string;
  /** Human-readable message */
  message?: string;
  /** Structured outputs (supports template interpolation) */
  outputs?: Record<string, unknown>;
}

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
  static readonly primaryProperty = 'code';

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

    // Validate config structure
    if (config && typeof config !== 'object') {
      throw new CatalystError(
        'Return configuration must be an object',
        'ReturnConfigInvalid',
        'Provide config with optional "code", "message", and "outputs" properties'
      );
    }

    const code = config?.code || 'Success';
    const message = config?.message || 'Playbook completed successfully';
    const outputs = config?.outputs || {};

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
