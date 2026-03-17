// @req FR:playbook-actions-io/log.warning-action

import { LogActionBase, type LogLevel } from './base-log-action';

/**
 * Log warning action
 *
 * Writes a warning message to stderr using console.warn().
 *
 * @example
 * ```yaml
 * steps:
 *   # Full syntax
 *   - action: log-warning
 *     config:
 *       message: "Feature {{feature-name}} is deprecated"
 *
 *   # Shorthand syntax
 *   - log-warning: "Config file not found, using defaults"
 * ```
 *
 * @example Output
 * ```
 * WARN : Playbook.Log: Config file not found, using defaults
 * ```
 */
export class LogWarningAction extends LogActionBase {
  static readonly actionType = 'log-warning';
  static readonly primaryProperty = 'message';

  protected readonly level: LogLevel = 'warning';
  protected readonly consoleMethod = console.warn;
}
