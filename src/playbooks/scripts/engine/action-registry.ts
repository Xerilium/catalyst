import type { PlaybookAction } from '../playbooks/types';
import { CatalystError } from '../errors';

/**
 * Runtime action registry
 *
 * Maps action type names to executable action instances. This is different
 * from ACTION_REGISTRY (playbook-definition) which is a build-time metadata
 * registry mapping action types to ActionMetadata.
 *
 * The ActionRegistry stores executable PlaybookAction instances used during
 * step execution.
 *
 * @example
 * ```typescript
 * const registry = new ActionRegistry();
 *
 * // Register action
 * registry.register('file-write', new FileWriteAction());
 *
 * // Get action for execution
 * const action = registry.get('file-write');
 * await action.execute({ path: 'file.txt', content: 'hello' });
 * ```
 */
export class ActionRegistry {
  private readonly actions: Map<string, PlaybookAction<unknown>>;

  constructor() {
    this.actions = new Map();
  }

  /**
   * Register an action instance
   *
   * @param actionName - Action type identifier in kebab-case (e.g., 'file-write')
   * @param action - Action implementation instance
   * @throws CatalystError with code 'DuplicateAction' if action already registered
   * @throws CatalystError with code 'InvalidActionName' if name not kebab-case
   */
  register(actionName: string, action: PlaybookAction<unknown>): void {
    // Validate name is kebab-case
    if (!this.isKebabCase(actionName)) {
      throw new CatalystError(
        `Action name "${actionName}" is not in kebab-case format`,
        'InvalidActionName',
        'Use kebab-case for action names (e.g., "file-write", "http-get")'
      );
    }

    // Check for duplicate registration
    if (this.actions.has(actionName)) {
      throw new CatalystError(
        `Action "${actionName}" is already registered`,
        'DuplicateAction',
        'Each action type can only be registered once. Check for duplicate registrations.'
      );
    }

    this.actions.set(actionName, action);
  }

  /**
   * Get an action instance by name
   *
   * @param actionName - Action type identifier
   * @returns Action instance or undefined if not found
   */
  get(actionName: string): PlaybookAction<unknown> | undefined {
    return this.actions.get(actionName);
  }

  /**
   * Check if an action is registered
   *
   * @param actionName - Action type identifier
   * @returns True if action is registered, false otherwise
   */
  has(actionName: string): boolean {
    return this.actions.has(actionName);
  }

  /**
   * Get all registered actions
   *
   * @returns Map of action names to action instances
   */
  getAll(): Record<string, PlaybookAction<unknown>> {
    const result: Record<string, PlaybookAction<unknown>> = {};
    for (const [name, action] of this.actions.entries()) {
      result[name] = action;
    }
    return result;
  }

  /**
   * Get count of registered actions
   *
   * @returns Number of registered actions
   */
  count(): number {
    return this.actions.size;
  }

  /**
   * Clear all registered actions
   *
   * Useful for testing.
   */
  clear(): void {
    this.actions.clear();
  }

  /**
   * Validate action name is kebab-case
   *
   * @param name - Action name to validate
   * @returns True if kebab-case, false otherwise
   */
  private isKebabCase(name: string): boolean {
    // Must match: lowercase letters, numbers, and hyphens
    // Must start with letter
    // Must not start or end with hyphen
    const kebabCaseRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
    return kebabCaseRegex.test(name);
  }
}
