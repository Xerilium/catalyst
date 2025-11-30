import * as fs from 'fs/promises';
import { parseYAML } from './parser';
import { validatePlaybook, ValidationError } from './validator';
import { transformPlaybook } from './transformer';
import type { Playbook } from '../types';

/**
 * Playbook loader for YAML format
 *
 * Loads YAML playbooks from files or strings, validates against schema,
 * and transforms to TypeScript Playbook interface.
 *
 * @example
 * ```typescript
 * const loader = new PlaybookLoader();
 *
 * // Load from file
 * const playbook = await loader.load('playbooks/my-workflow.yaml');
 * console.log(`Loaded: ${playbook.name}`);
 *
 * // Load from string
 * const yamlContent = `
 * name: test-playbook
 * description: Test
 * owner: Engineer
 * steps:
 *   - custom-action: "test"
 * `;
 * const playbook2 = await loader.loadFromString(yamlContent);
 * ```
 */
export class PlaybookLoader {
  /**
   * Load playbook from YAML file
   *
   * @param yamlPath - Absolute or relative path to YAML file
   * @returns Transformed Playbook
   * @throws {ValidationError} If file not found, YAML invalid, schema validation fails, or transformation fails
   */
  async load(yamlPath: string): Promise<Playbook> {
    try {
      const yamlContent = await fs.readFile(yamlPath, 'utf-8');
      return await this.loadFromString(yamlContent, yamlPath);
    } catch (err) {
      if (err instanceof ValidationError) {
        // Already a ValidationError, re-throw
        throw err;
      }

      // File not found or read error
      throw new ValidationError(
        `Failed to load playbook file: ${(err as Error).message}`,
        yamlPath
      );
    }
  }

  /**
   * Load playbook from YAML string
   *
   * @param yamlContent - YAML content string
   * @param filePath - Optional file path for error messages
   * @returns Transformed Playbook
   * @throws {ValidationError} If YAML invalid, schema validation fails, or transformation fails
   */
  async loadFromString(yamlContent: string, filePath?: string): Promise<Playbook> {
    try {
      // Step 1: Parse YAML
      const parsed = parseYAML(yamlContent);

      // Step 2: Validate against schema
      const validationResult = validatePlaybook(parsed);

      if (!validationResult.valid) {
        const errorMessages = validationResult.errors!
          .map(err => `  → ${err.path}: ${err.message}`)
          .join('\n');

        throw new ValidationError(
          `Schema validation failed:\n${errorMessages}`,
          filePath,
          undefined,
          undefined,
          validationResult.errors
        );
      }

      // Step 3: Transform to Playbook interface
      const playbook = transformPlaybook(parsed);

      return playbook;
    } catch (err) {
      if (err instanceof ValidationError) {
        // Already a ValidationError
        throw err;
      }

      // Parse or transformation error
      throw new ValidationError(
        (err as Error).message,
        filePath
      );
    }
  }
}
