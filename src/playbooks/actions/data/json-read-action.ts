// @req FR:playbook-actions-data/json-read.@action
// @req FR:playbook-actions-data/json-read.input
// @req FR:playbook-actions-data/json-read.read
// @req FR:playbook-actions-data/json-read.errors
// @req FR:playbook-actions-data/json-read.output

import { CatalystError } from '@core/errors';
import type { PlaybookAction, PlaybookActionResult } from '../../types';
import { FileReadAction } from '../io/file/read-action';
import type { JsonReadConfig } from './types';

/**
 * JSON read action
 *
 * Reads a file and parses its content as JSON. File I/O (path validation,
 * encoding, error mapping) is delegated to `file-read`; this action layers
 * JSON parsing on top.
 *
 * @example
 * ```typescript
 * const action = new JsonReadAction();
 * const result = await action.execute({ path: 'config.json' });
 * // result.value === parsed JSON value
 * ```
 *
 * @example YAML shorthand
 * ```yaml
 * steps:
 *   - name: catalog
 *     json-read: catalyst://ai-providers/command-configs.json
 * ```
 */
export class JsonReadAction implements PlaybookAction<JsonReadConfig> {
  static readonly actionType = 'json-read';
  static readonly primaryProperty = 'path';

  async execute(config: JsonReadConfig): Promise<PlaybookActionResult> {
    // Delegate file I/O to file-read — inherits path validation, encoding
    // handling, and file-error mapping. file-read also validates that
    // config.path is present, so we don't duplicate that check here.
    const fileResult = await new FileReadAction().execute({
      path: config?.path,
      encoding: config?.encoding
    });

    // Propagate file errors as-is.
    if (fileResult.code !== 'Success') {
      return fileResult;
    }

    // Parse the file content as JSON.
    try {
      const parsed = JSON.parse(fileResult.value as string);
      return {
        code: 'Success',
        message: `Read and parsed JSON from ${config.path}`,
        value: parsed,
        error: undefined
      };
    } catch (error) {
      const parseError = new CatalystError(
        `Failed to parse JSON in ${config.path}: ${(error as Error).message}`,
        'JsonParseError',
        `The file '${config.path}' did not contain valid JSON. Check the file's contents.`,
        error as Error
      );
      return {
        code: parseError.code,
        message: parseError.message,
        error: parseError
      };
    }
  }
}
