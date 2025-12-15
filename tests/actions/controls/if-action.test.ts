/**
 * Tests for IfAction
 *
 * These tests MUST fail initially (no implementation yet) following TDD principles.
 *
 * @req FR:playbook-actions-controls/conditional.if-action
 * @req FR:playbook-actions-controls/conditional.if-action.base-class
 * @req FR:playbook-actions-controls/conditional.if-action.evaluation
 * @req FR:playbook-actions-controls/conditional.if-action.branch-selection
 * @req FR:playbook-actions-controls/conditional.if-action.validation
 * @req FR:playbook-actions-controls/conditional.if-action.nesting
 * @req NFR:playbook-actions-controls/testability.isolation
 */

import { IfAction } from '@playbooks/actions/controls/if-action';
import type { StepExecutor } from '@playbooks/types/action';
import type { PlaybookActionResult, PlaybookStep } from '@playbooks/types';
import type { IfConfig } from '@playbooks/actions/controls/types';

describe('IfAction', () => {
  let mockStepExecutor: jest.Mocked<StepExecutor>;

  beforeEach(() => {
    mockStepExecutor = {
      executeSteps: jest.fn(),
      getCallStack: jest.fn()
    };
  });

  describe('configuration validation', () => {
    it('should throw error when condition is missing', async () => {
      const action = new IfAction(mockStepExecutor);
      const config = {
        then: [{ action: 'bash', config: { code: 'echo test' } }]
      } as any;

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'IfConfigInvalid' });
    });

    it('should throw error when condition is empty string', async () => {
      const action = new IfAction(mockStepExecutor);
      const config: IfConfig = {
        condition: '',
        then: [{ action: 'bash', config: { code: 'echo test' } }]
      };

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'IfConfigInvalid' });
    });

    it('should throw error when then is missing', async () => {
      const action = new IfAction(mockStepExecutor);
      const config = {
        condition: 'true'
      } as any;

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'IfConfigInvalid' });
    });

    it('should throw error when then is empty array', async () => {
      const action = new IfAction(mockStepExecutor);
      const config: IfConfig = {
        condition: 'true',
        then: []
      };

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'IfConfigInvalid' });
    });

    it('should throw error when else is not an array', async () => {
      const action = new IfAction(mockStepExecutor);
      const config = {
        condition: 'true',
        then: [{ action: 'bash', config: { code: 'echo test' } }],
        else: 'not an array'
      } as any;

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'IfConfigInvalid' });
    });

    it('should throw error when then step is missing action property', async () => {
      const action = new IfAction(mockStepExecutor);
      const config: IfConfig = {
        condition: 'true',
        then: [{ config: { code: 'echo test' } } as any]
      };

      await expect(action.execute(config)).rejects.toMatchObject({ code: 'IfConfigInvalid' });
    });
  });

  describe('then branch execution', () => {
    it('should execute then branch when condition is truthy string', async () => {
      const action = new IfAction(mockStepExecutor);
      const thenSteps: PlaybookStep[] = [
        { action: 'bash', config: { code: 'echo "then"' } }
      ];
      const config: IfConfig = {
        condition: 'true',
        then: thenSteps
      };

      mockStepExecutor.executeSteps.mockResolvedValue([
        { code: 'Success', message: 'Step executed' }
      ]);

      const result = await action.execute(config);

      expect(mockStepExecutor.executeSteps).toHaveBeenCalledWith(thenSteps, undefined);
      expect(result.code).toBe('Success');
      expect(result.value).toEqual({ branch: 'then', executed: 1 });
    });

    it('should execute then branch when condition is boolean true', async () => {
      const action = new IfAction(mockStepExecutor);
      const config: IfConfig = {
        condition: 'true', // Will be evaluated as truthy
        then: [{ action: 'bash', config: { code: 'echo test' } }]
      };

      mockStepExecutor.executeSteps.mockResolvedValue([
        { code: 'Success', message: 'Step executed' }
      ]);

      const result = await action.execute(config);

      expect(result.value).toEqual({ branch: 'then', executed: 1 });
    });

    it('should track multiple steps executed in then branch', async () => {
      const action = new IfAction(mockStepExecutor);
      const config: IfConfig = {
        condition: 'true',
        then: [
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

      expect(result.value).toEqual({ branch: 'then', executed: 3 });
    });
  });

  describe('else branch execution', () => {
    it('should execute else branch when condition is falsy', async () => {
      const action = new IfAction(mockStepExecutor);
      const elseSteps: PlaybookStep[] = [
        { action: 'bash', config: { code: 'echo "else"' } }
      ];
      const config: IfConfig = {
        condition: 'false',
        then: [{ action: 'bash', config: { code: 'echo "then"' } }],
        else: elseSteps
      };

      mockStepExecutor.executeSteps.mockResolvedValue([
        { code: 'Success', message: 'Step executed' }
      ]);

      const result = await action.execute(config);

      expect(mockStepExecutor.executeSteps).toHaveBeenCalledWith(elseSteps, undefined);
      expect(result.code).toBe('Success');
      expect(result.value).toEqual({ branch: 'else', executed: 1 });
    });

    it('should return none branch when condition is falsy and no else provided', async () => {
      const action = new IfAction(mockStepExecutor);
      const config: IfConfig = {
        condition: 'false',
        then: [{ action: 'bash', config: { code: 'echo "then"' } }]
      };

      const result = await action.execute(config);

      expect(mockStepExecutor.executeSteps).not.toHaveBeenCalled();
      expect(result.code).toBe('Success');
      expect(result.value).toEqual({ branch: 'none', executed: 0 });
    });
  });

  describe('condition evaluation', () => {
    it('should treat non-empty string as truthy', async () => {
      const action = new IfAction(mockStepExecutor);
      const config: IfConfig = {
        condition: 'some value',
        then: [{ action: 'bash', config: { code: 'echo test' } }]
      };

      mockStepExecutor.executeSteps.mockResolvedValue([{ code: 'Success' }]);

      const result = await action.execute(config);

      expect(result.value).toEqual({ branch: 'then', executed: 1 });
    });

    it('should treat empty string as falsy', async () => {
      const action = new IfAction(mockStepExecutor);
      const config: IfConfig = {
        condition: '',
        then: [{ action: 'bash', config: { code: 'echo test' } }]
      };

      await expect(action.execute(config)).rejects.toThrow(); // Should fail validation first
    });

    it('should treat string "0" as truthy (JavaScript semantics)', async () => {
      const action = new IfAction(mockStepExecutor);
      const config: IfConfig = {
        condition: '0',
        then: [{ action: 'bash', config: { code: 'echo test' } }]
      };

      mockStepExecutor.executeSteps.mockResolvedValue([{ code: 'Success' }]);

      const result = await action.execute(config);

      expect(result.value).toEqual({ branch: 'then', executed: 1 });
    });
  });

  describe('metadata', () => {
    it('should have primaryProperty set to condition', () => {
      expect(IfAction.primaryProperty).toBe('condition');
    });

    it('should have actionType set to if', () => {
      expect(IfAction.actionType).toBe('if');
    });
  });

  describe('nested conditionals', () => {
    it('should support if action in then branch', async () => {
      const action = new IfAction(mockStepExecutor);
      const config: IfConfig = {
        condition: 'true',
        then: [
          {
            action: 'if',
            config: {
              condition: 'true',
              then: [{ action: 'bash', config: { code: 'echo nested' } }]
            }
          }
        ]
      };

      mockStepExecutor.executeSteps.mockResolvedValue([{ code: 'Success' }]);

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
      expect(mockStepExecutor.executeSteps).toHaveBeenCalled();
    });
  });
});
