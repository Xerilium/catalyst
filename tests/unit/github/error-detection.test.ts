/**
 * Unit tests for CLI error detection patterns
 * Test T044: Error detection
 */

import { detectErrorType, mapCLIError } from '../../../src/playbooks/scripts/github/errors';
import {
  GitHubAuthError,
  GitHubNotFoundError,
  GitHubNetworkError,
} from '../../../src/playbooks/scripts/github/types';

describe('Error Detection', () => {
  describe('detectErrorType()', () => {
    it('should detect auth errors', () => {
      const error = new Error('gh: To get started with GitHub CLI, please run: gh auth login');
      const detected = detectErrorType(error);
      expect(detected).toBe('auth');
    });

    it('should detect not found errors', () => {
      const error = new Error('could not resolve to an Issue');
      const detected = detectErrorType(error);
      expect(detected).toBe('not_found');
    });

    it('should detect network errors', () => {
      const error = new Error('dial tcp: lookup api.github.com: no such host');
      const detected = detectErrorType(error);
      expect(detected).toBe('network');
    });

    it('should detect rate limit errors', () => {
      const error = new Error('API rate limit exceeded');
      const detected = detectErrorType(error);
      expect(detected).toBe('rate_limit');
    });

    it('should detect permission errors', () => {
      const error = new Error('Resource not accessible by personal access token');
      const detected = detectErrorType(error);
      expect(detected).toBe('permission');
    });
  });

  describe('mapCLIError()', () => {
    it('should map to GitHubAuthError', () => {
      const error = new Error('not logged in');
      const mapped = mapCLIError(error);
      expect(mapped).toBeInstanceOf(GitHubAuthError);
      expect(mapped.remediation).toContain('gh auth login');
    });

    it('should map to GitHubNotFoundError', () => {
      const error = new Error('not found');
      const mapped = mapCLIError(error);
      expect(mapped).toBeInstanceOf(GitHubNotFoundError);
    });

    it('should map to GitHubNetworkError', () => {
      const error = new Error('connection refused');
      const mapped = mapCLIError(error);
      expect(mapped).toBeInstanceOf(GitHubNetworkError);
    });

    it('should preserve original error as cause', () => {
      const originalError = new Error('Original message');
      const mapped = mapCLIError(originalError);
      expect(mapped.cause).toBe(originalError);
    });
  });
});
