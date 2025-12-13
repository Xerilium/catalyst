import * as fs from 'fs/promises';
import * as path from 'path';
import { CatalystError } from '@core/errors';

/**
 * Resource lock for playbook execution
 *
 * Locks prevent concurrent runs from modifying the same resources.
 */
export interface RunLock {
  /** Unique run identifier */
  runId: string;
  /** Actor executing the playbook */
  owner: string;
  /** Resource paths being locked */
  paths?: string[];
  /** Git branches being locked */
  branches?: string[];
  /** Lock acquisition timestamp */
  acquiredAt: string;
  /** Lock expiration timestamp (TTL) */
  expiresAt: string;
}

/**
 * Resource specification for locking
 */
export interface ResourceLock {
  /** File/directory paths to lock */
  paths?: string[];
  /** Git branches to lock */
  branches?: string[];
}

/**
 * Lock manager for playbook resource coordination
 *
 * Prevents concurrent execution conflicts by acquiring locks on resources
 * before playbook execution. Uses atomic file operations to ensure
 * consistency.
 *
 * @example
 * ```typescript
 * const lockManager = new LockManager();
 *
 * // Acquire lock
 * await lockManager.acquire('run-123', {
 *   paths: ['src/api'],
 *   branches: ['main']
 * }, 'user@example.com');
 *
 * // Release lock
 * await lockManager.release('run-123');
 * ```
 */
export class LockManager {
  private readonly locksDir: string;

  constructor(baseDir: string = '.xe/runs/locks') {
    this.locksDir = baseDir;
  }

  /**
   * Acquire locks on resources
   *
   * @param runId - Unique run identifier
   * @param resources - Resources to lock
   * @param owner - Actor acquiring the lock
   * @param ttl - Time to live in milliseconds (default: 1 hour)
   * @throws {CatalystError} If resources are already locked
   */
  async acquire(
    runId: string,
    resources: ResourceLock,
    owner: string,
    ttl: number = 3600000 // 1 hour default
  ): Promise<void> {
    // Ensure locks directory exists
    await fs.mkdir(this.locksDir, { recursive: true });

    // Check if resources are already locked
    const conflictingLock = await this.findConflictingLock(resources);
    if (conflictingLock) {
      throw new CatalystError(
        `Resources are locked by run ${conflictingLock.runId} (owner: ${conflictingLock.owner})`,
        'ResourceLocked',
        `Wait for the conflicting run to complete or release locks manually. Lock acquired at ${conflictingLock.acquiredAt}, expires at ${conflictingLock.expiresAt}`
      );
    }

    // Create lock object
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl);

    const lock: RunLock = {
      runId,
      owner,
      paths: resources.paths,
      branches: resources.branches,
      acquiredAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    // Write lock file atomically (temp file + rename)
    const lockFilePath = path.join(this.locksDir, `run-${runId}.lock`);
    const tempFilePath = `${lockFilePath}.tmp`;

    try {
      await fs.writeFile(tempFilePath, JSON.stringify(lock, null, 2), 'utf-8');
      await fs.rename(tempFilePath, lockFilePath);
    } catch (error) {
      // Cleanup temp file if it exists
      try {
        await fs.unlink(tempFilePath);
      } catch {
        // Ignore cleanup errors
      }
      throw new CatalystError(
        `Failed to acquire lock: ${error instanceof Error ? error.message : String(error)}`,
        'LockAcquisitionFailed',
        'Check file system permissions and disk space'
      );
    }
  }

  /**
   * Release locks for a run
   *
   * @param runId - Unique run identifier
   */
  async release(runId: string): Promise<void> {
    const lockFilePath = path.join(this.locksDir, `run-${runId}.lock`);

    try {
      await fs.unlink(lockFilePath);
    } catch (error: any) {
      // Ignore if file doesn't exist (already released)
      if (error.code !== 'ENOENT') {
        console.error(`Failed to release lock for run ${runId}:`, error);
      }
    }
  }

  /**
   * Check if resources are currently locked
   *
   * @param resources - Resources to check
   * @returns True if any resource is locked
   */
  async isLocked(resources: ResourceLock): Promise<boolean> {
    const conflictingLock = await this.findConflictingLock(resources);
    return conflictingLock !== null;
  }

  /**
   * Clean up stale locks
   *
   * Removes lock files that have exceeded their TTL.
   *
   * @returns Number of stale locks cleaned up
   */
  async cleanupStale(): Promise<number> {
    try {
      const files = await fs.readdir(this.locksDir);
      const now = new Date();
      let cleaned = 0;

      for (const file of files) {
        if (!file.endsWith('.lock')) {
          continue;
        }

        const lockFilePath = path.join(this.locksDir, file);

        try {
          const content = await fs.readFile(lockFilePath, 'utf-8');
          const lock: RunLock = JSON.parse(content);

          // Check if lock has expired
          const expiresAt = new Date(lock.expiresAt);
          if (expiresAt < now) {
            await fs.unlink(lockFilePath);
            cleaned++;
          }
        } catch (error) {
          // If we can't read/parse the lock file, it's corrupted - delete it
          console.error(`Removing corrupted lock file ${file}:`, error);
          await fs.unlink(lockFilePath);
          cleaned++;
        }
      }

      return cleaned;
    } catch (error: any) {
      // If locks directory doesn't exist, no locks to clean
      if (error.code === 'ENOENT') {
        return 0;
      }
      throw error;
    }
  }

  /**
   * Find a lock that conflicts with the requested resources
   *
   * @param resources - Resources to check
   * @returns Conflicting lock or null if no conflict
   */
  private async findConflictingLock(resources: ResourceLock): Promise<RunLock | null> {
    try {
      const files = await fs.readdir(this.locksDir);
      const now = new Date();

      for (const file of files) {
        if (!file.endsWith('.lock')) {
          continue;
        }

        const lockFilePath = path.join(this.locksDir, file);

        try {
          const content = await fs.readFile(lockFilePath, 'utf-8');
          const lock: RunLock = JSON.parse(content);

          // Skip expired locks
          const expiresAt = new Date(lock.expiresAt);
          if (expiresAt < now) {
            continue;
          }

          // Check for path conflicts
          if (resources.paths && lock.paths) {
            for (const requestedPath of resources.paths) {
              for (const lockedPath of lock.paths) {
                // Check if paths overlap (exact match or one is parent of other)
                if (
                  requestedPath === lockedPath ||
                  requestedPath.startsWith(lockedPath + '/') ||
                  lockedPath.startsWith(requestedPath + '/')
                ) {
                  return lock;
                }
              }
            }
          }

          // Check for branch conflicts
          if (resources.branches && lock.branches) {
            for (const requestedBranch of resources.branches) {
              if (lock.branches.includes(requestedBranch)) {
                return lock;
              }
            }
          }
        } catch (error) {
          // Skip corrupted lock files
          console.error(`Skipping corrupted lock file ${file}:`, error);
          continue;
        }
      }

      return null;
    } catch (error: any) {
      // If locks directory doesn't exist, no conflicts
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all active locks
   *
   * @returns Array of active locks
   */
  async getAllLocks(): Promise<RunLock[]> {
    try {
      const files = await fs.readdir(this.locksDir);
      const now = new Date();
      const locks: RunLock[] = [];

      for (const file of files) {
        if (!file.endsWith('.lock')) {
          continue;
        }

        const lockFilePath = path.join(this.locksDir, file);

        try {
          const content = await fs.readFile(lockFilePath, 'utf-8');
          const lock: RunLock = JSON.parse(content);

          // Only include non-expired locks
          const expiresAt = new Date(lock.expiresAt);
          if (expiresAt >= now) {
            locks.push(lock);
          }
        } catch (error) {
          // Skip corrupted lock files
          continue;
        }
      }

      return locks;
    } catch (error: any) {
      // If locks directory doesn't exist, no locks
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
}
