// @req FR:playbook-actions-io/http.base-class.timeout-enforcement
// @req NFR:playbook-actions-io/maintainability.shared-logic

import { CatalystError } from '@core/errors';

/**
 * Timeout handling utility
 *
 * Wraps promises with timeout logic to prevent hanging operations.
 */

/**
 * Wrap a promise with timeout logic
 *
 * @template T - The return type of the promise
 * @param promise - Promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param errorCode - Error code for timeout error (default: 'HttpTimeout')
 * @returns Promise that rejects if timeout is exceeded
 * @throws CatalystError with specified code if timeout exceeded
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   fetch(url),
 *   30000,
 *   'HttpTimeout'
 * );
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorCode = 'HttpTimeout'
): Promise<T> {
  // Create timeout promise that rejects after specified time
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new CatalystError(
          `Operation timed out after ${timeoutMs}ms`,
          errorCode,
          `The operation exceeded the configured timeout of ${timeoutMs}ms. ` +
          `Consider increasing the timeout value or investigating why the operation is slow.`
        )
      );
    }, timeoutMs);
  });

  // Race between the actual promise and the timeout
  return Promise.race([promise, timeoutPromise]);
}
