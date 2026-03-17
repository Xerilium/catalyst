// @req FR:playbook-actions-io/log.trace-action

import { LogActionBase, type LogLevel } from './base-log-action';

/**
 * Log trace action
 *
 * Writes a trace message to stdout using console.log().
 * Intended for telemetry and detailed execution tracing.
 *
 * @example
 * ```yaml
 * steps:
 *   # Full syntax
 *   - action: log-trace
 *     config:
 *       message: "Step completed"
 *       source: "Engine"
 *       action: "ExecuteStep"
 *       data:
 *         step: "product-md"
 *         duration: 150
 *
 *   # Shorthand syntax
 *   - log-trace: "API call: method={{method}}, url={{url}}, status={{status}}"
 * ```
 *
 * @example Output
 * ```
 * TRACE: Engine.ExecuteStep: Step completed {"step":"product-md","duration":150}
 * ```
 */
export class LogTraceAction extends LogActionBase {
  static readonly actionType = 'log-trace';
  static readonly primaryProperty = 'message';

  protected readonly level: LogLevel = 'trace';
  protected readonly consoleMethod = console.log;
}
