import type { ErrorPolicy, ErrorAction } from '@core/errors';
import type { InputValidationRule } from './validation';

/**
 * Playbook definition interface
 *
 * Defines the structure of a workflow playbook. Playbooks are format-agnostic
 * and can be constructed from YAML, JSON, or TypeScript code directly.
 *
 * @example
 * ```typescript
 * const playbook: Playbook = {
 *   name: 'user-onboarding',
 *   description: 'Onboard new users to the platform',
 *   owner: 'Product Manager',
 *   steps: [
 *     { action: 'validate-email', config: { email: '{{email}}' } },
 *     { action: 'create-account', config: { email: '{{email}}' } }
 *   ]
 * };
 * ```
 */
export interface Playbook {
  /** Unique playbook identifier in kebab-case */
  name: string;

  /** Human-readable purpose statement */
  description: string;

  /** Event-based activation rules (optional) */
  triggers?: Array<{
    /** GitHub event type (e.g., 'issues', 'pull_request') */
    event: string;
    /** GitHub event action (e.g., 'opened', 'labeled') */
    action: string;
    /** Event-specific filters */
    args?: Record<string, unknown>;
  }>;  

  /** Responsible role (e.g., Engineer, Architect, Product Manager) */
  owner: string;

  /** Review requirements (optional) */
  reviewers?: {
    /** Roles that must approve */
    required: string[];
    /** Roles that may review */
    optional: string[];
  };

  /** Input parameters for playbook (optional) */
  inputs?: InputParameter[];
  
  /** Expected output names and types (optional) */
  outputs?: Record<string, string>;

  /** Resources to lock during execution (optional) */
  resources?: {
    /** File/directory paths to lock */
    paths?: string[];
    /** Git branches to lock */
    branches?: string[];
  };

  /** Array of execution steps */
  steps: PlaybookStep[];
  
  /** Error recovery rules (optional) */
  catch?: Array<{
    /** Error code to catch */
    code: string;
    /** Recovery steps */
    steps: PlaybookStep[];
  }>;

  /** Cleanup steps always executed (optional) */
  finally?: PlaybookStep[];
}

/**
 * Playbook step interface
 *
 * Represents a single execution step in a playbook. Steps are executed
 * sequentially by the playbook engine.
 *
 * @example
 * ```typescript
 * const step: PlaybookStep = {
 *   name: 'create-user',
 *   action: 'database-insert',
 *   config: {
 *     table: 'users',
 *     data: { email: '{{email}}', name: '{{name}}' }
 *   }
 * };
 * ```
 */
export interface PlaybookStep {
  /** Action type identifier in kebab-case */
  action: string;

  /** Step identifier for referencing results in variables (optional) */
  name?: string;

  /** Action-specific configuration object passed to action's execute() method */
  config: unknown;

  /** Error handling configuration (optional) */
  errorPolicy?: ErrorPolicy | ErrorAction;

  /**
   * Override action's default isolation mode for nested step execution (optional)
   *
   * Controls whether variables set by nested steps propagate back to the parent scope.
   * Only applicable to actions that execute nested steps (if, for-each, playbook).
   *
   * - `false` (shared scope): Variables propagate back to parent
   * - `true` (isolated): Variables do NOT propagate back
   *
   * If not specified, uses the action's default isolation mode.
   */
  isolated?: boolean;
}

/**
 * Input parameter definition for playbooks
 *
 * Defines the structure and validation rules for playbook input parameters.
 *
 * @example
 * ```typescript
 * const param: InputParameter = {
 *   name: 'user-email',
 *   type: 'string',
 *   description: 'Email address of the user',
 *   required: true,
 *   validation: [
 *     {
 *       type: 'Regex',
 *       pattern: '^[^@]+@[^@]+\\.[^@]+$',
 *       message: 'Invalid email format'
 *     }
 *   ]
 * };
 * ```
 */
export interface InputParameter {
  /** Parameter name in kebab-case */
  name: string;

  /** Parameter type */
  type: 'string' | 'number' | 'boolean';

  /** Human-readable description (optional) */
  description?: string;

  /** Whether parameter is required (default: false) */
  required?: boolean;

  /** Default value if not provided (optional) */
  default?: unknown;

  /** Enumeration of allowed values (optional) */
  allowed?: unknown[];

  /** Array of validation rules to apply (optional) */
  validation?: InputValidationRule[];
}
