import type { CatalystError } from '../errors';

/**
 * Execution options for playbook runs
 *
 * Configures how the playbook engine executes workflows.
 *
 * @example
 * ```typescript
 * const options: ExecutionOptions = {
 *   mode: 'normal',
 *   autonomous: false,
 *   maxRecursionDepth: 10,
 *   actor: 'user@example.com',
 *   workingDirectory: '/path/to/project'
 * };
 * ```
 */
export interface ExecutionOptions {
  /**
   * Execution mode
   *
   * - 'normal': Execute actions normally with side effects
   * - 'what-if': Simulate execution without side effects (dry-run)
   *
   * @default 'normal'
   */
  mode?: 'normal' | 'what-if';

  /**
   * Autonomous execution flag
   *
   * When true, checkpoints are automatically approved without user input.
   * When false, checkpoints pause execution until user approval.
   *
   * @default false
   */
  autonomous?: boolean;

  /**
   * Maximum recursion depth for playbook composition
   *
   * Prevents infinite recursion when playbooks invoke child playbooks.
   * Execution fails if depth exceeds this limit.
   *
   * @default 10
   */
  maxRecursionDepth?: number;

  /**
   * Actor executing the playbook
   *
   * User or service account initiating execution.
   * Used for logging, RBAC checks, and lock ownership.
   *
   * @example 'user@example.com', 'github-actions', 'product-manager'
   */
  actor?: string;

  /**
   * Base directory for execution
   *
   * Used to resolve relative file paths in actions.
   * Defaults to current working directory.
   */
  workingDirectory?: string;
}

/**
 * Result of playbook execution
 *
 * Contains execution outcome, outputs, metrics, and error details.
 *
 * @example
 * ```typescript
 * const result: ExecutionResult = {
 *   runId: '20251201-143022-001',
 *   status: 'completed',
 *   outputs: { 'user-id': 123 },
 *   error: undefined,
 *   duration: 5432,
 *   stepsExecuted: 5,
 *   startTime: '2025-12-01T14:30:22Z',
 *   endTime: '2025-12-01T14:30:27Z'
 * };
 * ```
 */
export interface ExecutionResult {
  /**
   * Unique run identifier
   *
   * Format: YYYYMMDD-HHMMSS-nnn
   * Example: 20251201-143022-001
   */
  runId: string;

  /**
   * Execution status
   *
   * - 'completed': Execution finished successfully
   * - 'failed': Execution failed with error
   * - 'paused': Execution paused (can be resumed)
   */
  status: 'completed' | 'failed' | 'paused';

  /**
   * Output values from playbook
   *
   * Maps output names (from playbook.outputs) to their values.
   * Empty object if playbook defines no outputs.
   */
  outputs: Record<string, unknown>;

  /**
   * Error details if execution failed
   *
   * Undefined if execution succeeded or is paused.
   */
  error?: CatalystError;

  /**
   * Execution duration in milliseconds
   *
   * Time from start to completion/failure.
   */
  duration: number;

  /**
   * Number of steps successfully executed
   *
   * Includes steps from main playbook and child playbooks.
   */
  stepsExecuted: number;

  /**
   * Execution start time in ISO 8601 format
   *
   * Example: 2025-12-01T14:30:22Z
   */
  startTime: string;

  /**
   * Execution end time in ISO 8601 format
   *
   * Example: 2025-12-01T14:30:27Z
   */
  endTime: string;
}
