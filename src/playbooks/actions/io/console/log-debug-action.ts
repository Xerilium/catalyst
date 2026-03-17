// @req FR:playbook-actions-io/log.debug-action

import { LogActionBase, type LogLevel } from './base-log-action';

/**
 * Log debug action
 *
 * Writes a debug message to stdout using console.debug().
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
 *
 * @example Output
 * ```
 * DEBUG: Playbook.Log: Current state: active {"variables":{"x":1,"y":2}}
 * ```
 */
export class LogDebugAction extends LogActionBase {
  static readonly actionType = 'log-debug';
  static readonly primaryProperty = 'message';

  protected readonly level: LogLevel = 'debug';
  protected readonly consoleMethod = console.debug;
}
