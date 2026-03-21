// @req FR:playbook-actions-io/log.error-action
// @req FR:playbook-actions-io/log.warning-action
// @req FR:playbook-actions-io/log.info-action
// @req FR:playbook-actions-io/log.verbose-action
// @req FR:playbook-actions-io/log.debug-action
// @req FR:playbook-actions-io/log.trace-action
// @req FR:playbook-actions-io/log.primary-property
// @req NFR:playbook-actions-io/testability.isolation
// @req NFR:playbook-actions-io/testability.success-coverage

/**
 * Unit tests for Log Actions
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  LogErrorAction,
  LogWarningAction,
  LogInfoAction,
  LogVerboseAction,
  LogDebugAction,
  LogTraceAction
} from '@playbooks/actions/io/console';
import type { LogResult } from '@playbooks/actions/io/types';
import type { StepExecutor } from '@playbooks/types/action';

/**
 * Create a mock StepExecutor for testing
 */
function createMockStepExecutor(playbookName?: string): StepExecutor {
  return {
    executeSteps: jest.fn<StepExecutor['executeSteps']>().mockResolvedValue([]),
    getCallStack: jest.fn<StepExecutor['getCallStack']>().mockReturnValue([]),
    getVariable: jest.fn<StepExecutor['getVariable']>().mockImplementation((name: string) => {
      if (name === 'playbook.name') {
        return playbookName;
      }
      return undefined;
    }),
    setVariable: jest.fn<StepExecutor['setVariable']>()
  };
}

describe('Log Actions', () => {
  // Store original console methods
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;
  const originalConsoleLog = console.log;
  const originalConsoleDebug = console.debug;

  // Mock functions
  let mockError: jest.Mock;
  let mockWarn: jest.Mock;
  let mockInfo: jest.Mock;
  let mockLog: jest.Mock;
  let mockDebug: jest.Mock;

  // Mock step executor
  let mockStepExecutor: StepExecutor;

  beforeEach(() => {
    // Create mocks
    mockError = jest.fn();
    mockWarn = jest.fn();
    mockInfo = jest.fn();
    mockLog = jest.fn();
    mockDebug = jest.fn();

    // Replace console methods with mocks
    console.error = mockError;
    console.warn = mockWarn;
    console.info = mockInfo;
    console.log = mockLog;
    console.debug = mockDebug;

    // Create mock step executor with playbook name
    mockStepExecutor = createMockStepExecutor('test-playbook');
  });

  afterEach(() => {
    // Restore original console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
    console.log = originalConsoleLog;
    console.debug = originalConsoleDebug;
  });

  describe('LogErrorAction', () => {
    let action: LogErrorAction;

    beforeEach(() => {
      action = new LogErrorAction(mockStepExecutor);
    });

    it('should have correct actionType', () => {
      expect(LogErrorAction.actionType).toBe('log-error');
    });

    it('should have correct primaryProperty', () => {
      expect(LogErrorAction.primaryProperty).toBe('message');
    });

    it('should log error message', async () => {
      const result = await action.execute({
        message: 'Test error message',
        action: 'TestAction'
      });

      expect(result.code).toBe('Success');
      expect(mockError).toHaveBeenCalledWith('Test error message');
    });

    it('should return correct result structure', async () => {
      const result = await action.execute({
        message: 'Error!',
        source: 'Validator',
        action: 'CheckInput'
      });

      expect(result.code).toBe('Success');
      expect(result.error).toBeUndefined();

      const value = result.value as LogResult;
      expect(value.level).toBe('error');
      expect(value.source).toBe('Validator');
      expect(value.action).toBe('CheckInput');
      expect(value.message).toBe('Error!');
    });

    it('should default source to playbook name', async () => {
      const result = await action.execute({
        message: 'Test',
        action: 'TestAction'
      });

      const value = result.value as LogResult;
      expect(value.source).toBe('test-playbook');
    });

    it('should fall back to Playbook when playbook name not available', async () => {
      const executorWithoutPlaybookName = createMockStepExecutor(undefined);
      const actionWithoutPlaybook = new LogErrorAction(executorWithoutPlaybookName);

      const result = await actionWithoutPlaybook.execute({
        message: 'Test',
        action: 'TestAction'
      });

      const value = result.value as LogResult;
      expect(value.source).toBe('Playbook');
    });

    it('should reject missing message', async () => {
      const result = await action.execute({ action: 'Test' } as any);

      expect(result.code).toBe('LogConfigInvalid');
      expect(result.error).toBeDefined();
    });

    it('should reject missing action', async () => {
      const result = await action.execute({ message: 'Test' } as any);

      expect(result.code).toBe('LogConfigInvalid');
      expect(result.error).toBeDefined();
    });

    it('should reject null message', async () => {
      const result = await action.execute({
        message: null as any,
        action: 'Test'
      });

      expect(result.code).toBe('LogConfigInvalid');
      expect(result.error).toBeDefined();
    });

    it('should reject non-string message', async () => {
      const result = await action.execute({
        message: 123 as any,
        action: 'Test'
      });

      expect(result.code).toBe('LogConfigInvalid');
      expect(result.error).toBeDefined();
    });
  });

  describe('LogWarningAction', () => {
    let action: LogWarningAction;

    beforeEach(() => {
      action = new LogWarningAction(mockStepExecutor);
    });

    it('should have correct actionType', () => {
      expect(LogWarningAction.actionType).toBe('log-warning');
    });

    it('should log warning message', async () => {
      const result = await action.execute({
        message: 'Test warning',
        action: 'TestAction'
      });

      expect(result.code).toBe('Success');
      expect(mockWarn).toHaveBeenCalledWith('Test warning');
    });

    it('should return correct level in result', async () => {
      const result = await action.execute({
        message: 'Warning!',
        action: 'Test'
      });

      const value = result.value as LogResult;
      expect(value.level).toBe('warning');
    });
  });

  describe('LogInfoAction', () => {
    let action: LogInfoAction;

    beforeEach(() => {
      action = new LogInfoAction(mockStepExecutor);
    });

    it('should have correct actionType', () => {
      expect(LogInfoAction.actionType).toBe('log-info');
    });

    it('should log info message', async () => {
      const result = await action.execute({
        message: 'Test info',
        action: 'TestAction'
      });

      expect(result.code).toBe('Success');
      expect(mockInfo).toHaveBeenCalledWith('Test info');
    });

    it('should return correct level in result', async () => {
      const result = await action.execute({
        message: 'Info!',
        action: 'Test'
      });

      const value = result.value as LogResult;
      expect(value.level).toBe('info');
    });
  });

  describe('LogVerboseAction', () => {
    let action: LogVerboseAction;

    beforeEach(() => {
      action = new LogVerboseAction(mockStepExecutor);
    });

    it('should have correct actionType', () => {
      expect(LogVerboseAction.actionType).toBe('log-verbose');
    });

    it('should log verbose message', async () => {
      const result = await action.execute({
        message: 'Verbose details',
        action: 'TestAction'
      });

      expect(result.code).toBe('Success');
      expect(mockLog).toHaveBeenCalledWith('Verbose details');
    });

    it('should return correct level in result', async () => {
      const result = await action.execute({
        message: 'Details',
        action: 'Test'
      });

      const value = result.value as LogResult;
      expect(value.level).toBe('verbose');
      expect(value.message).toBe('Details');
    });
  });

  describe('LogDebugAction', () => {
    let action: LogDebugAction;

    beforeEach(() => {
      action = new LogDebugAction(mockStepExecutor);
    });

    it('should have correct actionType', () => {
      expect(LogDebugAction.actionType).toBe('log-debug');
    });

    it('should log debug message', async () => {
      const result = await action.execute({
        message: 'Debug info',
        action: 'TestAction'
      });

      expect(result.code).toBe('Success');
      expect(mockDebug).toHaveBeenCalledWith('Debug info');
    });

    it('should return correct level in result', async () => {
      const result = await action.execute({
        message: 'Debug',
        action: 'Test'
      });

      const value = result.value as LogResult;
      expect(value.level).toBe('debug');
    });
  });

  describe('LogTraceAction', () => {
    let action: LogTraceAction;

    beforeEach(() => {
      action = new LogTraceAction(mockStepExecutor);
    });

    it('should have correct actionType', () => {
      expect(LogTraceAction.actionType).toBe('log-trace');
    });

    it('should log trace message', async () => {
      const result = await action.execute({
        message: 'Trace data',
        action: 'TestAction'
      });

      expect(result.code).toBe('Success');
      expect(mockLog).toHaveBeenCalledWith('Trace data');
    });

    it('should return correct level in result', async () => {
      const result = await action.execute({
        message: 'Trace',
        action: 'Test'
      });

      const value = result.value as LogResult;
      expect(value.level).toBe('trace');
    });
  });

  describe('common behavior', () => {
    it('should handle empty string message', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const result = await action.execute({
        message: '',
        action: 'Test'
      });

      expect(result.code).toBe('Success');
      expect(mockInfo).toHaveBeenCalledWith('');
    });

    it('should handle multiline messages', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const multiline = 'Line 1\nLine 2\nLine 3';
      const result = await action.execute({
        message: multiline,
        action: 'Test'
      });

      expect(result.code).toBe('Success');
      expect(mockInfo).toHaveBeenCalledWith(multiline);
    });

    it('should handle messages with special characters', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const special = 'Special: \t\r quotes "\'';
      const result = await action.execute({
        message: special,
        action: 'Test'
      });

      expect(result.code).toBe('Success');
      expect(mockInfo).toHaveBeenCalledWith(special);
    });

    it('should handle unicode messages', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const unicode = 'Hello 世界 🌍';
      const result = await action.execute({
        message: unicode,
        action: 'Test'
      });

      expect(result.code).toBe('Success');
      expect(mockInfo).toHaveBeenCalledWith(unicode);
    });

    it('should handle very long messages', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const longMessage = 'x'.repeat(10000);
      const result = await action.execute({
        message: longMessage,
        action: 'Test'
      });

      expect(result.code).toBe('Success');
      expect(mockInfo).toHaveBeenCalledWith(longMessage);
    });

    it('should provide error guidance for invalid config', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const result = await action.execute({} as any);

      expect(result.error).toBeDefined();
      const error = result.error as any;
      expect(error.guidance).toBeDefined();
      expect(error.guidance).toContain('message');
    });

    it('should include level in success message', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const result = await action.execute({
        message: 'test',
        action: 'Test'
      });

      expect(result.message).toContain('info');
    });
  });

  describe('data property', () => {
    it('should append JSON-serialized data to log output', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const data = { userId: 123, status: 'active' };
      const result = await action.execute({
        message: 'User info',
        action: 'Test',
        data
      });

      expect(result.code).toBe('Success');
      expect(mockInfo).toHaveBeenCalledWith(
        'User info {"userId":123,"status":"active"}'
      );
    });

    it('should include data in result value', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const data = { key: 'value', count: 42 };
      const result = await action.execute({
        message: 'Test',
        action: 'Test',
        data
      });

      const value = result.value as LogResult;
      expect(value.data).toEqual(data);
    });

    it('should not include data in result when not provided', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const result = await action.execute({
        message: 'No data',
        action: 'Test'
      });

      const value = result.value as LogResult;
      expect(value.data).toBeUndefined();
    });

    it('should handle empty data object', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const data = {};
      const result = await action.execute({
        message: 'Empty data',
        action: 'Test',
        data
      });

      expect(result.code).toBe('Success');
      expect(mockInfo).toHaveBeenCalledWith('Empty data {}');

      const value = result.value as LogResult;
      expect(value.data).toEqual({});
    });

    it('should handle nested data objects', async () => {
      const action = new LogDebugAction(mockStepExecutor);
      const data = {
        user: { id: 1, name: 'Test' },
        items: [1, 2, 3],
        metadata: { nested: { deep: true } }
      };
      const result = await action.execute({
        message: 'Nested',
        action: 'Test',
        data
      });

      expect(result.code).toBe('Success');
      expect(mockDebug).toHaveBeenCalledWith(
        `Nested ${JSON.stringify(data)}`
      );

      const value = result.value as LogResult;
      expect(value.data).toEqual(data);
    });

    it('should work with all log levels', async () => {
      const data = { test: true };
      const dataStr = ' {"test":true}';

      const errorAction = new LogErrorAction(mockStepExecutor);
      await errorAction.execute({ message: 'Error', action: 'Test', data });
      expect(mockError).toHaveBeenCalledWith(`Error${dataStr}`);

      const warnAction = new LogWarningAction(mockStepExecutor);
      await warnAction.execute({ message: 'Warning', action: 'Test', data });
      expect(mockWarn).toHaveBeenCalledWith(`Warning${dataStr}`);

      const verboseAction = new LogVerboseAction(mockStepExecutor);
      await verboseAction.execute({ message: 'Verbose', action: 'Test', data });
      expect(mockLog).toHaveBeenCalledWith(`Verbose${dataStr}`);

      const traceAction = new LogTraceAction(mockStepExecutor);
      await traceAction.execute({ message: 'Trace', action: 'Test', data });
      expect(mockLog).toHaveBeenCalledWith(`Trace${dataStr}`);
    });
  });

  describe('source and action properties', () => {
    it('should include source and action in result', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const result = await action.execute({
        message: 'Test',
        source: 'MyComponent',
        action: 'DoSomething'
      });

      const value = result.value as LogResult;
      expect(value.source).toBe('MyComponent');
      expect(value.action).toBe('DoSomething');
    });

    it('should use playbook name as default source', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const result = await action.execute({
        message: 'Test',
        action: 'DoSomething'
      });

      const value = result.value as LogResult;
      expect(value.source).toBe('test-playbook');
      expect(value.action).toBe('DoSomething');
    });

    it('should require action', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const result = await action.execute({
        message: 'Test'
      } as any);

      expect(result.code).toBe('LogConfigInvalid');
      expect(result.error).toBeDefined();
    });

    it('should allow custom source to override default', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const result = await action.execute({
        message: 'Test',
        source: 'CustomSource',
        action: 'Test'
      });

      const value = result.value as LogResult;
      expect(value.source).toBe('CustomSource');
    });
  });
});
