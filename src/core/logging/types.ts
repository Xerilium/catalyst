/**
 * Log verbosity levels with numeric values for comparison.
 *
 * Higher numeric values include all lower level output.
 * Use with CLI -v flags: -v=info, -vv=verbose, -vvv=debug, -vvvv=trace
 */
export enum LogLevel {
  /** No output at all */
  silent = -1,
  /** Errors only */
  error = 0,
  /** Warnings and errors */
  warning = 1,
  /** Info, warnings, and errors (same level as warning) */
  info = 1,
  /** Verbose output including step flow */
  verbose = 2,
  /** Debug output including interpolation details */
  debug = 3,
  /** Maximum detail - everything including expression evaluation */
  trace = 4,
}

/**
 * Logger interface providing log methods for each verbosity level.
 *
 * Each method only outputs if the current level >= the method's level.
 * Output format: {prefix}{source}.{action}: {message} {data}
 *
 * @param source - The component doing the logging (e.g., "Engine", "GitHubAction")
 * @param action - The operation being performed (e.g., "execute", "validate")
 * @param message - Human-readable log message
 * @param data - Optional dictionary of action-specific data for measurement and analysis
 */
export interface Logger {
  /** Log error message (always shown unless silent) */
  error(source: string, action: string, message: string, data?: Record<string, unknown>): void;

  /** Log warning message (shown at -v and above) */
  warning(source: string, action: string, message: string, data?: Record<string, unknown>): void;

  /** Log info message (shown at -v and above) */
  info(source: string, action: string, message: string, data?: Record<string, unknown>): void;

  /** Log verbose message (shown at -vv and above) */
  verbose(source: string, action: string, message: string, data?: Record<string, unknown>): void;

  /** Log debug message (shown at -vvv and above) */
  debug(source: string, action: string, message: string, data?: Record<string, unknown>): void;

  /** Log trace message (shown at -vvvv) */
  trace(source: string, action: string, message: string, data?: Record<string, unknown>): void;
}
