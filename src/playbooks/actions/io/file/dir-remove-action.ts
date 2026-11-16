// @req FR:playbook-actions-io/dir-remove.@action
// @req FR:playbook-actions-io/dir-remove.input
// @req FR:playbook-actions-io/dir-remove.remove
// @req FR:playbook-actions-io/dir-remove.output
// @req FR:playbook-actions-io/dir-remove.errors

import * as fs from 'fs/promises';
import * as path from 'path';
import { CatalystError } from '@core/errors';
import type { PlaybookAction, PlaybookActionResult } from '../../../types';
import type { DirRemoveConfig } from '../types';
import { validatePath } from '../utils/path-validation';

/**
 * Directory remove action
 *
 * Removes a directory, like `rmdir` (default) or `rm -r` (`recursive: true`).
 * `onlyEmpty: true` leaves a non-empty directory in place instead of failing.
 * A missing directory returns false unless `ignoreMissing` is false.
 *
 * @example YAML
 * ```yaml
 * - dir-remove: .claude/commands/catalyst
 *   onlyEmpty: true
 * ```
 */
export class DirRemoveAction implements PlaybookAction<DirRemoveConfig> {
  static readonly actionType = 'dir-remove';
  static readonly primaryProperty = 'path';

  async execute(config: DirRemoveConfig): Promise<PlaybookActionResult> {
    try {
      this.validateConfig(config);
      const { recursive = false, onlyEmpty = false, ignoreMissing = true } = config;
      const safePath = validatePath(config.path);
      this.assertNotWorkingDirectory(safePath, config.path);

      const stat = await fs.stat(safePath).catch((err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') {return null;}
        throw err;
      });
      if (!stat) {
        if (ignoreMissing) {return this.success(false, `Directory already absent: ${config.path}`);}
        throw new CatalystError(
          `Directory not found: ${config.path}`,
          'FileNotFound',
          `The dir-remove action cannot remove '${config.path}' because it does not exist. Set ignoreMissing: true to allow this.`
        );
      }
      if (!stat.isDirectory()) {
        throw new CatalystError(
          `Not a directory: ${config.path}`,
          'FileConfigInvalid',
          `The dir-remove action removes directories; use file-delete for '${config.path}'.`
        );
      }

      if (recursive) {
        await fs.rm(safePath, { recursive: true });
        return this.success(true, `Removed directory and contents: ${config.path}`);
      }

      try {
        await fs.rmdir(safePath); // rmdir fails on non-empty dirs, so it never deletes content
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== 'ENOTEMPTY' && code !== 'EEXIST') {throw err;}
        if (onlyEmpty) {return this.success(false, `Directory not empty, left in place: ${config.path}`);}
        throw new CatalystError(
          `Directory not empty: ${config.path}`,
          'DirNotEmpty',
          `The dir-remove action did not remove '${config.path}' because it has contents. ` +
            `Set recursive: true to remove its contents, or onlyEmpty: true to skip non-empty directories.`,
          err as Error
        );
      }
      return this.success(true, `Removed empty directory: ${config.path}`);
    } catch (error) {
      return this.handleError(error as Error, config);
    }
  }

  private validateConfig(config: DirRemoveConfig): void {
    if (!config?.path) {
      throw new CatalystError(
        'Missing required configuration property: path',
        'FileConfigInvalid',
        `The dir-remove action requires a 'path' property in the config.`
      );
    }
    if (config.recursive && config.onlyEmpty) {
      throw new CatalystError(
        'Conflicting options: recursive and onlyEmpty',
        'FileConfigInvalid',
        `The dir-remove action cannot use both 'recursive' and 'onlyEmpty'. Pick one.`
      );
    }
  }

  /** Never remove the working directory or one of its ancestors. */
  private assertNotWorkingDirectory(safePath: string, original: string): void {
    const rel = path.relative(safePath, process.cwd());
    if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) {
      throw new CatalystError(
        `Refusing to remove working directory or its parent: ${original}`,
        'FileInvalidPath',
        `The dir-remove action cannot remove '${original}' because it contains the current working directory.`
      );
    }
  }

  private success(value: boolean, message: string): PlaybookActionResult {
    return { code: 'Success', message, value, error: undefined };
  }

  private handleError(error: Error, config: DirRemoveConfig): PlaybookActionResult {
    if (error instanceof CatalystError) {
      return { code: error.code, message: error.message, error };
    }
    const nodeError = error as NodeJS.ErrnoException;
    const denied = nodeError.code === 'EACCES' || nodeError.code === 'EPERM';
    const wrapped = new CatalystError(
      denied
        ? `Permission denied removing ${config?.path}`
        : `Failed to remove directory: ${config?.path}`,
      denied ? 'FilePermissionDenied' : 'FileDeleteFailed',
      `Unable to remove '${config?.path}'. See error details for more information.`,
      error
    );
    return { code: wrapped.code, message: wrapped.message, error: wrapped };
  }
}
