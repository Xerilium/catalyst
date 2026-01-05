// @req FR:playbook-actions-io/http.base-class.retry-logic
// @req NFR:playbook-actions-io/reliability.exponential-backoff
// @req NFR:playbook-actions-io/performance.retry-backoff-limit
// @req NFR:playbook-actions-io/maintainability.shared-logic

/**
 * Retry logic with exponential backoff
 *
 * Implements retry functionality for HTTP requests with configurable
 * retry count and exponential backoff delays.
 */

/**
 * Execute an operation with retry logic and exponential backoff
 *
 * @template T - The return type of the operation
 * @param operation - Async function to execute
 * @param retries - Number of retry attempts (default: 3)
 * @param shouldRetry - Function to determine if error is retryable (default: always retry)
 * @returns Promise resolving to operation result
 * @throws Last error if all retries exhausted
 *
 * @example
 * ```typescript
 * const result = await executeWithRetry(
 *   async () => fetch(url),
 *   3,
 *   (error) => error instanceof NetworkError
 * );
 * ```
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  shouldRetry: (error: Error) => boolean = () => true
): Promise<T> {
  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if we've exhausted all attempts
      if (attempt >= retries) {
        throw lastError;
      }

      // Don't retry if error is not retryable
      if (!shouldRetry(lastError)) {
        throw lastError;
      }

      // Calculate exponential backoff: attempt^2 * 1000ms
      // Attempt 1: 1s, Attempt 2: 4s, Attempt 3: 9s, Attempt 4: 16s
      const delay = Math.pow(attempt + 1, 2) * 1000;

      // Cap at 30 seconds
      const cappedDelay = Math.min(delay, 30000);

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, cappedDelay));

      attempt++;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Determine if an HTTP error should be retried
 *
 * @param error - Error to check
 * @param statusCode - HTTP status code (if available)
 * @returns true if error should be retried
 *
 * Only retries network errors and 5xx status codes.
 * Does not retry 4xx client errors.
 */
export function isRetryableHttpError(error: Error, statusCode?: number): boolean {
  // Network errors (no status code) should be retried
  if (statusCode === undefined) {
    return true;
  }

  // 5xx server errors should be retried
  if (statusCode >= 500 && statusCode < 600) {
    return true;
  }

  // All other errors (including 4xx) should not be retried
  return false;
}
