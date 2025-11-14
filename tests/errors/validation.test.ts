/**
 * Unit tests for ValidationError
 */

import { describe, it, expect } from '@jest/globals';
import { ValidationError } from '../../src/ts/errors/validation';
import { CatalystError } from '../../src/ts/errors/base';

describe('ValidationError', () => {
  it('should create error with VALIDATION_ERROR code', () => {
    const error = new ValidationError(
      'Invalid email format',
      'Provide email in format: user@example.com'
    );

    expect(error.message).toBe('Invalid email format');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.guidance).toBe('Provide email in format: user@example.com');
    expect(error.name).toBe('ValidationError');
  });

  it('should extend CatalystError', () => {
    const error = new ValidationError(
      'Invalid input',
      'Check input format'
    );

    expect(error).toBeInstanceOf(CatalystError);
    expect(error).toBeInstanceOf(ValidationError);
  });

  it('should support cause chaining', () => {
    const cause = new Error('Parse error');
    const error = new ValidationError(
      'Invalid JSON',
      'Ensure JSON is well-formed',
      cause
    );

    expect(error.cause).toBe(cause);
  });
});
