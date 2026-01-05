// @req FR:playbook-actions-io/file.write-action.atomic-write
// @req NFR:playbook-actions-io/reliability.atomic-writes
// @req NFR:playbook-actions-io/reliability.temp-file-cleanup
// @req NFR:playbook-actions-io/maintainability.shared-logic

import * as fs from 'fs/promises';
import * as path from 'path';
import { CatalystError } from '@core/errors';

/**
 * Atomic write utility
 *
 * Writes files atomically to prevent corruption on crash or interruption.
 * Uses a temp file + rename pattern for atomicity.
 */

/**
 * Write content to a file atomically
 *
 * Writes to a temporary file first, then renames it to the target path.
 * This ensures the file is either fully written or not written at all.
 *
 * @param filePath - Target file path
 * @param content - Content to write
 * @param encoding - File encoding (default: 'utf8')
 * @throws CatalystError on write or rename failure
 *
 * @example
 * ```typescript
 * await atomicWrite('/path/to/file.txt', 'Hello World', 'utf8');
 * ```
 */
export async function atomicWrite(
  filePath: string,
  content: string,
  encoding: BufferEncoding = 'utf8'
): Promise<void> {
  // Generate temporary file path in same directory
  const directory = path.dirname(filePath);
  const filename = path.basename(filePath);
  const tempPath = path.join(directory, `.${filename}.tmp`);

  try {
    // Ensure parent directory exists
    await fs.mkdir(directory, { recursive: true });

    // Write to temporary file
    await fs.writeFile(tempPath, content, { encoding });

    // Atomically rename temp file to target path
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempPath);
    } catch (_cleanupError) {
      // Ignore cleanup errors
    }

    // Map error to CatalystError
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === 'EACCES' || nodeError.code === 'EPERM') {
      throw new CatalystError(
        `Permission denied writing to ${filePath}`,
        'FilePermissionDenied',
        `Unable to write to '${filePath}' due to insufficient permissions. ` +
        `Check that the file and directory are writable by the current user.`,
        error as Error
      );
    }

    if (nodeError.code === 'ENOSPC') {
      throw new CatalystError(
        `Disk full while writing to ${filePath}`,
        'FileDiskFull',
        `Unable to write to '${filePath}' because the disk is full. ` +
        `Free up disk space and try again.`,
        error as Error
      );
    }

    throw new CatalystError(
      `Failed to write file: ${filePath}`,
      'FileWriteFailed',
      `An error occurred while writing to '${filePath}'. See error details for more information.`,
      error as Error
    );
  }
}
