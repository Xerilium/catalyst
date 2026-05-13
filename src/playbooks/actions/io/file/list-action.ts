// @req FR:playbook-actions-io/file-list.@action
// @req FR:playbook-actions-io/file-list.input
// @req FR:playbook-actions-io/file-list.enumerate
// @req FR:playbook-actions-io/file-list.format
// @req FR:playbook-actions-io/file-list.errors
// @req FR:playbook-actions-io/file-list.output
// @req NFR:playbook-actions-io/maintainability.single-responsibility

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { CatalystError } from '@core/errors';
import type { PlaybookAction, PlaybookActionResult } from '../../../types';
import type { FileListConfig, FileListRelativeTo } from '../types';
import { validatePath } from '../utils/path-validation';

const VALID_RELATIVE_TO: readonly FileListRelativeTo[] = ['root', 'cwd', 'absolute'];

/**
 * File list action
 *
 * Enumerates directory entries matching an optional glob pattern. Supports
 * flat (e.g. `*.md`) and recursive (e.g. `** /*.md`, written without the
 * space) globs. Result paths can be formatted relative to the input
 * directory (default), the current working directory, or as absolute paths.
 *
 * @example
 * ```typescript
 * const action = new FileListAction();
 * const result = await action.execute({
 *   path: 'ai-config/commands',
 *   pattern: '*.md'
 * });
 * // result.value === ['create.md', 'fix.md', ...]
 * ```
 *
 * @example YAML shorthand
 * ```yaml
 * steps:
 *   - name: command-files
 *     file-list:
 *       path: catalyst://ai-config/commands
 *       pattern: '*.md'
 * ```
 */
export class FileListAction implements PlaybookAction<FileListConfig> {
  static readonly actionType = 'file-list';
  static readonly primaryProperty = 'path';

  async execute(config: FileListConfig): Promise<PlaybookActionResult> {
    try {
      this.validateConfig(config);

      const { path: dirPath, pattern = '*', relativeTo = 'root' } = config;

      // Path traversal prevention. validatePath returns a normalized absolute path.
      const safeDir = validatePath(dirPath);

      // Surface "not a directory / doesn't exist" with the right error code
      // BEFORE handing off to glob (glob silently returns []).
      const stat = await fs.stat(safeDir).catch((err) => {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') {
          throw new CatalystError(
            `Directory not found: ${dirPath}`,
            'FileNotFound',
            `The file-list action cannot list '${dirPath}' because the directory does not exist.`,
            err as Error
          );
        }
        if (code === 'EACCES' || code === 'EPERM') {
          throw new CatalystError(
            `Permission denied listing ${dirPath}`,
            'FilePermissionDenied',
            `The file-list action cannot access '${dirPath}' due to insufficient permissions.`,
            err as Error
          );
        }
        throw err;
      });

      if (!stat.isDirectory()) {
        throw new CatalystError(
          `Not a directory: ${dirPath}`,
          'FileNotFound',
          `The file-list action requires a directory; '${dirPath}' is not a directory.`
        );
      }

      // Glob runs relative to `safeDir` and returns matches as POSIX-style paths.
      const matches = await glob(pattern, {
        cwd: safeDir,
        nodir: true,
        dot: false,
        posix: true
      });

      const formatted = this.formatPaths(matches, safeDir, relativeTo).sort();

      return {
        code: 'Success',
        message: `Listed ${formatted.length} entries matching '${pattern}' in ${dirPath}`,
        value: formatted,
        error: undefined
      };
    } catch (error) {
      return this.handleError(error as Error, config);
    }
  }

  private validateConfig(config: FileListConfig): void {
    if (!config || typeof config !== 'object') {
      throw new CatalystError(
        'Missing configuration for file-list',
        'FileConfigInvalid',
        `The file-list action requires a config object with at least a 'path' property.`
      );
    }
    if (!config.path) {
      throw new CatalystError(
        'Missing required configuration property: path',
        'FileConfigInvalid',
        `The file-list action requires a 'path' property in the config. Provide a directory path.`
      );
    }
    if (config.relativeTo !== undefined && !VALID_RELATIVE_TO.includes(config.relativeTo)) {
      throw new CatalystError(
        `Invalid relativeTo value: ${config.relativeTo}`,
        'FileConfigInvalid',
        `The file-list action's 'relativeTo' must be one of: ${VALID_RELATIVE_TO.join(', ')}.`
      );
    }
  }

  /**
   * Format glob matches per the requested relativeTo mode.
   * - `root` (default): relative to the listed directory
   * - `cwd`: relative to process.cwd()
   * - `absolute`: full filesystem paths
   */
  private formatPaths(
    matches: string[],
    safeDir: string,
    relativeTo: FileListRelativeTo
  ): string[] {
    switch (relativeTo) {
      case 'root':
        return matches; // glob already returned cwd-relative-to-safeDir (i.e., root-relative)
      case 'absolute':
        return matches.map((m) => path.join(safeDir, m));
      case 'cwd':
        return matches.map((m) => path.relative(process.cwd(), path.join(safeDir, m)));
    }
  }

  private handleError(error: Error, config: FileListConfig): PlaybookActionResult {
    if (error instanceof CatalystError) {
      return {
        code: error.code,
        message: error.message,
        error
      };
    }

    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'EACCES' || nodeError.code === 'EPERM') {
      const wrapped = new CatalystError(
        `Permission denied listing ${config?.path}`,
        'FilePermissionDenied',
        `Unable to list '${config?.path}' due to insufficient permissions.`,
        error
      );
      return { code: wrapped.code, message: wrapped.message, error: wrapped };
    }

    const wrapped = new CatalystError(
      `Failed to list directory: ${config?.path}`,
      'FileListFailed',
      `An error occurred while listing '${config?.path}'. See error details for more information.`,
      error
    );
    return { code: wrapped.code, message: wrapped.message, error: wrapped };
  }
}
