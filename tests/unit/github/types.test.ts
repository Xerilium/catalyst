/**
 * Unit tests for Result<T> type guards and helpers
 */

import { Result, success, failure, GitHubError } from '../../../src/playbooks/scripts/github/types';

describe('Result<T> type guards', () => {
  describe('success()', () => {
    it('should create success result with data', () => {
      const result = success({ value: 42 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 42 });
      expect(result.error).toBeNull();
    });

    it('should handle null data', () => {
      const result = success(null);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it('should handle undefined data', () => {
      const result = success(undefined);

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeNull();
    });
  });

  describe('failure()', () => {
    it('should create failure result with error', () => {
      const error = new GitHubError('Test error', 'TEST_CODE', 'Try again');
      const result = failure(error);

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe(error);
    });

    it('should preserve error properties', () => {
      const error = new GitHubError('Auth failed', 'AUTH_ERROR', 'Run: gh auth login');
      const result = failure(error);

      expect(result.error?.message).toBe('Auth failed');
      expect(result.error?.code).toBe('AUTH_ERROR');
      expect(result.error?.guidance).toBe('Run: gh auth login');
    });
  });

  describe('type narrowing', () => {
    it('should narrow type when success is true', () => {
      const result: Result<string> = success('test');

      if (result.success) {
        // TypeScript should infer result.data as string here
        expect(result.data.toUpperCase()).toBe('TEST');
        expect(result.error).toBeNull();
      } else {
        fail('Should not reach here');
      }
    });

    it('should narrow type when success is false', () => {
      const error = new GitHubError('Failed', 'ERROR', 'Fix it');
      const result: Result<string> = failure(error);

      if (!result.success) {
        // TypeScript should infer result.error as GitHubError here
        expect(result.error.code).toBe('ERROR');
        expect(result.data).toBeNull();
      } else {
        fail('Should not reach here');
      }
    });
  });
});
