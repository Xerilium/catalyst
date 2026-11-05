// @req FR:playbook-actions-io/file-glob.@action
// @req FR:playbook-actions-io/file-glob.input
// @req FR:playbook-actions-io/file-glob.match
// @req FR:playbook-actions-io/file-glob.output
// @req FR:playbook-actions-io/file-glob.errors

import * as path from 'path';
import { glob } from 'glob';
import { CatalystError } from '@core/errors';
import type { PlaybookAction, PlaybookActionResult } from '../../../types';
import type { FileGlobConfig } from '../types';
import { validatePath } from '../utils/path-validation';

/**
 * File glob action
 *
 * Returns sorted absolute paths of files matching one or more glob patterns
 * under a root directory. A missing root yields an empty list.
 *
 * @example YAML
 * ```yaml
 * - name: stale
 *   file-glob:
 *     root: .claude/commands/catalyst
 *     patterns: ["*.md"]
 * ```
 */
export class FileGlobAction implements PlaybookAction<FileGlobConfig> {
  static readonly actionType = 'file-glob';

  async execute(config: FileGlobConfig): Promise<PlaybookActionResult> {
    try {
      const patterns = Array.isArray(config?.patterns)
        ? config.patterns
        : config?.patterns
          ? [config.patterns]
          : [];
      if (patterns.length === 0) {
        throw new CatalystError(
          'Missing required configuration property: patterns',
          'FileConfigInvalid',
          `The file-glob action requires 'patterns' (a glob string or list of globs).`
        );
      }

      const root = validatePath(config.root ?? '.');
      const matches = await glob(patterns, {
        cwd: root,
        nodir: true,
        dot: config.dot ?? false,
        absolute: true,
        posix: false
      });
      const files = [...new Set(matches.map((m) => path.normalize(m)))].sort();

      return {
        code: 'Success',
        message: `Found ${files.length} file(s) matching ${patterns.join(', ')}`,
        value: files,
        error: undefined
      };
    } catch (error) {
      if (error instanceof CatalystError) {
        return { code: error.code, message: error.message, error };
      }
      const wrapped = new CatalystError(
        `Failed to glob files: ${(error as Error).message}`,
        'FileGlobFailed',
        `An error occurred while globbing '${config?.root ?? '.'}'. See error details for more information.`,
        error as Error
      );
      return { code: wrapped.code, message: wrapped.message, error: wrapped };
    }
  }
}
