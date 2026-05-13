// @req FR:playbook-actions-git/gitignore-edit.@action
// @req FR:playbook-actions-git/gitignore-edit.input
// @req FR:playbook-actions-git/gitignore-edit.section-model
// @req FR:playbook-actions-git/gitignore-edit.add
// @req FR:playbook-actions-git/gitignore-edit.remove
// @req FR:playbook-actions-git/gitignore-edit.idempotent
// @req FR:playbook-actions-git/gitignore-edit.errors
// @req FR:playbook-actions-git/gitignore-edit.output

import * as fs from 'fs/promises';
import { CatalystError } from '@core/errors';
import type { PlaybookAction, PlaybookActionResult } from '../../types';
import { FileWriteAction } from '../io/file/write-action';
import type { GitignoreEditConfig, GitignoreEditResult } from './types';

/**
 * Gitignore-edit action
 *
 * Manages a named section inside a `.gitignore` file: adds patterns not yet
 * present, removes patterns listed in remove, deletes the section header when
 * its patterns are gone. Atomic write is inherited via delegation to
 * `file-write`.
 *
 * @example YAML
 * ```yaml
 * - gitignore-edit:
 *     path: .gitignore
 *     header: "Catalyst commands"
 *     add: ["catalyst.*.md"]
 * ```
 */
export class GitignoreEditAction implements PlaybookAction<GitignoreEditConfig> {
  static readonly actionType = 'gitignore-edit';
  static readonly primaryProperty = 'path';

  async execute(config: GitignoreEditConfig): Promise<PlaybookActionResult> {
    const validationError = this.validateConfig(config);
    if (validationError) {
      return {
        code: validationError.code,
        message: validationError.message,
        error: validationError
      };
    }

    const { path: filePath, header } = config;
    const add = config.add ?? [];
    const remove = config.remove ?? [];

    // Read existing file. Missing file is the new-file path.
    let existing: string | undefined;
    try {
      existing = await fs.readFile(filePath, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        // Permission/IO errors fall through to the write delegate to get
        // a consistent error code mapping.
        existing = undefined;
      }
    }

    const nextContent = this.applyEdits(existing, header, add, remove);

    // No-op detection: if file existed and content didn't change, skip the write.
    if (existing !== undefined && nextContent === existing) {
      return {
        code: 'Success',
        message: `Gitignore already current at ${filePath} (no changes)`,
        value: { path: filePath, bytesWritten: 0, changed: false } satisfies GitignoreEditResult,
        error: undefined
      };
    }

    // Also a no-op when no add/remove had any effect on a missing file
    // (e.g., remove-only call against a file that never existed).
    if (existing === undefined && nextContent === '') {
      return {
        code: 'Success',
        message: `Gitignore unchanged at ${filePath} (no patterns to add)`,
        value: { path: filePath, bytesWritten: 0, changed: false } satisfies GitignoreEditResult,
        error: undefined
      };
    }

    const writeResult = await new FileWriteAction().execute({
      path: filePath,
      content: nextContent
    });

    if (writeResult.code !== 'Success') {
      return writeResult;
    }

    const bytesWritten = (writeResult.value as { bytesWritten: number }).bytesWritten;
    const result: GitignoreEditResult = {
      path: filePath,
      bytesWritten,
      changed: true
    };

    return {
      code: 'Success',
      message: `Wrote ${bytesWritten} bytes to ${filePath}`,
      value: result,
      error: undefined
    };
  }

  private validateConfig(config: GitignoreEditConfig): CatalystError | undefined {
    if (!config?.path) {
      return new CatalystError(
        'Missing required configuration property: path',
        'GitignoreEditConfigInvalid',
        `The gitignore-edit action requires a 'path' property.`
      );
    }
    if (!config.header || typeof config.header !== 'string') {
      return new CatalystError(
        'Missing required configuration property: header',
        'GitignoreEditConfigInvalid',
        `The gitignore-edit action requires a 'header' property naming the section to edit at '${config.path}'.`
      );
    }
    const addLen = Array.isArray(config.add) ? config.add.length : 0;
    const removeLen = Array.isArray(config.remove) ? config.remove.length : 0;
    if (addLen === 0 && removeLen === 0) {
      return new CatalystError(
        'Missing add/remove patterns',
        'GitignoreEditConfigInvalid',
        `The gitignore-edit action requires at least one pattern in 'add' or 'remove' for '${config.path}'.`
      );
    }
    return undefined;
  }

  /**
   * Apply add/remove operations to the existing file content, returning the
   * new content. Pure function — no I/O.
   */
  private applyEdits(
    existing: string | undefined,
    header: string,
    add: readonly string[],
    remove: readonly string[]
  ): string {
    const lines = existing === undefined ? [] : existing.split('\n');
    // If the file ends with a trailing newline, split produces an empty final
    // element. Track and re-apply it at the end so we don't drop the newline.
    const hadTrailingNewline = existing !== undefined && existing.endsWith('\n');
    if (hadTrailingNewline) {
      lines.pop();
    }

    const headerLower = header.toLowerCase();
    const isMatchingHeader = (line: string): boolean => {
      if (!line.startsWith('#')) return false;
      const text = line.slice(1).trim().toLowerCase();
      return text === headerLower;
    };

    // Locate section [startIdx, endIdx) — startIdx is the header line; endIdx
    // is one past the last pattern line in the section.
    let startIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (isMatchingHeader(lines[i])) {
        startIdx = i;
        break;
      }
    }

    let endIdx = -1;
    if (startIdx !== -1) {
      endIdx = lines.length;
      for (let i = startIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line === '' || line.startsWith('#')) {
          endIdx = i;
          break;
        }
      }
    }

    // Build the section's new pattern list.
    let sectionPatterns: string[];
    if (startIdx === -1) {
      // No existing section; start from empty.
      sectionPatterns = [];
    } else {
      sectionPatterns = lines.slice(startIdx + 1, endIdx);
    }

    // Apply removals first so adds can re-introduce removed entries if desired.
    if (remove.length > 0) {
      const removeSet = new Set(remove);
      sectionPatterns = sectionPatterns.filter((p) => !removeSet.has(p));
    }

    // Append missing adds at the end of the section.
    for (const pattern of add) {
      if (!sectionPatterns.includes(pattern)) {
        sectionPatterns.push(pattern);
      }
    }

    // Splice the updated section back into the file.
    let nextLines: string[];
    if (sectionPatterns.length === 0) {
      // Section is empty — delete header too.
      if (startIdx === -1) {
        // No section existed and none to create; nothing to splice.
        nextLines = lines.slice();
      } else {
        nextLines = lines.slice(0, startIdx).concat(lines.slice(endIdx));
      }
    } else if (startIdx === -1) {
      // Create a new section. If file is non-empty and doesn't end with a
      // blank line, insert one for readability.
      const newSection = [`# ${header}`, ...sectionPatterns];
      if (lines.length === 0) {
        nextLines = newSection;
      } else {
        const needsBlank = lines[lines.length - 1] !== '';
        nextLines = needsBlank
          ? lines.concat('', newSection)
          : lines.concat(newSection);
      }
    } else {
      // Replace the existing section's patterns.
      nextLines = lines
        .slice(0, startIdx + 1)
        .concat(sectionPatterns)
        .concat(lines.slice(endIdx));
    }

    // Trim trailing empty lines we may have introduced via splice when the
    // section was deleted and was at EOF.
    while (nextLines.length > 0 && nextLines[nextLines.length - 1] === '') {
      nextLines.pop();
    }

    if (nextLines.length === 0) {
      return '';
    }
    // Always end with a trailing newline.
    return nextLines.join('\n') + '\n';
  }
}
