// @req FR:playbook-actions-io/http.base-class.header-masking
// @req FR:playbook-actions-io/security.http-data-masking
// @req NFR:playbook-actions-io/maintainability.shared-logic

/**
 * Header masking utility
 *
 * Masks sensitive header values in logs to prevent credential leakage.
 */

/**
 * Patterns for sensitive header names (case-insensitive)
 */
const SENSITIVE_PATTERNS = [
  'authorization',
  'token',
  'key',
  'secret',
  'password'
];

/**
 * Check if a header name is sensitive
 *
 * @param headerName - Header name to check
 * @returns true if header contains sensitive data
 */
export function isSensitiveHeader(headerName: string): boolean {
  const lowerName = headerName.toLowerCase();
  return SENSITIVE_PATTERNS.some(pattern => lowerName.includes(pattern));
}

/**
 * Mask sensitive headers for logging
 *
 * @param headers - Headers object to mask
 * @returns New headers object with sensitive values masked
 *
 * @example
 * ```typescript
 * const headers = {
 *   'Authorization': 'Bearer secret-token',
 *   'Content-Type': 'application/json'
 * };
 * const masked = maskSensitiveHeaders(headers);
 * // { 'Authorization': '***', 'Content-Type': 'application/json' }
 * ```
 */
export function maskSensitiveHeaders(
  headers: Record<string, string>
): Record<string, string> {
  const masked: Record<string, string> = {};

  for (const [name, value] of Object.entries(headers)) {
    masked[name] = isSensitiveHeader(name) ? '***' : value;
  }

  return masked;
}

/**
 * Mask sensitive query parameters in URLs
 *
 * @param url - URL to mask
 * @returns URL with sensitive query parameters masked
 *
 * @example
 * ```typescript
 * const url = 'https://api.example.com?api_key=secret&page=1';
 * const masked = maskSensitiveUrlParams(url);
 * // 'https://api.example.com?api_key=***&page=1'
 * ```
 */
export function maskSensitiveUrlParams(url: string): string {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    // Collect parameter names first to avoid iterator issues
    const names: string[] = [];
    params.forEach((_, name) => {
      names.push(name);
    });

    // Check each parameter name
    for (const name of names) {
      if (isSensitiveHeader(name)) {
        params.set(name, '***');
      }
    }

    return urlObj.toString();
  } catch (_error) {
    // If URL parsing fails, return original (might be a template)
    return url;
  }
}
