/**
 * Type definitions for control flow actions
 */

import type { PlaybookStep } from '../../types';

/**
 * Configuration for if action
 */
export interface IfConfig {
  /**
   * Condition expression to evaluate (supports ${{}} template expressions)
   * The condition is evaluated after template interpolation by the engine.
   * Uses JavaScript truthy/falsy semantics.
   *
   * @example "${{ get('count') > 10 }}"
   * @example "${{ get('enabled') === true }}"
   */
  condition: string;

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
 * Configuration for throw action (error termination)
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
