// @req FR:playbook-actions-github/errors.graceful-failure
// @req FR:playbook-actions-github/errors.actionable-messages
// @req NFR:playbook-actions-github/reliability.actionable-errors

import {
  GitHubError,
  GitHubAuthError,
  GitHubNotFoundError,
  GitHubPermissionError,
  GitHubRateLimitError,
  GitHubNetworkError,
} from '@playbooks/actions/github/errors';

describe('GitHubError', () => {
  it('should construct with code, message, guidance, and cause', () => {
    const cause = new Error('Underlying error');
    const error = new GitHubError('test_error', 'Something failed', 'Try this fix', cause);

    expect(error.message).toBe('Something failed');
    expect(error.code).toBe('test_error');
    expect(error.guidance).toBe('Try this fix');
    expect(error.cause).toBe(cause);
  });

  it('should preserve stack trace', () => {
    const error = new GitHubError('test_code', 'Test error');
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('GitHubError');
  });

  it('should serialize to JSON correctly', () => {
    const error = new GitHubError('test_code', 'Test error', 'Fix guidance');
    const json = JSON.stringify(error);
    const parsed = JSON.parse(json);

    expect(parsed.message).toBe('Test error');
    expect(parsed.code).toBe('test_code');
    expect(parsed.guidance).toBe('Fix guidance');
  });
});

describe('GitHubAuthError', () => {
  it('should extend GitHubError', () => {
    const error = new GitHubAuthError('Not authenticated', 'Run: gh auth login');
    expect(error).toBeInstanceOf(GitHubError);
    expect(error).toBeInstanceOf(GitHubAuthError);
  });

  it('should have auth_required code', () => {
    const error = new GitHubAuthError('Not authenticated', 'Run: gh auth login');
    expect(error.code).toBe('auth_required');
  });

  it('should preserve properties', () => {
    const error = new GitHubAuthError('Not authenticated', 'Run: gh auth login');
    expect(error.message).toBe('Not authenticated');
    expect(error.guidance).toBe('Run: gh auth login');
  });
});

describe('GitHubNotFoundError', () => {
  it('should extend GitHubError', () => {
    const error = new GitHubNotFoundError('Repository not found', 'Check repository name');
    expect(error).toBeInstanceOf(GitHubError);
    expect(error).toBeInstanceOf(GitHubNotFoundError);
  });

  it('should have not_found code', () => {
    const error = new GitHubNotFoundError('Repository not found', 'Check repository name');
    expect(error.code).toBe('not_found');
  });
});

describe('GitHubPermissionError', () => {
  it('should extend GitHubError', () => {
    const error = new GitHubPermissionError('Insufficient permissions', 'Request write access');
    expect(error).toBeInstanceOf(GitHubError);
    expect(error).toBeInstanceOf(GitHubPermissionError);
  });

  it('should have permission_denied code', () => {
    const error = new GitHubPermissionError('Insufficient permissions', 'Request write access');
    expect(error.code).toBe('permission_denied');
  });
});

describe('GitHubRateLimitError', () => {
  it('should extend GitHubError', () => {
    const error = new GitHubRateLimitError('Rate limit exceeded', 'Wait 60 minutes');
    expect(error).toBeInstanceOf(GitHubError);
    expect(error).toBeInstanceOf(GitHubRateLimitError);
  });

  it('should have rate_limit_exceeded code', () => {
    const error = new GitHubRateLimitError('Rate limit exceeded', 'Wait 60 minutes');
    expect(error.code).toBe('rate_limit_exceeded');
  });
});

describe('GitHubNetworkError', () => {
  it('should extend GitHubError', () => {
    const error = new GitHubNetworkError('Connection failed', 'Check network connectivity');
    expect(error).toBeInstanceOf(GitHubError);
    expect(error).toBeInstanceOf(GitHubNetworkError);
  });

  it('should have network_error code', () => {
    const error = new GitHubNetworkError('Connection failed', 'Check network connectivity');
    expect(error.code).toBe('network_error');
  });
});

describe('Error prototype chain', () => {
  it('should work with instanceof checks', () => {
    const authError = new GitHubAuthError('Auth failed', 'Login first');
    const notFoundError = new GitHubNotFoundError('Not found', 'Check name');
    const permError = new GitHubPermissionError('No permission', 'Request access');
    const rateLimitError = new GitHubRateLimitError('Rate limited', 'Wait');
    const networkError = new GitHubNetworkError('Network failed', 'Check connection');

    // All are GitHubErrors
    expect(authError instanceof GitHubError).toBe(true);
    expect(notFoundError instanceof GitHubError).toBe(true);
    expect(permError instanceof GitHubError).toBe(true);
    expect(rateLimitError instanceof GitHubError).toBe(true);
    expect(networkError instanceof GitHubError).toBe(true);

    // But not each other
    expect(authError instanceof GitHubNotFoundError).toBe(false);
    expect(notFoundError instanceof GitHubAuthError).toBe(false);
  });
});
