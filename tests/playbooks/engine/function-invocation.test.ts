/**
 * Tests for FunctionInvocationAction
 *
 * Tests function invocation: input mapping, step execution, and return values.
 *
 * @req FR:playbook-engine/actions.builtin.function.invocation - Function callable as action type
 * @req FR:playbook-engine/actions.builtin.function.inputs - Typed input parameters
 * @req FR:playbook-engine/actions.builtin.function.return - Return values via return action
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { PlaybookActionResult, StepExecutor, PlaybookStep, InputParameter } from '@playbooks/types';
import { FunctionInvocationAction } from '@playbooks/engine/actions/function-invocation-action';
import type { FunctionDefinition } from '@playbooks/engine/actions/function-action';

// Mock StepExecutor
function createMockStepExecutor(results?: PlaybookActionResult[]): StepExecutor {
  return {
    executeSteps: jest.fn<StepExecutor['executeSteps']>().mockResolvedValue(results ?? []),
    getCallStack: jest.fn<StepExecutor['getCallStack']>().mockReturnValue([]),
    getVariable: jest.fn<StepExecutor['getVariable']>().mockReturnValue(undefined),
    setVariable: jest.fn<StepExecutor['setVariable']>()
  };
}

// Helper to create InputParameter from minimal args
function input(name: string, opts: Partial<InputParameter> = {}): InputParameter {
  return { name, type: opts.type ?? 'string', ...opts };
}

const simpleSteps: PlaybookStep[] = [
  { action: 'log-info', config: { message: 'Hello' } }
];

/** @req FR:playbook-engine/actions.builtin.function.invocation */
describe('FunctionInvocationAction', () => {
  let stepExecutor: StepExecutor;

  beforeEach(() => {
    stepExecutor = createMockStepExecutor();
  });

  describe('basic invocation', () => {
    it('should execute function steps via StepExecutor', async () => {
      const def: FunctionDefinition = { name: 'greet', steps: simpleSteps };
      const action = new FunctionInvocationAction(stepExecutor, def);

      await action.execute({});

      expect(stepExecutor.executeSteps).toHaveBeenCalledWith(simpleSteps, {});
    });

    it('should return Success code', async () => {
      const def: FunctionDefinition = { name: 'greet', steps: simpleSteps };
      const action = new FunctionInvocationAction(stepExecutor, def);

      const result = await action.execute({});

      expect(result.code).toBe('Success');
    });
  });

  /** @req FR:playbook-engine/actions.builtin.function.inputs */
  describe('named inputs', () => {
    it('should pass named inputs as variable overrides', async () => {
      const def: FunctionDefinition = {
        name: 'greet',
        inputs: [input('name'), input('greeting')],
        steps: simpleSteps
      };
      const action = new FunctionInvocationAction(stepExecutor, def);

      await action.execute({ name: 'World', greeting: 'Hello' });

      expect(stepExecutor.executeSteps).toHaveBeenCalledWith(simpleSteps, {
        name: 'World',
        greeting: 'Hello'
      });
    });

    it('should apply default values for missing optional inputs', async () => {
      const def: FunctionDefinition = {
        name: 'greet',
        inputs: [
          input('name', { required: true }),
          input('greeting', { default: 'Hi' })
        ],
        steps: simpleSteps
      };
      const action = new FunctionInvocationAction(stepExecutor, def);

      await action.execute({ name: 'World' });

      expect(stepExecutor.executeSteps).toHaveBeenCalledWith(simpleSteps, {
        name: 'World',
        greeting: 'Hi'
      });
    });

    it('should throw FunctionInputInvalid for missing required input', async () => {
      const def: FunctionDefinition = {
        name: 'greet',
        inputs: [input('name', { required: true })],
        steps: simpleSteps
      };
      const action = new FunctionInvocationAction(stepExecutor, def);

      await expect(action.execute({})).rejects.toMatchObject({
        code: 'FunctionInputInvalid'
      });
    });
  });

  /** @req FR:playbook-engine/actions.builtin.function.inputs */
  describe('positional inputs', () => {
    it('should map positional array to input parameter names', async () => {
      const def: FunctionDefinition = {
        name: 'greet',
        inputs: [input('emoji'), input('title')],
        steps: simpleSteps
      };
      const action = new FunctionInvocationAction(stepExecutor, def);

      await action.execute(['📁', 'File Operations'] as any);

      expect(stepExecutor.executeSteps).toHaveBeenCalledWith(simpleSteps, {
        emoji: '📁',
        title: 'File Operations'
      });
    });

    it('should unwrap transformer { value: [...] } wrapper for positional args', async () => {
      const def: FunctionDefinition = {
        name: 'greet',
        inputs: [input('emoji'), input('title')],
        steps: simpleSteps
      };
      const action = new FunctionInvocationAction(stepExecutor, def);

      // YAML transformer wraps arrays as { value: [...] } for non-catalog actions
      await action.execute({ value: ['📁', 'File Operations'] });

      expect(stepExecutor.executeSteps).toHaveBeenCalledWith(simpleSteps, {
        emoji: '📁',
        title: 'File Operations'
      });
    });

    it('should throw FunctionInputInvalid when array exceeds input count', async () => {
      const def: FunctionDefinition = {
        name: 'greet',
        inputs: [input('name')],
        steps: simpleSteps
      };
      const action = new FunctionInvocationAction(stepExecutor, def);

      await expect(action.execute(['a', 'b', 'c'] as any)).rejects.toMatchObject({
        code: 'FunctionInputInvalid'
      });
    });
  });

  describe('no inputs defined', () => {
    it('should execute without inputs when function has no input spec', async () => {
      const def: FunctionDefinition = { name: 'no-args', steps: simpleSteps };
      const action = new FunctionInvocationAction(stepExecutor, def);

      await action.execute({});

      expect(stepExecutor.executeSteps).toHaveBeenCalledWith(simpleSteps, {});
    });

    it('should execute with empty config when function has no input spec', async () => {
      const def: FunctionDefinition = { name: 'no-args', steps: simpleSteps };
      const action = new FunctionInvocationAction(stepExecutor, def);

      await action.execute(undefined as any);

      expect(stepExecutor.executeSteps).toHaveBeenCalledWith(simpleSteps, {});
    });
  });

  /** @req FR:playbook-engine/actions.builtin.function.return */
  describe('return values', () => {
    it('should return the last result value from executed steps', async () => {
      const returnResult: PlaybookActionResult = {
        code: 'Success',
        message: 'Returned',
        value: { greeting: 'Hello World' },
        error: undefined
      };
      stepExecutor = createMockStepExecutor([returnResult]);
      const def: FunctionDefinition = { name: 'greet', steps: simpleSteps };
      const action = new FunctionInvocationAction(stepExecutor, def);

      const result = await action.execute({});

      expect(result.value).toEqual({ greeting: 'Hello World' });
    });

    it('should return empty object when function has no steps results', async () => {
      stepExecutor = createMockStepExecutor([]);
      const def: FunctionDefinition = { name: 'empty', steps: simpleSteps };
      const action = new FunctionInvocationAction(stepExecutor, def);

      const result = await action.execute({});

      expect(result.value).toEqual({});
    });
  });
});
