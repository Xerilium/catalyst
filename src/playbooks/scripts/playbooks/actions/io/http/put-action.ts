import { HttpActionBase } from './base-http-action';
import type { HttpPutConfig } from '../types';

/**
 * HTTP PUT action
 *
 * Executes HTTP PUT requests with request body support, retry logic,
 * timeout enforcement, and comprehensive error handling.
 *
 * @example
 * ```typescript
 * const action = new HttpPutAction();
 * const result = await action.execute({
 *   url: 'https://api.example.com/users/123',
 *   headers: { 'Authorization': 'Bearer token' },
 *   body: { email: 'updated@example.com', name: 'Updated User' },
 *   timeout: 30000,
 *   retries: 3
 * });
 * ```
 */
export class HttpPutAction extends HttpActionBase<HttpPutConfig> {
  static readonly actionType = 'http-put';
  readonly method = 'PUT';
}
