/**
 * Module Loading Module
 *
 * Dynamically loads custom JavaScript modules alongside playbook files.
 * Provides custom functions for use in template expressions.
 */

import * as path from 'path';
import * as fs from 'fs';

/**
 * Loads custom JavaScript modules for template functions.
 *
 * Module Discovery:
 * For a playbook at `/path/to/playbook.yaml`, checks for `/path/to/playbook.js`
 *
 * Module Format:
 * ```javascript
 * export function myFunction(arg) { return arg * 2; }
 * export function anotherFunction(a, b) { return a + b; }
 * ```
 */
export class ModuleLoader {
  /**
   * Loads a JavaScript module from the given playbook path.
   *
   * @param playbookPath - Path to the playbook file (.yaml, .json, etc.)
   * @returns Object with exported functions, or empty object if module not found
   * @throws Error with code 'ModuleLoadError' on syntax errors or invalid exports
   */
  async loadModule(playbookPath: string): Promise<Record<string, Function>> {
    try {
      // Construct module path by replacing extension with .js
      const modulePath = this.getModulePath(playbookPath);

      // Check if module exists
      if (!(await this.fileExists(modulePath))) {
        // Module is optional, return empty object
        return {};
      }

      // Dynamically import the module
      const module = await import(modulePath);

      // Validate exports are functions
      const functions: Record<string, Function> = {};
      for (const [name, value] of Object.entries(module)) {
        if (typeof value === 'function') {
          functions[name] = value as Function;
        }
      }

      return functions;
    } catch (error: any) {
      // Wrap errors in ModuleLoadError
      throw new Error(`ModuleLoadError: Failed to load module - ${error.message}`);
    }
  }

  /**
   * Constructs the module path from a playbook path.
   *
   * Example: `/path/to/playbook.yaml` → `/path/to/playbook.js`
   */
  private getModulePath(playbookPath: string): string {
    const parsed = path.parse(playbookPath);
    return path.join(parsed.dir, `${parsed.name}.js`);
  }

  /**
   * Checks if a file exists.
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
