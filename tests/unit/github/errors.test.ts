/**
 * Unit tests for GitHubError hierarchy
 */

import {
  GitHubError,
  GitHubAuthError,
  GitHubNotFoundError,
  GitHubNetworkError,
  GitHubRateLimitError,
  GitHubPermissionError,
} from '../../../src/playbooks/scripts/github/types';

describe('GitHubError hierarchy', () => {
  describe('GitHubError', () => {
    it('should create error with all properties', () => {
      const error = new GitHubError('Test message', 'TEST_CODE', 'Do something');

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.remediation).toBe('Do something');
      expect(error.cause).toBeUndefined();
      expect(error.name).toBe('GitHubError');
    });

    it('should include cause when provided', () => {
      const cause = new Error('Original error');
      const error = new GitHubError('Wrapped', 'WRAP', 'Fix it', cause);

      expect(error.cause).toBe(cause);
    });

    it('should be instance of Error', () => {
      const error = new GitHubError('Test', 'CODE', 'Fix');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(GitHubError);
    });
  });

  describe('GitHubAuthError', () => {
    it('should create auth error with AUTH_ERROR code', () => {
      const error = new GitHubAuthError('Not authenticated', 'Run: gh auth login');

      expect(error.message).toBe('Not authenticated');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.remediation).toBe('Run: gh auth login');
      expect(error.name).toBe('GitHubAuthError');
    });

    it('should be instance of GitHubError', () => {
      const error = new GitHubAuthError('Auth failed', 'Login first');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(GitHubError);
      expect(error).toBeInstanceOf(GitHubAuthError);
    });
  });

  describe('GitHubNotFoundError', () => {
    it('should create not found error with NOT_FOUND code', () => {
      const error = new GitHubNotFoundError('Issue #999 not found', 'Check issue number');

      expect(error.message).toBe('Issue #999 not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.remediation).toBe('Check issue number');
      expect(error.name).toBe('GitHubNotFoundError');
    });

    it('should be instance of GitHubError', () => {
      const error = new GitHubNotFoundError('Not found', 'Verify ID');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(GitHubError);
      expect(error).toBeInstanceOf(GitHubNotFoundError);
    });
  });

  describe('GitHubNetworkError', () => {
    it('should create network error with NETWORK_ERROR code', () => {
      const error = new GitHubNetworkError('Connection timeout', 'Check network connection');

      expect(error.message).toBe('Connection timeout');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.remediation).toBe('Check network connection');
      expect(error.name).toBe('GitHubNetworkError');
    });

    it('should preserve cause for network errors', () => {
      const cause = new Error('ECONNREFUSED');
      const error = new GitHubNetworkError('Connection failed', 'Retry', cause);

      expect(error.cause).toBe(cause);
    });

    it('should be instance of GitHubError', () => {
      const error = new GitHubNetworkError('Network error', 'Retry');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(GitHubError);
      expect(error).toBeInstanceOf(GitHubNetworkError);
    });
  });

  describe('GitHubRateLimitError', () => {
    it('should create rate limit error with RATE_LIMIT code', () => {
      const error = new GitHubRateLimitError('Rate limit exceeded', 'Wait 60 seconds');

      expect(error.message).toBe('Rate limit exceeded');
      expect(error.code).toBe('RATE_LIMIT');
      expect(error.remediation).toBe('Wait 60 seconds');
      expect(error.name).toBe('GitHubRateLimitError');
    });

    it('should be instance of GitHubError', () => {
      const error = new GitHubRateLimitError('Too many requests', 'Wait');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(GitHubError);
      expect(error).toBeInstanceOf(GitHubRateLimitError);
    });
  });

  describe('GitHubPermissionError', () => {
    it('should create permission error with PERMISSION_ERROR code', () => {
      const error = new GitHubPermissionError('Insufficient permissions', 'Request admin access');

      expect(error.message).toBe('Insufficient permissions');
      expect(error.code).toBe('PERMISSION_ERROR');
      expect(error.remediation).toBe('Request admin access');
      expect(error.name).toBe('GitHubPermissionError');
    });

    it('should be instance of GitHubError', () => {
      const error = new GitHubPermissionError('Access denied', 'Get permission');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(GitHubError);
      expect(error).toBeInstanceOf(GitHubPermissionError);
    });
  });

  describe('error differentiation', () => {
    it('should distinguish error types using instanceof', () => {
      const authError = new GitHubAuthError('Auth', 'Login');
      const notFoundError = new GitHubNotFoundError('Not found', 'Check');
      const networkError = new GitHubNetworkError('Network', 'Retry');

      expect(authError instanceof GitHubAuthError).toBe(true);
      expect(authError instanceof GitHubNotFoundError).toBe(false);
      expect(authError instanceof GitHubNetworkError).toBe(false);

      expect(notFoundError instanceof GitHubNotFoundError).toBe(true);
      expect(notFoundError instanceof GitHubAuthError).toBe(false);

      expect(networkError instanceof GitHubNetworkError).toBe(true);
      expect(networkError instanceof GitHubNotFoundError).toBe(false);
    });

    it('should distinguish error types using code property', () => {
      const authError = new GitHubAuthError('Auth', 'Login');
      const notFoundError = new GitHubNotFoundError('Not found', 'Check');
      const networkError = new GitHubNetworkError('Network', 'Retry');
      const rateLimitError = new GitHubRateLimitError('Rate limit', 'Wait');
      const permissionError = new GitHubPermissionError('Permission', 'Request');

      expect(authError.code).toBe('AUTH_ERROR');
      expect(notFoundError.code).toBe('NOT_FOUND');
      expect(networkError.code).toBe('NETWORK_ERROR');
      expect(rateLimitError.code).toBe('RATE_LIMIT');
      expect(permissionError.code).toBe('PERMISSION_ERROR');
    });
  });
});
