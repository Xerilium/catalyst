/**
 * Unit tests for retry utility
 */

import { describe, it, expect, jest } from '@jest/globals';
import { executeWithRetry, isRetryableHttpError } from '@playbooks/actions/io/utils/retry';

describe('Retry Utility', () => {
  describe('executeWithRetry', () => {
    it('should return result on successful operation', async () => {
      const operation = jest.fn(async () => 'success');

      const result = await executeWithRetry(operation, 3);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      let attempts = 0;
      const operation = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const result = await executeWithRetry(operation, 3);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    }, 10000); // 10 second timeout (1s + 4s delays)

    it('should throw error after exhausting retries', async () => {
      const operation = jest.fn(async () => {
        throw new Error('Persistent failure');
      });

      await expect(executeWithRetry(operation, 3)).rejects.toThrow('Persistent failure');
      expect(operation).toHaveBeenCalledTimes(4); // Initial + 3 retries
    }, 40000); // 40 second timeout (1s + 4s + 9s + 16s delays)

    it('should use exponential backoff delays', async () => {
      const operation = jest.fn(async () => {
        throw new Error('Failure');
      });

      const startTime = Date.now();

      try {
        await executeWithRetry(operation, 2);
      } catch (_error) {
        // Expected to fail
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Attempt 1: 1s, Attempt 2: 4s = 5s total minimum
      // Allow some margin for execution time
      expect(duration).toBeGreaterThanOrEqual(4900);
      expect(duration).toBeLessThan(6000);
    }, 10000); // 10 second timeout

    it('should respect shouldRetry function', async () => {
      const operation = jest.fn(async () => {
        throw new Error('Non-retryable error');
      });

      const shouldRetry = jest.fn(() => false);

      await expect(executeWithRetry(operation, 3, shouldRetry)).rejects.toThrow('Non-retryable error');

      expect(operation).toHaveBeenCalledTimes(1); // No retries
      expect(shouldRetry).toHaveBeenCalledTimes(1);
    });

    it('should cap backoff delay at 30 seconds', async () => {
      const operation = jest.fn(async () => {
        throw new Error('Failure');
      });

      const startTime = Date.now();

      try {
        // Attempt 7 would be 36s without cap, should be capped at 30s
        await executeWithRetry(operation, 6);
      } catch (_error) {
        // Expected to fail
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Delays: 1s, 4s, 9s, 16s, 25s, 30s (capped from 36s) = ~85s total
      // Allow generous margin for execution time variance across different machines
      expect(duration).toBeGreaterThanOrEqual(84000);
      expect(duration).toBeLessThan(120000);
    }, 150000); // Set timeout to 150 seconds for this long-running test
  });

  describe('isRetryableHttpError', () => {
    it('should retry network errors (no status code)', () => {
      const error = new Error('Network error');
      expect(isRetryableHttpError(error, undefined)).toBe(true);
    });

    it('should retry 5xx server errors', () => {
      const error = new Error('Server error');
      expect(isRetryableHttpError(error, 500)).toBe(true);
      expect(isRetryableHttpError(error, 502)).toBe(true);
      expect(isRetryableHttpError(error, 503)).toBe(true);
      expect(isRetryableHttpError(error, 504)).toBe(true);
    });

    it('should not retry 4xx client errors', () => {
      const error = new Error('Client error');
      expect(isRetryableHttpError(error, 400)).toBe(false);
      expect(isRetryableHttpError(error, 401)).toBe(false);
      expect(isRetryableHttpError(error, 403)).toBe(false);
      expect(isRetryableHttpError(error, 404)).toBe(false);
    });

    it('should not retry 2xx success codes', () => {
      const error = new Error('Unexpected error');
      expect(isRetryableHttpError(error, 200)).toBe(false);
      expect(isRetryableHttpError(error, 201)).toBe(false);
    });

    it('should not retry 3xx redirect codes', () => {
      const error = new Error('Redirect');
      expect(isRetryableHttpError(error, 301)).toBe(false);
      expect(isRetryableHttpError(error, 302)).toBe(false);
    });
  });
});
