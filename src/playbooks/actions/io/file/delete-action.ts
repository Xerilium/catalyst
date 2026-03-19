// @req FR:playbook-actions-io/file.delete-action.implementation
// @req FR:playbook-actions-io/file.delete-action.deletion
// @req FR:playbook-actions-io/file.delete-action.result-format
// @req FR:playbook-actions-io/file.delete-action.error-handling
// @req FR:playbook-actions-io/security.config-validation
// @req NFR:playbook-actions-io/maintainability.single-responsibility

import * as fs from 'fs/promises';
import type { PlaybookAction, PlaybookActionResult } from '../../../types';
import { CatalystError } from '@core/errors';
import { LoggerSingleton } from '@core/logging';
import type { FileDeleteConfig } from '../types';
import { validatePath } from '../utils/path-validation';

/**
 * File delete action
 *
 * Deletes a file at the specified path. Returns an error if the file
 * does not exist or cannot be deleted.
 *
 * @example
 * ```typescript
 * const action = new FileDeleteAction();
 * const result = await action.execute({
 *   path: '.xe/temp/output.txt'
 * });
 * // result.value === true if file was deleted
 * ```
 *
 * @example YAML shorthand
 * ```yaml
 * steps:
 *   - name: cleanup-temp
 *     file-delete: .xe/temp/output.txt
 * ```
 */
export class FileDeleteAction implements PlaybookAction<FileDeleteConfig> {
  static readonly actionType = 'file-delete';

  /**
   * Primary property for YAML shorthand syntax
   * Enables: `file-delete: path/to/file`
   */
  static readonly primaryProperty = 'path';

  /**
   * Execute file deletion
   *
   * @param config - File delete configuration
   * @returns Promise resolving to action result
   */
  async execute(config: FileDeleteConfig): Promise<PlaybookActionResult> {
    const logger = LoggerSingleton.getInstance();

    try {
      // Validate configuration
      this.validateConfig(config);

      // Extract path
      const { path: filePath } = config;

      // Validate and normalize path (prevents directory traversal)
      const safePath = validatePath(filePath);

      logger.debug('FileDeleteAction', 'Execute', 'Executing file delete', { path: safePath });

      // Delete the file
      await fs.unlink(safePath);

      logger.verbose('FileDeleteAction', 'Execute', 'File deleted', { path: safePath });

      return {
        code: 'Success',
        message: `Successfully deleted file: ${filePath}`,
        value: true,
        error: undefined
      };
    } catch (error) {
      logger.debug('FileDeleteAction', 'Execute', 'File delete failed', { path: config.path, error: (error as Error).message });
      return this.handleError(error as Error, config);
    }
  }

  /**
   * Validate configuration before execution
   *
   * @param config - Configuration to validate
   * @throws CatalystError if configuration is invalid
   */
  private validateConfig(config: FileDeleteConfig): void {
    if (!config.path) {
      throw new CatalystError(
        'Missing required configuration property: path',
        'FileConfigInvalid',
        `The file-delete action requires a 'path' property in the config. Provide a valid file path.`
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
  private handleError(error: Error, config: FileDeleteConfig): PlaybookActionResult {
    // If already a CatalystError, return it
    if (error instanceof CatalystError) {
      return {
        code: error.code,
        message: `File delete failed for ${config.path}: ${error.message}`,
        error
      };
    }

    // Map Node.js errors to CatalystError
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === 'ENOENT') {
      const catalystError = new CatalystError(
        `File not found: ${config.path}`,
        'FileNotFound',
        `The file '${config.path}' does not exist. Check that the path is correct and the file has been created.`,
        error
      );
      return {
        code: catalystError.code,
        message: catalystError.message,
        error: catalystError
      };
    }

    if (nodeError.code === 'EACCES' || nodeError.code === 'EPERM') {
      const catalystError = new CatalystError(
        `Permission denied deleting ${config.path}`,
        'FilePermissionDenied',
        `Unable to delete '${config.path}' due to insufficient permissions. ` +
        `Check that the file is writable by the current user.`,
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
      `Failed to delete file: ${config.path}`,
      'FileDeleteFailed',
      `An error occurred while deleting '${config.path}'. See error details for more information.`,
      error
    );

    return {
      code: catalystError.code,
      message: catalystError.message,
      error: catalystError
    };
  }
}
