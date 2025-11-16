/**
 * Error handling policy for playbook engine
 * Maps error codes to handling strategies
 */
export type ErrorPolicy = string | Record<string, string>;
