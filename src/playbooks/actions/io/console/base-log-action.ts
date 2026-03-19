// @req FR:playbook-actions-io/log.base-config
// @req FR:playbook-actions-io/log.primary-property
// @req NFR:playbook-actions-io/maintainability.single-responsibility
// @req NFR:playbook-actions-io/maintainability.shared-logic

import { PlaybookActionWithSteps, type PlaybookActionResult, type StepExecutor } from '../../../types';
import { CatalystError } from '@core/errors';
import type { LogConfig, LogResult } from '../types';

/**
 * Log level type
 */
export type LogLevel = 'error' | 'warning' | 'info' | 'verbose' | 'debug' | 'trace';

/**
 * Abstract base class for all log actions
 *
 * Extends PlaybookActionWithSteps to access stepExecutor.getVariable() for
 * retrieving the playbook name as the default source. Uses console.* methods
 * for direct user-facing output (distinct from the framework Logger used for
 * debug/trace instrumentation).
 *
 * @example Subclass implementation
 * ```typescript
 * export class LogInfoAction extends LogActionBase {
 *   static readonly actionType = 'log-info';
 *   protected readonly level: LogLevel = 'info';
 *   protected readonly consoleMethod = console.info;
 * }
 * ```
 */
export abstract class LogActionBase extends PlaybookActionWithSteps<LogConfig> {
  /**
   * Primary property for YAML shorthand syntax
   * Enables: `log-info: "My message"`
   */
  static readonly primaryProperty = 'message';

  /**
   * Log level for this action (error, warning, info, verbose, debug, trace)
   */
  protected abstract readonly level: LogLevel;

  /**
   * Console method to use for logging
   */
  protected abstract readonly consoleMethod: (...args: unknown[]) => void;

  /**
   * Construct log action with step executor for variable access
   */
  constructor(stepExecutor: StepExecutor) {
    super(stepExecutor);
  }

  /**
   * Execute the log action
   *
   * @param config - Log configuration with message, source, action, and optional data
   * @returns Promise resolving to action result
   */
  async execute(config: LogConfig): Promise<PlaybookActionResult> {
    try {
      // Validate configuration
      this.validateConfig(config);

      // Get source from config or default to playbook name
      const source = config.source ?? this.getDefaultSource();

      // Get action from config or default to "Playbook"
      const action = config.action ?? 'Playbook';

      const { message, data } = config;

      // Output message with optional JSON data
      const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : '';
      this.consoleMethod(`${message}${dataStr}`);

      // Build result
      const result: LogResult = {
        level: this.level,
        source,
        action,
        message,
        ...(data !== undefined && { data })
      };

      return {
        code: 'Success',
        message: `Logged ${this.level} message`,
        value: result,
        error: undefined
      };
    } catch (error) {
      return this.handleError(error as Error);
    }
  }

  /**
   * Get the default source from playbook context
   *
   * Uses stepExecutor.getVariable() to retrieve the playbook name.
   * Falls back to 'Playbook' if not available.
   *
   * @returns Default source string
   */
  private getDefaultSource(): string {
    const playbookName = this.stepExecutor.getVariable('playbook.name');
    if (typeof playbookName === 'string' && playbookName.length > 0) {
      return playbookName;
    }
    return 'Playbook';
  }

  /**
   * Validate configuration before execution
   *
   * @param config - Configuration to validate
   * @throws CatalystError if configuration is invalid
   */
  private validateConfig(config: LogConfig): void {
    if (!config || typeof config !== 'object') {
      throw new CatalystError(
        'Invalid configuration: config must be an object',
        'LogConfigInvalid',
        `The log action requires a config object with a 'message' property.`
      );
    }

    if (config.message === undefined || config.message === null) {
      throw new CatalystError(
        'Missing required configuration property: message',
        'LogConfigInvalid',
        `The log action requires a 'message' property in the config.`
      );
    }

    if (typeof config.message !== 'string') {
      throw new CatalystError(
        'Invalid message type: must be a string',
        'LogConfigInvalid',
        `The 'message' property must be a string. Received: ${typeof config.message}`
      );
    }

    // source is optional - defaults to playbook name via getDefaultSource()
    if (config.source !== undefined && config.source !== null && typeof config.source !== 'string') {
      throw new CatalystError(
        'Invalid source type: must be a string',
        'LogConfigInvalid',
        `The 'source' property must be a string. Received: ${typeof config.source}`
      );
    }

    // action is optional - defaults to "Playbook"
    if (config.action !== undefined && config.action !== null && typeof config.action !== 'string') {
      throw new CatalystError(
        'Invalid action type: must be a string',
        'LogConfigInvalid',
        `The 'action' property must be a string. Received: ${typeof config.action}`
      );
    }
  }

  /**
   * Handle errors and convert to PlaybookActionResult
   *
   * @param error - Error that occurred
   * @returns PlaybookActionResult with error details
   */
  private handleError(error: Error): PlaybookActionResult {
    // If already a CatalystError, return it
    if (error instanceof CatalystError) {
      return {
        code: error.code,
        message: `Log action failed: ${error.message}`,
        error
      };
    }

    // Generic error
    const catalystError = new CatalystError(
      `Failed to log message: ${error.message}`,
      'LogFailed',
      `An error occurred while logging. See error details for more information.`,
      error
    );

    return {
      code: catalystError.code,
      message: catalystError.message,
      error: catalystError
    };
  }
}
