// @req FR:playbook-actions-io/http.patch-action.implementation
// @req NFR:playbook-actions-io/maintainability.single-responsibility

import { HttpActionBase } from './base-http-action';
import type { HttpPatchConfig } from '../types';

/**
 * HTTP PATCH action
 *
 * Executes HTTP PATCH requests with request body support, retry logic,
 * timeout enforcement, and comprehensive error handling.
 *
 * @example
 * ```typescript
 * const action = new HttpPatchAction();
 * const result = await action.execute({
 *   url: 'https://api.example.com/users/123',
 *   headers: { 'Authorization': 'Bearer token' },
 *   body: { email: 'patched@example.com' },
 *   timeout: 30000,
 *   retries: 3
 * });
 * ```
 */
export class HttpPatchAction extends HttpActionBase<HttpPatchConfig> {
  static readonly actionType = 'http-patch';
  readonly method = 'PATCH';
}
