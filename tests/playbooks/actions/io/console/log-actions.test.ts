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
import { LogManager } from '@core/logging';
import type { Logger } from '@core/logging/types';

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

/**
 * Create a mock Logger
 */
function createMockLogger(): Logger & Record<string, jest.Mock> {
  return {
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn()
  };
}

describe('Log Actions', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockStepExecutor: StepExecutor;

  beforeEach(() => {
    mockLogger = createMockLogger();
    LogManager.reset();
    LogManager.setFramework(mockLogger);
    mockStepExecutor = createMockStepExecutor('test-playbook');
  });

  afterEach(() => {
    LogManager.reset();
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
    it('should log error message via framework Logger', async () => {
      const result = await action.execute({
        message: 'Test error message',
        action: 'TestAction'
      });

      expect(result.code).toBe('Success');
      expect(mockLogger.error).toHaveBeenCalledWith('test-playbook', 'TestAction', 'Test error message', undefined);
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
    it('should log warning message via framework Logger', async () => {
      const result = await action.execute({
        message: 'Test warning',
        action: 'TestAction'
      });

      expect(result.code).toBe('Success');
      expect(mockLogger.warning).toHaveBeenCalledWith('test-playbook', 'TestAction', 'Test warning', undefined);
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
    it('should log info message via framework Logger', async () => {
      const result = await action.execute({
        message: 'Test info',
        action: 'TestAction'
      });

      expect(result.code).toBe('Success');
      expect(mockLogger.info).toHaveBeenCalledWith('test-playbook', 'TestAction', 'Test info', undefined);
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
    it('should log verbose message via framework Logger', async () => {
      const result = await action.execute({
        message: 'Verbose details',
        action: 'TestAction'
      });

      expect(result.code).toBe('Success');
      expect(mockLogger.verbose).toHaveBeenCalledWith('test-playbook', 'TestAction', 'Verbose details', undefined);
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
    it('should log debug message via framework Logger', async () => {
      const result = await action.execute({
        message: 'Debug info',
        action: 'TestAction'
      });

      expect(result.code).toBe('Success');
      expect(mockLogger.debug).toHaveBeenCalledWith('test-playbook', 'TestAction', 'Debug info', undefined);
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
    it('should log trace message via framework Logger', async () => {
      const result = await action.execute({
        message: 'Trace data',
        action: 'TestAction'
      });

      expect(result.code).toBe('Success');
      expect(mockLogger.trace).toHaveBeenCalledWith('test-playbook', 'TestAction', 'Trace data', undefined);
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
      expect(mockLogger.info).toHaveBeenCalledWith('test-playbook', 'Test', '', undefined);
    });

    it('should handle multiline messages', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const multiline = 'Line 1\nLine 2\nLine 3';
      const result = await action.execute({
        message: multiline,
        action: 'Test'
      });

      expect(result.code).toBe('Success');
      expect(mockLogger.info).toHaveBeenCalledWith('test-playbook', 'Test', multiline, undefined);
    });

    it('should handle messages with special characters', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const special = 'Special: \t\r quotes "\'';
      const result = await action.execute({
        message: special,
        action: 'Test'
      });

      expect(result.code).toBe('Success');
      expect(mockLogger.info).toHaveBeenCalledWith('test-playbook', 'Test', special, undefined);
    });

    it('should handle unicode messages', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const unicode = 'Hello 世界 🌍';
      const result = await action.execute({
        message: unicode,
        action: 'Test'
      });

      expect(result.code).toBe('Success');
      expect(mockLogger.info).toHaveBeenCalledWith('test-playbook', 'Test', unicode, undefined);
    });

    it('should handle very long messages', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const longMessage = 'x'.repeat(10000);
      const result = await action.execute({
        message: longMessage,
        action: 'Test'
      });

      expect(result.code).toBe('Success');
      expect(mockLogger.info).toHaveBeenCalledWith('test-playbook', 'Test', longMessage, undefined);
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
    it('should pass data to Logger', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      const data = { userId: 123, status: 'active' };
      const result = await action.execute({
        message: 'User info',
        action: 'Test',
        data
      });

      expect(result.code).toBe('Success');
      expect(mockLogger.info).toHaveBeenCalledWith('test-playbook', 'Test', 'User info', data);
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
      expect(mockLogger.info).toHaveBeenCalledWith('test-playbook', 'Test', 'Empty data', data);

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
      expect(mockLogger.debug).toHaveBeenCalledWith('test-playbook', 'Test', 'Nested', data);

      const value = result.value as LogResult;
      expect(value.data).toEqual(data);
    });

    it('should pass data to correct Logger method for each level', async () => {
      const data = { test: true };

      const errorAction = new LogErrorAction(mockStepExecutor);
      await errorAction.execute({ message: 'Error', action: 'Test', data });
      expect(mockLogger.error).toHaveBeenCalledWith('test-playbook', 'Test', 'Error', data);

      const warnAction = new LogWarningAction(mockStepExecutor);
      await warnAction.execute({ message: 'Warning', action: 'Test', data });
      expect(mockLogger.warning).toHaveBeenCalledWith('test-playbook', 'Test', 'Warning', data);

      const verboseAction = new LogVerboseAction(mockStepExecutor);
      await verboseAction.execute({ message: 'Verbose', action: 'Test', data });
      expect(mockLogger.verbose).toHaveBeenCalledWith('test-playbook', 'Test', 'Verbose', data);

      const traceAction = new LogTraceAction(mockStepExecutor);
      await traceAction.execute({ message: 'Trace', action: 'Test', data });
      expect(mockLogger.trace).toHaveBeenCalledWith('test-playbook', 'Test', 'Trace', data);
    });
  });

  describe('Logger integration', () => {
    // @req FR:playbook-actions-io/log.error-action
    it('should call correct Logger method for each action level', async () => {
      const actions = [
        { Action: LogErrorAction, level: 'error' as const },
        { Action: LogWarningAction, level: 'warning' as const },
        { Action: LogInfoAction, level: 'info' as const },
        { Action: LogVerboseAction, level: 'verbose' as const },
        { Action: LogDebugAction, level: 'debug' as const },
        { Action: LogTraceAction, level: 'trace' as const },
      ];

      for (const { Action, level } of actions) {
        const a = new Action(mockStepExecutor);
        await a.execute({ message: 'msg', action: 'Act' } as any);
        expect(mockLogger[level]).toHaveBeenCalledWith('test-playbook', 'Act', 'msg', undefined);
      }
    });

    // @req FR:playbook-actions-io/log.base-config
    it('should use custom source in Logger call when provided', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      await action.execute({ message: 'msg', source: 'MyComponent', action: 'Deploy' });
      expect(mockLogger.info).toHaveBeenCalledWith('MyComponent', 'Deploy', 'msg', undefined);
    });

    // @req FR:playbook-actions-io/log.base-config
    it('should use default action "Playbook" when action omitted', async () => {
      const action = new LogInfoAction(mockStepExecutor);
      await action.execute({ message: 'msg' } as any);
      expect(mockLogger.info).toHaveBeenCalledWith('test-playbook', 'Playbook', 'msg', undefined);
    });

    // @req FR:playbook-actions-io/log.base-config
    it('should fall back to "Playbook" source when no playbook name', async () => {
      const executorNoName = createMockStepExecutor(undefined);
      const action = new LogInfoAction(executorNoName);
      await action.execute({ message: 'msg' } as any);
      expect(mockLogger.info).toHaveBeenCalledWith('Playbook', 'Playbook', 'msg', undefined);
    });

    // @req FR:playbook-actions-io/log.base-config
    it('should always return result value regardless of Logger filtering', async () => {
      // Logger may filter output, but result is always returned for context.logs[] capture
      const action = new LogDebugAction(mockStepExecutor);
      const result = await action.execute({ message: 'filtered', data: { key: 'val' } } as any);

      expect(result.code).toBe('Success');
      const value = result.value as LogResult;
      expect(value.level).toBe('debug');
      expect(value.message).toBe('filtered');
      expect(value.data).toEqual({ key: 'val' });
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
