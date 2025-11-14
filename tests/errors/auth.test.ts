/**
 * Unit tests for AuthError
 */

import { describe, it, expect } from '@jest/globals';
import { AuthError } from '../../src/ts/errors/auth';
import { CatalystError } from '../../src/ts/errors/base';

describe('AuthError', () => {
  it('should create error with AUTH_FAILED code', () => {
    const error = new AuthError(
      'GitHub CLI not authenticated',
      'Run: gh auth login'
    );

    expect(error.message).toBe('GitHub CLI not authenticated');
    expect(error.code).toBe('AUTH_FAILED');
    expect(error.guidance).toBe('Run: gh auth login');
    expect(error.name).toBe('AuthError');
  });

  it('should extend CatalystError', () => {
    const error = new AuthError(
      'Authentication failed',
      'Check credentials'
    );

    expect(error).toBeInstanceOf(CatalystError);
    expect(error).toBeInstanceOf(AuthError);
  });

  it('should support cause chaining', () => {
    const cause = new Error('Token expired');
    const error = new AuthError(
      'Session expired',
      'Log in again',
      cause
    );

    expect(error.cause).toBe(cause);
  });
});
