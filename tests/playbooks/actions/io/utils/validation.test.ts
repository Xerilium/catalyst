/**
 * Unit tests for validation utility
 */

import { describe, it, expect } from '@jest/globals';
import {
  defaultStatusValidator,
  validateResponseStatus
} from '@playbooks/actions/io/utils/validation';
import { CatalystError } from '@core/errors';

describe('Validation Utility', () => {
  describe('defaultStatusValidator', () => {
    it('should accept 2xx status codes', () => {
      expect(defaultStatusValidator(200)).toBe(true);
      expect(defaultStatusValidator(201)).toBe(true);
      expect(defaultStatusValidator(204)).toBe(true);
      expect(defaultStatusValidator(299)).toBe(true);
    });

    it('should reject 1xx status codes', () => {
      expect(defaultStatusValidator(100)).toBe(false);
      expect(defaultStatusValidator(101)).toBe(false);
    });

    it('should reject 3xx status codes', () => {
      expect(defaultStatusValidator(300)).toBe(false);
      expect(defaultStatusValidator(301)).toBe(false);
      expect(defaultStatusValidator(302)).toBe(false);
      expect(defaultStatusValidator(304)).toBe(false);
    });

    it('should reject 4xx status codes', () => {
      expect(defaultStatusValidator(400)).toBe(false);
      expect(defaultStatusValidator(401)).toBe(false);
      expect(defaultStatusValidator(403)).toBe(false);
      expect(defaultStatusValidator(404)).toBe(false);
      expect(defaultStatusValidator(422)).toBe(false);
    });

    it('should reject 5xx status codes', () => {
      expect(defaultStatusValidator(500)).toBe(false);
      expect(defaultStatusValidator(502)).toBe(false);
      expect(defaultStatusValidator(503)).toBe(false);
      expect(defaultStatusValidator(504)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(defaultStatusValidator(199)).toBe(false);
      expect(defaultStatusValidator(300)).toBe(false);
      expect(defaultStatusValidator(600)).toBe(false);
    });
  });

  describe('validateResponseStatus', () => {
    it('should not throw for valid status codes', () => {
      expect(() => validateResponseStatus(200)).not.toThrow();
      expect(() => validateResponseStatus(201)).not.toThrow();
      expect(() => validateResponseStatus(204)).not.toThrow();
    });

    it('should throw CatalystError for invalid status codes', () => {
      expect(() => validateResponseStatus(400)).toThrow(CatalystError);
      expect(() => validateResponseStatus(404)).toThrow(CatalystError);
      expect(() => validateResponseStatus(500)).toThrow(CatalystError);
    });

    it('should include status code in error message', () => {
      try {
        validateResponseStatus(404);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        const catalystError = error as CatalystError;
        expect(catalystError.message).toContain('404');
      }
    });

    it('should use default error code if not specified', () => {
      try {
        validateResponseStatus(500);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        const catalystError = error as CatalystError;
        expect(catalystError.code).toBe('HttpInvalidStatus');
      }
    });

    it('should use custom error code when provided', () => {
      try {
        validateResponseStatus(500, defaultStatusValidator, 'CustomErrorCode');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        const catalystError = error as CatalystError;
        expect(catalystError.code).toBe('CustomErrorCode');
      }
    });

    it('should use custom validator function', () => {
      // Custom validator that only accepts 200
      const customValidator = (status: number) => status === 200;

      // Should not throw for 200
      expect(() => validateResponseStatus(200, customValidator)).not.toThrow();

      // Should throw for 201 (even though it's normally valid)
      expect(() => validateResponseStatus(201, customValidator)).toThrow(CatalystError);
    });

    it('should provide helpful guidance in error', () => {
      try {
        validateResponseStatus(403);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        const catalystError = error as CatalystError;
        expect(catalystError.guidance).toBeDefined();
        expect(catalystError.guidance).toContain('status');
      }
    });

    it('should handle all common HTTP error codes', () => {
      const errorCodes = [400, 401, 403, 404, 422, 429, 500, 502, 503, 504];

      for (const code of errorCodes) {
        expect(() => validateResponseStatus(code)).toThrow(CatalystError);
      }
    });

    it('should work with custom validator that accepts redirects', () => {
      const redirectValidator = (status: number) =>
        status >= 200 && status < 400; // Accept 2xx and 3xx

      // Should not throw for redirects
      expect(() => validateResponseStatus(301, redirectValidator)).not.toThrow();
      expect(() => validateResponseStatus(302, redirectValidator)).not.toThrow();

      // Should still throw for errors
      expect(() => validateResponseStatus(404, redirectValidator)).toThrow();
      expect(() => validateResponseStatus(500, redirectValidator)).toThrow();
    });

    it('should work with custom validator that only accepts specific codes', () => {
      const specificValidator = (status: number) =>
        [200, 201, 204, 404].includes(status);

      // Should not throw for whitelisted codes
      expect(() => validateResponseStatus(200, specificValidator)).not.toThrow();
      expect(() => validateResponseStatus(404, specificValidator)).not.toThrow();

      // Should throw for non-whitelisted codes
      expect(() => validateResponseStatus(202, specificValidator)).toThrow();
      expect(() => validateResponseStatus(500, specificValidator)).toThrow();
    });

    it('should include error context in thrown error', () => {
      try {
        validateResponseStatus(503);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        const catalystError = error as CatalystError;
        expect(catalystError.message).toMatch(/503/);
        expect(catalystError.guidance).toBeTruthy();
      }
    });
  });
});
