/**
 * Variable Assignment Action (Built-in)
 *
 * Privileged action that sets custom variables in the execution context.
 * Variables can be used in subsequent steps via template interpolation.
 *
 * @example
 * ```yaml
 * steps:
 *   # Shorthand syntax (primary property)
 *   - var: user-count
 *     value: 42
 *
 *   # Full syntax
 *   - action: var
 *     config:
 *       name: calculated-result
 *       value: ${{ get('input-a') + get('input-b') }}
 * ```
 */

import type { PlaybookAction, PlaybookActionResult } from '../../playbooks/types';
import type { PlaybookContext } from '../../playbooks/types/state';
import { CatalystError } from '../../errors';

/**
 * Configuration for var action
 *
 * TODO: This should be imported from playbook-definition once available
 */
export interface VarConfig {
  /** Variable name (kebab-case) */
  name: string;
  /** Value to assign (supports template interpolation) */
  value: unknown;
}

/**
 * VarAction - Built-in action for variable assignment
 *
 * This action has privileged access to PlaybookContext and can directly
 * mutate the variables map. Regular actions do not have this capability.
 *
 * Security: Context is injected via property after instantiation by Engine.
 * External actions cannot spoof this - Engine uses instanceof validation.
 */
export class VarAction implements PlaybookAction<VarConfig> {
  static readonly actionType = 'var';
  static readonly primaryProperty = 'name';

  /**
   * Privileged context access (injected by Engine after instantiation)
   * @internal
   */
  private __context?: PlaybookContext;

  /**
   * Create a new VarAction without dependencies
   *
   * Context will be injected by Engine via property injection.
   */
  constructor() {
    // No constructor parameters - Engine injects context via __context property
  }

  /**
   * Execute variable assignment
   *
   * @param config - Variable configuration (already interpolated by Engine)
   * @returns Success result with assigned value
   * @throws CatalystError if variable name is invalid or context not injected
   */
  async execute(config: VarConfig): Promise<PlaybookActionResult> {
    // Validate privileged context access was granted
    if (!this.__context) {
      throw new CatalystError(
        'VarAction requires privileged context access',
        'MissingPrivilegedAccess',
        'This action must be instantiated by Engine with context injection'
      );
    }

    // Validate config structure
    if (!config || typeof config !== 'object') {
      throw new CatalystError(
        'Variable configuration must be an object',
        'VarConfigInvalid',
        'Provide config with "name" and "value" properties'
      );
    }

    // Validate name is present
    if (!config.name || typeof config.name !== 'string') {
      throw new CatalystError(
        'Variable name is required and must be a string',
        'VarInvalidName',
        'Provide a valid variable name in kebab-case format'
      );
    }

    const { name, value} = config;

    // Validate kebab-case format (warn only, don't fail)
    const kebabCaseRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
    if (!kebabCaseRegex.test(name)) {
      console.warn(
        `[VarAction] Variable name "${name}" does not follow kebab-case convention. ` +
          `Consider using kebab-case for consistency (e.g., "user-id", "total-count").`
      );
    }

    // Directly mutate context variables (privileged access)
    this.__context.variables[name] = value;

    // Return success result with assigned value
    return {
      code: 'Success',
      message: `Variable "${name}" assigned`,
      value: value,
      error: undefined
    };
  }
}
