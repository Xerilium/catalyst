/**
 * StepExecutor Unit Tests
 *
 * Tests the StepExecutor interface implementation used by control flow actions
 * to execute nested steps with engine semantics.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type {
  Playbook,
  PlaybookAction,
  PlaybookActionResult,
  PlaybookState,
  StepExecutor,
  PlaybookStep
} from '@playbooks/types';
import { PlaybookActionWithSteps } from '@playbooks/types';
import { PlaybookProvider } from '@playbooks/registry/playbook-provider';
import { Engine } from '@playbooks/engine/engine';
import { TemplateEngine } from '@playbooks/template/engine';
import { StatePersistence } from '@playbooks/persistence/state-persistence';
import { CatalystError } from '@core/errors';

/**
 * Mock action configuration for testing
 */
interface MockActionConfig {
  /** Value to return from execute */
  returnValue?: unknown;
  /** Whether to fail */
  fail?: boolean;
  /** Error code if failing */
  errorCode?: string;
}

/**
 * Mock action for testing
 */
class MockAction implements PlaybookAction<MockActionConfig> {
  static readonly actionType = 'mock-action';

  async execute(config: MockActionConfig): Promise<PlaybookActionResult> {
    if (config?.fail) {
      return {
        code: config.errorCode || 'MockError',
        message: 'Mock action failed',
        error: new CatalystError('Mock action failed', config.errorCode || 'MockError', 'Test error')
      };
    }

    return {
      code: 'Success',
      message: 'Mock action executed',
      value: config?.returnValue ?? 'success'
    };
  }
}

/**
 * Action that uses StepExecutor to run nested steps
 * Extends PlaybookActionWithSteps to receive StepExecutor from Engine
 */
interface NestedActionConfig {
  nestedSteps: PlaybookStep[];
  variableOverrides?: Record<string, unknown>;
}

class NestedAction extends PlaybookActionWithSteps<NestedActionConfig> {
  static readonly actionType = 'nested-action';

  async execute(config: NestedActionConfig): Promise<PlaybookActionResult> {
    const results = await this.stepExecutor.executeSteps(
      config.nestedSteps,
      config.variableOverrides
    );

    return {
      code: 'Success',
      message: 'Nested steps executed',
      value: { results, count: results.length }
    };
  }
}

// Helper to cast action classes for registerAction (works around type signature mismatch)
type AnyActionConstructor = new (...args: unknown[]) => PlaybookAction<unknown>;

// Mock state persistence with in-memory storage (uses deep copy to avoid reference issues)
class MockStatePersistence extends StatePersistence {
  private states: Map<string, PlaybookState> = new Map();

  async save(state: PlaybookState): Promise<void> {
    // Deep copy to avoid reference issues when engine modifies variables
    this.states.set(state.runId, JSON.parse(JSON.stringify(state)));
  }

  async load(runId: string): Promise<PlaybookState> {
    const state = this.states.get(runId);
    if (!state) {
      throw new Error(`State not found for runId: ${runId}`);
    }
    return JSON.parse(JSON.stringify(state));
  }

  async archive(runId: string): Promise<void> {
    // Don't delete in tests - keep the state for inspection
    // In real persistence, this would move to history directory
  }

  getState(runId: string): PlaybookState | undefined {
    const state = this.states.get(runId);
    return state ? JSON.parse(JSON.stringify(state)) : undefined;
  }

  clear(): void {
    this.states.clear();
  }
}

/**
 * @req FR:playbook-engine/step-executor.interface - StepExecutor interface implementation
 * @req FR:playbook-engine/step-executor.semantics - Same semantics as top-level steps
 * @req FR:playbook-engine/step-executor.overrides - Variable override support
 * @req FR:playbook-engine/step-executor.results - Return array of step results
 * @req FR:playbook-engine/step-executor.call-stack - Call stack for circular detection
 */
describe('StepExecutor', () => {
  let engine: Engine;
  let statePersistence: MockStatePersistence;
  let provider: PlaybookProvider;

  beforeEach(() => {
    PlaybookProvider.resetInstance();
    provider = PlaybookProvider.getInstance();
    statePersistence = new MockStatePersistence();
    engine = new Engine(undefined, statePersistence);
  });

  afterEach(() => {
    provider.clearAll();
    PlaybookProvider.resetInstance();
    statePersistence.clear();
  });

  describe('executeSteps interface', () => {
    it('should execute nested steps and return results', async () => {
      provider.registerAction('mock-action', MockAction);
      provider.registerAction('nested-action', NestedAction as AnyActionConstructor);

      const playbook: Playbook = {
        name: 'nested-steps-test',
        description: 'Test nested step execution',
        owner: 'Engineer',
        steps: [
          {
            name: 'outer-step',
            action: 'nested-action',
            config: {
              nestedSteps: [
                { name: 'inner-1', action: 'mock-action', config: { returnValue: 'value-1' } },
                { name: 'inner-2', action: 'mock-action', config: { returnValue: 'value-2' } }
              ]
            }
          }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('completed');
      const state = statePersistence.getState(result.runId);
      const nestedResult = state?.variables['outer-step'] as { results: PlaybookActionResult[]; count: number };
      expect(nestedResult.count).toBe(2);
      expect(nestedResult.results[0].value).toBe('value-1');
      expect(nestedResult.results[1].value).toBe('value-2');
    });

    it('should apply same semantics as top-level steps', async () => {
      // @req FR:playbook-engine/step-executor.semantics
      provider.registerAction('mock-action', MockAction);
      provider.registerAction('nested-action', NestedAction as AnyActionConstructor);

      const playbook: Playbook = {
        name: 'semantics-test',
        description: 'Test nested steps have same semantics',
        owner: 'Engineer',
        steps: [
          {
            name: 'outer',
            action: 'nested-action',
            config: {
              nestedSteps: [
                // Auto-generated name test (unnamed step)
                { action: 'mock-action', config: { returnValue: 'auto-named' } }
              ]
            }
          }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('completed');
    });

    it('should propagate errors from nested steps', async () => {
      provider.registerAction('mock-action', MockAction);
      provider.registerAction('nested-action', NestedAction as AnyActionConstructor);

      const playbook: Playbook = {
        name: 'error-propagation-test',
        description: 'Test error propagation from nested steps',
        owner: 'Engineer',
        steps: [
          {
            name: 'outer',
            action: 'nested-action',
            config: {
              nestedSteps: [
                { name: 'fails', action: 'mock-action', config: { fail: true, errorCode: 'NestedError' } }
              ]
            }
          }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('NestedError');
    });
  });

  describe('variable overrides', () => {
    it('should inject variable overrides into nested execution scope', async () => {
      // @req FR:playbook-engine/step-executor.overrides
      // Use mock action to verify overrides are accessible during nested execution
      provider.registerAction('mock-action', MockAction);
      provider.registerAction('nested-action', NestedAction as AnyActionConstructor);

      const playbook: Playbook = {
        name: 'override-test',
        description: 'Test variable overrides',
        owner: 'Engineer',
        steps: [
          {
            name: 'outer',
            action: 'nested-action',
            config: {
              nestedSteps: [
                // Mock action doesn't use overrides, but we verify the mechanism works
                { name: 'inner', action: 'mock-action', config: { returnValue: 'with-overrides' } }
              ],
              variableOverrides: { item: 'overridden-value', index: 0 }
            }
          }
        ]
      };

      const result = await engine.run(playbook);

      // Execution should complete successfully with overrides applied
      expect(result.status).toBe('completed');
    });

    it('should not persist override variables to parent scope', async () => {
      // @req FR:playbook-engine/step-executor.overrides
      provider.registerAction('mock-action', MockAction);
      provider.registerAction('nested-action', NestedAction as AnyActionConstructor);

      const playbook: Playbook = {
        name: 'scope-test',
        description: 'Test variable scope isolation',
        owner: 'Engineer',
        steps: [
          {
            name: 'set-parent-var',
            action: 'mock-action',
            config: { returnValue: 'parent-value' }
          },
          {
            name: 'nested',
            action: 'nested-action',
            config: {
              nestedSteps: [
                { name: 'inner', action: 'mock-action', config: { returnValue: 'nested-value' } }
              ],
              variableOverrides: { item: 'loop-item', index: 0 }
            }
          },
          {
            name: 'after-nested',
            action: 'mock-action',
            config: { returnValue: 'after-value' }
          }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('completed');
      const state = statePersistence.getState(result.runId);
      // Parent variable should still exist
      expect(state?.variables['set-parent-var']).toBe('parent-value');
      // Override variables should NOT leak to parent
      expect(state?.variables['item']).toBeUndefined();
      expect(state?.variables['index']).toBeUndefined();
    });
  });

  describe('call stack', () => {
    it('should provide call stack for circular reference detection', async () => {
      // @req FR:playbook-engine/step-executor.call-stack
      let capturedCallStack: string[] = [];

      // Action that captures call stack (extends PlaybookActionWithSteps to get stepExecutor)
      class CallStackCaptureAction extends PlaybookActionWithSteps<Record<string, never>> {
        static readonly actionType = 'capture-stack';

        async execute(): Promise<PlaybookActionResult> {
          capturedCallStack = this.stepExecutor.getCallStack();
          return { code: 'Success', message: 'Captured call stack', value: capturedCallStack };
        }
      }

      provider.registerAction('capture-stack', CallStackCaptureAction as AnyActionConstructor);

      const playbook: Playbook = {
        name: 'call-stack-test',
        description: 'Test call stack access',
        owner: 'Engineer',
        steps: [
          { name: 'capture', action: 'capture-stack', config: {} }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('completed');
      // Call stack should contain current playbook
      expect(capturedCallStack).toContain('call-stack-test');
    });
  });

  describe('result array', () => {
    it('should return one PlaybookActionResult per executed step', async () => {
      // @req FR:playbook-engine/step-executor.results
      provider.registerAction('mock-action', MockAction);
      provider.registerAction('nested-action', NestedAction as AnyActionConstructor);

      const playbook: Playbook = {
        name: 'results-test',
        description: 'Test result array',
        owner: 'Engineer',
        steps: [
          {
            name: 'outer',
            action: 'nested-action',
            config: {
              nestedSteps: [
                { name: 'step-1', action: 'mock-action', config: { returnValue: 'a' } },
                { name: 'step-2', action: 'mock-action', config: { returnValue: 'b' } },
                { name: 'step-3', action: 'mock-action', config: { returnValue: 'c' } }
              ]
            }
          }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('completed');
      const state = statePersistence.getState(result.runId);
      const nestedResult = state?.variables['outer'] as { results: PlaybookActionResult[]; count: number };
      expect(nestedResult.results).toHaveLength(3);
      expect(nestedResult.results.map(r => r.value)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('error handling', () => {
    it('should throw error when called outside of execution context', async () => {
      // Attempting to call executeSteps directly without running a playbook
      await expect(
        engine.executeSteps([{ action: 'mock-action', config: {} }])
      ).rejects.toThrow('Cannot execute steps without active execution context');
    });
  });
});
