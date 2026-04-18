// @req FR:playbook-actions-io/log.info-action

import { LogActionBase, type LogLevel } from './base-log-action';

/**
 * Log info action
 *
 * Writes an informational message via the framework Logger.
 *
 * @example
 * ```yaml
 * steps:
 *   # Full syntax
 *   - action: log-info
 *     config:
 *       message: "Processing item {{index}} of {{total}}"
 *
 *   # Shorthand syntax
 *   - log-info: "Starting deployment to {{environment}}"
 * ```
 */
export class LogInfoAction extends LogActionBase {
  static readonly actionType = 'log-info';
  static readonly primaryProperty = 'message';

  protected readonly level: LogLevel = 'info';
}
