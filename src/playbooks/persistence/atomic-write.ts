import { writeFile, rename, unlink, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { randomBytes } from 'crypto';

/**
 * Atomically write content to a file
 *
 * Uses the temp file + rename pattern to ensure atomic writes. This prevents
 * file corruption if the process crashes during write, as the original file
 * remains intact until the atomic rename operation completes.
 *
 * @param path - Target file path
 * @param content - Content to write
 * @throws Error if write fails
 *
 * @example
 * ```typescript
 * await atomicWrite('/path/to/file.json', JSON.stringify(data));
 * ```
 */
export async function atomicWrite(path: string, content: string): Promise<void> {
  // Generate unique temp file path with random hex suffix
  const tempPath = `${path}.tmp-${randomBytes(8).toString('hex')}`;

  try {
    // Ensure parent directory exists
    await mkdir(dirname(path), { recursive: true });

    // Write to temp file
    await writeFile(tempPath, content, 'utf8');

    // Atomically rename to target (atomic on POSIX filesystems)
    await rename(tempPath, path);
  } catch (error) {
    // Clean up temp file on error (ignore cleanup errors)
    try {
      await unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }

    // Propagate original error
    throw error;
  }
}
