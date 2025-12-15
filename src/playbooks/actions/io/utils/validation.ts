// @req FR:playbook-actions-io/http.base-class.error-handling
// @req NFR:playbook-actions-io/maintainability.shared-logic

import { CatalystError } from '@core/errors';

/**
 * Status validation utility
 *
 * Validates HTTP response status codes against configured rules.
 */

/**
 * Default status validator: 2xx status codes are valid
 *
 * @param status - HTTP status code
 * @returns true if status is valid (200-299)
 */
export function defaultStatusValidator(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Validate response status code
 *
 * @param status - HTTP status code
 * @param validator - Custom validation function (defaults to 2xx validator)
 * @param errorCode - Error code to use if validation fails (default: 'HttpInvalidStatus')
 * @throws CatalystError if status is invalid
 *
 * @example
 * ```typescript
 * validateResponseStatus(200); // No error
 * validateResponseStatus(404); // Throws CatalystError
 * validateResponseStatus(503, (s) => s === 503); // No error
 * ```
 */
export function validateResponseStatus(
  status: number,
  validator: (status: number) => boolean = defaultStatusValidator,
  errorCode = 'HttpInvalidStatus'
): void {
  if (!validator(status)) {
    throw new CatalystError(
      `HTTP request failed with status ${status}`,
      errorCode,
      `The server returned status code ${status} which is considered invalid. ` +
      `Common status codes: 200 (OK), 404 (Not Found), 500 (Server Error). ` +
      `Check the API documentation for expected status codes, or configure a custom status validator.`
    );
  }
}
