/**
 * ConsoleLogger implementation providing color-formatted console output
 * with level filtering, configurable formatting, and secret masking.
 *
 * @req FR:console.interface
 * @req FR:console.level
 * @req FR:console.config
 * @req FR:console.colors
 * @req FR:console.streams
 */

import { LogLevel, Logger } from './types';
import {
  ANSI_COLORS,
  LOG_OUTPUT_CONFIG,
  LogOutputConfig,
  buildLogPrefix,
  getColorCode,
} from './config';

/** Interface for secret masking - matches SecretManager from template engine */
interface SecretMasker {
  mask(text: string): string;
}

/**
 * Check if colors should be used in output.
 * Respects NO_COLOR environment variable and TTY detection.
 */
function shouldUseColors(): boolean {
  // NO_COLOR presence (even empty) disables colors
  if ('NO_COLOR' in process.env) {
    return false;
  }
  // Check if stdout is a TTY
  return process.stdout.isTTY === true;
}

/**
 * Map log levels to their numeric thresholds for filtering
 */
const LEVEL_THRESHOLDS = {
  error: LogLevel.error,
  warning: LogLevel.warning,
  info: LogLevel.info,
  verbose: LogLevel.verbose,
  debug: LogLevel.debug,
  trace: LogLevel.trace,
};

/**
 * ConsoleLogger implementation providing color-formatted console output
 * with level filtering and secret masking.
 *
 * @req FR:console.interface
 */
export class ConsoleLogger implements Logger {
  private readonly outputConfig: LogOutputConfig;

  /**
   * Create a ConsoleLogger.
   *
   * @param level Maximum log level to output
   * @param secretManager Optional masker for sensitive values
   * @param outputConfig Optional output configuration overrides
   *
   * @req FR:console.level
   * @req FR:console.config
   */
  constructor(
    private readonly level: LogLevel,
    private readonly secretManager?: SecretMasker,
    outputConfig?: Partial<LogOutputConfig>
  ) {
    const terminalSupportsColors = shouldUseColors();
    this.outputConfig = {
      ...LOG_OUTPUT_CONFIG,
      ...outputConfig,
      // Override useColor if terminal doesn't support it
      useColor: terminalSupportsColors && (outputConfig?.useColor ?? LOG_OUTPUT_CONFIG.useColor),
    };
  }

  error(message: string, data?: unknown): void {
    this.log('error', LEVEL_THRESHOLDS.error, message, data, true);
  }

  warning(message: string, data?: unknown): void {
    this.log('warning', LEVEL_THRESHOLDS.warning, message, data, true);
  }

  info(message: string, data?: unknown): void {
    this.log('info', LEVEL_THRESHOLDS.info, message, data, false);
  }

  verbose(message: string, data?: unknown): void {
    this.log('verbose', LEVEL_THRESHOLDS.verbose, message, data, false);
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', LEVEL_THRESHOLDS.debug, message, data, false);
  }

  trace(message: string, data?: unknown): void {
    this.log('trace', LEVEL_THRESHOLDS.trace, message, data, false);
  }

  /**
   * Internal log method handling filtering, formatting, masking, and output.
   *
   * @req FR:interface.filtering
   * @req FR:interface.prefix
   * @req FR:interface.serialization
   * @req FR:interface.masking
   */
  private log(
    levelName: string,
    levelThreshold: LogLevel,
    message: string,
    data: unknown,
    useStderr: boolean
  ): void {
    // Level filtering - fast path for filtered messages
    // @req NFR:performance.filtered
    if (this.level < levelThreshold) {
      return;
    }

    // Build the prefix using configuration
    // @req FR:config.format
    const prefix = buildLogPrefix(levelName, this.outputConfig);

    // Format the message with prefix
    let output = `${prefix}${message}`;

    // Serialize data if provided
    // @req FR:interface.serialization
    if (data !== undefined) {
      try {
        output += ' ' + JSON.stringify(data);
      } catch {
        output += ' [unserializable]';
      }
    }

    // Apply secret masking if available
    // @req FR:secrets.mask
    if (this.secretManager) {
      output = this.secretManager.mask(output);
    }

    // Apply color based on level and configuration
    // @req FR:console.colors
    if (this.outputConfig.useColor) {
      output = this.colorize(levelName, levelThreshold, prefix, output);
    }

    // Output to appropriate stream
    // @req FR:console.streams
    const stream = useStderr ? process.stderr : process.stdout;
    stream.write(output + '\n');
  }

  /**
   * Apply ANSI color based on log level and configuration.
   *
   * @param levelName - The log level name
   * @param levelThreshold - The numeric level threshold for this log level
   * @param prefix - The prefix portion of the output
   * @param fullOutput - The complete output string
   * @returns Colorized output string
   *
   * @req FR:console.colors
   * @req FR:config.options (fullColorThreshold, defaultColor)
   */
  private colorize(
    levelName: string,
    levelThreshold: number,
    prefix: string,
    fullOutput: string
  ): string {
    const colorCode = getColorCode(levelName);
    if (!colorCode) {
      return fullOutput;
    }

    // Check if this level should get full-line color
    const { fullColorThreshold } = this.outputConfig;
    const useFullColor = fullColorThreshold !== null && levelThreshold <= fullColorThreshold;

    if (useFullColor) {
      // Color the entire line
      return `${colorCode}${fullOutput}${ANSI_COLORS.reset}`;
    } else {
      // Color prefix with level color, message with default color (if set)
      const messageStart = prefix.length;
      const coloredPrefix = `${colorCode}${prefix}${ANSI_COLORS.reset}`;
      const messageContent = fullOutput.substring(messageStart);

      if (this.outputConfig.defaultColor) {
        const defaultColorCode = ANSI_COLORS[this.outputConfig.defaultColor];
        return `${coloredPrefix}${defaultColorCode}${messageContent}${ANSI_COLORS.reset}`;
      }
      return coloredPrefix + messageContent;
    }
  }
}
