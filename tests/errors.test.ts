/**
 * Unit tests for error handling
 */

import { describe, it, expect } from '@jest/globals';
import {
  CatalystError,
  ErrorAction,
  type ErrorPolicyAction,
  type ErrorPolicy
} from '@core/errors';

/**
 * @req FR:error-handling/catalyst-error
 * @req FR:error-handling/error-action
 * @req FR:error-handling/error-policy-action
 * @req FR:error-handling/error-policy
 */
describe('CatalystError', () => {
  describe('constructor', () => {
    // @req FR:error-handling/catalyst-error.constructor
    it('should create error with all fields', () => {
      const error = new CatalystError(
        'Test error message',
        'TestCode',
        'Fix by doing X'
      );

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TestCode');
      expect(error.guidance).toBe('Fix by doing X');
      expect(error.cause).toBeUndefined();
      expect(error.name).toBe('CatalystError');
    });

    // @req FR:error-handling/catalyst-error.constructor
    it('should create error with cause chaining', () => {
      const cause = new Error('Original error');
      const error = new CatalystError(
        'Wrapped error',
        'WrappedError',
        'Check the cause',
        cause
      );

      expect(error.cause).toBe(cause);
    });

    // @req FR:error-handling/catalyst-error.stack-traces
    it('should preserve stack trace', () => {
      const error = new CatalystError(
        'Test error',
        'TestCode',
        'Test guidance'
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('CatalystError');
    });
  });

  describe('instanceof checks', () => {
    // @req FR:error-handling/catalyst-error.extends-error
    it('should be instance of Error', () => {
      const error = new CatalystError(
        'Test error',
        'TestCode',
        'Test guidance'
      );

      expect(error).toBeInstanceOf(Error);
    });

    // @req FR:error-handling/catalyst-error.extends-error
    it('should be instance of CatalystError', () => {
      const error = new CatalystError(
        'Test error',
        'TestCode',
        'Test guidance'
      );

      expect(error).toBeInstanceOf(CatalystError);
    });
  });

  describe('toJSON', () => {
    // @req FR:error-handling/catalyst-error.serialization
    it('should serialize error to JSON', () => {
      const error = new CatalystError(
        'Test error',
        'TestCode',
        'Fix by doing X'
      );

      const json = error.toJSON();

      expect(json).toMatchObject({
        name: 'CatalystError',
        message: 'Test error',
        code: 'TestCode',
        guidance: 'Fix by doing X',
        cause: null,
      });
      expect(json.stack).toBeDefined();
    });

    // @req FR:error-handling/catalyst-error.serialization
    it('should include cause message in JSON', () => {
      const cause = new Error('Original error');
      const error = new CatalystError(
        'Wrapped error',
        'WrappedError',
        'Check the cause',
        cause
      );

      const json = error.toJSON();

      expect(json.cause).toBe('Original error');
    });
  });
});

describe('ErrorAction', () => {
  // @req FR:error-handling/error-action.values
  it('should have all required enum values', () => {
    expect(ErrorAction.Stop).toBe("Stop");
    expect(ErrorAction.Suspend).toBe("Suspend");
    expect(ErrorAction.Break).toBe("Break");
    expect(ErrorAction.Inquire).toBe("Inquire");
    expect(ErrorAction.Continue).toBe("Continue");
    expect(ErrorAction.SilentlyContinue).toBe("SilentlyContinue");
    expect(ErrorAction.Ignore).toBe("Ignore");
  });

  // @req FR:error-handling/error-action
  it('should be usable as enum', () => {
    const action: ErrorAction = ErrorAction.Stop;
    expect(action).toBe("Stop");
  });
});

describe('ErrorPolicyAction', () => {
  // @req FR:error-handling/error-policy-action.interface
  it('should support action without retryCount', () => {
    const policyAction: ErrorPolicyAction = {
      action: ErrorAction.Stop
    };

    expect(policyAction.action).toBe(ErrorAction.Stop);
    expect(policyAction.retryCount).toBeUndefined();
  });

  // @req FR:error-handling/error-policy-action.interface
  it('should support action with retryCount', () => {
    const policyAction: ErrorPolicyAction = {
      action: ErrorAction.Continue,
      retryCount: 3
    };

    expect(policyAction.action).toBe(ErrorAction.Continue);
    expect(policyAction.retryCount).toBe(3);
  });
});

describe('ErrorPolicy', () => {
  // @req FR:error-handling/error-policy.interface
  it('should require default property', () => {
    const policy: ErrorPolicy = {
      default: { action: ErrorAction.Stop }
    };

    expect(policy.default.action).toBe(ErrorAction.Stop);
  });

  // @req FR:error-handling/error-policy.interface
  // @req FR:error-handling/error-policy.pascal-cased
  it('should support per-code overrides', () => {
    const policy: ErrorPolicy = {
      default: { action: ErrorAction.Stop },
      GitHubAuthFailed: {
        action: ErrorAction.Continue,
        retryCount: 3
      },
      NetworkTimeout: {
        action: ErrorAction.Ignore
      }
    };

    expect(policy.default.action).toBe(ErrorAction.Stop);
    expect(policy.GitHubAuthFailed.action).toBe(ErrorAction.Continue);
    expect(policy.GitHubAuthFailed.retryCount).toBe(3);
    expect(policy.NetworkTimeout.action).toBe(ErrorAction.Ignore);
  });

  // @req FR:error-handling/error-policy.interface
  it('should work with minimal configuration', () => {
    const policy: ErrorPolicy = {
      default: { action: ErrorAction.Stop }
    };

    expect(policy.default).toBeDefined();
    expect(policy.default.action).toBe(ErrorAction.Stop);
  });
});
