/**
 * GitHub helper functions for legacy playbook scripts
 *
 * Note: These functions are placeholders for mocking in tests.
 * The actual implementations use execSync with `gh` CLI directly
 * in the new-init-issue.ts and new-blueprint-issue.ts scripts.
 *
 * @deprecated This module exists only for test compatibility
 */

export function getProjectName(): string {
  throw new Error('Not implemented - use gh CLI directly');
}

export function isGitHubCliAvailable(): boolean {
  throw new Error('Not implemented - use gh CLI directly');
}

export function findIssue(_title: string): unknown | null {
  throw new Error('Not implemented - use gh CLI directly');
}

export function prepareIssueTemplate(_project: string): string {
  throw new Error('Not implemented - use gh CLI directly');
}

export function createGitHubIssue(_title: string, _body: string): void {
  throw new Error('Not implemented - use gh CLI directly');
}
