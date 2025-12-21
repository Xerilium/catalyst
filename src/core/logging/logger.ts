import { CatalystError } from '../errors';
import type { Logger } from './types';

/**
 * Silent logger implementation that does nothing.
 * Used when Logger is not initialized.
 */
class NoOpLogger implements Logger {
  error(_message: string, _data?: unknown): void {
    // No-op
  }
  warning(_message: string, _data?: unknown): void {
    // No-op
  }
  info(_message: string, _data?: unknown): void {
    // No-op
  }
  verbose(_message: string, _data?: unknown): void {
    // No-op
  }
  debug(_message: string, _data?: unknown): void {
    // No-op
  }
  trace(_message: string, _data?: unknown): void {
    // No-op
  }
}

/** Shared NoOpLogger instance */
const noOpLogger = new NoOpLogger();

/**
 * Singleton accessor for the global Logger.
 *
 * - Call `initialize()` once at CLI startup to set the logger
 * - Call `getInstance()` anywhere to get the current logger
 * - Calling `initialize()` twice throws LoggerAlreadyInitialized
 * - Before initialization, `getInstance()` returns a no-op logger
 */
export class LoggerSingleton {
  private static instance: Logger | null = null;
  private static initialized = false;

  /**
   * Get the current logger instance.
   * Returns a no-op logger if not initialized.
   */
  static getInstance(): Logger {
    return LoggerSingleton.instance ?? noOpLogger;
  }

  /**
   * Initialize the global logger.
   * Must be called exactly once at application startup.
   *
   * @throws CatalystError with code LoggerAlreadyInitialized if called twice
   */
  static initialize(logger: Logger): void {
    if (LoggerSingleton.initialized) {
      throw new CatalystError(
        'Logger has already been initialized',
        'LoggerAlreadyInitialized',
        'Logger can only be initialized once at application startup. If you need to change the logger, use reset() first (testing only).'
      );
    }
    LoggerSingleton.instance = logger;
    LoggerSingleton.initialized = true;
  }

  /**
   * Reset the logger state for testing purposes.
   * Allows re-initialization after reset.
   */
  static reset(): void {
    LoggerSingleton.instance = null;
    LoggerSingleton.initialized = false;
  }
}
