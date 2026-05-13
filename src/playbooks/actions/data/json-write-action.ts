// @req FR:playbook-actions-data/json-write.@action
// @req FR:playbook-actions-data/json-write.input
// @req FR:playbook-actions-data/json-write.write
// @req FR:playbook-actions-data/json-write.errors
// @req FR:playbook-actions-data/json-write.output

import { CatalystError } from '@core/errors';
import type { PlaybookAction, PlaybookActionResult } from '../../types';
import { FileWriteAction } from '../io/file/write-action';
import type { JsonWriteConfig } from './types';

/**
 * JSON write action
 *
 * Serializes a value as JSON and atomically writes it to a file. File I/O
 * (path validation, atomic write, error mapping) is delegated to
 * `file-write`; this action layers JSON serialization on top.
 *
 * @example
 * ```typescript
 * const action = new JsonWriteAction();
 * const result = await action.execute({
 *   path: 'config.json',
 *   value: { feature: 'enabled' },
 *   pretty: true
 * });
 * ```
 *
 * @example YAML
 * ```yaml
 * steps:
 *   - json-write:
 *       path: temp://manifest.json
 *       value: "{{manifest-data}}"
 * ```
 */
export class JsonWriteAction implements PlaybookAction<JsonWriteConfig> {
  static readonly actionType = 'json-write';
  static readonly primaryProperty = 'value';

  async execute(config: JsonWriteConfig): Promise<PlaybookActionResult> {
    // Serialize value. catch handles cyclic references, BigInt, etc.
    let serialized: string;
    try {
      serialized = JSON.stringify(config?.value, null, config?.pretty === false ? 0 : 2);
      if (serialized === undefined) {
        // JSON.stringify returns undefined for values like `undefined` or a
        // function — not an error but not writeable either.
        throw new Error('Value is not JSON-serializable (serializes to undefined)');
      }
    } catch (error) {
      const stringifyError = new CatalystError(
        `Failed to serialize value as JSON for ${config?.path}: ${(error as Error).message}`,
        'JsonStringifyError',
        `The value provided to json-write could not be serialized for '${config?.path}'. Check for cyclic references, BigInt values, or undefined.`,
        error as Error
      );
      return {
        code: stringifyError.code,
        message: stringifyError.message,
        error: stringifyError
      };
    }

    // Delegate file write — inherits path validation, atomic write, and
    // file-error mapping. file-write also validates path and content presence.
    return await new FileWriteAction().execute({
      path: config?.path,
      content: serialized,
      encoding: config?.encoding
    });
  }
}
