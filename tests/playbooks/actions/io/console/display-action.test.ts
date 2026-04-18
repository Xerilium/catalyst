import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DisplayAction } from '@playbooks/actions/io/console';
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
      if (name === 'engine.logLevel') {
        return 4; // trace — display action is not subject to log-level filtering
      }
      return undefined;
    }),
    setVariable: jest.fn<StepExecutor['setVariable']>()
  };
}

describe('DisplayAction', () => {
  const originalConsoleLog = console.log;
  let mockLog: jest.Mock;
  let mockStepExecutor: StepExecutor;

  beforeEach(() => {
    mockLog = jest.fn();
    console.log = mockLog;
    mockStepExecutor = createMockStepExecutor('test-playbook');
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  // @req FR:playbook-actions-io/display.primary-property
  it('should declare primaryProperty as message', () => {
    expect(DisplayAction.primaryProperty).toBe('message');
  });

  // @req FR:playbook-actions-io/display.implementation
  it('should declare actionType as display', () => {
    expect(DisplayAction.actionType).toBe('display');
  });

  describe('console output', () => {
    // @req FR:playbook-actions-io/display.console-output
    it('should write message to console.log with no prefix or color', async () => {
      const action = new DisplayAction(mockStepExecutor);
      await action.execute({ message: 'Hello world' });

      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith('Hello world');
    });

    // @req FR:playbook-actions-io/display.console-output
    it('should not include level, source, or action prefix', async () => {
      const action = new DisplayAction(mockStepExecutor);
      await action.execute({ message: 'Plain output' });

      const output = mockLog.mock.calls[0][0] as string;
      expect(output).toBe('Plain output');
      expect(output).not.toContain(':');
      expect(output).not.toContain('\x1b[');
    });
  });

  describe('result format', () => {
    // @req FR:playbook-actions-io/display.result-format
    it('should return Success with value containing message', async () => {
      const action = new DisplayAction(mockStepExecutor);
      const result = await action.execute({ message: 'Test message' });

      expect(result.code).toBe('Success');
      expect(result.message).toBe('Displayed message');
      expect(result.value).toEqual({ message: 'Test message' });
      expect(result.error).toBeUndefined();
    });
  });

  describe('log capture', () => {
    // @req FR:playbook-actions-io/display.log-capture
    it('should include level, source, and action in value when log is true', async () => {
      const action = new DisplayAction(mockStepExecutor);
      const result = await action.execute({ message: 'Logged display', log: true });

      expect(result.code).toBe('Success');
      const value = result.value as Record<string, unknown>;
      expect(value.level).toBe('display');
      expect(value.source).toBe('test-playbook');
      expect(value.action).toBe('Playbook');
      expect(value.message).toBe('Logged display');
    });

    // @req FR:playbook-actions-io/display.log-capture
    it('should not include level in value when log is false', async () => {
      const action = new DisplayAction(mockStepExecutor);
      const result = await action.execute({ message: 'No log', log: false });

      const value = result.value as Record<string, unknown>;
      expect(value.level).toBeUndefined();
      expect(value.source).toBeUndefined();
      expect(value.action).toBeUndefined();
    });

    // @req FR:playbook-actions-io/display.log-capture
    it('should not include level in value when log is omitted', async () => {
      const action = new DisplayAction(mockStepExecutor);
      const result = await action.execute({ message: 'Default' });

      const value = result.value as Record<string, unknown>;
      expect(value.level).toBeUndefined();
    });

    // @req FR:playbook-actions-io/display.log-capture
    it('should use default source when playbook name is not available', async () => {
      const noNameExecutor = createMockStepExecutor();
      const action = new DisplayAction(noNameExecutor);
      const result = await action.execute({ message: 'No name', log: true });

      const value = result.value as Record<string, unknown>;
      expect(value.source).toBe('Playbook');
    });
  });

  describe('error handling', () => {
    // @req FR:playbook-actions-io/display.error-handling
    it('should return DisplayConfigInvalid when message is missing', async () => {
      const action = new DisplayAction(mockStepExecutor);
      const result = await action.execute({} as any);

      expect(result.code).toBe('DisplayConfigInvalid');
      expect(mockLog).not.toHaveBeenCalled();
    });

    // @req FR:playbook-actions-io/display.error-handling
    it('should return DisplayConfigInvalid when message is non-string', async () => {
      const action = new DisplayAction(mockStepExecutor);
      const result = await action.execute({ message: 42 } as any);

      expect(result.code).toBe('DisplayConfigInvalid');
      expect(mockLog).not.toHaveBeenCalled();
    });

    // @req FR:playbook-actions-io/display.error-handling
    it('should return DisplayConfigInvalid when config is null', async () => {
      const action = new DisplayAction(mockStepExecutor);
      const result = await action.execute(null as any);

      expect(result.code).toBe('DisplayConfigInvalid');
      expect(mockLog).not.toHaveBeenCalled();
    });
  });
});
