import { HttpActionBase } from './base-http-action';
import type { HttpPostConfig } from '../types';

/**
 * HTTP POST action
 *
 * Executes HTTP POST requests with request body support, retry logic,
 * timeout enforcement, and comprehensive error handling.
 *
 * @example
 * ```typescript
 * const action = new HttpPostAction();
 * const result = await action.execute({
 *   url: 'https://api.example.com/users',
 *   headers: { 'Authorization': 'Bearer token' },
 *   body: { email: 'user@example.com', name: 'User' },
 *   timeout: 30000,
 *   retries: 3
 * });
 * ```
 */
export class HttpPostAction extends HttpActionBase<HttpPostConfig> {
  readonly method = 'POST';
  readonly actionName = 'http-post';
}
