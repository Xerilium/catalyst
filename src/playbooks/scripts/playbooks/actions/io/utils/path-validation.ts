import * as path from 'path';
import { CatalystError } from '../../../../errors';

/**
 * Path validation utility
 *
 * Validates and normalizes file paths to prevent directory traversal attacks.
 */

/**
 * Validate and normalize a file path
 *
 * @param filePath - Path to validate
 * @param errorCode - Error code for invalid paths (default: 'FileInvalidPath')
 * @returns Normalized absolute path
 * @throws CatalystError if path contains directory traversal attempts
 *
 * @example
 * ```typescript
 * const safePath = validatePath('./data/file.txt'); // OK
 * const badPath = validatePath('../../../etc/passwd'); // Throws error
 * ```
 */
export function validatePath(
  filePath: string,
  errorCode = 'FileInvalidPath'
): string {
  // Normalize the path (resolves . and .. segments)
  const normalized = path.normalize(filePath);

  // Check for directory traversal attempts
  // After normalization, '..' segments that escape should be visible
  if (normalized.includes('..')) {
    throw new CatalystError(
      `Invalid path: ${filePath} contains directory traversal`,
      errorCode,
      `The path '${filePath}' contains '..' segments which could be used for directory traversal attacks. ` +
      `Use absolute paths or paths relative to the current working directory without '..' segments.`
    );
  }

  // Resolve to absolute path
  // If already absolute, returns as-is
  // If relative, resolves against current working directory
  const absolutePath = path.resolve(normalized);

  return absolutePath;
}

/**
 * Check if a path is safe (no directory traversal)
 *
 * @param filePath - Path to check
 * @returns true if path is safe
 */
export function isSafePath(filePath: string): boolean {
  try {
    validatePath(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}
