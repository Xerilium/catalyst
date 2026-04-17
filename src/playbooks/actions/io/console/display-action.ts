// @req FR:playbook-actions-io/display.implementation
import { PlaybookActionWithSteps, type PlaybookActionResult, type StepExecutor } from '../../../types';
import { CatalystError } from '@core/errors';
import type { DisplayConfig } from '../types';

/**
 * Display action — writes plain text to console with no diagnostic prefix.
 *
 * Unlike log-* actions which prefix output with level/source/action metadata,
 * this action outputs the raw message via console.log(). When `log: true`,
 * the result value includes log entry fields so the engine can capture it
 * in context.logs[] for non-terminal UI consumers.
 *
 * @example Shorthand syntax
 * ```yaml
 * display: "Hello world"
 * ```
 *
 * @example With log capture
 * ```yaml
 * display:
 *   config:
 *     message: "Processing complete"
 *     log: true
 * ```
 */
export class DisplayAction extends PlaybookActionWithSteps<DisplayConfig> {
  static readonly actionType = 'display';
  static readonly primaryProperty = 'message';

  constructor(stepExecutor: StepExecutor) {
    super(stepExecutor);
  }

  /**
   * Execute the display action
   *
   * @req FR:playbook-actions-io/display.primary-property
   * @req FR:playbook-actions-io/display.console-output
   * @req FR:playbook-actions-io/display.result-format
   * @req FR:playbook-actions-io/display.log-capture
   */
  async execute(config: DisplayConfig): Promise<PlaybookActionResult> {
    try {
      this.validateConfig(config);

      const { message } = config;

      // Output raw message — no level, no source, no color
      console.log(message);

      // Base result
      const value: Record<string, unknown> = { message };

      // When log is true, enrich value for engine log capture
      if (config.log) {
        value.level = 'display';
        value.source = this.getDefaultSource();
        value.action = 'Playbook';
      }

      return {
        code: 'Success',
        message: 'Displayed message',
        value,
        error: undefined
      };
    } catch (error) {
      return this.handleError(error as Error);
    }
  }

  /**
   * Get the default source from playbook context
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
   * @req FR:playbook-actions-io/display.error-handling
   */
  private validateConfig(config: DisplayConfig): void {
    if (!config || typeof config !== 'object') {
      throw new CatalystError(
        'Invalid configuration: config must be an object',
        'DisplayConfigInvalid',
        `The display action requires a config object with a 'message' property.`
      );
    }

    if (config.message === undefined || config.message === null) {
      throw new CatalystError(
        'Missing required configuration property: message',
        'DisplayConfigInvalid',
        `The display action requires a 'message' property in the config.`
      );
    }

    if (typeof config.message !== 'string') {
      throw new CatalystError(
        'Invalid message type: must be a string',
        'DisplayConfigInvalid',
        `The 'message' property must be a string. Received: ${typeof config.message}`
      );
    }
  }

  /**
   * Handle errors and convert to PlaybookActionResult
   */
  private handleError(error: Error): PlaybookActionResult {
    if (error instanceof CatalystError) {
      return {
        code: error.code,
        message: `Display action failed: ${error.message}`,
        error
      };
    }

    const catalystError = new CatalystError(
      `Failed to display message: ${error.message}`,
      'DisplayFailed',
      `An error occurred while displaying. See error details for more information.`,
      error
    );

    return {
      code: catalystError.code,
      message: catalystError.message,
      error: catalystError
    };
  }
}
