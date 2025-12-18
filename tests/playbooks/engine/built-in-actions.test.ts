/**
 * Tests for privileged built-in actions (var, return)
 *
 * These actions have privileged access to PlaybookContext and are automatically
 * registered by the Engine when execution context is available.
 *
 * Note: throw and playbook actions have been moved to playbook-actions-controls
 * and are tested in tests/actions/controls/
 *
 * @req FR:playbook-engine/actions.builtin.var - Test variable assignment action
 * @req FR:playbook-engine/actions.builtin.return - Test successful termination action
 * @req NFR:playbook-engine/testability.mockable-actions - Action testing with mocks
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import type { PlaybookContext } from '@playbooks/types';
import { CatalystError } from '@core/errors';
import { VarAction } from '@playbooks/engine/actions/var-action';
import { ReturnAction } from '@playbooks/engine/actions/return-action';

// Helper to create mock context
function createMockContext(overrides?: Partial<PlaybookContext>): PlaybookContext {
  return {
    runId: 'test-run-123',
    playbookName: 'test-playbook',
    playbook: {
      name: 'test-playbook',
      description: 'Test playbook for unit tests',
      owner: 'Test',
      steps: []
      // inputs and outputs are optional
    },
    startTime: new Date().toISOString(),
    status: 'running',
    inputs: {},
    variables: {},
    completedSteps: [],
    currentStepName: '',
    ...overrides
  };
}

describe('VarAction', () => {
  let context: PlaybookContext;
  let varAction: VarAction;

  beforeEach(() => {
    context = createMockContext({
      variables: {
        'existing-var': 'existing-value',
        'user-id': 123
      }
    });
    varAction = new VarAction();
    // Inject context via property (simulating Engine behavior)
    (varAction as any).__context = context;
  });

  describe('configuration validation', () => {
    it('should throw error when config is not an object', async () => {
      await expect(varAction.execute(null as any))
        .rejects
        .toMatchObject({
          code: 'VarConfigInvalid',
          message: expect.stringContaining('must be an object')
        });
    });

    it('should throw error when name is missing', async () => {
      await expect(varAction.execute({ value: 42 } as any))
        .rejects
        .toMatchObject({
          code: 'VarInvalidName',
          message: expect.stringContaining('name is required')
        });
    });

    it('should throw error when name is not a string', async () => {
      await expect(varAction.execute({ name: 123, value: 42 } as any))
        .rejects
        .toMatchObject({
          code: 'VarInvalidName',
          message: expect.stringContaining('must be a string')
        });
    });

    it('should warn when name is not kebab-case but still succeed', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await varAction.execute({ name: 'camelCase', value: 42 });

      expect(result.code).toBe('Success');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('camelCase')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('variable assignment', () => {
    it('should assign new variable to context', async () => {
      const result = await varAction.execute({
        name: 'new-variable',
        value: 'new-value'
      });

      expect(result.code).toBe('Success');
      expect(result.message).toContain('new-variable');
      expect(result.value).toBe('new-value');
      expect(result.error).toBeUndefined();
      expect(context.variables['new-variable']).toBe('new-value');
    });

    it('should overwrite existing variable', async () => {
      expect(context.variables['existing-var']).toBe('existing-value');

      await varAction.execute({
        name: 'existing-var',
        value: 'updated-value'
      });

      expect(context.variables['existing-var']).toBe('updated-value');
    });

    it('should assign different value types', async () => {
      await varAction.execute({ name: 'string-var', value: 'hello' });
      expect(context.variables['string-var']).toBe('hello');

      await varAction.execute({ name: 'number-var', value: 42 });
      expect(context.variables['number-var']).toBe(42);

      await varAction.execute({ name: 'boolean-var', value: true });
      expect(context.variables['boolean-var']).toBe(true);

      await varAction.execute({ name: 'object-var', value: { key: 'value' } });
      expect(context.variables['object-var']).toEqual({ key: 'value' });

      await varAction.execute({ name: 'array-var', value: [1, 2, 3] });
      expect(context.variables['array-var']).toEqual([1, 2, 3]);
    });

    it('should assign null and undefined', async () => {
      await varAction.execute({ name: 'null-var', value: null });
      expect(context.variables['null-var']).toBeNull();

      await varAction.execute({ name: 'undefined-var', value: undefined });
      expect(context.variables['undefined-var']).toBeUndefined();
    });
  });

  describe('privileged context access', () => {
    it('should directly mutate context variables', async () => {
      const variablesBefore = context.variables;

      await varAction.execute({ name: 'test-var', value: 'test' });

      // Same object reference (direct mutation)
      expect(context.variables).toBe(variablesBefore);
      expect(context.variables['test-var']).toBe('test');
    });
  });
});

describe('ReturnAction', () => {
  let context: PlaybookContext;
  let returnAction: ReturnAction;

  beforeEach(() => {
    context = createMockContext({
      playbook: {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'Test',
        steps: [],
        outputs: {
          'result': 'string',
          'count': 'number'
        }
      },
      variables: {
        'result': 'success',
        'count': 42
      }
    });
    returnAction = new ReturnAction();
    // Inject context via property (simulating Engine behavior)
    (returnAction as any).__context = context;
  });

  describe('configuration validation', () => {
    it('should throw error when config is not an object', async () => {
      await expect(returnAction.execute('invalid' as any))
        .rejects
        .toMatchObject({
          code: 'ReturnConfigInvalid',
          message: expect.stringContaining('must be an object')
        });
    });

    it('should accept empty config with defaults', async () => {
      const result = await returnAction.execute({});

      expect(result.code).toBe('Success');
      expect(result.message).toContain('successfully');
      expect(result.value).toEqual({});
      expect(result.error).toBeUndefined();
    });
  });

  describe('early return', () => {
    it('should set earlyReturn flag in context', async () => {
      expect(context.earlyReturn).toBeUndefined();

      await returnAction.execute({
        code: 'CustomSuccess',
        message: 'Custom completion',
        outputs: { result: 'done' }
      });

      expect(context.earlyReturn).toBeDefined();
      expect(context.earlyReturn?.code).toBe('CustomSuccess');
      expect(context.earlyReturn?.message).toBe('Custom completion');
      expect(context.earlyReturn?.outputs).toEqual({ result: 'done' });
    });

    it('should use default code and message', async () => {
      await returnAction.execute({});

      expect(context.earlyReturn?.code).toBe('Success');
      expect(context.earlyReturn?.message).toBe('Playbook completed successfully');
    });

    it('should return result with outputs', async () => {
      const result = await returnAction.execute({
        code: 'TestCode',
        outputs: { test: 'value' }
      });

      expect(result.code).toBe('TestCode');
      expect(result.value).toEqual({ test: 'value' });
      expect(result.error).toBeUndefined();
    });
  });

  describe('output validation', () => {
    it('should warn when required output is missing', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await returnAction.execute({
        outputs: { result: 'done' } // missing 'count'
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('count')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should warn when output type mismatches', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await returnAction.execute({
        outputs: {
          result: 'done',
          count: 'not-a-number' // should be number
        }
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('count')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should succeed when outputs match schema', async () => {
      const result = await returnAction.execute({
        outputs: {
          result: 'done',
          count: 10
        }
      });

      expect(result.code).toBe('Success');
      expect(context.earlyReturn?.outputs).toEqual({
        result: 'done',
        count: 10
      });
    });
  });

  describe('privileged context access', () => {
    it('should access playbook definition for validation', async () => {
      const playbookWithoutOutputs = createMockContext({
        playbook: {
          name: 'test',
          description: 'Test playbook',
          owner: 'Test',
          steps: []
          // No outputs defined
        }
      });

      const action = new ReturnAction();
      // Inject context via property (simulating Engine behavior)
      (action as any).__context = playbookWithoutOutputs;

      // Should not warn when no outputs are defined
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await action.execute({ outputs: { anything: 'goes' } });

      expect(consoleWarnSpy).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });
});
