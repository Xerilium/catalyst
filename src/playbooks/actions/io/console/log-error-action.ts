// @req FR:playbook-actions-io/log.error-action

import { LogActionBase, type LogLevel } from './base-log-action';

/**
 * Log error action
 *
 * Writes an error message via the framework Logger.
 * Does NOT terminate playbook execution - use the 'throw' action for that.
 *
 * @example
 * ```yaml
 * steps:
 *   # Full syntax
 *   - action: log-error
 *     config:
 *       message: "Validation failed for {{item-name}}"
 *       source: "Validator"
 *       action: "CheckInput"
 *
 *   # Shorthand syntax
 *   - log-error: "Error processing {{file}}: {{error}}"
 * ```
 */
export class LogErrorAction extends LogActionBase {
  static readonly actionType = 'log-error';
  static readonly primaryProperty = 'message';

  protected readonly level: LogLevel = 'error';
}
