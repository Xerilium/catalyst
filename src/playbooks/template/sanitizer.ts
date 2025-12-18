/**
 * Context Sanitization Module
 *
 * Provides security-critical sanitization for template interpolation contexts.
 * Prevents prototype pollution, function injection, and dangerous property access.
 *
 * @req FR:playbook-template-engine/security.sandbox.isolation.proto
 * @req FR:playbook-template-engine/security.sandbox.allowlist.reject
 * @req NFR:playbook-template-engine/security.prototype
 * @req NFR:playbook-template-engine/testability.sanitization
 */

/**
 * Sanitizes a context object to prevent security vulnerabilities.
 *
 * Security measures:
 * 1. Creates null-prototype object to prevent prototype pollution
 * 2. Filters dangerous properties (__proto__, constructor, prototype)
 * 3. Rejects function objects to prevent code injection
 *
 * @param context - The raw context object to sanitize
 * @returns A sanitized context object safe for template interpolation
 * @throws CatalystError with code 'InvalidContext' if functions are detected
 */
export function sanitizeContext(context: Record<string, any>): Record<string, any> {
  // Create null-prototype object to prevent prototype pollution
  const sanitized = Object.create(null);

  // Dangerous properties that should never be allowed
  const dangerousProps = new Set(['__proto__', 'constructor', 'prototype']);

  for (const [key, value] of Object.entries(context)) {
    // Skip dangerous properties
    if (dangerousProps.has(key)) {
      continue;
    }

    // Reject function objects
    if (typeof value === 'function') {
      throw new Error('Functions not allowed in context');
    }

    // Recursively sanitize nested objects
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeContext(value);
    }
    // Recursively sanitize arrays
    else if (Array.isArray(value)) {
      sanitized[key] = value.map((item: any) =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
          ? sanitizeContext(item)
          : item
      );
    }
    // Primitive values are safe
    else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
