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
 * Output includes a level prefix (e.g., [debug]) and optional JSON-serialized data.
 */
export interface Logger {
  /** Log error message (always shown unless silent) */
  error(message: string, data?: unknown): void;

  /** Log warning message (shown at -v and above) */
  warning(message: string, data?: unknown): void;

  /** Log info message (shown at -v and above) */
  info(message: string, data?: unknown): void;

  /** Log verbose message (shown at -vv and above) */
  verbose(message: string, data?: unknown): void;

  /** Log debug message (shown at -vvv and above) */
  debug(message: string, data?: unknown): void;

  /** Log trace message (shown at -vvvv) */
  trace(message: string, data?: unknown): void;
}
