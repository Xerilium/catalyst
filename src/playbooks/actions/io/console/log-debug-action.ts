// @req FR:playbook-actions-io/log.debug-action

import { LogActionBase, type LogLevel } from './base-log-action';

/**
 * Log debug action
 *
 * Writes a debug message via the framework Logger.
 * Used for troubleshooting and development diagnostics.
 *
 * @example
 * ```yaml
 * steps:
 *   # Full syntax
 *   - action: log-debug
 *     config:
 *       message: "Current state: {{state}}"
 *       data:
 *         variables: { x: 1, y: 2 }
 *
 *   # Shorthand syntax
 *   - log-debug: "Variable values: x={{x}}, y={{y}}"
 * ```
 */
export class LogDebugAction extends LogActionBase {
  static readonly actionType = 'log-debug';
  static readonly primaryProperty = 'message';

  protected readonly level: LogLevel = 'debug';
}
