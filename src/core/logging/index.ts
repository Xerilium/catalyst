/**
 * Logging module - provides consistent, leveled logging across all Catalyst features.
 *
 * @example
 * ```typescript
 * import { Logger, ConsoleLogger, LogLevel } from '@core/logging';
 *
 * // Initialize at CLI startup
 * Logger.initialize(new ConsoleLogger(LogLevel.debug));
 *
 * // Use in any feature
 * const logger = Logger.getInstance();
 * logger.info('Processing playbook', { name: 'hello' });
 *
 * // With custom output configuration
 * const customLogger = new ConsoleLogger(LogLevel.debug, undefined, {
 *   showIcon: true,
 *   showText: false, // Icon only mode
 *   fullColor: false, // Color only the prefix
 * });
 * ```
 */

export { LogLevel, Logger } from './types';
export { LoggerSingleton } from './logger';
export { ConsoleLogger } from './console-logger';
export {
  LOG_LEVEL_CONFIG,
  LOG_OUTPUT_CONFIG,
  LogLevelConfig,
  LogOutputConfig,
  ANSI_COLORS,
  ColorName,
  buildLogPrefix,
  getColorCode,
  getMaxTextLength,
} from './config';
