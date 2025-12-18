// @req FR:playbook-definition/types.state.interface
// @req FR:playbook-definition/types.state.context
// @req FR:playbook-definition/types.state.variables
import type { Playbook } from './playbook';
import { CatalystError } from '@core/errors';

/**
 * Playbook execution state
 *
 * Represents a serializable snapshot of playbook execution progress.
 * This state is persisted to disk and can be used to resume execution
 * after interruption.
 *
 * @req FR:playbook-definition/types.state.interface
 * @req FR:playbook-definition/types.state.variables
 *
 * @example
 * ```typescript
 * const state: PlaybookState = {
 *   playbookName: 'user-onboarding',
 *   runId: '20251128-143022-001',
 *   startTime: '2025-11-28T14:30:22Z',
 *   status: 'running',
 *   inputs: { 'user-email': 'alice@example.com' },
 *   variables: {
 *     'user-email': 'alice@example.com',
 *     'user-id': 123
 *   },
 *   completedSteps: ['validate-email', 'create-account'],
 *   currentStepName: 'send-welcome-email'
 * };
 * ```
 */
export interface PlaybookState {
  /** Name of playbook being executed */
  playbookName: string;

  /**
   * Unique run identifier
   *
   * Format: YYYYMMDD-HHMMSS-nnn
   * Example: 20251128-143022-001
   */
  runId: string;

  /**
   * Execution start timestamp in ISO 8601 format
   *
   * Example: 2025-11-28T14:30:22Z
   */
  startTime: string;

  /**
   * Current run status
   *
   * - 'running': Execution in progress
   * - 'paused': Execution paused (can be resumed)
   * - 'completed': Execution finished successfully
   * - 'failed': Execution failed with error
   */
  status: 'running' | 'paused' | 'completed' | 'failed';

  /**
   * Validated input parameters with kebab-case keys
   *
   * These are the input values provided when the playbook was started,
   * after validation against the input parameter definitions.
   */
  inputs: Record<string, unknown>;

  /**
   * All variables including inputs, var assignments, and step outputs
   *
   * The variables map provides unified lookup for the template engine.
   * It includes:
   * - All inputs (copied at start)
   * - Variables assigned via 'var' action
   * - Step outputs (added using step name as key)
   */
  variables: Record<string, unknown>;

  /**
   * Names of successfully completed steps
   *
   * Used to skip already-completed steps when resuming execution.
   */
  completedSteps: string[];

  /**
   * Name of step currently being executed
   *
   * This is the step that will execute next when resuming.
   */
  currentStepName: string;
}

/**
 * Runtime playbook execution context
 *
 * Extends PlaybookState with non-serializable runtime data. This is passed
 * to the playbook engine but NOT to individual action execute() methods.
 *
 * @req FR:playbook-definition/types.state.context
 *
 * @example
 * ```typescript
 * const context: PlaybookContext = {
 *   ...state,  // All PlaybookState properties
 *   playbook: {
 *     name: 'user-onboarding',
 *     description: 'Onboard new users',
 *     owner: 'Product',
 *     steps: [...]
 *   }
 * };
 * ```
 */
export interface PlaybookContext extends PlaybookState {
  /**
   * Playbook definition being executed
   *
   * This is runtime-only data and is NOT persisted to disk.
   * It provides the engine access to the playbook structure during execution.
   */
  playbook: Playbook;
}

/**
 * Error class for state persistence operations
 *
 * Thrown when state save, load, or archive operations fail.
 *
 * @example
 * ```typescript
 * throw new StateError(
 *   'Failed to save state for run 20251128-143022-001',
 *   'StateSaveFailed',
 *   'Check disk space and permissions',
 *   originalError
 * );
 * ```
 */
export class StateError extends CatalystError {
  /**
   * Create a new StateError
   *
   * @param message - Human-readable error message
   * @param code - Error code (e.g., 'StateSaveFailed', 'StateLoadFailed')
   * @param guidance - Actionable guidance for resolving the error
   * @param cause - Original error that caused this error (optional)
   */
  constructor(message: string, code: string, guidance: string, cause?: Error) {
    super(message, code, guidance, cause);
  }
}
