/**
 * Unit tests for timeout utility
 */

import { describe, it, expect } from '@jest/globals';
import { withTimeout } from '@playbooks/actions/io/utils/timeout';
import { CatalystError } from '@core/errors';

describe('Timeout Utility', () => {
  describe('withTimeout', () => {
    it('should return result when promise completes before timeout', async () => {
      const promise = new Promise<string>(resolve => {
        setTimeout(() => resolve('success'), 100);
      });

      const result = await withTimeout(promise, 500);

      expect(result).toBe('success');
    });

    it('should throw timeout error when promise exceeds timeout', async () => {
      const promise = new Promise<string>(resolve => {
        setTimeout(() => resolve('too-late'), 1000);
      });

      await expect(withTimeout(promise, 200)).rejects.toThrow(CatalystError);
      await expect(withTimeout(promise, 200)).rejects.toMatchObject({
        code: 'HttpTimeout',
        message: expect.stringContaining('200ms')
      });
    });

    it('should use custom error code', async () => {
      const promise = new Promise<string>(resolve => {
        setTimeout(() => resolve('too-late'), 1000);
      });

      await expect(withTimeout(promise, 200, 'CustomTimeout')).rejects.toMatchObject({
        code: 'CustomTimeout'
      });
    });

    it('should handle promise rejection before timeout', async () => {
      const error = new Error('Promise rejected');
      const promise = Promise.reject(error);

      await expect(withTimeout(promise, 500)).rejects.toThrow('Promise rejected');
    });

    it('should handle immediate resolution', async () => {
      const promise = Promise.resolve('immediate');

      const result = await withTimeout(promise, 100);

      expect(result).toBe('immediate');
    });

    it('should handle zero timeout', async () => {
      const promise = new Promise<string>(resolve => {
        setTimeout(() => resolve('never'), 100);
      });

      await expect(withTimeout(promise, 0)).rejects.toMatchObject({
        code: 'HttpTimeout'
      });
    });

    it('should handle different return types', async () => {
      const numberPromise = Promise.resolve(42);
      const objectPromise = Promise.resolve({ key: 'value' });
      const booleanPromise = Promise.resolve(true);

      expect(await withTimeout(numberPromise, 100)).toBe(42);
      expect(await withTimeout(objectPromise, 100)).toEqual({ key: 'value' });
      expect(await withTimeout(booleanPromise, 100)).toBe(true);
    });

    it('should include timeout value in error message', async () => {
      const promise = new Promise<string>(resolve => {
        setTimeout(() => resolve('too-late'), 1000);
      });

      try {
        await withTimeout(promise, 300);
        fail('Should have thrown timeout error');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        const catalystError = error as CatalystError;
        expect(catalystError.message).toContain('300ms');
        expect(catalystError.message).toContain('timed out');
      }
    });

    it('should provide helpful guidance in timeout error', async () => {
      const promise = new Promise<string>(resolve => {
        setTimeout(() => resolve('too-late'), 1000);
      });

      try {
        await withTimeout(promise, 250);
        fail('Should have thrown timeout error');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        const catalystError = error as CatalystError;
        expect(catalystError.guidance).toBeDefined();
        expect(catalystError.guidance).toContain('timeout');
      }
    });
  });
});
