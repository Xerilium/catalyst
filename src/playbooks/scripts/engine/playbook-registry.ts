import type { Playbook } from '../playbooks/types';
import { CatalystError } from '../errors';

/**
 * Registry for managing playbook definitions
 *
 * Provides playbook lookup during child playbook execution. Validates
 * playbook names follow kebab-case convention.
 *
 * @example
 * ```typescript
 * const registry = new PlaybookRegistry();
 * registry.register('deploy-app', deployPlaybook);
 * registry.register('run-tests', testPlaybook);
 *
 * const playbook = registry.get('deploy-app');
 * ```
 */
export class PlaybookRegistry {
  private playbooks: Map<string, Playbook> = new Map();

  /**
   * Register a playbook definition
   *
   * @param name - Unique playbook name (must be kebab-case)
   * @param playbook - Playbook definition
   * @throws {CatalystError} If name is not kebab-case or already registered
   */
  register(name: string, playbook: Playbook): void {
    // Validate name is kebab-case
    const kebabCaseRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
    if (!kebabCaseRegex.test(name)) {
      throw new CatalystError(
        `Playbook name "${name}" is not valid kebab-case`,
        'InvalidPlaybookName',
        'Use lowercase letters, numbers, and hyphens only (e.g., "deploy-app", "run-tests")'
      );
    }

    // Check for duplicate registration
    if (this.playbooks.has(name)) {
      throw new CatalystError(
        `Playbook "${name}" is already registered`,
        'DuplicatePlaybook',
        'Use a different name or unregister the existing playbook first'
      );
    }

    this.playbooks.set(name, playbook);
  }

  /**
   * Get a playbook by name
   *
   * @param name - Playbook name
   * @returns Playbook definition or undefined if not found
   */
  get(name: string): Playbook | undefined {
    return this.playbooks.get(name);
  }

  /**
   * Check if a playbook is registered
   *
   * @param name - Playbook name
   * @returns True if playbook is registered
   */
  has(name: string): boolean {
    return this.playbooks.has(name);
  }

  /**
   * Get all registered playbook names
   *
   * @returns Array of registered playbook names
   */
  getAllNames(): string[] {
    return Array.from(this.playbooks.keys());
  }

  /**
   * Get count of registered playbooks
   *
   * @returns Number of registered playbooks
   */
  count(): number {
    return this.playbooks.size;
  }

  /**
   * Clear all registered playbooks
   */
  clear(): void {
    this.playbooks.clear();
  }
}
