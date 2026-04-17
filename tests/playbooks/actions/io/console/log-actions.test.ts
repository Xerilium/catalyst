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

const R = "\x1b[0m";
const C = {
  error:   "\x1b[31m",
  warning: "\x1b[33m",
  info:    "",
  verbose: "\x1b[32m",
  debug:   "\x1b[34m",
  trace:   "\x1b[2m",
} as const;

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

    // @req FR:playbook-actions-io/log.error-action
    it('should have correct actionType', () => {
      expect(LogErrorAction.actionType).toBe('log-error');
    });

    // @req FR:playbook-actions-io/log.primary-property
    it('should have correct primaryProperty', () => {
      expect(LogErrorAction.primaryProperty).toBe('message');
    });

    // @req FR:playbook-actions-io/log.error-action
    it('should log error message', async () => {
      const result = await action.execute({
        message: 'Test error message',
        action: 'TestAction'
      });

      expect(result.code).toBe('Success');
      expect(mockError).toHaveBeenCalledWith(`${C.error}ERROR  : test-playbook.TestAction: Test error message${R}`);
    });

    // @req FR:playbook-actions-io/log.error-action
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

    // @req FR:playbook-actions-io/log.base-config
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

    it('should succeed with missing action (defaults to Playbook)', async () => {
      const result = await action.execute({ message: 'Test' } as any);

      expect(result.code).toBe('Success');
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

    // @req FR:playbook-actions-io/log.warning-action
    it('should have correct actionType', () => {
      expect(LogWarningAction.actionType).toBe('log-warning');
    });

    // @req FR:playbook-actions-io/log.warning-action
    it('should log warning message', async () => {
      const result = await action.execute({
        message: 'Test warning',
        action: 'TestAction'
      });

      expect(result.code).toBe('Success');
      expect(mockWarn).toHaveBeenCalledWith(`${C.warning}WARNING: test-playbook.TestAction: Test warning${R}`);
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

    // @req FR:playbook-actions-io/log.info-action
    it('should have correct actionType', () => {
      expect(LogInfoAction.actionType).toBe('log-info');
    });

    // @req FR:playbook-actions-io/log.info-action
    it('should log info message', async () => {
      const result = await action.execute({
        message: 'Test info',
        action: 'TestAction'
      });

      expect(result.code).toBe('Success');
      expect(mockInfo).toHaveBeenCalledWith(`${C.info}INFO   : test-playbook.TestAction: Test info${R}`);
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

    // @req FR:playbook-actions-io/log.verbose-action
    it('should have correct actionType', () => {
      expect(LogVerboseAction.actionType).toBe('log-verbose');
    });

    // @req FR:playbook-actions-io/log.verbose-action
    it('should log verbose message', async () => {
      const result = await action.execute({
        message: 'Verbose details',
        action: 'TestAction'
      });

      expect(result.code).toBe('Success');
      expect(mockLog).toHaveBeenCalledWith(`${C.verbose}VERBOSE: test-playbook.TestAction: Verbose details${R}`);
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

    // @req FR:playbook-actions-io/log.debug-action
    it('should have correct actionType', () => {
      expect(LogDebugAction.actionType).toBe('log-debug');
    });

    // @req FR:playbook-actions-io/log.debug-action
    it('should log debug message', async () => {
      const result = await action.execute({
        message: 'Debug info',
        action: 'TestAction'
      });

      expect(result.code).toBe('Success');
      expect(mockDebug).toHaveBeenCalledWith(`${C.debug}DEBUG  : test-playbook.TestAction: Debug info${R}`);
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

    // @req FR:playbook-actions-io/log.trace-action
    it('should have correct actionType', () => {
      expect(LogTraceAction.actionType).toBe('log-trace');
    });

    // @req FR:playbook-actions-io/log.trace-action
    it('should log trace message', async () => {
      const result = await action.execute({
        message: 'Trace data',
        action: 'TestAction'
      });

      expect(result.code).toBe('Success');
      expect(mockLog).toHaveBeenCalledWith(`${C.trace}TRACE  : test-playbook.TestAction: Trace data${R}`);
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
      expect(mockInfo).toHaveBeenCalledWith(`${C.info}INFO   : test-playbook.Test: ${R}`);
    });

    it('should handle multiline messages', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const multiline = 'Line 1\nLine 2\nLine 3';
      const result = await action.execute({
        message: multiline,
        action: 'Test'
      });

      expect(result.code).toBe('Success');
      expect(mockInfo).toHaveBeenCalledWith(`${C.info}INFO   : test-playbook.Test: ${multiline}${R}`);
    });

    it('should handle messages with special characters', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const special = 'Special: \t\r quotes "\'';
      const result = await action.execute({
        message: special,
        action: 'Test'
      });

      expect(result.code).toBe('Success');
      expect(mockInfo).toHaveBeenCalledWith(`${C.info}INFO   : test-playbook.Test: ${special}${R}`);
    });

    it('should handle unicode messages', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const unicode = 'Hello 世界 🌍';
      const result = await action.execute({
        message: unicode,
        action: 'Test'
      });

      expect(result.code).toBe('Success');
      expect(mockInfo).toHaveBeenCalledWith(`${C.info}INFO   : test-playbook.Test: ${unicode}${R}`);
    });

    it('should handle very long messages', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const longMessage = 'x'.repeat(10000);
      const result = await action.execute({
        message: longMessage,
        action: 'Test'
      });

      expect(result.code).toBe('Success');
      expect(mockInfo).toHaveBeenCalledWith(`${C.info}INFO   : test-playbook.Test: ${longMessage}${R}`);
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
        `${C.info}INFO   : test-playbook.Test: User info {"userId":123,"status":"active"}${R}`
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
      expect(mockInfo).toHaveBeenCalledWith(`${C.info}INFO   : test-playbook.Test: Empty data {}${R}`);

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
        `${C.debug}DEBUG  : test-playbook.Test: Nested ${JSON.stringify(data)}${R}`
      );

      const value = result.value as LogResult;
      expect(value.data).toEqual(data);
    });

    it('should work with all log levels', async () => {
      const data = { test: true };
      const dataStr = ' {"test":true}';

      const errorAction = new LogErrorAction(mockStepExecutor);
      await errorAction.execute({ message: 'Error', action: 'Test', data });
      expect(mockError).toHaveBeenCalledWith(`${C.error}ERROR  : test-playbook.Test: Error${dataStr}${R}`);

      const warnAction = new LogWarningAction(mockStepExecutor);
      await warnAction.execute({ message: 'Warning', action: 'Test', data });
      expect(mockWarn).toHaveBeenCalledWith(`${C.warning}WARNING: test-playbook.Test: Warning${dataStr}${R}`);

      const verboseAction = new LogVerboseAction(mockStepExecutor);
      await verboseAction.execute({ message: 'Verbose', action: 'Test', data });
      expect(mockLog).toHaveBeenCalledWith(`${C.verbose}VERBOSE: test-playbook.Test: Verbose${dataStr}${R}`);

      const traceAction = new LogTraceAction(mockStepExecutor);
      await traceAction.execute({ message: 'Trace', action: 'Test', data });
      expect(mockLog).toHaveBeenCalledWith(`${C.trace}TRACE  : test-playbook.Test: Trace${dataStr}${R}`);
    });
  });

  describe('FR:log.output-format', () => {
    // @req FR:playbook-actions-io/log.output-format
    it('should prefix output with level padded to 7 chars for ERROR', async () => {
      const action = new LogErrorAction(mockStepExecutor);
      await action.execute({ message: 'msg', action: 'Act' });
      expect(mockError).toHaveBeenCalledWith(`${C.error}ERROR  : test-playbook.Act: msg${R}`);
    });

    // @req FR:playbook-actions-io/log.output-format
    it('should prefix output with level padded to 7 chars for WARNING', async () => {
      const action = new LogWarningAction(mockStepExecutor);
      await action.execute({ message: 'msg', action: 'Act' });
      expect(mockWarn).toHaveBeenCalledWith(`${C.warning}WARNING: test-playbook.Act: msg${R}`);
    });

    // @req FR:playbook-actions-io/log.output-format
    it('should prefix output with level padded to 7 chars for INFO', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      await action.execute({ message: 'msg', action: 'Act' });
      expect(mockInfo).toHaveBeenCalledWith(`${C.info}INFO   : test-playbook.Act: msg${R}`);
    });

    // @req FR:playbook-actions-io/log.output-format
    it('should prefix output with level padded to 7 chars for VERBOSE', async () => {
      const action = new LogVerboseAction(mockStepExecutor);
      await action.execute({ message: 'msg', action: 'Act' });
      expect(mockLog).toHaveBeenCalledWith(`${C.verbose}VERBOSE: test-playbook.Act: msg${R}`);
    });

    // @req FR:playbook-actions-io/log.output-format
    it('should prefix output with level padded to 7 chars for DEBUG', async () => {
      const action = new LogDebugAction(mockStepExecutor);
      await action.execute({ message: 'msg', action: 'Act' });
      expect(mockDebug).toHaveBeenCalledWith(`${C.debug}DEBUG  : test-playbook.Act: msg${R}`);
    });

    // @req FR:playbook-actions-io/log.output-format
    it('should prefix output with level padded to 7 chars for TRACE', async () => {
      const action = new LogTraceAction(mockStepExecutor);
      await action.execute({ message: 'msg', action: 'Act' });
      expect(mockLog).toHaveBeenCalledWith(`${C.trace}TRACE  : test-playbook.Act: msg${R}`);
    });

    // @req FR:playbook-actions-io/log.output-format
    it('should use custom source in prefix when provided', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      await action.execute({ message: 'msg', source: 'MyComponent', action: 'Deploy' });
      expect(mockInfo).toHaveBeenCalledWith(`${C.info}INFO   : MyComponent.Deploy: msg${R}`);
    });

    // @req FR:playbook-actions-io/log.output-format
    it('should use default action "Playbook" in prefix when action omitted', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      await action.execute({ message: 'msg' } as any);
      expect(mockInfo).toHaveBeenCalledWith(`${C.info}INFO   : test-playbook.Playbook: msg${R}`);
    });

    // @req FR:playbook-actions-io/log.output-format
    it('should fall back to "Playbook.Playbook" prefix when source and action omitted and no playbook name', async () => {
      const executorNoName = createMockStepExecutor(undefined);
      const action = new LogInfoAction(executorNoName);
      await action.execute({ message: 'msg' } as any);
      expect(mockInfo).toHaveBeenCalledWith(`${C.info}INFO   : Playbook.Playbook: msg${R}`);
    });

    // @req FR:playbook-actions-io/log.output-format
    it('should append JSON data after message in formatted output', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      await action.execute({ message: 'msg', action: 'Act', data: { id: 42 } });
      expect(mockInfo).toHaveBeenCalledWith(`${C.info}INFO   : test-playbook.Act: msg {"id":42}${R}`);
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

    it('should default action to Playbook when not provided', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const result = await action.execute({
        message: 'Test'
      } as any);

      expect(result.code).toBe('Success');
      const value = result.value as LogResult;
      expect(value.action).toBe('Playbook');
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
