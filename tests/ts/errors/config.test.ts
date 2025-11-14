/**
 * Unit tests for ConfigError
 */

import { describe, it, expect } from '@jest/globals';
import { ConfigError } from '../../../src/ts/errors/config';
import { CatalystError } from '../../../src/ts/errors/base';

describe('ConfigError', () => {
  it('should create error with CONFIG_ERROR code', () => {
    const error = new ConfigError(
      'Missing required configuration: API_KEY',
      'Set API_KEY environment variable'
    );

    expect(error.message).toBe('Missing required configuration: API_KEY');
    expect(error.code).toBe('CONFIG_ERROR');
    expect(error.guidance).toBe('Set API_KEY environment variable');
    expect(error.name).toBe('ConfigError');
  });

  it('should extend CatalystError', () => {
    const error = new ConfigError(
      'Invalid config',
      'Check configuration file'
    );

    expect(error).toBeInstanceOf(CatalystError);
    expect(error).toBeInstanceOf(ConfigError);
  });

  it('should support cause chaining', () => {
    const cause = new Error('JSON parse error');
    const error = new ConfigError(
      'Failed to load config',
      'Ensure config.json is valid JSON',
      cause
    );

    expect(error.cause).toBe(cause);
  });
});
