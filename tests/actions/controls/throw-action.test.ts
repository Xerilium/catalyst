/**
 * Tests for ThrowAction
 *
 * These tests MUST fail initially (no implementation yet) following TDD principles.
 */

import { ThrowAction } from '@playbooks/actions/controls/throw-action';
import type { ThrowConfig } from '@playbooks/actions/controls/types';

/**
 * @req FR:playbook-actions-controls/error-handling.throw-action
 * @req FR:playbook-actions-controls/error-handling.throw-action.base-class
 * @req FR:playbook-actions-controls/error-handling.throw-action.code-validation
 * @req FR:playbook-actions-controls/error-handling.throw-action.error-throwing
 * @req FR:playbook-actions-controls/error-handling.throw-action.validation
 * @req NFR:playbook-actions-controls/testability.isolation
 */
describe('ThrowAction', () => {
  describe('configuration validation', () => {
    it('should throw error when code is missing', async () => {
      const action = new ThrowAction();
      const config = {
        message: 'Error occurred'
      } as any;

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'ThrowConfigInvalid' });
    });

    it('should throw error when code is empty string', async () => {
      const action = new ThrowAction();
      const config: ThrowConfig = {
        code: '',
        message: 'Error occurred'
      };

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'ThrowConfigInvalid' });
    });

    it('should throw error when config is not an object', async () => {
      const action = new ThrowAction();
      const config = 'invalid' as any;

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'ThrowConfigInvalid' });
    });
  });

  describe('error throwing with code only', () => {
    it('should throw error with user-specified code', async () => {
      const action = new ThrowAction();
      const config: ThrowConfig = {
        code: 'ValidationFailed'
      };

      await expect(action.execute(config)).rejects.toMatchObject({
        code: 'ValidationFailed',
        message: 'Playbook failed'
      });
    });

    it('should throw error with PascalCase code', async () => {
      const action = new ThrowAction();
      const config: ThrowConfig = {
        code: 'InsufficientBalance'
      };

      await expect(action.execute(config)).rejects.toMatchObject({
        code: 'InsufficientBalance'
      });
    });
  });

  describe('error throwing with message', () => {
    it('should throw error with custom message', async () => {
      const action = new ThrowAction();
      const config: ThrowConfig = {
        code: 'ValidationFailed',
        message: 'User input validation failed'
      };

      await expect(action.execute(config)).rejects.toMatchObject({
        code: 'ValidationFailed',
        message: 'User input validation failed'
      });
    });

    it('should use default message when not provided', async () => {
      const action = new ThrowAction();
      const config: ThrowConfig = {
        code: 'CustomError'
      };

      await expect(action.execute(config)).rejects.toMatchObject({
        message: 'Playbook failed'
      });
    });
  });

  describe('error throwing with guidance', () => {
    it('should throw error with guidance', async () => {
      const action = new ThrowAction();
      const config: ThrowConfig = {
        code: 'ValidationFailed',
        message: 'Validation failed',
        guidance: 'Check input parameters and retry'
      };

      await expect(action.execute(config)).rejects.toMatchObject({
        code: 'ValidationFailed',
        guidance: 'Check input parameters and retry'
      });
    });

    it('should use default guidance when not provided', async () => {
      const action = new ThrowAction();
      const config: ThrowConfig = {
        code: 'CustomError'
      };

      await expect(action.execute(config)).rejects.toMatchObject({
        guidance: 'Check playbook execution logs for details'
      });
    });
  });

  describe('error throwing with metadata', () => {
    it('should throw error with metadata attached', async () => {
      const action = new ThrowAction();
      const config: ThrowConfig = {
        code: 'InsufficientBalance',
        message: 'Balance too low',
        metadata: {
          userId: 123,
          requiredBalance: 100,
          currentBalance: 50
        }
      };

      try {
        await action.execute(config);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.code).toBe('InsufficientBalance');
        expect(error.metadata).toEqual({
          userId: 123,
          requiredBalance: 100,
          currentBalance: 50
        });
      }
    });

    it('should work without metadata', async () => {
      const action = new ThrowAction();
      const config: ThrowConfig = {
        code: 'SimpleError',
        message: 'Error occurred'
      };

      await expect(action.execute(config)).rejects.toMatchObject({
        code: 'SimpleError'
      });
    });
  });

  describe('PascalCase warning', () => {
    it('should warn when code is not PascalCase but still throw', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const action = new ThrowAction();
      const config: ThrowConfig = {
        code: 'invalid_code',
        message: 'Test error'
      };

      await expect(action.execute(config)).rejects.toMatchObject({
        code: 'invalid_code'
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('does not follow PascalCase convention')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should not warn for valid PascalCase codes', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const action = new ThrowAction();
      const config: ThrowConfig = {
        code: 'ValidationFailed'
      };

      await expect(action.execute(config)).rejects.toMatchObject({
        code: 'ValidationFailed'
      });

      expect(consoleWarnSpy).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('metadata', () => {
    it('should have actionType set to throw', () => {
      expect(ThrowAction.actionType).toBe('throw');
    });

    it('should have primaryProperty set to code', () => {
      expect(ThrowAction.primaryProperty).toBe('code');
    });
  });

  describe('action never returns successfully', () => {
    it('should always throw and never return PlaybookActionResult', async () => {
      const action = new ThrowAction();
      const config: ThrowConfig = {
        code: 'TestError',
        message: 'This should always throw'
      };

      // Verify that execute ALWAYS throws
      await expect(action.execute(config)).rejects.toThrow();

      // Verify it never returns a success result
      let didReturn = false;
      try {
        await action.execute(config);
        didReturn = true;
      } catch {
        // Expected
      }

      expect(didReturn).toBe(false);
    });
  });
});
