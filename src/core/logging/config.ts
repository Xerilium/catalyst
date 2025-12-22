/**
 * Logging configuration for console output formatting
 *
 * Provides customizable formatting options for log output including
 * icons, text labels, colors, and alignment settings.
 *
 * @req FR:config.levels
 * @req FR:config.options
 * @req FR:config.format
 */

/**
 * ANSI color codes for log output
 * @req FR:console.colors
 */
export const ANSI_COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
} as const;

/**
 * Color name type for configuration
 */
export type ColorName = 'red' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'gray';

/**
 * Configuration for a single log level
 * @req FR:config.levels
 */
export interface LogLevelConfig {
  /** Icon (emoji or unicode character) to display */
  icon: string;
  /** Text label to display */
  text: string;
  /** ANSI color name for this level */
  color: ColorName;
}

/**
 * Per-level format settings
 * @req FR:config.levels
 */
export const LOG_LEVEL_CONFIG: Record<string, LogLevelConfig> = {
  error: { icon: '❌', text: 'ERROR', color: 'red' },
  warning: { icon: '⚠️', text: 'WARN', color: 'yellow' },
  info: { icon: 'ℹ️ ', text: 'INFO', color: 'blue' }, // Extra space to compensate for narrow rendering
  verbose: { icon: '🔍', text: 'VERB', color: 'gray' },
  debug: { icon: '🐛', text: 'DEBUG', color: 'magenta' },
  trace: { icon: '🧵', text: 'TRACE', color: 'cyan' },
};

/**
 * Global output display options
 * @req FR:config.options
 */
export interface LogOutputConfig {
  /** Whether to output icon before text (default: true) */
  showIcon: boolean;
  /** Whether to output text label after icon (default: true) */
  showText: boolean;
  /** Whether to apply ANSI colors (default: true, respects NO_COLOR and TTY) */
  useColor: boolean;
  /** Log level threshold at/above which full-line color is applied (null = prefix only) */
  fullColorThreshold: number | null;
  /** Default color for message text when not using full-line color (null = no color) */
  defaultColor: ColorName | null;
  /** Whether to pad text labels for consistent alignment (default: true) */
  alignText: boolean;
}

/**
 * Default output configuration
 * @req FR:config.options
 */
export const LOG_OUTPUT_CONFIG: LogOutputConfig = {
  showIcon: true,
  showText: true,
  useColor: true,
  fullColorThreshold: 1, // LogLevel.warning - errors and warnings get full color
  defaultColor: 'gray', // Message text color when not using full-line color
  alignText: true,
};

/**
 * Calculate the maximum text label length for alignment padding
 * @req FR:config.format
 */
export function getMaxTextLength(): number {
  return Math.max(
    ...Object.values(LOG_LEVEL_CONFIG).map((config) => config.text.length)
  );
}

/**
 * Build the log prefix based on configuration
 *
 * Format: {icon}{space}{text}{pad}{separator}
 * - {icon} is the level icon (if showIcon is true)
 * - {space} is a single space (only if both showIcon and showText are true)
 * - {text} is the level text label (if showText is true)
 * - {pad} is padding spaces for alignment (if showText and alignText are true)
 * - {separator} is ": " (only if showText is true)
 *
 * @param levelName - The log level name (error, warning, info, verbose, debug, trace)
 * @param config - Output configuration options
 * @returns Formatted prefix string
 * @req FR:config.format
 */
export function buildLogPrefix(
  levelName: string,
  config: LogOutputConfig = LOG_OUTPUT_CONFIG
): string {
  const levelConfig = LOG_LEVEL_CONFIG[levelName];
  if (!levelConfig) {
    return '';
  }

  const parts: string[] = [];

  // Add icon if enabled
  if (config.showIcon) {
    parts.push(levelConfig.icon);
  }

  // Add space between icon and text (only if both are shown)
  if (config.showIcon && config.showText) {
    parts.push(' ');
  }

  // Add text if enabled
  if (config.showText) {
    let text = levelConfig.text;

    // Add padding for alignment if enabled
    if (config.alignText) {
      const maxLen = getMaxTextLength();
      text = text.padEnd(maxLen);
    }

    parts.push(text);

    // Add separator (only if text is shown)
    parts.push(': ');
  }

  return parts.join('');
}

/**
 * Get the ANSI color code for a log level
 *
 * @param levelName - The log level name
 * @returns ANSI color escape code
 */
export function getColorCode(levelName: string): string {
  const levelConfig = LOG_LEVEL_CONFIG[levelName];
  if (!levelConfig) {
    return '';
  }
  return ANSI_COLORS[levelConfig.color];
}
