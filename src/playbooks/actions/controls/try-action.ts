import { PlaybookActionWithSteps } from '../../types/action';
import type { PlaybookActionResult } from '../../types';
import type { TryConfig, TryResult } from './types';
import { TryErrors } from './errors';
import { CatalystError } from '@core/errors';
import { validateStepArray } from './validation';
import { LoggerSingleton } from '@core/logging';

/**
 * Try action - scoped error handling with catch and finally blocks
 *
 * Executes steps with local catch and finally blocks, mirroring the
 * playbook-level error handling semantics but scoped to individual steps.
 * This eliminates the need to wrap steps in a child playbook just for
 * error handling.
 *
 * Semantics (matching playbook-level behavior):
 * - catch blocks match errors by code (exact match)
 * - Caught error is accessible via $error variable with { code, message, guidance }
 * - Re-thrown errors in catch blocks chain the original error as cause
 * - finally block always executes regardless of success or failure
 * - Errors in finally are logged but don't fail the try action (if main succeeded)
 *
 * @example
 * ```yaml
 * steps:
 *   - try:
 *       steps:
 *         - http-get: https://api.example.com/data
 *         - script: |
 *             if (!get('result').ok) throw new Error('API failed');
 *       catch:
 *         - code: HttpError
 *           steps:
 *             - log-warning: "API call failed: {{$error.message}}"
 *             - var: api-data
 *               value: null
 *       finally:
 *         - log-debug: "API call attempt complete"
 * ```
 *
 * @req FR:playbook-actions-controls/error-handling.try-action
 * @req NFR:playbook-actions-controls/maintainability.interface-contract
 */
export class TryAction extends PlaybookActionWithSteps<TryConfig> {
  /** Action type identifier for registry */
  static readonly actionType = 'try';

  /** Primary property for YAML shorthand syntax */
  static readonly primaryProperty = 'steps';

  /**
   * Default isolation mode for nested step execution
   * Try blocks share parent scope so variables propagate back
   */
  readonly isolated = false;

  /**
   * Execute try-catch-finally block
   *
   * @param config - Try action configuration
   * @returns Promise resolving to action result with outcome information
   *
   * @req FR:playbook-actions-controls/error-handling.try-action.base-class
   * @req FR:playbook-actions-controls/error-handling.try-action.steps
   * @req FR:playbook-actions-controls/error-handling.try-action.catch
   * @req FR:playbook-actions-controls/error-handling.try-action.error-chaining
   * @req FR:playbook-actions-controls/error-handling.try-action.result
   * @req FR:playbook-actions-controls/execution.nested-steps.base-class
   * @req FR:playbook-actions-controls/execution.nested-steps.mechanisms
   */
  async execute(config: TryConfig): Promise<PlaybookActionResult> {
    const logger = LoggerSingleton.getInstance();

    // Step 1: Validate configuration
    this.validateConfig(config);

    let executed = 0;
    let executionError: CatalystError | undefined;

    // Step 2: Execute try steps
    try {
      logger.verbose('TryAction', 'Execute', 'Executing try steps', { stepCount: config.steps.length });
      const results = await this.stepExecutor.executeSteps(config.steps, undefined);
      executed = results.length;
    } catch (error) {
      executionError = error instanceof CatalystError ? error : new CatalystError(
        error instanceof Error ? error.message : String(error),
        'ExecutionFailed',
        `Step execution failed: ${error instanceof Error ? error.message : String(error)}`
      );

      logger.verbose('TryAction', 'Execute', 'Error in try steps', {
        errorCode: executionError.code,
        errorMessage: executionError.message
      });

      // Step 3: Execute catch blocks if defined
      if (config.catch && config.catch.length > 0) {
        const matchingBlock = config.catch.find(block => block.code === executionError!.code);

        if (matchingBlock) {
          logger.verbose('TryAction', 'Execute', 'Executing catch block', { code: matchingBlock.code });

          // Set $error variable for catch block access
          const originalErrorVar = this.stepExecutor.getVariable('$error');
          this.stepExecutor.setVariable('$error', {
            code: executionError.code,
            message: executionError.message,
            guidance: executionError.guidance
          });

          try {
            await this.stepExecutor.executeSteps(matchingBlock.steps, undefined);

            // Error was successfully caught - clear it
            const caughtCode = executionError.code;
            executionError = undefined;

            // Restore $error variable
            if (originalErrorVar === undefined) {
              this.stepExecutor.setVariable('$error', undefined as any);
            } else {
              this.stepExecutor.setVariable('$error', originalErrorVar);
            }

            // Return caught result after finally
            const result: TryResult = {
              outcome: 'caught',
              executed,
              caughtError: caughtCode
            };

            // Execute finally if defined (still need to run after catch)
            if (config.finally && config.finally.length > 0) {
              await this.executeFinally(config.finally, logger);
            }

            return {
              code: 'Success',
              message: `Error '${caughtCode}' caught and handled`,
              value: result
            };
          } catch (catchError) {
            // Catch block re-threw - chain original error as cause
            if (catchError instanceof CatalystError) {
              if (!catchError.cause) {
                (catchError as any).cause = executionError;
              }
              executionError = catchError;
            } else {
              const catchMsg = catchError instanceof Error ? catchError.message : String(catchError);
              executionError = new CatalystError(
                catchMsg,
                'CatchBlockFailed',
                `Catch block failed while handling error '${executionError!.code}': ${catchMsg}`,
                executionError
              );
            }

            logger.verbose('TryAction', 'Execute', 'Catch block re-threw', {
              errorCode: executionError.code
            });
          } finally {
            // Restore $error variable
            if (originalErrorVar === undefined) {
              this.stepExecutor.setVariable('$error', undefined as any);
            } else {
              this.stepExecutor.setVariable('$error', originalErrorVar);
            }
          }
        }
      }
    }

    // Step 4: Execute finally block (always runs)
    if (config.finally && config.finally.length > 0) {
      await this.executeFinally(config.finally, logger);
    }

    // Step 5: If there's still an unhandled error, re-throw it
    if (executionError) {
      throw executionError;
    }

    // Step 6: Return success result
    const result: TryResult = {
      outcome: 'success',
      executed
    };

    return {
      code: 'Success',
      message: `Try block completed successfully with ${executed} steps`,
      value: result
    };
  }

  /**
   * Execute finally steps with error suppression
   *
   * Finally block errors are logged but don't override the primary execution outcome.
   *
   * @req FR:playbook-actions-controls/error-handling.try-action.finally
   */
  private async executeFinally(finallySteps: any[], logger: any): Promise<void> {
    try {
      logger.verbose('TryAction', 'ExecuteFinally', 'Executing finally steps', { stepCount: finallySteps.length });
      await this.stepExecutor.executeSteps(finallySteps, undefined);
    } catch (finallyError) {
      logger.warning('TryAction', 'ExecuteFinally', 'Error in finally block', {
        error: finallyError instanceof Error ? finallyError.message : String(finallyError)
      });
      // Don't fail if finally fails - match playbook-level behavior
    }
  }

  /**
   * Validate try action configuration
   *
   * @param config - Configuration to validate
   * @throws CatalystError if configuration is invalid
   *
   * @req FR:playbook-actions-controls/error-handling.try-action.validation
   */
  private validateConfig(config: TryConfig): void {
    if (!config || typeof config !== 'object') {
      throw TryErrors.configInvalid('config must be an object');
    }

    if (!config.steps) {
      throw TryErrors.configInvalid('steps property is required');
    }

    validateStepArray(config.steps, 'Try', 'steps');

    // Validate catch blocks if provided
    if (config.catch !== undefined) {
      if (!Array.isArray(config.catch)) {
        throw TryErrors.configInvalid('catch property must be an array of catch blocks');
      }

      for (let i = 0; i < config.catch.length; i++) {
        const block = config.catch[i];
        if (!block || typeof block !== 'object') {
          throw TryErrors.configInvalid(`catch block at index ${i} must be an object`);
        }
        if (!block.code || typeof block.code !== 'string' || block.code.trim() === '') {
          throw TryErrors.configInvalid(`catch block at index ${i} must have a non-empty "code" property`);
        }
        if (!block.steps || !Array.isArray(block.steps)) {
          throw TryErrors.configInvalid(`catch block "${block.code}" must have a "steps" array`);
        }
        validateStepArray(block.steps, 'Try', `catch[${block.code}].steps`);
      }
    }

    // Validate finally steps if provided
    if (config.finally !== undefined) {
      if (!Array.isArray(config.finally)) {
        throw TryErrors.configInvalid('finally property must be an array');
      }

      if (config.finally.length > 0) {
        validateStepArray(config.finally, 'Try', 'finally');
      }
    }
  }
}
