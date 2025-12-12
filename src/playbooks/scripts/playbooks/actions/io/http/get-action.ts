import { HttpActionBase } from './base-http-action';
import type { HttpGetConfig } from '../types';

/**
 * HTTP GET action
 *
 * Executes HTTP GET requests with retry logic, timeout enforcement,
 * and comprehensive error handling.
 *
 * @example
 * ```typescript
 * const action = new HttpGetAction();
 * const result = await action.execute({
 *   url: 'https://api.example.com/users/123',
 *   headers: { 'Authorization': 'Bearer token' },
 *   timeout: 30000,
 *   retries: 3
 * });
 * ```
 */
export class HttpGetAction extends HttpActionBase<HttpGetConfig> {
  static readonly actionType = 'http-get';
  readonly method = 'GET';
}
