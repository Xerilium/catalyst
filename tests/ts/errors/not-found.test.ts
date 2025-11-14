/**
 * Unit tests for NotFoundError
 */

import { describe, it, expect } from '@jest/globals';
import { NotFoundError } from '../../../src/ts/errors/not-found';
import { CatalystError } from '../../../src/ts/errors/base';

describe('NotFoundError', () => {
  it('should create error with NOT_FOUND code', () => {
    const error = new NotFoundError(
      'User ID 123 not found',
      'Check user ID and try again'
    );

    expect(error.message).toBe('User ID 123 not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.guidance).toBe('Check user ID and try again');
    expect(error.name).toBe('NotFoundError');
  });

  it('should extend CatalystError', () => {
    const error = new NotFoundError(
      'Resource not found',
      'Verify resource exists'
    );

    expect(error).toBeInstanceOf(CatalystError);
    expect(error).toBeInstanceOf(NotFoundError);
  });

  it('should support cause chaining', () => {
    const cause = new Error('Database query failed');
    const error = new NotFoundError(
      'Record not found',
      'Check database connection',
      cause
    );

    expect(error.cause).toBe(cause);
  });
});
