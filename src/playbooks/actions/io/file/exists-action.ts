// @req FR:playbook-actions-io/file.exists-action.implementation
// @req FR:playbook-actions-io/file.exists-action.check
// @req FR:playbook-actions-io/file.exists-action.result-format
// @req FR:playbook-actions-io/file.exists-action.error-handling
// @req NFR:playbook-actions-io/maintainability.single-responsibility

import * as fs from 'fs/promises';
import type { PlaybookAction, PlaybookActionResult } from '../../../types';
import { CatalystError } from '@core/errors';
import type { FileExistsConfig } from '../types';
import { validatePath } from '../utils/path-validation';

/**
 * File exists action
 *
 * Checks if a file exists at the specified path. Returns a boolean value
 * indicating whether the file exists. Does NOT throw errors for non-existent
 * files - that's the expected use case.
 *
 * @example
 * ```typescript
 * const action = new FileExistsAction();
 * const result = await action.execute({
 *   path: '.xe/config.json'
 * });
 * // result.value === true if file exists, false otherwise
 * ```
 *
 * @example YAML shorthand
 * ```yaml
 * steps:
 *   - name: check-config
 *     file-exists: .xe/config.json
 *
 *   - if: "{{check-config}}"
 *     then:
 *       - file-read: .xe/config.json
 * ```
 */
export class FileExistsAction implements PlaybookAction<FileExistsConfig> {
  static readonly actionType = 'file-exists';

  /**
   * Primary property for YAML shorthand syntax
   * Enables: `file-exists: path/to/file`
   */
  static readonly primaryProperty = 'path';

  /**
   * Execute file existence check
   *
   * @param config - File exists configuration
   * @returns Promise resolving to action result with boolean value
   */
  async execute(config: FileExistsConfig): Promise<PlaybookActionResult> {
    try {
      // Validate configuration
      this.validateConfig(config);

      // Extract path
      const { path: filePath } = config;

      // Validate and normalize path (prevents directory traversal)
      const safePath = validatePath(filePath);

      // Check if file exists
      try {
        await fs.access(safePath, fs.constants.F_OK);
        // File exists
        return {
          code: 'Success',
          message: `File exists: ${filePath}`,
          value: true,
          error: undefined
        };
      } catch {
        // File does not exist - this is NOT an error condition
        return {
          code: 'Success',
          message: `File does not exist: ${filePath}`,
          value: false,
          error: undefined
        };
      }
    } catch (error) {
      return this.handleError(error as Error, config);
    }
  }

  /**
   * Validate configuration before execution
   *
   * @param config - Configuration to validate
   * @throws CatalystError if configuration is invalid
   */
  private validateConfig(config: FileExistsConfig): void {
    if (!config.path) {
      throw new CatalystError(
        'Missing required configuration property: path',
        'FileConfigInvalid',
        `The file-exists action requires a 'path' property in the config. Provide a valid file path.`
      );
    }
  }

  /**
   * Handle errors and convert to PlaybookActionResult
   *
   * @param error - Error that occurred
   * @param config - Action configuration
   * @returns PlaybookActionResult with error details
   */
  private handleError(error: Error, config: FileExistsConfig): PlaybookActionResult {
    // If already a CatalystError, return it
    if (error instanceof CatalystError) {
      return {
        code: error.code,
        message: `File exists check failed for ${config.path}: ${error.message}`,
        error
      };
    }

    // Map Node.js errors to CatalystError
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === 'EACCES' || nodeError.code === 'EPERM') {
      const catalystError = new CatalystError(
        `Permission denied checking ${config.path}`,
        'FilePermissionDenied',
        `Unable to check '${config.path}' due to insufficient permissions. ` +
        `Check that the path is accessible by the current user.`,
        error
      );
      return {
        code: catalystError.code,
        message: catalystError.message,
        error: catalystError
      };
    }

    // Generic error
    const catalystError = new CatalystError(
      `Failed to check file existence: ${config.path}`,
      'FileCheckFailed',
      `An error occurred while checking '${config.path}'. See error details for more information.`,
      error
    );

    return {
      code: catalystError.code,
      message: catalystError.message,
      error: catalystError
    };
  }
}
