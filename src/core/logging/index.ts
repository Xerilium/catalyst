/**
 * Logging module — leveled logging with contextual resolution across all Catalyst features.
 *
 * @example
 * ```typescript
 * import { LogManager, ConsoleLogger, LogLevel } from '@core/logging';
 *
 * // Configure the framework default at application startup
 * LogManager.setFramework(new ConsoleLogger(LogLevel.debug));
 *
 * // Any code calls current() to get the logger appropriate for its context
 * LogManager.current().info('Processing playbook', 'start', 'Starting');
 *
 * // Higher-level code can substitute the logger for an operation
 * await LogManager.scope(new ConsoleLogger(LogLevel.info), async () => {
 *   // Code here (sync or async) sees the substituted logger via current()
 * });
 * ```
 */

export { LogLevel, Logger } from './types';
export { LogManager } from './log-manager';
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
  getLogPrefixWidth,
} from './config';
