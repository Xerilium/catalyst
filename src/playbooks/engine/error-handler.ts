import type { CatalystError, ErrorPolicy, ErrorAction, ErrorPolicyAction } from '@core/errors';

/**
 * Error handler for playbook execution
 *
 * Evaluates error policies and determines appropriate actions when steps fail.
 * Supports retry logic with exponential backoff.
 *
 * @example
 * ```typescript
 * const handler = new ErrorHandler();
 * const policy: ErrorPolicy = {
 *   default: { action: ErrorAction.Stop },
 *   'NetworkError': { action: ErrorAction.Continue, retryCount: 3 }
 * };
 *
 * const action = handler.evaluate(error, policy);
 * if (action === ErrorAction.Continue) {
 *   // Retry with backoff
 *   await handler.retryWithBackoff(async () => executeStep(), 3);
 * }
 * ```
 */
export class ErrorHandler {
  /**
   * Evaluate error policy and determine action to take
   *
   * @param error - The error that occurred
   * @param policy - Error policy configuration
   * @returns Error action to take (Stop, Continue, etc.)
   */
  evaluate(error: CatalystError, policy: ErrorPolicy | ErrorAction): ErrorAction {
    // If policy is just an ErrorAction string, return it directly
    if (typeof policy === 'string') {
      return policy as ErrorAction;
    }

    // Look for specific error code mapping
    const policyAction = policy[error.code];
    if (policyAction) {
      return policyAction.action;
    }

    // Fall back to default policy
    return policy.default.action;
  }

  /**
   * Get retry count for an error from policy
   *
   * @param error - The error that occurred
   * @param policy - Error policy configuration
   * @returns Number of retries to attempt (0 if no retries)
   */
  getRetryCount(error: CatalystError, policy: ErrorPolicy | ErrorAction): number {
    // If policy is just an ErrorAction string, no retries
    if (typeof policy === 'string') {
      return 0;
    }

    // Look for specific error code mapping
    const policyAction = policy[error.code];
    if (policyAction && policyAction.retryCount !== undefined) {
      return policyAction.retryCount;
    }

    // Fall back to default policy
    return policy.default.retryCount || 0;
  }

  /**
   * Retry an operation with exponential backoff
   *
   * Backoff formula: attempt^2 * 1000ms
   * Example: 1st retry = 1s, 2nd = 4s, 3rd = 9s
   *
   * @param operation - Async operation to retry
   * @param maxRetries - Maximum number of retry attempts
   * @returns Result of successful operation
   * @throws Last error if all retries fail
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // If we've used all retries, throw the error
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Calculate backoff delay: attempt^2 * 1000ms
        // Note: attempt starts at 0, so for first retry (attempt=0), delay is 0
        // For second retry (attempt=1), delay is 1000ms, etc.
        const delayMs = Math.pow(attempt + 1, 2) * 1000;

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('Retry failed with unknown error');
  }
}
