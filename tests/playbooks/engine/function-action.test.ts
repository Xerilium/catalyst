/**
 * Tests for FunctionAction (privileged built-in action)
 *
 * Tests function definition and registration into PlaybookContext.
 *
 * @req FR:playbook-engine/actions.builtin.function - Inline function definition
 * @req FR:playbook-engine/actions.builtin.function.interface - Function action interface
 * @req FR:playbook-engine/actions.builtin.function.collision - Naming collision detection
 * @req FR:playbook-engine/actions.builtin.function.validation - Configuration validation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { PlaybookContext } from '@playbooks/types';
import { FunctionAction } from '@playbooks/engine/actions/function-action';
import type { FunctionConfig } from '@playbooks/engine/actions/function-action';

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

/** @req FR:playbook-engine/actions.builtin.function.interface */
describe('FunctionAction', () => {
  let context: PlaybookContext;
  let action: FunctionAction;

  beforeEach(() => {
    context = createMockContext();
    action = new FunctionAction();
    (action as any).__context = context;
  });

  describe('static properties', () => {
    it('should have actionType "function"', () => {
      expect(FunctionAction.actionType).toBe('function');
    });

    it('should have primaryProperty "name"', () => {
      expect(FunctionAction.primaryProperty).toBe('name');
    });
  });

  /** @req FR:playbook-engine/actions.builtin.function.interface */
  describe('function registration', () => {
    it('should register a function with name and steps', async () => {
      const config: FunctionConfig = {
        name: 'greet',
        steps: [
          { action: 'log-info', config: { message: 'Hello' } }
        ]
      };

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
      expect(context.functions).toBeDefined();
      expect(context.functions!['greet']).toBeDefined();
      expect(context.functions!['greet'].name).toBe('greet');
      expect(context.functions!['greet'].steps).toEqual(config.steps);
    });

    it('should register a function with inputs', async () => {
      const config: FunctionConfig = {
        name: 'greet-user',
        inputs: [{ string: 'name' }],
        steps: [
          { action: 'log-info', config: { message: '{{name}}' } }
        ]
      };

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
      expect(context.functions!['greet-user'].inputs).toEqual([
        { name: 'name', type: 'string', required: false }
      ]);
    });

    it('should register multiple functions', async () => {
      await action.execute({
        name: 'func-a',
        steps: [{ action: 'log-info', config: { message: 'A' } }]
      });

      // Need a fresh action instance for second call
      const action2 = new FunctionAction();
      (action2 as any).__context = context;

      await action2.execute({
        name: 'func-b',
        steps: [{ action: 'log-info', config: { message: 'B' } }]
      });

      expect(Object.keys(context.functions!)).toEqual(['func-a', 'func-b']);
    });

    it('should return function name as result value', async () => {
      const result = await action.execute({
        name: 'my-func',
        steps: [{ action: 'log-info', config: { message: 'test' } }]
      });

      expect(result.value).toEqual({ name: 'my-func' });
    });
  });

  /** @req FR:playbook-engine/actions.builtin.function.validation */
  describe('validation', () => {
    it('should throw MissingPrivilegedAccess when context not injected', async () => {
      const uninjected = new FunctionAction();

      await expect(uninjected.execute({
        name: 'test',
        steps: [{ action: 'log-info', config: {} }]
      })).rejects.toMatchObject({
        code: 'MissingPrivilegedAccess'
      });
    });

    it('should throw FunctionConfigInvalid when config is not an object', async () => {
      await expect(action.execute(null as any)).rejects.toMatchObject({
        code: 'FunctionConfigInvalid'
      });
    });

    it('should throw FunctionConfigInvalid when name is missing', async () => {
      await expect(action.execute({
        steps: [{ action: 'log-info', config: {} }]
      } as any)).rejects.toMatchObject({
        code: 'FunctionConfigInvalid'
      });
    });

    it('should throw FunctionConfigInvalid when name is empty', async () => {
      await expect(action.execute({
        name: '',
        steps: [{ action: 'log-info', config: {} }]
      })).rejects.toMatchObject({
        code: 'FunctionConfigInvalid'
      });
    });

    it('should throw FunctionConfigInvalid when steps is missing', async () => {
      await expect(action.execute({
        name: 'test'
      } as any)).rejects.toMatchObject({
        code: 'FunctionConfigInvalid'
      });
    });

    it('should throw FunctionConfigInvalid when steps is empty', async () => {
      await expect(action.execute({
        name: 'test',
        steps: []
      })).rejects.toMatchObject({
        code: 'FunctionConfigInvalid'
      });
    });
  });

  /** @req FR:playbook-engine/actions.builtin.function.collision */
  describe('collision detection', () => {
    it('should throw FunctionConfigInvalid when name matches built-in action', async () => {
      await expect(action.execute({
        name: 'var',
        steps: [{ action: 'log-info', config: {} }]
      })).rejects.toMatchObject({
        code: 'FunctionConfigInvalid',
        message: expect.stringContaining('built-in action')
      });
    });

    it('should throw FunctionConfigInvalid when name matches registered action', async () => {
      await expect(action.execute({
        name: 'script',
        steps: [{ action: 'log-info', config: {} }]
      })).rejects.toMatchObject({
        code: 'FunctionConfigInvalid',
        message: expect.stringContaining('built-in action')
      });
    });

    it('should throw FunctionConfigInvalid when name is already registered as a function', async () => {
      // Register first
      await action.execute({
        name: 'duplicate',
        steps: [{ action: 'log-info', config: {} }]
      });

      // Try to register again
      const action2 = new FunctionAction();
      (action2 as any).__context = context;

      await expect(action2.execute({
        name: 'duplicate',
        steps: [{ action: 'log-info', config: {} }]
      })).rejects.toMatchObject({
        code: 'FunctionConfigInvalid',
        message: expect.stringContaining('already defined')
      });
    });
  });
});
