import { HttpActionBase } from './base-http-action';
import type { HttpDeleteConfig } from '../types';

/**
 * HTTP DELETE action
 *
 * Executes HTTP DELETE requests with optional request body support, retry logic,
 * timeout enforcement, and comprehensive error handling.
 *
 * @req FR:playbook-actions-io/http.delete-action.implementation
 * @req NFR:playbook-actions-io/maintainability.single-responsibility
 *
 * @example
 * ```typescript
 * const action = new HttpDeleteAction();
 * const result = await action.execute({
 *   url: 'https://api.example.com/users/123',
 *   headers: { 'Authorization': 'Bearer token' },
 *   timeout: 30000,
 *   retries: 3
 * });
 * ```
 */
export class HttpDeleteAction extends HttpActionBase<HttpDeleteConfig> {
  static readonly actionType = 'http-delete';
  readonly method = 'DELETE';
}
