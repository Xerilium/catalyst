import type { PlaybookAction, PlaybookActionResult } from '../../../types';
import { CatalystError } from '@core/errors';
import type { FileWriteConfig, FileWriteResult } from '../types';
import { validatePath } from '../utils/path-validation';
import { atomicWrite } from '../utils/atomic-write';
import { addFrontMatter } from '../utils/front-matter';

/**
 * File write action
 *
 * Writes file contents with atomic write pattern, front matter support,
 * and simple text replacement.
 *
 * @example
 * ```typescript
 * const action = new FileWriteAction();
 * const result = await action.execute({
 *   path: '.xe/features/my-feature/spec.md',
 *   content: '# Feature\n\nDescription here',
 *   frontMatter: { id: 'my-feature', author: 'me' }
 * });
 * ```
 */
export class FileWriteAction implements PlaybookAction<FileWriteConfig> {
  static readonly actionType = 'file-write';

  readonly primaryProperty = 'path';

  /**
   * Execute file write operation
   *
   * @param config - File write configuration
   * @returns Promise resolving to action result
   */
  async execute(config: FileWriteConfig): Promise<PlaybookActionResult> {
    try {
      // Validate configuration
      this.validateConfig(config);

      // Extract configuration with defaults
      const {
        path: filePath,
        content,
        encoding = 'utf8',
        frontMatter,
        replace
      } = config;

      // Validate and normalize path
      const safePath = validatePath(filePath);

      console.log(`[file-write] Writing file: ${safePath}`);

      // Process content
      let processedContent = content;

      // Apply replace dictionary if provided
      if (replace) {
        for (const [find, replaceWith] of Object.entries(replace)) {
          // Use global regex to replace all occurrences
          const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          processedContent = processedContent.replace(regex, replaceWith);
        }
      }

      // Add front matter if provided
      if (frontMatter) {
        processedContent = addFrontMatter(processedContent, frontMatter, filePath);
      }

      // Write file atomically
      await atomicWrite(safePath, processedContent, encoding as BufferEncoding);

      // Calculate bytes written
      const bytesWritten = Buffer.byteLength(processedContent, encoding as BufferEncoding);

      // Success
      const result: FileWriteResult = {
        path: filePath,
        bytesWritten
      };

      return {
        code: 'Success',
        message: `Successfully wrote ${bytesWritten} bytes to ${filePath}`,
        value: result,
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
  private validateConfig(config: FileWriteConfig): void {
    if (!config.path) {
      throw new CatalystError(
        'Missing required configuration property: path',
        'FileConfigInvalid',
        `The file-write action requires a 'path' property in the config. Provide a valid file path.`
      );
    }

    if (config.content === undefined) {
      throw new CatalystError(
        'Missing required configuration property: content',
        'FileConfigInvalid',
        `The file-write action requires a 'content' property in the config. Provide content to write.`
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
  private handleError(error: Error, config: FileWriteConfig): PlaybookActionResult {
    // If already a CatalystError, return it
    if (error instanceof CatalystError) {
      return {
        code: error.code,
        message: `File write failed for ${config.path}: ${error.message}`,
        error
      };
    }

    // Generic error
    const catalystError = new CatalystError(
      `Failed to write file: ${config.path}`,
      'FileWriteFailed',
      `An error occurred while writing to '${config.path}'. See error details for more information.`,
      error
    );

    return {
      code: catalystError.code,
      message: catalystError.message,
      error: catalystError
    };
  }
}
