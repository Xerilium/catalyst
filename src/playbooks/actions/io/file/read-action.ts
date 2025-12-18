// @req FR:playbook-actions-io/file.read-action.implementation
// @req FR:playbook-actions-io/file.read-action.file-reading
// @req FR:playbook-actions-io/file.read-action.result-format
// @req FR:playbook-actions-io/file.read-action.error-handling
// @req FR:playbook-actions-io/security.config-validation
// @req NFR:playbook-actions-io/performance.file-read-overhead
// @req NFR:playbook-actions-io/maintainability.single-responsibility
// @req NFR:playbook-actions-io/reliability.error-guidance

import * as fs from 'fs/promises';
import type { PlaybookAction, PlaybookActionResult } from '../../../types';
import { CatalystError } from '@core/errors';
import type { FileReadConfig } from '../types';
import { validatePath } from '../utils/path-validation';

/**
 * File read action
 *
 * Reads file contents with encoding support and path validation.
 *
 * @example
 * ```typescript
 * const action = new FileReadAction();
 * const result = await action.execute({
 *   path: '.xe/product.md',
 *   encoding: 'utf8'
 * });
 * ```
 */
export class FileReadAction implements PlaybookAction<FileReadConfig> {
  static readonly actionType = 'file-read';

  readonly primaryProperty = 'path';

  /**
   * Execute file read operation
   *
   * @param config - File read configuration
   * @returns Promise resolving to action result
   */
  async execute(config: FileReadConfig): Promise<PlaybookActionResult> {
    try {
      // Validate configuration
      this.validateConfig(config);

      // Extract configuration with defaults
      const { path: filePath, encoding = 'utf8' } = config;

      // Validate and normalize path
      const safePath = validatePath(filePath);

      console.log(`[file-read] Reading file: ${safePath}`);

      // Read file
      const content = await fs.readFile(safePath, { encoding: encoding as BufferEncoding });

      // Success
      return {
        code: 'Success',
        message: `Successfully read file: ${filePath}`,
        value: content,
        error: undefined
      };
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
  private validateConfig(config: FileReadConfig): void {
    if (!config.path) {
      throw new CatalystError(
        'Missing required configuration property: path',
        'FileConfigInvalid',
        `The file-read action requires a 'path' property in the config. Provide a valid file path.`
      );
    }

    // Validate encoding if provided
    const validEncodings = ['utf8', 'utf-8', 'ascii', 'base64', 'binary', 'hex'];
    if (config.encoding && !validEncodings.includes(config.encoding)) {
      throw new CatalystError(
        `Invalid encoding: ${config.encoding}`,
        'FileInvalidEncoding',
        `The encoding '${config.encoding}' is not supported. Valid encodings: ${validEncodings.join(', ')}`
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
  private handleError(error: Error, config: FileReadConfig): PlaybookActionResult {
    // If already a CatalystError, return it
    if (error instanceof CatalystError) {
      return {
        code: error.code,
        message: `File read failed for ${config.path}: ${error.message}`,
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
        `Permission denied reading ${config.path}`,
        'FilePermissionDenied',
        `Unable to read '${config.path}' due to insufficient permissions. ` +
        `Check that the file is readable by the current user.`,
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
      `Failed to read file: ${config.path}`,
      'FileReadFailed',
      `An error occurred while reading '${config.path}'. See error details for more information.`,
      error
    );

    return {
      code: catalystError.code,
      message: catalystError.message,
      error: catalystError
    };
  }
}
