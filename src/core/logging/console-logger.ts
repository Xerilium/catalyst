import { LogLevel, Logger } from './types';

/** Interface for secret masking - matches SecretManager from template engine */
interface SecretMasker {
  mask(text: string): string;
}

/**
 * ANSI color codes for log output
 */
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

/**
 * Check if colors should be used in output.
 * Respects NO_COLOR environment variable.
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
 */
export class ConsoleLogger implements Logger {
  private readonly useColors: boolean;

  /**
   * Create a ConsoleLogger.
   *
   * @param level Maximum log level to output
   * @param secretManager Optional masker for sensitive values
   */
  constructor(
    private readonly level: LogLevel,
    private readonly secretManager?: SecretMasker
  ) {
    this.useColors = shouldUseColors();
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
   */
  private log(
    levelName: string,
    levelThreshold: LogLevel,
    message: string,
    data: unknown,
    useStderr: boolean
  ): void {
    // Level filtering - fast path for filtered messages
    if (this.level < levelThreshold) {
      return;
    }

    // Format the message with prefix
    let output = `[${levelName}] ${message}`;

    // Serialize data if provided
    if (data !== undefined) {
      try {
        output += ' ' + JSON.stringify(data);
      } catch {
        output += ' [unserializable]';
      }
    }

    // Apply secret masking if available
    if (this.secretManager) {
      output = this.secretManager.mask(output);
    }

    // Apply color based on level
    if (this.useColors) {
      output = this.colorize(levelName, output);
    }

    // Output to appropriate stream
    const stream = useStderr ? process.stderr : process.stdout;
    stream.write(output + '\n');
  }

  /**
   * Apply ANSI color based on log level.
   */
  private colorize(levelName: string, text: string): string {
    let color: string;
    switch (levelName) {
      case 'error':
        color = COLORS.red;
        break;
      case 'warning':
        color = COLORS.yellow;
        break;
      case 'info':
        color = COLORS.cyan;
        break;
      default:
        // verbose, debug, trace
        color = COLORS.dim;
        break;
    }
    return `${color}${text}${COLORS.reset}`;
  }
}
