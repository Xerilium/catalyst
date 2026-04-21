import { AsyncLocalStorage } from 'node:async_hooks';
import { CatalystError } from '../errors';
import type { Logger } from './types';

class NoOpLogger implements Logger {
  error(): void {}
  warning(): void {}
  info(): void {}
  verbose(): void {}
  debug(): void {}
  trace(): void {}
}

const noOpLogger = new NoOpLogger();
const loggerScope = new AsyncLocalStorage<Logger>();

/**
 * Contextual logger resolution.
 *
 * - `current()` returns the active scoped logger, falling back to the framework default, then no-op.
 * - `setFramework()` installs the default logger once at application startup.
 * - `scope(logger, fn)` runs `fn` with `logger` as the active logger for its entire async call tree.
 *
 * @req FR:logging/access.current
 * @req FR:logging/access.default
 * @req FR:logging/access.contextual
 * @req FR:logging/access.isolation
 * @req FR:logging/access.fallback
 * @req FR:logging/access.reset
 */
export class LogManager {
  private static frameworkLogger: Logger | null = null;
  private static frameworkLocked = false;

  /**
   * Return the logger appropriate for the current execution context.
   * Prefers the nearest enclosing scope established via {@link scope}; falls
   * back to the framework default, then to a no-op logger.
   */
  static current(): Logger {
    return loggerScope.getStore() ?? LogManager.frameworkLogger ?? noOpLogger;
  }

  /**
   * Return the framework default logger, bypassing any active scope.
   *
   * For framework-internal instrumentation (engine, template engine, action
   * internals) that should NOT route through playbook-scoped loggers. Playbook
   * author output (log-* actions, display) should use {@link current} instead.
   */
  static framework(): Logger {
    return LogManager.frameworkLogger ?? noOpLogger;
  }

  static setFramework(logger: Logger): void {
    if (LogManager.frameworkLocked) {
      throw new CatalystError(
        'Logger has already been initialized',
        'LoggerAlreadyInitialized',
        'Framework logger can only be configured once at application startup. Use reset() first (testing only) to reconfigure.'
      );
    }
    LogManager.frameworkLogger = logger;
    LogManager.frameworkLocked = true;
  }

  static scope<T>(logger: Logger, fn: () => T): T {
    return loggerScope.run(logger, fn);
  }

  static reset(): void {
    LogManager.frameworkLogger = null;
    LogManager.frameworkLocked = false;
  }
}
