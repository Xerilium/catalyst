/**
 * Unit tests for NetworkError
 */

import { describe, it, expect } from '@jest/globals';
import { NetworkError } from '../../src/ts/errors/network';
import { CatalystError } from '../../src/ts/errors/base';

describe('NetworkError', () => {
  it('should create error with NETWORK_ERROR code', () => {
    const error = new NetworkError(
      'Failed to connect to GitHub',
      'Check internet connection and retry'
    );

    expect(error.message).toBe('Failed to connect to GitHub');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.guidance).toBe('Check internet connection and retry');
    expect(error.name).toBe('NetworkError');
  });

  it('should extend CatalystError', () => {
    const error = new NetworkError(
      'Connection timeout',
      'Retry request'
    );

    expect(error).toBeInstanceOf(CatalystError);
    expect(error).toBeInstanceOf(NetworkError);
  });

  it('should support cause chaining', () => {
    const cause = new Error('ECONNREFUSED');
    const error = new NetworkError(
      'Connection refused',
      'Check server is running',
      cause
    );

    expect(error.cause).toBe(cause);
  });
});
