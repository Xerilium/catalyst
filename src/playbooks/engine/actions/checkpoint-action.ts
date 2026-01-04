/**
 * Checkpoint Action (Built-in)
 *
 * Privileged action that pauses execution for human approval at critical decision points.
 * In autonomous mode, checkpoints are automatically approved without pausing.
 *
 * @example
 * ```yaml
 * steps:
 *   # Shorthand syntax (primary property)
 *   - checkpoint: Review the research findings before proceeding
 *
 *   # Full syntax
 *   - action: checkpoint
 *     name: review-spec
 *     config:
 *       message: Please review the specification before implementation
 * ```
 */

import type { PlaybookAction, PlaybookActionResult } from '../../types';
import type { PlaybookContext } from '../../types/state';
import { CatalystError } from '@core/errors';

/**
 * Configuration for checkpoint action
 */
export interface CheckpointConfig {
  /** Human-readable message explaining what to review */
  message: string;
}

/**
 * Extended context with checkpoint pause signal
 */
interface CheckpointContext extends PlaybookContext {
  /** Signal to engine that execution should pause */
  checkpointPause?: {
    stepName: string;
    message: string;
  };
  /** Execution options (passed by engine) */
  options?: {
    autonomous?: boolean;
  };
}

/**
 * CheckpointAction - Built-in action for human approval checkpoints
 *
 * This action has privileged access to PlaybookContext and can:
 * - Signal the engine to pause execution
 * - Track approved checkpoints for resume support
 *
 * Security: Context is injected via property after instantiation by Engine.
 * External actions cannot spoof this - Engine uses instanceof validation.
 *
 * @req FR:playbook-engine/actions.builtin.checkpoint - Human checkpoint action
 * @req FR:playbook-engine/actions.builtin.checkpoint.pause - Pause execution
 * @req FR:playbook-engine/actions.builtin.checkpoint.manual - Manual mode pauses for input
 * @req FR:playbook-engine/actions.builtin.checkpoint.autonomous - Auto-approve in autonomous mode
 * @req FR:playbook-engine/actions.builtin.checkpoint.persistence - Persist approval state
 * @req FR:playbook-engine/actions.builtin.checkpoint.resume - Respect approved checkpoints
 */
export class CheckpointAction implements PlaybookAction<CheckpointConfig> {
  static readonly actionType = 'checkpoint';
  static readonly primaryProperty = 'message';

  /**
   * Privileged context access (injected by Engine after instantiation)
   * @internal
   */
  private __context?: CheckpointContext;

  /**
   * Create a new CheckpointAction without dependencies
   *
   * Context will be injected by Engine via property injection.
   */
  constructor() {
    // No constructor parameters - Engine injects context via __context property
  }

  /**
   * Execute checkpoint - pause for approval or auto-approve
   *
   * @param config - Checkpoint configuration (already interpolated by Engine)
   * @returns Success result if approved, or signals pause
   * @throws CatalystError if context not injected
   */
  async execute(config: CheckpointConfig): Promise<PlaybookActionResult> {
    // Validate privileged context access was granted
    if (!this.__context) {
      throw new CatalystError(
        'CheckpointAction requires privileged context access',
        'MissingPrivilegedAccess',
        'This action must be instantiated by Engine with context injection'
      );
    }

    // Validate config structure
    if (!config || typeof config !== 'object') {
      throw new CatalystError(
        'Checkpoint configuration must be an object',
        'CheckpointConfigInvalid',
        'Provide config with "message" property'
      );
    }

    // Validate message is present
    if (!config.message || typeof config.message !== 'string') {
      throw new CatalystError(
        'Checkpoint message is required and must be a string',
        'CheckpointMessageRequired',
        'Provide a human-readable message explaining what to review'
      );
    }

    const { message } = config;
    const stepName = this.__context.currentStepName;
    const isAutonomous = this.__context.options?.autonomous ?? false;

    // Initialize approvedCheckpoints if not present
    if (!this.__context.approvedCheckpoints) {
      this.__context.approvedCheckpoints = [];
    }

    // Check if this checkpoint was already approved (for resume)
    if (this.__context.approvedCheckpoints.includes(stepName)) {
      return {
        code: 'CheckpointApproved',
        message: `Checkpoint "${stepName}" was previously approved`,
        value: { approved: true, previouslyApproved: true },
        error: undefined
      };
    }

    // In autonomous mode, auto-approve
    if (isAutonomous) {
      // Mark as approved for future resumes
      this.__context.approvedCheckpoints.push(stepName);

      return {
        code: 'CheckpointAutoApproved',
        message: `Checkpoint "${stepName}" auto-approved (autonomous mode)`,
        value: { approved: true, autonomous: true },
        error: undefined
      };
    }

    // Manual mode - signal pause to engine
    // The engine will check for checkpointPause and handle accordingly
    this.__context.checkpointPause = {
      stepName,
      message
    };

    // Mark as approved BEFORE pausing (so resume doesn't re-prompt)
    this.__context.approvedCheckpoints.push(stepName);

    return {
      code: 'CheckpointPaused',
      message: `Checkpoint "${stepName}": ${message}`,
      value: { approved: false, paused: true, message },
      error: undefined
    };
  }
}
