// @req FR:playbook-actions-io/log.verbose-action

import { LogActionBase, type LogLevel } from './base-log-action';

/**
 * Log verbose action
 *
 * Writes a verbose message via the framework Logger.
 * Used for detailed progress information that may be too noisy for normal output.
 *
 * @example
 * ```yaml
 * steps:
 *   # Full syntax
 *   - action: log-verbose
 *     config:
 *       message: "Request headers: {{headers}}"
 *       source: "HttpClient"
 *       action: "SendRequest"
 *
 *   # Shorthand syntax
 *   - log-verbose: "File content length: {{content-length}} bytes"
 * ```
 */
export class LogVerboseAction extends LogActionBase {
  static readonly actionType = 'log-verbose';
  static readonly primaryProperty = 'message';

  protected readonly level: LogLevel = 'verbose';
}
