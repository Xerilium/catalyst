/**
 * Tests for TryAction
 *
 * @req FR:playbook-actions-controls/error-handling.try-action
 * @req FR:playbook-actions-controls/error-handling.try-action.base-class
 * @req FR:playbook-actions-controls/error-handling.try-action.steps
 * @req FR:playbook-actions-controls/error-handling.try-action.catch
 * @req FR:playbook-actions-controls/error-handling.try-action.finally
 * @req FR:playbook-actions-controls/error-handling.try-action.error-chaining
 * @req FR:playbook-actions-controls/error-handling.try-action.validation
 * @req FR:playbook-actions-controls/error-handling.try-action.result
 * @req NFR:playbook-actions-controls/testability.isolation
 */

import { TryAction } from '@playbooks/actions/controls/try-action';
import type { StepExecutor } from '@playbooks/types/action';
import type { PlaybookStep } from '@playbooks/types';
import type { TryConfig } from '@playbooks/actions/controls/types';
import { CatalystError } from '@core/errors';

describe('TryAction', () => {
  let mockStepExecutor: jest.Mocked<StepExecutor>;

  beforeEach(() => {
    mockStepExecutor = {
      executeSteps: jest.fn(),
      getCallStack: jest.fn(),
      getVariable: jest.fn(),
      setVariable: jest.fn()
    };
  });

  describe('configuration validation', () => {
    it('should throw error when config is not an object', async () => {
      const action = new TryAction(mockStepExecutor);

      await expect(action.execute(null as any)).rejects.toMatchObject({ code: 'TryConfigInvalid' });
    });

    it('should throw error when steps is missing', async () => {
      const action = new TryAction(mockStepExecutor);
      const config = {} as any;

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'TryConfigInvalid' });
    });

    it('should throw error when steps is empty array', async () => {
      const action = new TryAction(mockStepExecutor);
      const config: TryConfig = {
        steps: []
      };

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'TryConfigInvalid' });
    });

    it('should throw error when step is missing action property', async () => {
      const action = new TryAction(mockStepExecutor);
      const config: TryConfig = {
        steps: [{ config: { code: 'echo test' } } as any]
      };

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'TryConfigInvalid' });
    });

    it('should throw error when catch is not an array', async () => {
      const action = new TryAction(mockStepExecutor);
      const config = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }],
        catch: 'not an array'
      } as any;

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'TryConfigInvalid' });
    });

    it('should throw error when catch block is missing code', async () => {
      const action = new TryAction(mockStepExecutor);
      const config = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }],
        catch: [{ steps: [{ action: 'bash', config: { code: 'echo recovery' } }] }]
      } as any;

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'TryConfigInvalid' });
    });

    it('should throw error when catch block is missing steps', async () => {
      const action = new TryAction(mockStepExecutor);
      const config = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }],
        catch: [{ code: 'TestError' }]
      } as any;

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'TryConfigInvalid' });
    });

    it('should throw error when finally is not an array', async () => {
      const action = new TryAction(mockStepExecutor);
      const config = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }],
        finally: 'not an array'
      } as any;

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'TryConfigInvalid' });
    });

    it('should accept valid config with steps only', async () => {
      const action = new TryAction(mockStepExecutor);
      const config: TryConfig = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }]
      };

      mockStepExecutor.executeSteps.mockResolvedValue([{ code: 'Success' }]);

      const result = await action.execute(config);
      expect(result.code).toBe('Success');
    });

    it('should accept valid config with steps, catch, and finally', async () => {
      const action = new TryAction(mockStepExecutor);
      const config: TryConfig = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }],
        catch: [{ code: 'TestError', steps: [{ action: 'log-info', config: { message: 'caught' } }] }],
        finally: [{ action: 'log-debug', config: { message: 'done' } }]
      };

      mockStepExecutor.executeSteps.mockResolvedValue([{ code: 'Success' }]);

      const result = await action.execute(config);
      expect(result.code).toBe('Success');
    });
  });

  describe('try block execution', () => {
    it('should execute steps via StepExecutor', async () => {
      const action = new TryAction(mockStepExecutor);
      const trySteps: PlaybookStep[] = [
        { action: 'bash', config: { code: 'echo hello' } }
      ];
      const config: TryConfig = { steps: trySteps };

      mockStepExecutor.executeSteps.mockResolvedValue([{ code: 'Success' }]);

      await action.execute(config);

      expect(mockStepExecutor.executeSteps).toHaveBeenCalledWith(trySteps, undefined);
    });

    it('should return success outcome with executed count', async () => {
      const action = new TryAction(mockStepExecutor);
      const config: TryConfig = {
        steps: [
          { action: 'bash', config: { code: 'echo 1' } },
          { action: 'bash', config: { code: 'echo 2' } },
          { action: 'bash', config: { code: 'echo 3' } }
        ]
      };

      mockStepExecutor.executeSteps.mockResolvedValue([
        { code: 'Success' },
        { code: 'Success' },
        { code: 'Success' }
      ]);

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
      expect(result.value).toEqual({ outcome: 'success', executed: 3 });
    });
  });

  describe('catch block execution', () => {
    it('should execute matching catch block when error code matches', async () => {
      const action = new TryAction(mockStepExecutor);
      const catchSteps: PlaybookStep[] = [
        { action: 'log-info', config: { message: 'caught' } }
      ];
      const config: TryConfig = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }],
        catch: [{ code: 'TestError', steps: catchSteps }]
      };

      // Try steps throw
      mockStepExecutor.executeSteps
        .mockRejectedValueOnce(new CatalystError('Test failed', 'TestError', 'Fix the test'))
        .mockResolvedValueOnce([{ code: 'Success' }]); // Catch steps succeed

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
      expect(result.value).toEqual({ outcome: 'caught', executed: 0, caughtError: 'TestError' });
      // Second call should be the catch block steps
      expect(mockStepExecutor.executeSteps).toHaveBeenCalledTimes(2);
      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(2, catchSteps, undefined);
    });

    it('should set $error variable with code, message, and guidance', async () => {
      const action = new TryAction(mockStepExecutor);
      const config: TryConfig = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }],
        catch: [{ code: 'TestError', steps: [{ action: 'log-info', config: { message: 'caught' } }] }]
      };

      mockStepExecutor.executeSteps
        .mockRejectedValueOnce(new CatalystError('Something failed', 'TestError', 'Try again'))
        .mockResolvedValueOnce([{ code: 'Success' }]);
      mockStepExecutor.getVariable.mockReturnValue(undefined);

      await action.execute(config);

      expect(mockStepExecutor.setVariable).toHaveBeenCalledWith('$error', {
        code: 'TestError',
        message: 'Something failed',
        guidance: 'Try again'
      });
    });

    it('should select first matching catch block when multiple exist', async () => {
      const action = new TryAction(mockStepExecutor);
      const firstCatchSteps: PlaybookStep[] = [{ action: 'log-info', config: { message: 'first' } }];
      const secondCatchSteps: PlaybookStep[] = [{ action: 'log-info', config: { message: 'second' } }];
      const config: TryConfig = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }],
        catch: [
          { code: 'TestError', steps: firstCatchSteps },
          { code: 'TestError', steps: secondCatchSteps }
        ]
      };

      mockStepExecutor.executeSteps
        .mockRejectedValueOnce(new CatalystError('Failed', 'TestError', 'Fix it'))
        .mockResolvedValueOnce([{ code: 'Success' }]);

      await action.execute(config);

      // Should call the first matching catch block, not the second
      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(2, firstCatchSteps, undefined);
    });

    it('should re-throw error when no catch block matches', async () => {
      const action = new TryAction(mockStepExecutor);
      const config: TryConfig = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }],
        catch: [{ code: 'OtherError', steps: [{ action: 'log-info', config: { message: 'caught' } }] }]
      };

      const error = new CatalystError('Failed', 'TestError', 'Fix it');
      mockStepExecutor.executeSteps.mockRejectedValueOnce(error);

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'TestError' });
    });

    it('should restore $error variable after catch block completes', async () => {
      const action = new TryAction(mockStepExecutor);
      const config: TryConfig = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }],
        catch: [{ code: 'TestError', steps: [{ action: 'log-info', config: { message: 'caught' } }] }]
      };

      const originalError = { code: 'PreviousError', message: 'old error' };
      mockStepExecutor.getVariable.mockReturnValue(originalError);
      mockStepExecutor.executeSteps
        .mockRejectedValueOnce(new CatalystError('Failed', 'TestError', 'Fix it'))
        .mockResolvedValueOnce([{ code: 'Success' }]);

      await action.execute(config);

      // Last setVariable call should restore original $error
      const setVariableCalls = mockStepExecutor.setVariable.mock.calls;
      const lastErrorCall = setVariableCalls.filter(c => c[0] === '$error').pop();
      expect(lastErrorCall?.[1]).toEqual(originalError);
    });

    it('should re-throw when no catch blocks are defined', async () => {
      const action = new TryAction(mockStepExecutor);
      const config: TryConfig = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }]
      };

      const error = new CatalystError('Failed', 'TestError', 'Fix it');
      mockStepExecutor.executeSteps.mockRejectedValueOnce(error);

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'TestError' });
    });
  });

  describe('finally block execution', () => {
    it('should execute finally after successful try', async () => {
      const action = new TryAction(mockStepExecutor);
      const finallySteps: PlaybookStep[] = [{ action: 'log-debug', config: { message: 'cleanup' } }];
      const config: TryConfig = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }],
        finally: finallySteps
      };

      mockStepExecutor.executeSteps.mockResolvedValue([{ code: 'Success' }]);

      await action.execute(config);

      // Should be called twice: try steps + finally steps
      expect(mockStepExecutor.executeSteps).toHaveBeenCalledTimes(2);
      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(2, finallySteps, undefined);
    });

    it('should execute finally after caught error', async () => {
      const action = new TryAction(mockStepExecutor);
      const finallySteps: PlaybookStep[] = [{ action: 'log-debug', config: { message: 'cleanup' } }];
      const config: TryConfig = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }],
        catch: [{ code: 'TestError', steps: [{ action: 'log-info', config: { message: 'caught' } }] }],
        finally: finallySteps
      };

      mockStepExecutor.executeSteps
        .mockRejectedValueOnce(new CatalystError('Failed', 'TestError', 'Fix it'))
        .mockResolvedValueOnce([{ code: 'Success' }])  // catch steps
        .mockResolvedValueOnce([{ code: 'Success' }]); // finally steps

      await action.execute(config);

      // try + catch + finally = 3 calls
      expect(mockStepExecutor.executeSteps).toHaveBeenCalledTimes(3);
      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(3, finallySteps, undefined);
    });

    it('should execute finally after uncaught error', async () => {
      const action = new TryAction(mockStepExecutor);
      const finallySteps: PlaybookStep[] = [{ action: 'log-debug', config: { message: 'cleanup' } }];
      const config: TryConfig = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }],
        finally: finallySteps
      };

      mockStepExecutor.executeSteps
        .mockRejectedValueOnce(new CatalystError('Failed', 'TestError', 'Fix it'))
        .mockResolvedValueOnce([{ code: 'Success' }]); // finally steps

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'TestError' });

      // try + finally = 2 calls
      expect(mockStepExecutor.executeSteps).toHaveBeenCalledTimes(2);
      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(2, finallySteps, undefined);
    });

    it('should not fail when finally block throws and try succeeded', async () => {
      const action = new TryAction(mockStepExecutor);
      const config: TryConfig = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }],
        finally: [{ action: 'bash', config: { code: 'exit 1' } }]
      };

      mockStepExecutor.executeSteps
        .mockResolvedValueOnce([{ code: 'Success' }])  // try steps
        .mockRejectedValueOnce(new Error('finally failed')); // finally steps

      const result = await action.execute(config);

      // Should still succeed despite finally error
      expect(result.code).toBe('Success');
      expect(result.value).toEqual({ outcome: 'success', executed: 1 });
    });

    it('should not fail when finally block throws and error was caught', async () => {
      const action = new TryAction(mockStepExecutor);
      const config: TryConfig = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }],
        catch: [{ code: 'TestError', steps: [{ action: 'log-info', config: { message: 'caught' } }] }],
        finally: [{ action: 'bash', config: { code: 'exit 1' } }]
      };

      mockStepExecutor.executeSteps
        .mockRejectedValueOnce(new CatalystError('Failed', 'TestError', 'Fix it'))
        .mockResolvedValueOnce([{ code: 'Success' }])  // catch steps
        .mockRejectedValueOnce(new Error('finally failed')); // finally steps

      const result = await action.execute(config);

      // Should still return caught result despite finally error
      expect(result.code).toBe('Success');
      expect(result.value).toEqual({ outcome: 'caught', executed: 0, caughtError: 'TestError' });
    });
  });

  describe('error chaining', () => {
    it('should chain original error as cause when catch block re-throws', async () => {
      const action = new TryAction(mockStepExecutor);
      const config: TryConfig = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }],
        catch: [{ code: 'TestError', steps: [{ action: 'throw', config: { code: 'RethrowError', message: 're-thrown' } }] }]
      };

      const originalError = new CatalystError('Original failure', 'TestError', 'Fix it');
      const catchError = new CatalystError('Re-thrown', 'RethrowError', 'Handle it');

      mockStepExecutor.executeSteps
        .mockRejectedValueOnce(originalError)
        .mockRejectedValueOnce(catchError);

      try {
        await action.execute(config);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        expect((error as CatalystError).code).toBe('RethrowError');
        expect((error as any).cause).toBe(originalError);
      }
    });
  });

  describe('result structure', () => {
    it('should return success outcome with step count on success', async () => {
      const action = new TryAction(mockStepExecutor);
      const config: TryConfig = {
        steps: [
          { action: 'bash', config: { code: 'echo 1' } },
          { action: 'bash', config: { code: 'echo 2' } }
        ]
      };

      mockStepExecutor.executeSteps.mockResolvedValue([{ code: 'Success' }, { code: 'Success' }]);

      const result = await action.execute(config);

      expect(result.value).toEqual({ outcome: 'success', executed: 2 });
    });

    it('should return caught outcome with error code on catch', async () => {
      const action = new TryAction(mockStepExecutor);
      const config: TryConfig = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }],
        catch: [{ code: 'ValidationFailed', steps: [{ action: 'log-info', config: { message: 'caught' } }] }]
      };

      mockStepExecutor.executeSteps
        .mockRejectedValueOnce(new CatalystError('Invalid', 'ValidationFailed', 'Check input'))
        .mockResolvedValueOnce([{ code: 'Success' }]);

      const result = await action.execute(config);

      expect(result.value).toEqual({ outcome: 'caught', executed: 0, caughtError: 'ValidationFailed' });
    });

    it('should throw on uncaught error (no result returned)', async () => {
      const action = new TryAction(mockStepExecutor);
      const config: TryConfig = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }]
      };

      mockStepExecutor.executeSteps.mockRejectedValueOnce(new CatalystError('Boom', 'UnexpectedError', 'Unexpected'));

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'UnexpectedError' });
    });
  });

  describe('metadata', () => {
    it('should have actionType set to try', () => {
      expect(TryAction.actionType).toBe('try');
    });

    it('should have primaryProperty set to steps', () => {
      expect((TryAction as any).primaryProperty).toBe('steps');
    });

    it('should have isolated set to false', () => {
      const action = new TryAction(mockStepExecutor);
      expect(action.isolated).toBe(false);
    });
  });
});
