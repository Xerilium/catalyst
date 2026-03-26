/**
 * Type definitions for control flow actions
 */

import type { PlaybookStep, CatchBlock } from '../../types';

/**
 * Configuration for if action
 *
 * @req FR:playbook-actions-controls/conditional.if-action.base-class
 * @req NFR:playbook-actions-controls/maintainability.type-safety
 */
export interface IfConfig {
  /**
   * Condition expression to evaluate (supports ${{}} template expressions)
   * The condition is evaluated after template interpolation by the engine.
   * Uses JavaScript truthy/falsy semantics.
   *
   * Can be a string (for complex expressions), boolean, or number (when expression
   * result is returned directly from get()).
   *
   * @example "${{ get('count') > 10 }}"
   * @example "${{ get('enabled') }}" // Returns boolean directly
   * @example "${{ get('count') }}" // Returns number directly (0 is falsy)
   * @example true
   */
  condition: string | boolean | number;

  /**
   * Steps to execute when condition evaluates to truthy value
   */
  then: PlaybookStep[];

  /**
   * Steps to execute when condition evaluates to falsy value (optional)
   */
  else?: PlaybookStep[];
}

/**
 * Result structure for if action execution
 */
export interface IfResult {
  /**
   * Which branch was executed
   * - 'then': condition was truthy, then branch executed
   * - 'else': condition was falsy, else branch executed
   * - 'none': condition was falsy, no else branch provided
   */
  branch: 'then' | 'else' | 'none';

  /**
   * Number of steps executed in the taken branch
   */
  executed: number;
}

/**
 * Configuration for for-each action
 *
 * @req FR:playbook-actions-controls/iteration.for-each-action.base-class
 * @req NFR:playbook-actions-controls/maintainability.type-safety
 */
export interface ForEachConfig {
  /**
   * Array to iterate over
   * Can be an array directly or a string that resolves to an array after template interpolation
   *
   * @example [1, 2, 3]
   * @example "{{ get('file-list') }}"
   */
  in: unknown[] | string;

  /**
   * Variable name for current item (default: 'item')
   * This variable is scoped to the loop iteration and shadows parent variables
   *
   * @default "item"
   */
  item?: string;

  /**
   * Variable name for current index (default: 'index')
   * This variable is scoped to the loop iteration and shadows parent variables
   *
   * @default "index"
   */
  index?: string;

  /**
   * Steps to execute for each iteration
   */
  steps: PlaybookStep[];
}

/**
 * Result structure for for-each action execution
 */
export interface ForEachResult {
  /**
   * Total number of iterations performed
   */
  iterations: number;

  /**
   * Number of iterations that completed successfully
   */
  completed: number;

  /**
   * Number of iterations that failed
   * Failures are tracked when steps fail and error policy is Continue
   */
  failed: number;
}

/**
 * Configuration for playbook action (child playbook execution)
 *
 * @req FR:playbook-actions-controls/composition.playbook-action.base-class
 * @req NFR:playbook-actions-controls/maintainability.type-safety
 */
export interface PlaybookRunConfig {
  /**
   * Name of the playbook to execute
   * Loaded via PlaybookProvider.getInstance().load(name)
   *
   * @example "deploy-service"
   * @example "./playbooks/validate.yaml"
   */
  name: string;

  /**
   * Input values to pass to child playbook (optional)
   * Inputs are mapped to child playbook's input parameters
   */
  inputs?: Record<string, unknown>;
}

/**
 * Configuration for try action (scoped error handling)
 *
 * Executes steps with scoped catch and finally blocks, mirroring
 * the playbook-level catch/finally semantics but at the step level.
 *
 * @req FR:playbook-actions-controls/error-handling.try-action.base-class
 * @req NFR:playbook-actions-controls/maintainability.type-safety
 */
export interface TryConfig {
  /**
   * Steps to execute in the try block
   */
  steps: PlaybookStep[];

  /**
   * Error recovery blocks (optional)
   * Each block matches errors by code and executes recovery steps.
   * The caught error is accessible via $error variable.
   */
  catch?: CatchBlock[];

  /**
   * Cleanup steps always executed regardless of success or failure (optional)
   * Runs even if a catch block re-throws.
   */
  finally?: PlaybookStep[];
}

/**
 * Result structure for try action execution
 */
export interface TryResult {
  /**
   * Outcome of the try action
   * - 'success': Steps completed without error
   * - 'caught': An error was caught by a catch block
   * - 'uncaught': An error occurred but no matching catch block was found (error re-thrown)
   */
  outcome: 'success' | 'caught' | 'uncaught';

  /**
   * Number of steps executed in the try block before completion or error
   */
  executed: number;

  /**
   * Error code that was caught (only present when outcome is 'caught')
   */
  caughtError?: string;
}

/**
 * Configuration for throw action (error termination)
 *
 * @req FR:playbook-actions-controls/error-handling.throw-action.base-class
 * @req NFR:playbook-actions-controls/maintainability.type-safety
 */
export interface ThrowConfig {
  /**
   * Error message (supports template interpolation)
   * If not provided, defaults to "Playbook failed"
   */
  message?: string;

  /**
   * Error code (required, PascalCase recommended)
   * This becomes the CatalystError code
   *
   * @example "ValidationFailed"
   * @example "InsufficientBalance"
   */
  code: string;

  /**
   * Actionable fix guidance (optional, supports template interpolation)
   * Helps users understand how to resolve the error
   */
  guidance?: string;

  /**
   * Additional error metadata (optional)
   * Attached to CatalystError for debugging
   */
  metadata?: Record<string, unknown>;
}
