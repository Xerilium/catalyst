import { describe, it, expect, beforeEach } from '@jest/globals';
import type { Playbook } from '../../../src/playbooks/scripts/playbooks/types';
import { CatalystError } from '../../../src/playbooks/scripts/errors';
import { PlaybookRegistry } from '../../../src/playbooks/scripts/engine/playbook-registry';

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

// Mock playbook for testing
const mockPlaybook: Playbook = {
  name: 'test-playbook',
  description: 'Test playbook',
  owner: 'Engineer',
  steps: []
};

describe('PlaybookRegistry', () => {
  let registry: PlaybookRegistry;

  beforeEach(() => {
    registry = new PlaybookRegistry();
  });

  describe('register', () => {
    it('should register a playbook successfully', () => {
      expect(() => registry.register('test-playbook', mockPlaybook)).not.toThrow();
      expect(registry.has('test-playbook')).toBe(true);
    });

    it('should fail if playbook name is not kebab-case', () => {
      expectCatalystError(() => registry.register('TestPlaybook', mockPlaybook), 'InvalidPlaybookName');
      expectCatalystError(() => registry.register('test_playbook', mockPlaybook), 'InvalidPlaybookName');
      expectCatalystError(() => registry.register('testPlaybook', mockPlaybook), 'InvalidPlaybookName');
    });

    it('should accept valid kebab-case names', () => {
      expect(() => registry.register('deploy-app', mockPlaybook)).not.toThrow();
      expect(() => registry.register('run-tests', mockPlaybook)).not.toThrow();
      expect(() => registry.register('create-github-issue', mockPlaybook)).not.toThrow();
      expect(() => registry.register('simple', mockPlaybook)).not.toThrow();
      expect(() => registry.register('test123', mockPlaybook)).not.toThrow();
      expect(() => registry.register('test-123', mockPlaybook)).not.toThrow();
    });

    it('should reject names starting with hyphen', () => {
      expectCatalystError(() => registry.register('-test', mockPlaybook), 'InvalidPlaybookName');
    });

    it('should reject names ending with hyphen', () => {
      expectCatalystError(() => registry.register('test-', mockPlaybook), 'InvalidPlaybookName');
    });

    it('should reject names with uppercase letters', () => {
      expectCatalystError(() => registry.register('Test', mockPlaybook), 'InvalidPlaybookName');
      expectCatalystError(() => registry.register('test-Playbook', mockPlaybook), 'InvalidPlaybookName');
    });

    it('should fail if playbook is already registered', () => {
      registry.register('test-playbook', mockPlaybook);

      expectCatalystError(
        () => registry.register('test-playbook', mockPlaybook),
        'DuplicatePlaybook',
        'test-playbook'
      );
    });

    it('should provide clear error message for duplicate registration', () => {
      registry.register('test-playbook', mockPlaybook);

      expect(() => registry.register('test-playbook', mockPlaybook)).toThrow('already registered');
    });
  });

  describe('get', () => {
    it('should return registered playbook', () => {
      registry.register('test-playbook', mockPlaybook);

      const retrieved = registry.get('test-playbook');

      expect(retrieved).toBe(mockPlaybook);
    });

    it('should return undefined for unregistered playbook', () => {
      const retrieved = registry.get('nonexistent-playbook');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for registered playbook', () => {
      registry.register('test-playbook', mockPlaybook);

      expect(registry.has('test-playbook')).toBe(true);
    });

    it('should return false for unregistered playbook', () => {
      expect(registry.has('nonexistent-playbook')).toBe(false);
    });
  });

  describe('getAllNames', () => {
    it('should return empty array when no playbooks registered', () => {
      const names = registry.getAllNames();

      expect(names).toEqual([]);
    });

    it('should return all registered playbook names', () => {
      const playbook1: Playbook = { ...mockPlaybook, name: 'playbook-one' };
      const playbook2: Playbook = { ...mockPlaybook, name: 'playbook-two' };

      registry.register('playbook-one', playbook1);
      registry.register('playbook-two', playbook2);

      const names = registry.getAllNames();

      expect(names).toHaveLength(2);
      expect(names).toContain('playbook-one');
      expect(names).toContain('playbook-two');
    });
  });

  describe('count', () => {
    it('should return 0 when no playbooks registered', () => {
      expect(registry.count()).toBe(0);
    });

    it('should return correct count of registered playbooks', () => {
      registry.register('playbook-one', mockPlaybook);
      expect(registry.count()).toBe(1);

      registry.register('playbook-two', mockPlaybook);
      expect(registry.count()).toBe(2);

      registry.register('playbook-three', mockPlaybook);
      expect(registry.count()).toBe(3);
    });
  });

  describe('clear', () => {
    it('should remove all registered playbooks', () => {
      registry.register('playbook-one', mockPlaybook);
      registry.register('playbook-two', mockPlaybook);

      expect(registry.count()).toBe(2);

      registry.clear();

      expect(registry.count()).toBe(0);
      expect(registry.has('playbook-one')).toBe(false);
      expect(registry.has('playbook-two')).toBe(false);
    });
  });
});
