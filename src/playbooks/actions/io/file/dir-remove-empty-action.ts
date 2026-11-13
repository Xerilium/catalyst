// @req FR:playbook-actions-io/dir-remove-empty.@action
// @req FR:playbook-actions-io/dir-remove-empty.remove
// @req FR:playbook-actions-io/dir-remove-empty.output
// @req FR:playbook-actions-io/dir-remove-empty.errors

import * as fs from 'fs/promises';
import { CatalystError } from '@core/errors';
import type { PlaybookAction, PlaybookActionResult } from '../../../types';
import type { DirRemoveEmptyConfig } from '../types';
import { validatePath } from '../utils/path-validation';

/**
 * Directory remove-empty action
 *
 * Removes a directory only when it has no entries. Returns true if removed,
 * false if the directory is missing or not empty.
 *
 * @example YAML shorthand
 * ```yaml
 * - dir-remove-empty: .claude/commands/catalyst
 * ```
 */
export class DirRemoveEmptyAction implements PlaybookAction<DirRemoveEmptyConfig> {
  static readonly actionType = 'dir-remove-empty';
  static readonly primaryProperty = 'path';

  async execute(config: DirRemoveEmptyConfig): Promise<PlaybookActionResult> {
    try {
      if (!config?.path) {
        throw new CatalystError(
          'Missing required configuration property: path',
          'FileConfigInvalid',
          `The dir-remove-empty action requires a 'path' property in the config.`
        );
      }
      const safePath = validatePath(config.path);

      try {
        await fs.rmdir(safePath); // rmdir fails on non-empty dirs, so it never deletes content
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT' || code === 'ENOTEMPTY' || code === 'EEXIST') {
          return {
            code: 'Success',
            message: `Directory not removed (${code === 'ENOENT' ? 'missing' : 'not empty'}): ${config.path}`,
            value: false,
            error: undefined
          };
        }
        throw err;
      }

      return {
        code: 'Success',
        message: `Removed empty directory: ${config.path}`,
        value: true,
        error: undefined
      };
    } catch (error) {
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
        error as Error
      );
      return { code: wrapped.code, message: wrapped.message, error: wrapped };
    }
  }
}
