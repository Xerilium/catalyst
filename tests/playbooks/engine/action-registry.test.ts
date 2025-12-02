import { describe, it, expect, beforeEach } from '@jest/globals';
import type { PlaybookAction, PlaybookActionResult } from '../../../src/playbooks/scripts/playbooks/types';
import { CatalystError } from '../../../src/playbooks/scripts/errors';
import { ActionRegistry } from '../../../src/playbooks/scripts/engine/action-registry';

// Helper to assert CatalystError
function expectCatalystError(fn: () => void, expectedCode: string, expectedMessagePart?: string) {
  try {
    fn();
    throw new Error('Expected function to throw CatalystError');
  } catch (error) {
    expect(error).toBeInstanceOf(CatalystError);
    expect((error as CatalystError).code).toBe(expectedCode);
    if (expectedMessagePart) {
      expect((error as CatalystError).message).toContain(expectedMessagePart);
    }
  }
}

// Mock action for testing
class MockAction implements PlaybookAction<unknown> {
  async execute(config: unknown): Promise<PlaybookActionResult> {
    return {
      code: 'Success',
      message: 'Mock action executed',
      value: config
    };
  }
}

describe('ActionRegistry', () => {
  let registry: ActionRegistry;

  beforeEach(() => {
    registry = new ActionRegistry();
  });

  describe('register', () => {
    it('should register an action successfully', () => {
      const action = new MockAction();

      expect(() => registry.register('test-action', action)).not.toThrow();
      expect(registry.has('test-action')).toBe(true);
    });

    it('should fail if action name is not kebab-case', () => {
      const action = new MockAction();

      expectCatalystError(() => registry.register('TestAction', action), 'InvalidActionName');
      expectCatalystError(() => registry.register('test_action', action), 'InvalidActionName');
      expectCatalystError(() => registry.register('testAction', action), 'InvalidActionName');
    });

    it('should accept valid kebab-case names', () => {
      const action = new MockAction();

      expect(() => registry.register('file-write', action)).not.toThrow();
      expect(() => registry.register('http-get', action)).not.toThrow();
      expect(() => registry.register('github-issue-create', action)).not.toThrow();
      expect(() => registry.register('test', action)).not.toThrow();
      expect(() => registry.register('test123', action)).not.toThrow();
      expect(() => registry.register('test-123', action)).not.toThrow();
    });

    it('should reject names starting with hyphen', () => {
      const action = new MockAction();

      expectCatalystError(() => registry.register('-test', action), 'InvalidActionName');
    });

    it('should reject names ending with hyphen', () => {
      const action = new MockAction();

      expectCatalystError(() => registry.register('test-', action), 'InvalidActionName');
    });

    it('should reject names with uppercase letters', () => {
      const action = new MockAction();

      expectCatalystError(() => registry.register('Test', action), 'InvalidActionName');
      expectCatalystError(() => registry.register('test-Action', action), 'InvalidActionName');
    });

    it('should fail if action is already registered', () => {
      const action = new MockAction();

      registry.register('test-action', action);

      expectCatalystError(() => registry.register('test-action', new MockAction()), 'DuplicateAction', 'test-action');
    });

    it('should provide clear error message for duplicate registration', () => {
      const action = new MockAction();

      registry.register('test-action', action);

      expect(() => registry.register('test-action', action)).toThrow('already registered');
    });
  });

  describe('get', () => {
    it('should return registered action', () => {
      const action = new MockAction();
      registry.register('test-action', action);

      const retrieved = registry.get('test-action');

      expect(retrieved).toBe(action);
    });

    it('should return undefined for unregistered action', () => {
      const retrieved = registry.get('nonexistent-action');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for registered action', () => {
      const action = new MockAction();
      registry.register('test-action', action);

      expect(registry.has('test-action')).toBe(true);
    });

    it('should return false for unregistered action', () => {
      expect(registry.has('nonexistent-action')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return empty object when no actions registered', () => {
      const actions = registry.getAll();

      expect(actions).toEqual({});
    });

    it('should return all registered actions', () => {
      const action1 = new MockAction();
      const action2 = new MockAction();

      registry.register('action-one', action1);
      registry.register('action-two', action2);

      const actions = registry.getAll();

      expect(Object.keys(actions)).toHaveLength(2);
      expect(actions['action-one']).toBe(action1);
      expect(actions['action-two']).toBe(action2);
    });
  });

  describe('count', () => {
    it('should return 0 when no actions registered', () => {
      expect(registry.count()).toBe(0);
    });

    it('should return correct count of registered actions', () => {
      registry.register('action-one', new MockAction());
      expect(registry.count()).toBe(1);

      registry.register('action-two', new MockAction());
      expect(registry.count()).toBe(2);

      registry.register('action-three', new MockAction());
      expect(registry.count()).toBe(3);
    });
  });

  describe('clear', () => {
    it('should remove all registered actions', () => {
      registry.register('action-one', new MockAction());
      registry.register('action-two', new MockAction());

      expect(registry.count()).toBe(2);

      registry.clear();

      expect(registry.count()).toBe(0);
      expect(registry.has('action-one')).toBe(false);
      expect(registry.has('action-two')).toBe(false);
    });
  });
});
