/**
 * Unit tests for CLI error handling
 * @req FR:errors.PlaybookNotFound
 * @req FR:errors.InvalidInput
 * @req FR:errors.MissingPlaybookId
 * @req FR:errors.PlaybookExecutionFailed
 * @req FR:exit.codes
 */

import {
  createPlaybookNotFoundError,
  createInvalidInputError,
  createMissingPlaybookIdError,
  createPlaybookExecutionFailedError,
  formatError,
  getExitCode
} from '../../../../src/cli/utils/errors';
import { CatalystError } from '../../../../src/core/errors';

describe('CLI errors', () => {
  describe('error factory functions', () => {
    // @req FR:errors.PlaybookNotFound
    it('should create PlaybookNotFound error with correct code', () => {
      const error = createPlaybookNotFoundError('my-playbook');
      expect(error).toBeInstanceOf(CatalystError);
      expect(error.code).toBe('PlaybookNotFound');
      expect(error.message).toContain('my-playbook');
      expect(error.guidance).toBeDefined();
    });

    // @req FR:errors.InvalidInput
    it('should create InvalidInput error with correct code', () => {
      const error = createInvalidInputError('badvalue');
      expect(error).toBeInstanceOf(CatalystError);
      expect(error.code).toBe('InvalidInput');
      expect(error.message).toContain('badvalue');
      expect(error.guidance).toBeDefined();
    });

    // @req FR:errors.MissingPlaybookId
    it('should create MissingPlaybookId error with correct code', () => {
      const error = createMissingPlaybookIdError();
      expect(error).toBeInstanceOf(CatalystError);
      expect(error.code).toBe('MissingPlaybookId');
      expect(error.guidance).toBeDefined();
    });

    // @req FR:errors.PlaybookExecutionFailed
    it('should create PlaybookExecutionFailed error with correct code', () => {
      const cause = new Error('Step 3 failed');
      const error = createPlaybookExecutionFailedError('my-playbook', 'Step 3 failed', cause);
      expect(error).toBeInstanceOf(CatalystError);
      expect(error.code).toBe('PlaybookExecutionFailed');
      expect(error.message).toContain('my-playbook');
      expect(error.message).toContain('Step 3 failed');
      expect(error.cause).toBe(cause);
    });
  });

  describe('formatError', () => {
    it('should format error with code, message, and guidance', () => {
      const error = new CatalystError(
        'Something went wrong',
        'TestError',
        'Try doing X instead'
      );
      const formatted = formatError(error);

      expect(formatted).toContain('TestError');
      expect(formatted).toContain('Something went wrong');
      expect(formatted).toContain('Try doing X instead');
    });

    it('should include error code in parentheses', () => {
      const error = createPlaybookNotFoundError('test');
      const formatted = formatError(error);

      expect(formatted).toMatch(/\(PlaybookNotFound\)/);
    });

    it('should show nested error chain with indentation', () => {
      const innerError = new CatalystError('Inner error', 'InnerCode', 'Inner guidance');
      const outerError = new CatalystError('Outer error', 'OuterCode', 'Outer guidance', innerError);
      const formatted = formatError(outerError);

      // Should show outer error first
      expect(formatted).toMatch(/Outer error \(OuterCode\)/);
      // Should show inner error indented with arrow
      expect(formatted).toMatch(/↳ Inner error \(InnerCode\)/);
      // Should show guidance from innermost error (most specific details)
      expect(formatted).toContain('Inner guidance');
    });
  });

  describe('getExitCode', () => {
    // @req FR:exit.codes
    it('should return exit code 1 for PlaybookNotFound', () => {
      const error = createPlaybookNotFoundError('test');
      expect(getExitCode(error)).toBe(1);
    });

    // @req FR:exit.codes
    it('should return exit code 2 for InvalidInput', () => {
      const error = createInvalidInputError('test');
      expect(getExitCode(error)).toBe(2);
    });

    // @req FR:exit.codes
    it('should return exit code 2 for MissingPlaybookId', () => {
      const error = createMissingPlaybookIdError();
      expect(getExitCode(error)).toBe(2);
    });

    // @req FR:exit.codes
    it('should return exit code 1 for PlaybookExecutionFailed', () => {
      const error = createPlaybookExecutionFailedError('test', 'failed');
      expect(getExitCode(error)).toBe(1);
    });

    // @req FR:exit.codes
    it('should return exit code 1 for unknown error codes', () => {
      const error = new CatalystError('test', 'UnknownError', 'guidance');
      expect(getExitCode(error)).toBe(1);
    });
  });
});
