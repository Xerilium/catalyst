/**
 * Unit tests for CatalystError base class
 */

import { describe, it, expect } from '@jest/globals';
import { CatalystError } from '../../../src/ts/errors/base';

describe('CatalystError', () => {
  describe('constructor', () => {
    it('should create error with all fields', () => {
      const error = new CatalystError(
        'Test error message',
        'TEST_CODE',
        'Fix by doing X'
      );

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.guidance).toBe('Fix by doing X');
      expect(error.cause).toBeUndefined();
      expect(error.name).toBe('CatalystError');
    });

    it('should create error with cause chaining', () => {
      const cause = new Error('Original error');
      const error = new CatalystError(
        'Wrapped error',
        'WRAPPED_ERROR',
        'Check the cause',
        cause
      );

      expect(error.cause).toBe(cause);
    });

    it('should preserve stack trace', () => {
      const error = new CatalystError(
        'Test error',
        'TEST_CODE',
        'Test guidance'
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('CatalystError');
    });
  });

  describe('instanceof checks', () => {
    it('should be instance of Error', () => {
      const error = new CatalystError(
        'Test error',
        'TEST_CODE',
        'Test guidance'
      );

      expect(error).toBeInstanceOf(Error);
    });

    it('should be instance of CatalystError', () => {
      const error = new CatalystError(
        'Test error',
        'TEST_CODE',
        'Test guidance'
      );

      expect(error).toBeInstanceOf(CatalystError);
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON', () => {
      const error = new CatalystError(
        'Test error',
        'TEST_CODE',
        'Fix by doing X'
      );

      const json = error.toJSON();

      expect(json).toMatchObject({
        name: 'CatalystError',
        message: 'Test error',
        code: 'TEST_CODE',
        guidance: 'Fix by doing X',
        cause: null,
      });
      expect(json.stack).toBeDefined();
    });

    it('should include cause message in JSON', () => {
      const cause = new Error('Original error');
      const error = new CatalystError(
        'Wrapped error',
        'WRAPPED_ERROR',
        'Check the cause',
        cause
      );

      const json = error.toJSON();

      expect(json.cause).toBe('Original error');
    });
  });
});
