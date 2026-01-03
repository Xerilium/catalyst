import { readFile, readdir, unlink, stat, mkdir } from 'fs/promises';
import { join } from 'path';
import type { PlaybookState } from '../types/state';
import { StateError } from '../types/state';
import { atomicWrite } from './atomic-write';

/**
 * State persistence class
 *
 * @req FR:playbook-definition/persistence.active-runs
 * @req FR:playbook-definition/persistence.archive
 * @req FR:playbook-definition/persistence.atomic-writes
 * @req FR:playbook-definition/persistence.class.methods
 * @req FR:playbook-definition/persistence.class.format
 * @req FR:playbook-definition/persistence.class.performance
 * @req FR:playbook-definition/persistence.class.error-handling
 * @req NFR:playbook-definition/reliability.atomic-writes
 * @req NFR:playbook-definition/reliability.corruption-recovery
 *
 * Provides save, load, archive, and pruning operations for playbook state.
 * Uses atomic writes to prevent corruption.
 *
 * @example
 * ```typescript
 * const persistence = new StatePersistence();
 * await persistence.save(state);
 * const loaded = await persistence.load(runId);
 * await persistence.archive(runId);
 * ```
 */
export class StatePersistence {
  private readonly runsDir: string;
  private readonly historyDir: string;

  /**
   * Create a new StatePersistence instance
   *
   * @param runsDir - Base directory for active runs (default: '.xe/runs')
   */
  constructor(runsDir: string = '.xe/runs') {
    this.runsDir = runsDir;
    this.historyDir = join(runsDir, 'history');
  }

  /**
   * Save playbook state to disk
   *
   * @param state - Playbook state to save
   * @throws StateError if save fails
   */
  async save(state: PlaybookState): Promise<void> {
    const filePath = join(this.runsDir, `run-${state.runId}.json`);
    const json = JSON.stringify(state, null, 2);

    try {
      // Create directory if it doesn't exist
      await mkdir(this.runsDir, { recursive: true });

      // Use atomic write (temp file + rename)
      await atomicWrite(filePath, json);
    } catch (error) {
      throw new StateError(
        `Failed to save state for run ${state.runId}`,
        'StateSaveFailed',
        'Check disk space and file permissions for the .xe/runs directory',
        error as Error
      );
    }
  }

  /**
   * Load playbook state from disk
   *
   * @param runId - Run identifier to load
   * @returns Playbook state
   * @throws StateError if load fails or state corrupted
   */
  async load(runId: string): Promise<PlaybookState> {
    const filePath = join(this.runsDir, `run-${runId}.json`);

    try {
      const json = await readFile(filePath, 'utf8');
      const state = JSON.parse(json) as PlaybookState;

      // Validate required fields
      if (!state.runId || !state.playbookName) {
        throw new Error('Invalid state structure: missing runId or playbookName');
      }

      return state;
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('ENOENT')) {
        throw new StateError(
          `Failed to load state for run ${runId}. Run not found.`,
          'StateLoadFailed',
          'Verify the runId is correct and the state file exists in .xe/runs/',
          err
        );
      } else if (err instanceof SyntaxError) {
        throw new StateError(
          `Failed to load state for run ${runId}. File is corrupted (invalid JSON).`,
          'StateLoadFailed',
          'Restore from backup or delete the corrupted state file',
          err
        );
      } else {
        throw new StateError(
          `Failed to load state for run ${runId}. ${err.message}`,
          'StateLoadFailed',
          'Check file permissions and disk health',
          err
        );
      }
    }
  }

  /**
   * Archive completed run to history directory
   *
   * Moves the state file from active runs to history directory organized by date.
   * Creates .gitignore in history root on first archive.
   *
   * @param runId - Run identifier to archive
   * @throws StateError if archive fails
   */
  async archive(runId: string): Promise<void> {
    try {
      // Parse date from runId (YYYYMMDD-HHMMSS-nnn)
      const datePart = runId.split('-')[0];
      if (!datePart || datePart.length !== 8) {
        throw new Error(`Invalid runId format: ${runId}. Expected format: YYYYMMDD-HHMMSS-nnn`);
      }

      const year = datePart.substring(0, 4);
      const month = datePart.substring(4, 6);
      const day = datePart.substring(6, 8);

      const historyPath = join(this.historyDir, year, month, day);
      const sourcePath = join(this.runsDir, `run-${runId}.json`);
      const targetPath = join(historyPath, `run-${runId}.json`);

      // Create history directory structure
      await mkdir(historyPath, { recursive: true });

      // @req FR:playbook-definition/persistence.gitignore
      // Create .gitignore in history root if it doesn't exist
      const gitignorePath = join(this.historyDir, '.gitignore');
      try {
        await stat(gitignorePath);
      } catch {
        // File doesn't exist, create it
        await atomicWrite(gitignorePath, '*\n');
      }

      // Read source and write to target atomically
      const content = await readFile(sourcePath, 'utf8');
      await atomicWrite(targetPath, content);

      // Delete source file
      await unlink(sourcePath);
    } catch (error) {
      throw new StateError(
        `Failed to archive run ${runId}`,
        'StateArchiveFailed',
        'Check disk space and permissions for .xe/runs/history/ directory',
        error as Error
      );
    }
  }

  /**
   * List all active runs
   *
   * @returns Array of run IDs sorted alphabetically
   */
  async listActiveRuns(): Promise<string[]> {
    try {
      const files = await readdir(this.runsDir);
      const runFiles = files.filter(f => f.startsWith('run-') && f.endsWith('.json'));
      const runIds = runFiles.map(f => f.replace(/^run-/, '').replace(/\.json$/, ''));
      return runIds.sort();
    } catch (error) {
      throw new StateError(
        'Failed to list active runs',
        'StateListFailed',
        'Check permissions for .xe/runs/ directory',
        error as Error
      );
    }
  }

  /**
   * Prune old archived runs
   *
   * Deletes archived runs older than the specified retention period.
   *
   * @param retentionDays - Number of days to retain
   * @returns Number of runs deleted
   */
  async pruneArchive(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let deletedCount = 0;

    // Recursively scan history directories
    async function scanDirectory(dir: string): Promise<number> {
      let count = 0;
      try {
        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(dir, entry.name);

          if (entry.isDirectory()) {
            count += await scanDirectory(fullPath);
          } else if (entry.name.endsWith('.json')) {
            const stats = await stat(fullPath);
            if (stats.mtime < cutoffDate) {
              await unlink(fullPath);
              count++;
            }
          }
        }
      } catch (error) {
        // Continue on errors (directory might not exist yet)
      }
      return count;
    }

    deletedCount = await scanDirectory(this.historyDir);
    return deletedCount;
  }
}
