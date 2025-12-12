/**
 * Tests for PlaybookRunAction
 *
 * These tests MUST fail initially (no implementation yet) following TDD principles.
 */

import { PlaybookRunAction } from '../../../src/playbooks/scripts/playbooks/actions/controls/playbook-run-action';
import type { StepExecutor } from '../../../src/playbooks/scripts/playbooks/types/action';
import type { PlaybookActionResult, PlaybookStep } from '../../../src/playbooks/scripts/playbooks/types';
import type { PlaybookRunConfig } from '../../../src/playbooks/scripts/playbooks/actions/controls/types';
import type { Playbook } from '../../../src/playbooks/scripts/playbooks/types/playbook';

describe('PlaybookRunAction', () => {
  let mockStepExecutor: jest.Mocked<StepExecutor>;
  let mockLoadPlaybook: jest.Mock<Promise<Playbook | undefined>, [string]>;

  beforeEach(() => {
    mockStepExecutor = {
      executeSteps: jest.fn(),
      getCallStack: jest.fn()
    };

    mockLoadPlaybook = jest.fn();
  });

  describe('configuration validation', () => {
    it('should throw error when name is missing', async () => {
      const action = new PlaybookRunAction(mockStepExecutor, mockLoadPlaybook);
      const config = {
        inputs: { test: 'value' }
      } as any;

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'PlaybookRunConfigInvalid' });
    });

    it('should throw error when name is empty string', async () => {
      const action = new PlaybookRunAction(mockStepExecutor, mockLoadPlaybook);
      const config: PlaybookRunConfig = {
        name: '',
        inputs: {}
      };

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'PlaybookRunConfigInvalid' });
    });

    it('should throw error when config is not an object', async () => {
      const action = new PlaybookRunAction(mockStepExecutor, mockLoadPlaybook);
      const config = 'invalid' as any;

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'PlaybookRunConfigInvalid' });
    });
  });

  describe('playbook execution with inputs', () => {
    it('should execute child playbook with provided inputs', async () => {
      const childPlaybook: Playbook = {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'test',
        inputs: [],
        steps: [
          { action: 'bash', config: { code: 'echo test' } }
        ]
      };

      mockLoadPlaybook.mockResolvedValue(childPlaybook);
      mockStepExecutor.getCallStack.mockReturnValue([]);
      mockStepExecutor.executeSteps.mockResolvedValue([
        { code: 'Success', message: 'Step completed', value: { result: 'success' } }
      ]);

      const action = new PlaybookRunAction(mockStepExecutor, mockLoadPlaybook);
      const config: PlaybookRunConfig = {
        name: 'test-playbook',
        inputs: { param1: 'value1', param2: 42 }
      };

      const result = await action.execute(config);

      expect(mockLoadPlaybook).toHaveBeenCalledWith('test-playbook');
      expect(mockStepExecutor.executeSteps).toHaveBeenCalledWith(
        childPlaybook.steps,
        { param1: 'value1', param2: 42 }
      );
      expect(result.code).toBe('Success');
      expect(result.value).toEqual({ result: 'success' });
    });

    it('should execute child playbook without inputs', async () => {
      const childPlaybook: Playbook = {
        name: 'simple-playbook',
        description: 'Simple playbook',
        owner: 'test',
        inputs: [],
        steps: [{ action: 'bash', config: { code: 'echo hello' } }]
      };

      mockLoadPlaybook.mockResolvedValue(childPlaybook);
      mockStepExecutor.getCallStack.mockReturnValue([]);
      mockStepExecutor.executeSteps.mockResolvedValue([
        { code: 'Success', message: 'Done' }
      ]);

      const action = new PlaybookRunAction(mockStepExecutor, mockLoadPlaybook);
      const config: PlaybookRunConfig = {
        name: 'simple-playbook'
      };

      const result = await action.execute(config);

      expect(mockStepExecutor.executeSteps).toHaveBeenCalledWith(
        childPlaybook.steps,
        {}
      );
      expect(result.code).toBe('Success');
    });
  });

  describe('playbook not found error', () => {
    it('should throw error when playbook is not found', async () => {
      mockLoadPlaybook.mockResolvedValue(undefined);
      mockStepExecutor.getCallStack.mockReturnValue([]); // No circular reference

      const action = new PlaybookRunAction(mockStepExecutor, mockLoadPlaybook);
      const config: PlaybookRunConfig = {
        name: 'non-existent-playbook'
      };

      await expect(action.execute(config)).rejects.toMatchObject({
        code: 'PlaybookNotFound',
        message: expect.stringContaining('non-existent-playbook')
      });
    });
  });

  describe('circular reference detection', () => {
    it('should throw error when circular reference is detected', async () => {
      // Simulate a call stack where the playbook being called is already in the stack
      mockStepExecutor.getCallStack.mockReturnValue(['playbook-a', 'playbook-b']);

      const action = new PlaybookRunAction(mockStepExecutor, mockLoadPlaybook);
      const config: PlaybookRunConfig = {
        name: 'playbook-a' // Already in call stack
      };

      await expect(action.execute(config)).rejects.toMatchObject({
        code: 'CircularPlaybookReference',
        message: expect.stringContaining('playbook-a -> playbook-b -> playbook-a')
      });
    });

    it('should allow execution when no circular reference', async () => {
      const childPlaybook: Playbook = {
        name: 'child-playbook',
        description: 'Child',
        owner: 'test',
        inputs: [],
        steps: [{ action: 'bash', config: { code: 'echo test' } }]
      };

      mockLoadPlaybook.mockResolvedValue(childPlaybook);
      mockStepExecutor.getCallStack.mockReturnValue(['parent-playbook']);
      mockStepExecutor.executeSteps.mockResolvedValue([{ code: 'Success' }]);

      const action = new PlaybookRunAction(mockStepExecutor, mockLoadPlaybook);
      const config: PlaybookRunConfig = {
        name: 'child-playbook' // NOT in call stack
      };

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
    });
  });

  describe('recursion depth limit', () => {
    it('should throw error when recursion depth limit is exceeded', async () => {
      // Simulate a call stack with 10 playbooks (max depth)
      const deepCallStack = Array.from({ length: 10 }, (_, i) => `playbook-${i}`);
      mockStepExecutor.getCallStack.mockReturnValue(deepCallStack);

      const action = new PlaybookRunAction(mockStepExecutor, mockLoadPlaybook);
      const config: PlaybookRunConfig = {
        name: 'another-playbook'
      };

      await expect(action.execute(config)).rejects.toMatchObject({
        code: 'MaxRecursionDepthExceeded',
        message: expect.stringContaining('10')
      });
    });

    it('should allow execution when under recursion depth limit', async () => {
      const childPlaybook: Playbook = {
        name: 'child',
        description: 'Child',
        owner: 'test',
        inputs: [],
        steps: [{ action: 'bash', config: { code: 'echo test' } }]
      };

      mockLoadPlaybook.mockResolvedValue(childPlaybook);
      mockStepExecutor.getCallStack.mockReturnValue(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9']); // 9 playbooks
      mockStepExecutor.executeSteps.mockResolvedValue([{ code: 'Success' }]);

      const action = new PlaybookRunAction(mockStepExecutor, mockLoadPlaybook);
      const config: PlaybookRunConfig = {
        name: 'child'
      };

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
    });
  });

  describe('output value extraction', () => {
    it('should return value from last step result', async () => {
      const childPlaybook: Playbook = {
        name: 'test',
        description: 'Test',
        owner: 'test',
        inputs: [],
        steps: [
          { action: 'bash', config: { code: 'echo step1' } },
          { action: 'bash', config: { code: 'echo step2' } }
        ]
      };

      mockLoadPlaybook.mockResolvedValue(childPlaybook);
      mockStepExecutor.getCallStack.mockReturnValue([]);
      mockStepExecutor.executeSteps.mockResolvedValue([
        { code: 'Success', value: { step: 1 } },
        { code: 'Success', value: { step: 2, output: 'final' } }
      ]);

      const action = new PlaybookRunAction(mockStepExecutor, mockLoadPlaybook);
      const config: PlaybookRunConfig = {
        name: 'test'
      };

      const result = await action.execute(config);

      expect(result.value).toEqual({ step: 2, output: 'final' });
    });

    it('should return empty object when no steps executed', async () => {
      const childPlaybook: Playbook = {
        name: 'empty',
        description: 'Empty',
        owner: 'test',
        inputs: [],
        steps: []
      };

      mockLoadPlaybook.mockResolvedValue(childPlaybook);
      mockStepExecutor.getCallStack.mockReturnValue([]);
      mockStepExecutor.executeSteps.mockResolvedValue([]);

      const action = new PlaybookRunAction(mockStepExecutor, mockLoadPlaybook);
      const config: PlaybookRunConfig = {
        name: 'empty'
      };

      const result = await action.execute(config);

      expect(result.value).toEqual({});
    });
  });

  describe('metadata', () => {
    it('should have actionType set to playbook', () => {
      expect(PlaybookRunAction.actionType).toBe('playbook');
    });

    it('should have primaryProperty set to name', () => {
      expect(PlaybookRunAction.primaryProperty).toBe('name');
    });
  });
});
