/**
 * ThrowAction - Error termination action
 *
 * Terminates playbook execution with a custom error. Useful for business logic
 * validation and precondition checks.
 *
 * This is a stateless action (no constructor dependencies). Unlike other control
 * flow actions, it does not extend PlaybookActionWithSteps since it never executes
 * nested steps - it always throws immediately.
 *
 * @req FR:playbook-actions-controls/error-handling.throw-action
 * @req FR:playbook-actions-controls/error-handling.throw-action.base-class
 * @req FR:playbook-actions-controls/error-handling.throw-action.code-validation
 * @req FR:playbook-actions-controls/error-handling.throw-action.error-throwing
 * @req FR:playbook-actions-controls/error-handling.throw-action.validation
 * @req FR:playbook-actions-controls/error-handling.throw-action.interpolation
 * @req FR:playbook-actions-controls/metadata.primary-property
 *
 * @example
 * ```yaml
 * steps:
 *   # Shorthand syntax (primary property)
 *   - throw: ValidationFailed
 *
 *   # Full syntax with message and guidance
 *   - action: throw
 *     config:
 *       code: InsufficientBalance
 *       message: User balance is below minimum
 *       guidance: Increase account balance or reduce transaction amount
 *       metadata:
 *         user-id: 123
 *         required-balance: 100
 * ```
 */

import type { PlaybookAction, PlaybookActionResult } from '../../types';
import { CatalystError } from '@core/errors';
import type { ThrowConfig } from './types';
import { ThrowErrors } from './errors';

/**
 * Throw action - terminates playbook execution with custom error
 *
 * Stateless action with no constructor dependencies.
 */
export class ThrowAction implements PlaybookAction<ThrowConfig> {
  /**
   * Action type identifier for registry
   */
  static readonly actionType = 'throw';

  /**
   * Primary property for YAML shorthand syntax
   * Enables: `throw: ErrorCode`
   */
  static readonly primaryProperty = 'code';

  /**
   * Execute error throw
   *
   * NOTE: This method NEVER returns successfully - it always throws.
   *
   * @param config - Throw configuration (already interpolated by Engine)
   * @throws CatalystError with specified code, message, guidance, and metadata
   */
  async execute(config: ThrowConfig): Promise<PlaybookActionResult> {
    // Validate config structure
    if (!config || typeof config !== 'object') {
      throw ThrowErrors.configInvalid('config must be an object');
    }

    // Validate code is present
    if (!config.code || typeof config.code !== 'string' || config.code.trim() === '') {
      throw ThrowErrors.configInvalid('code property is required and must be a non-empty string');
    }

    const { code, message, guidance, metadata } = config;

    // Validate PascalCase format (warn only, don't fail)
    const pascalCaseRegex = /^[A-Z][a-zA-Z0-9]*$/;
    if (!pascalCaseRegex.test(code)) {
      console.warn(
        `[ThrowAction] Error code "${code}" does not follow PascalCase convention. ` +
          `Consider using PascalCase for consistency (e.g., "ValidationFailed", "ResourceNotFound").`
      );
    }

    // Construct CatalystError with provided details
    const error = new CatalystError(
      message || 'Playbook failed',
      code,
      guidance || 'Check playbook execution logs for details',
      undefined // cause
    );

    // Attach metadata as a custom property if provided
    if (metadata) {
      (error as any).metadata = metadata;
    }

    // Throw the error - Engine's error handling will process it
    throw error;
  }
}
