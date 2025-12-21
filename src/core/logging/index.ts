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
 * ```
 */

export { LogLevel, Logger } from './types';
export { LoggerSingleton } from './logger';
export { ConsoleLogger } from './console-logger';
