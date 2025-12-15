/**
 * @req FR:playbook-engine/error - Test error handling with policies and retry
 * @req NFR:playbook-engine/testability.critical-coverage - 100% coverage for error handling
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ErrorHandler } from '@playbooks/engine/error-handler';
import { CatalystError, ErrorAction, type ErrorPolicy } from '@core/errors';

describe('ErrorHandler', () => {
  let handler: ErrorHandler;

  beforeEach(() => {
    handler = new ErrorHandler();
  });

  describe('evaluate', () => {
    it('should return action for simple ErrorAction string', () => {
      const error = new CatalystError('Test error', 'TestError', 'Test guidance');
      const policy = ErrorAction.Continue;

      const action = handler.evaluate(error, policy);

      expect(action).toBe(ErrorAction.Continue);
    });

    it('should return specific action for matching error code', () => {
      const error = new CatalystError('Network error', 'NetworkError', 'Check connection');
      const policy: ErrorPolicy = {
        default: { action: ErrorAction.Stop },
        'NetworkError': { action: ErrorAction.Continue, retryCount: 3 }
      };

      const action = handler.evaluate(error, policy);

      expect(action).toBe(ErrorAction.Continue);
    });

    it('should return default action when no specific match', () => {
      const error = new CatalystError('Unknown error', 'UnknownError', 'Check logs');
      const policy: ErrorPolicy = {
        default: { action: ErrorAction.Stop },
        'NetworkError': { action: ErrorAction.Continue }
      };

      const action = handler.evaluate(error, policy);

      expect(action).toBe(ErrorAction.Stop);
    });
  });

  describe('getRetryCount', () => {
    it('should return 0 for simple ErrorAction string', () => {
      const error = new CatalystError('Test error', 'TestError', 'Test guidance');
      const policy = ErrorAction.Continue;

      const retryCount = handler.getRetryCount(error, policy);

      expect(retryCount).toBe(0);
    });

    it('should return retry count for matching error code', () => {
      const error = new CatalystError('Network error', 'NetworkError', 'Check connection');
      const policy: ErrorPolicy = {
        default: { action: ErrorAction.Stop },
        'NetworkError': { action: ErrorAction.Continue, retryCount: 5 }
      };

      const retryCount = handler.getRetryCount(error, policy);

      expect(retryCount).toBe(5);
    });

    it('should return default retry count when no specific match', () => {
      const error = new CatalystError('Unknown error', 'UnknownError', 'Check logs');
      const policy: ErrorPolicy = {
        default: { action: ErrorAction.Stop, retryCount: 2 },
        'NetworkError': { action: ErrorAction.Continue, retryCount: 5 }
      };

      const retryCount = handler.getRetryCount(error, policy);

      expect(retryCount).toBe(2);
    });

    it('should return 0 when no retry count specified', () => {
      const error = new CatalystError('Test error', 'TestError', 'Test guidance');
      const policy: ErrorPolicy = {
        default: { action: ErrorAction.Stop }
      };

      const retryCount = handler.getRetryCount(error, policy);

      expect(retryCount).toBe(0);
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await handler.retryWithBackoff(operation, 3);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockResolvedValueOnce('success');

      const result = await handler.retryWithBackoff(operation, 3);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw error after all retries exhausted', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(handler.retryWithBackoff(operation, 2)).rejects.toThrow('Always fails');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    }, 10000);

    it('should apply exponential backoff', async () => {
      const delays: number[] = [];
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const startTime = Date.now();
      const result = await handler.retryWithBackoff(operation, 2);
      const duration = Date.now() - startTime;

      expect(result).toBe('success');
      // Should take at least 1s (1^2 * 1000) + 4s (2^2 * 1000) = 5s
      // Allow some margin for execution time
      expect(duration).toBeGreaterThanOrEqual(4500);
    }, 10000);
  });
});
