/**
 * Tests for ForEachAction
 *
 * These tests MUST fail initially (no implementation yet) following TDD principles.
 */

import { ForEachAction } from '@playbooks/actions/controls/for-each-action';
import type { StepExecutor } from '@playbooks/types/action';
import type { PlaybookActionResult, PlaybookStep } from '@playbooks/types';
import type { ForEachConfig } from '@playbooks/actions/controls/types';

describe('ForEachAction', () => {
  let mockStepExecutor: jest.Mocked<StepExecutor>;

  beforeEach(() => {
    mockStepExecutor = {
      executeSteps: jest.fn(),
      getCallStack: jest.fn()
    };
  });

  describe('configuration validation', () => {
    it('should throw error when in is missing', async () => {
      const action = new ForEachAction(mockStepExecutor);
      const config = {
        steps: [{ action: 'bash', config: { code: 'echo test' } }]
      } as any;

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'ForEachConfigInvalid' });
    });

    it('should throw error when steps is missing', async () => {
      const action = new ForEachAction(mockStepExecutor);
      const config = {
        in: [1, 2, 3]
      } as any;

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'ForEachConfigInvalid' });
    });

    it('should throw error when steps is empty array', async () => {
      const action = new ForEachAction(mockStepExecutor);
      const config: ForEachConfig = {
        in: [1, 2, 3],
        steps: []
      };

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'ForEachConfigInvalid' });
    });

    it('should throw error when in is not an array', async () => {
      const action = new ForEachAction(mockStepExecutor);
      const config: ForEachConfig = {
        in: 'not an array' as any,
        steps: [{ action: 'bash', config: { code: 'echo test' } }]
      };

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'ForEachInvalidArray' });
    });

    it('should throw error when steps contain invalid step', async () => {
      const action = new ForEachAction(mockStepExecutor);
      const config: ForEachConfig = {
        in: [1, 2, 3],
        steps: [{ config: { code: 'echo test' } } as any]
      };

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'ForEachConfigInvalid' });
    });
  });

  describe('array iteration with default variable names', () => {
    it('should iterate over array with default item and index variables', async () => {
      const action = new ForEachAction(mockStepExecutor);
      const array = [1, 2, 3];
      const config: ForEachConfig = {
        in: array,
        steps: [{ action: 'bash', config: { code: 'echo {{item}}' } }]
      };

      mockStepExecutor.executeSteps.mockResolvedValue([{ code: 'Success' }]);

      const result = await action.execute(config);

      expect(mockStepExecutor.executeSteps).toHaveBeenCalledTimes(3);
      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(1, config.steps, { item: 1, index: 0 });
      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(2, config.steps, { item: 2, index: 1 });
      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(3, config.steps, { item: 3, index: 2 });
      expect(result.code).toBe('Success');
      expect(result.value).toEqual({ iterations: 3, completed: 3, failed: 0 });
    });

    it('should handle empty array', async () => {
      const action = new ForEachAction(mockStepExecutor);
      const config: ForEachConfig = {
        in: [],
        steps: [{ action: 'bash', config: { code: 'echo test' } }]
      };

      const result = await action.execute(config);

      expect(mockStepExecutor.executeSteps).not.toHaveBeenCalled();
      expect(result.code).toBe('Success');
      expect(result.value).toEqual({ iterations: 0, completed: 0, failed: 0 });
    });

    it('should handle arrays with different types', async () => {
      const action = new ForEachAction(mockStepExecutor);
      const array = ['string', 42, true, null, { key: 'value' }];
      const config: ForEachConfig = {
        in: array,
        steps: [{ action: 'bash', config: { code: 'echo {{item}}' } }]
      };

      mockStepExecutor.executeSteps.mockResolvedValue([{ code: 'Success' }]);

      const result = await action.execute(config);

      expect(mockStepExecutor.executeSteps).toHaveBeenCalledTimes(5);
      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(1, config.steps, { item: 'string', index: 0 });
      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(2, config.steps, { item: 42, index: 1 });
      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(3, config.steps, { item: true, index: 2 });
      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(4, config.steps, { item: null, index: 3 });
      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(5, config.steps, { item: { key: 'value' }, index: 4 });
    });
  });

  describe('array iteration with custom variable names', () => {
    it('should use custom item variable name', async () => {
      const action = new ForEachAction(mockStepExecutor);
      const config: ForEachConfig = {
        in: ['a', 'b', 'c'],
        item: 'letter',
        steps: [{ action: 'bash', config: { code: 'echo {{letter}}' } }]
      };

      mockStepExecutor.executeSteps.mockResolvedValue([{ code: 'Success' }]);

      await action.execute(config);

      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(1, config.steps, { letter: 'a', index: 0 });
      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(2, config.steps, { letter: 'b', index: 1 });
      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(3, config.steps, { letter: 'c', index: 2 });
    });

    it('should use custom index variable name', async () => {
      const action = new ForEachAction(mockStepExecutor);
      const config: ForEachConfig = {
        in: [10, 20, 30],
        index: 'position',
        steps: [{ action: 'bash', config: { code: 'echo {{position}}' } }]
      };

      mockStepExecutor.executeSteps.mockResolvedValue([{ code: 'Success' }]);

      await action.execute(config);

      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(1, config.steps, { item: 10, position: 0 });
      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(2, config.steps, { item: 20, position: 1 });
      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(3, config.steps, { item: 30, position: 2 });
    });

    it('should use both custom variable names', async () => {
      const action = new ForEachAction(mockStepExecutor);
      const config: ForEachConfig = {
        in: [100, 200],
        item: 'value',
        index: 'position',
        steps: [{ action: 'bash', config: { code: 'echo {{value}} at {{position}}' } }]
      };

      mockStepExecutor.executeSteps.mockResolvedValue([{ code: 'Success' }]);

      await action.execute(config);

      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(1, config.steps, { value: 100, position: 0 });
      expect(mockStepExecutor.executeSteps).toHaveBeenNthCalledWith(2, config.steps, { value: 200, position: 1 });
    });
  });

  describe('error handling in iterations', () => {
    it('should track failed iterations when steps fail', async () => {
      const action = new ForEachAction(mockStepExecutor);
      const config: ForEachConfig = {
        in: [1, 2, 3, 4],
        steps: [{ action: 'bash', config: { code: 'echo {{item}}' } }]
      };

      // Simulate failures on iterations 1 and 3
      mockStepExecutor.executeSteps
        .mockResolvedValueOnce([{ code: 'Success' }])
        .mockRejectedValueOnce(new Error('Step failed'))
        .mockResolvedValueOnce([{ code: 'Success' }])
        .mockRejectedValueOnce(new Error('Step failed'));

      await expect(action.execute(config)).rejects.toThrow();

      // Should stop on first failure (default behavior)
      expect(mockStepExecutor.executeSteps).toHaveBeenCalledTimes(2);
    });
  });

  describe('multiple steps per iteration', () => {
    it('should execute multiple steps for each item', async () => {
      const action = new ForEachAction(mockStepExecutor);
      const config: ForEachConfig = {
        in: [1, 2],
        steps: [
          { action: 'bash', config: { code: 'echo step1' } },
          { action: 'bash', config: { code: 'echo step2' } }
        ]
      };

      mockStepExecutor.executeSteps.mockResolvedValue([
        { code: 'Success' },
        { code: 'Success' }
      ]);

      const result = await action.execute(config);

      expect(mockStepExecutor.executeSteps).toHaveBeenCalledTimes(2);
      expect(result.value).toEqual({ iterations: 2, completed: 2, failed: 0 });
    });
  });

  describe('metadata', () => {
    it('should have primaryProperty set to item', () => {
      const action = new ForEachAction(mockStepExecutor);
      expect(action.primaryProperty).toBe('item');
    });

    it('should have actionType set to for-each', () => {
      expect(ForEachAction.actionType).toBe('for-each');
    });
  });

  describe('nested loops', () => {
    it('should support for-each action in steps', async () => {
      const action = new ForEachAction(mockStepExecutor);
      const config: ForEachConfig = {
        in: [1, 2],
        steps: [
          {
            action: 'for-each',
            config: {
              in: ['a', 'b'],
              steps: [{ action: 'bash', config: { code: 'echo nested' } }]
            }
          }
        ]
      };

      mockStepExecutor.executeSteps.mockResolvedValue([{ code: 'Success' }]);

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
      expect(mockStepExecutor.executeSteps).toHaveBeenCalledTimes(2);
    });
  });

  describe('large arrays', () => {
    it('should handle array with 1000+ items', async () => {
      const action = new ForEachAction(mockStepExecutor);
      const largeArray = Array.from({ length: 1500 }, (_, i) => i);
      const config: ForEachConfig = {
        in: largeArray,
        steps: [{ action: 'bash', config: { code: 'echo {{item}}' } }]
      };

      mockStepExecutor.executeSteps.mockResolvedValue([{ code: 'Success' }]);

      const result = await action.execute(config);

      expect(mockStepExecutor.executeSteps).toHaveBeenCalledTimes(1500);
      expect(result.value).toEqual({ iterations: 1500, completed: 1500, failed: 0 });
    });
  });
});
