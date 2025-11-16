/**
 * Canonical ErrorPolicy and PolicyAction types for playbook-engine consumers.
 * This file lives in the error-handling implementation location so other features can import the type.
 */
export type PolicyString = string; // e.g. 'Fail', 'Continue', 'Ignore', 'Retry:3'

export type ErrorPolicy = PolicyString | Record<string, PolicyString> | { default?: PolicyString } | ({ default?: PolicyString } & Record<string, PolicyString>);

/**
 * Notes:
 * - Policy strings MUST use PascalCase action names. Retry uses the form `Retry:N`.
 * - Error code keys MUST be human-readable PascalCased identifiers such as `InvalidParameter` or `RepositoryNotFound`.
 */

export const PolicyActionExamples = {
  Fail: 'Fail',
  Continue: 'Continue',
  Ignore: 'Ignore',
  Retry: (n: number) => `Retry:${n}`,
};

export default ErrorPolicy;
