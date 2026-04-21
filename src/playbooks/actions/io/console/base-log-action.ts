import { PlaybookActionWithSteps, type PlaybookActionResult, type StepExecutor } from '../../../types';
import { CatalystError } from '@core/errors';
import { LogManager } from '@core/logging';
import type { Logger } from '@core/logging/types';
import type { LogConfig, LogResult } from '../types';

/**
 * Log level type
 */
export type LogLevel = 'error' | 'warning' | 'info' | 'verbose' | 'debug' | 'trace';

/**
 * Abstract base class for all log actions
 *
 * Uses the framework Logger (LoggerSingleton) for console output, ensuring
 * consistent formatting, colors, level filtering, and secret masking across
 * the entire application.
 *
 * @example Subclass implementation
 * ```typescript
 * export class LogInfoAction extends LogActionBase {
 *   static readonly actionType = 'log-info';
 *   protected readonly level: LogLevel = 'info';
 * }
 * ```
 */
export abstract class LogActionBase extends PlaybookActionWithSteps<LogConfig> {
  static readonly primaryProperty = 'message';

  /**
   * Log level for this action (error, warning, info, verbose, debug, trace)
   */
  protected abstract readonly level: LogLevel;

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
  // @req FR:playbook-actions-io/log.base-config
  // @req FR:playbook-actions-io/log.primary-property
  // @req NFR:playbook-actions-io/maintainability.single-responsibility
  // @req NFR:playbook-actions-io/maintainability.shared-logic
  async execute(config: LogConfig): Promise<PlaybookActionResult> {
    try {
      // Validate configuration
      this.validateConfig(config);

      // Get source from config or default to playbook name
      const source = config.source ?? this.getDefaultSource();

      // Get action from config or default to "Playbook"
      const action = config.action ?? 'Playbook';

      const { message, data } = config;

      // Use framework Logger for output — handles formatting, colors, filtering, and masking
      const logger: Logger = LogManager.current();
      logger[this.level](source, action, message, data);

      // Build result — always returned so engine captures in context.logs[]
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
