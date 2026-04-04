import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type {
  Playbook,
  PlaybookAction,
  PlaybookActionResult,
  PlaybookState,
  PlaybookStep,
  StepExecutor
} from '@playbooks/types';
import { PlaybookActionWithSteps } from '@playbooks/types/action';
import { PlaybookProvider } from '@playbooks/registry/playbook-provider';
import { Engine } from '@playbooks/engine/engine';
import { TemplateEngine } from '@playbooks/template/engine';
import { StatePersistence } from '@playbooks/persistence/state-persistence';
import { CatalystError } from '@core/errors';

/**
 * Mock action configuration
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
 *
 * Returns config.returnValue or 'success' by default.
 * Set config.fail=true to return an error result.
 */
class MockAction implements PlaybookAction<MockActionConfig> {
  static readonly actionType = 'mock-action';

  async execute(config: MockActionConfig): Promise<PlaybookActionResult> {
    if (config?.fail) {
      return {
        code: config.errorCode || 'MockError',
        message: 'Mock action failed',
        error: new CatalystError('Mock action failed', config.errorCode || 'MockError', 'This is a test error')
      };
    }

    return {
      code: 'Success',
      message: 'Mock action executed',
      value: config?.returnValue ?? 'success'
    };
  }
}

// Mock template engine that returns input unchanged
class MockTemplateEngine extends TemplateEngine {
  async interpolate(template: string, context: Record<string, unknown>): Promise<string> {
    return template;
  }

  async interpolateObject(
    obj: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return obj;
  }
}

// Mock state persistence with in-memory storage
class MockStatePersistence extends StatePersistence {
  private states: Map<string, PlaybookState> = new Map();

  async save(state: PlaybookState): Promise<void> {
    this.states.set(state.runId, state);
  }

  async load(runId: string): Promise<PlaybookState> {
    const state = this.states.get(runId);
    if (!state) {
      throw new Error(`State not found for runId: ${runId}`);
    }
    return state;
  }

  async archive(runId: string): Promise<void> {
    // No-op for tests
  }

  getState(runId: string): PlaybookState | undefined {
    return this.states.get(runId);
  }

  clear(): void {
    this.states.clear();
  }
}

/**
 * @req FR:playbook-engine/execution - Test sequential step execution
 * @req FR:playbook-engine/state - Test state persistence
 * @req FR:playbook-engine/actions.instantiation - Test action instantiation
 * @req NFR:playbook-engine/testability.coverage - Achieve 90% code coverage
 */
describe('Engine', () => {
  let engine: Engine;
  let templateEngine: MockTemplateEngine;
  let statePersistence: MockStatePersistence;
  let provider: PlaybookProvider;

  beforeEach(() => {
    // Reset singleton and create fresh provider for each test
    PlaybookProvider.resetInstance();
    provider = PlaybookProvider.getInstance();

    templateEngine = new MockTemplateEngine();
    statePersistence = new MockStatePersistence();
    engine = new Engine(templateEngine, statePersistence);
  });

  afterEach(() => {
    // Clean up provider state
    provider.clearAll();
    PlaybookProvider.resetInstance();
  });

  describe('run', () => {
    it('should execute simple playbook with mock action', async () => {
      // Register mock action
      provider.registerAction('mock-action', MockAction);

      const playbook: Playbook = {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'Engineer',
        steps: [
          {
            action: 'mock-action',
            config: { returnValue: 'result-value' }
          }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('completed');
      expect(result.stepsExecuted).toBe(1);
      expect(result.runId).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should store step results in variables', async () => {
      provider.registerAction('mock-action', MockAction);

      const playbook: Playbook = {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'Engineer',
        steps: [
          {
            name: 'step-one',
            action: 'mock-action',
            config: { returnValue: 'result-value' }
          }
        ]
      };

      const result = await engine.run(playbook);

      // Check that state was persisted with step result
      const state = statePersistence.getState(result.runId);
      expect(state?.variables['step-one']).toBe('result-value');
    });

    // @req FR:playbook-engine/execution.result-storage
    it('should not store unnamed step results in variables', async () => {
      provider.registerAction('mock-action', MockAction);

      const playbook: Playbook = {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'Engineer',
        steps: [
          { action: 'mock-action', config: { returnValue: 'result' } },
          { action: 'mock-action', config: { returnValue: 'result' } }
        ]
      };

      const result = await engine.run(playbook);

      const state = statePersistence.getState(result.runId);
      // Unnamed steps should NOT be stored in variables
      expect(state?.variables['mock-action-1']).toBeUndefined();
      expect(state?.variables['mock-action-2']).toBeUndefined();
      // But they should still be tracked in completedSteps for resume
      expect(state?.completedSteps).toContain('mock-action-1');
      expect(state?.completedSteps).toContain('mock-action-2');
    });

    // @req FR:playbook-engine/execution.result-storage
    it('should store unnamed step results in variables when debug mode is enabled', async () => {
      provider.registerAction('mock-action', MockAction);

      const playbook: Playbook = {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'Engineer',
        steps: [
          { action: 'mock-action', config: { returnValue: 'result' } },
          { action: 'mock-action', config: { returnValue: 'result' } }
        ]
      };

      const result = await engine.run(playbook, {}, { debug: true });

      const state = statePersistence.getState(result.runId);
      // In debug mode, unnamed steps SHOULD be stored in variables
      expect(state?.variables['mock-action-1']).toBe('result');
      expect(state?.variables['mock-action-2']).toBe('result');
      // executionOptions should be persisted in state
      expect(state?.executionOptions).toEqual({ debug: true });
    });

    // @req FR:playbook-engine/state.persistence
    it('should persist executionOptions in state', async () => {
      provider.registerAction('mock-action', MockAction);

      const playbook: Playbook = {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'Engineer',
        steps: [
          { action: 'mock-action', name: 'step-one', config: { returnValue: 'result' } }
        ]
      };

      const options = { mode: 'normal' as const, autonomous: true, debug: false };
      const result = await engine.run(playbook, {}, options);

      const state = statePersistence.getState(result.runId);
      expect(state?.executionOptions).toEqual(options);
    });

    // @req FR:playbook-engine/state.persistence
    it('should persist executionOptions as undefined when no options provided', async () => {
      provider.registerAction('mock-action', MockAction);

      const playbook: Playbook = {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'Engineer',
        steps: [
          { action: 'mock-action', name: 'step-one', config: { returnValue: 'result' } }
        ]
      };

      const result = await engine.run(playbook);

      const state = statePersistence.getState(result.runId);
      // When no options passed, executionOptions should be empty default
      expect(state?.executionOptions).toBeDefined();
    });

    // @req FR:playbook-engine/state.persistence
    it('should not include old options property in state', async () => {
      provider.registerAction('mock-action', MockAction);

      const playbook: Playbook = {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'Engineer',
        steps: [
          { action: 'mock-action', name: 'step-one', config: { returnValue: 'result' } }
        ]
      };

      const result = await engine.run(playbook, {}, { autonomous: true });

      const state = statePersistence.getState(result.runId);
      // The old intersection type hack 'options' property should NOT exist
      expect((state as any).options).toBeUndefined();
      // executionOptions should be used instead
      expect(state?.executionOptions?.autonomous).toBe(true);
    });

    it('should persist state after each step', async () => {
      provider.registerAction('mock-action', MockAction);

      const playbook: Playbook = {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'Engineer',
        steps: [
          { name: 'step-one', action: 'mock-action', config: { returnValue: 'result' } },
          { name: 'step-two', action: 'mock-action', config: { returnValue: 'result' } }
        ]
      };

      const result = await engine.run(playbook);

      const state = statePersistence.getState(result.runId);
      expect(state?.completedSteps).toEqual(['step-one', 'step-two']);
      expect(state?.status).toBe('completed');
    });

    it('should validate inputs before execution', async () => {
      provider.registerAction('mock-action', MockAction);

      const playbook: Playbook = {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'Engineer',
        inputs: [
          { name: 'required-param', type: 'string', required: true }
        ],
        steps: [
          { action: 'mock-action', config: {} }
        ]
      };

      const result = await engine.run(playbook, {});

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('InputValidationFailed');
      expect(result.error?.message).toContain('required-param');
    });

    it('should fail with ActionNotFound for unknown action', async () => {
      const playbook: Playbook = {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'Engineer',
        steps: [
          { action: 'unknown-action', config: {} }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('ActionNotFound');
      expect(result.error?.message).toContain('unknown-action');
    });

    it('should fail when action execution fails', async () => {
      provider.registerAction('mock-action', MockAction);

      const playbook: Playbook = {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'Engineer',
        steps: [
          { action: 'mock-action', config: { fail: true } }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('MockError');
    });

    it('should validate playbook structure before execution', async () => {
      provider.registerAction('mock-action', MockAction);

      const invalidPlaybook = {
        // Missing required fields
        steps: []
      } as unknown as Playbook;

      const result = await engine.run(invalidPlaybook);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('PlaybookNotValid');
    });

    it('should execute multi-step workflow', async () => {
      provider.registerAction('mock-action', MockAction);

      const playbook: Playbook = {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'Engineer',
        steps: [
          { name: 'step-1', action: 'mock-action', config: { returnValue: 'value-1' } },
          { name: 'step-2', action: 'mock-action', config: { returnValue: 'value-2' } },
          { name: 'step-3', action: 'mock-action', config: { returnValue: 'value-3' } }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('completed');
      expect(result.stepsExecuted).toBe(3);

      const state = statePersistence.getState(result.runId);
      expect(state?.variables['step-1']).toBe('value-1');
      expect(state?.variables['step-2']).toBe('value-2');
      expect(state?.variables['step-3']).toBe('value-3');
    });

    it('should validate inputs with correct types', async () => {
      provider.registerAction('mock-action', MockAction);

      const playbook: Playbook = {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'Engineer',
        inputs: [
          { name: 'string-param', type: 'string', required: true },
          { name: 'number-param', type: 'number', required: true },
          { name: 'boolean-param', type: 'boolean', required: true }
        ],
        steps: [
          { action: 'mock-action', config: {} }
        ]
      };

      const result = await engine.run(playbook, {
        'string-param': 'hello',
        'number-param': 42,
        'boolean-param': true
      });

      expect(result.status).toBe('completed');
    });

    it('should validate outputs after execution', async () => {
      provider.registerAction('mock-action', MockAction);

      const playbook: Playbook = {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'Engineer',
        outputs: {
          'output-value': 'string'
        },
        steps: [
          { name: 'output-value', action: 'mock-action', config: { returnValue: 'result' } }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('completed');
      expect(result.outputs['output-value']).toBe('result');
    });

    it('should fail if declared output is missing', async () => {
      provider.registerAction('mock-action', MockAction);

      const playbook: Playbook = {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'Engineer',
        outputs: {
          'missing-output': 'string'
        },
        steps: [
          { action: 'mock-action', config: { returnValue: 'result' } }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('OutputValidationFailed');
    });

    it('should include inputs in variables', async () => {
      provider.registerAction('mock-action', MockAction);

      const playbook: Playbook = {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'Engineer',
        inputs: [
          { name: 'test-input', type: 'string', required: true }
        ],
        steps: [
          { action: 'mock-action', config: {} }
        ]
      };

      const result = await engine.run(playbook, {
        'test-input': 'input-value'
      });

      const state = statePersistence.getState(result.runId);
      expect(state?.variables['test-input']).toBe('input-value');
    });

    it('should generate unique run IDs', async () => {
      provider.registerAction('mock-action', MockAction);

      const playbook: Playbook = {
        name: 'test-playbook',
        description: 'Test playbook',
        owner: 'Engineer',
        steps: [
          { action: 'mock-action', config: {} }
        ]
      };

      const result1 = await engine.run(playbook);

      // Add small delay to ensure different milliseconds
      await new Promise(resolve => setTimeout(resolve, 5));

      const result2 = await engine.run(playbook);

      expect(result1.runId).not.toBe(result2.runId);
      expect(result1.runId).toMatch(/^\d{8}-\d{6}-\d{3}$/);
      expect(result2.runId).toMatch(/^\d{8}-\d{6}-\d{3}$/);
    });
  });

  describe('isolation', () => {
    /**
     * Mock action that sets a variable via nested steps
     * Uses isolated: false by default (like if action)
     */
    interface MockSharedScopeConfig {
      steps: PlaybookStep[];
    }

    class MockSharedScopeAction extends PlaybookActionWithSteps<MockSharedScopeConfig> {
      static readonly actionType = 'mock-shared-scope';
      readonly isolated = false;

      async execute(config: MockSharedScopeConfig): Promise<PlaybookActionResult> {
        await this.stepExecutor.executeSteps(config.steps);
        return { code: 'Success', message: 'Executed with shared scope' };
      }
    }

    /**
     * Mock action that sets a variable via nested steps
     * Uses isolated: true by default (like playbook action)
     */
    interface MockIsolatedScopeConfig {
      steps: PlaybookStep[];
    }

    class MockIsolatedScopeAction extends PlaybookActionWithSteps<MockIsolatedScopeConfig> {
      static readonly actionType = 'mock-isolated-scope';
      readonly isolated = true;

      async execute(config: MockIsolatedScopeConfig): Promise<PlaybookActionResult> {
        await this.stepExecutor.executeSteps(config.steps);
        return { code: 'Success', message: 'Executed with isolated scope' };
      }
    }

    /**
     * Mock action that sets a variable via nested steps with variable overrides
     * Used to test that overrides don't propagate regardless of isolation
     */
    interface MockWithOverridesConfig {
      steps: PlaybookStep[];
      overrideValue: string;
    }

    class MockWithOverridesAction extends PlaybookActionWithSteps<MockWithOverridesConfig> {
      static readonly actionType = 'mock-with-overrides';
      readonly isolated = false; // Shared scope, but overrides should still be scoped

      async execute(config: MockWithOverridesConfig): Promise<PlaybookActionResult> {
        await this.stepExecutor.executeSteps(config.steps, {
          'loop-var': config.overrideValue
        });
        return { code: 'Success', message: 'Executed with overrides' };
      }
    }

    beforeEach(() => {
      // Register test actions with their isolation metadata
      // Cast needed because PlaybookActionWithSteps has different constructor signature
      provider.registerAction('mock-shared-scope', MockSharedScopeAction as any, {
        actionType: 'mock-shared-scope',
        className: 'MockSharedScopeAction',
        isolated: false
      });
      provider.registerAction('mock-isolated-scope', MockIsolatedScopeAction as any, {
        actionType: 'mock-isolated-scope',
        className: 'MockIsolatedScopeAction',
        isolated: true
      });
      provider.registerAction('mock-with-overrides', MockWithOverridesAction as any, {
        actionType: 'mock-with-overrides',
        className: 'MockWithOverridesAction',
        isolated: false
      });
      provider.registerAction('mock-action', MockAction);
    });

    it('should propagate variables back with isolated: false (shared scope)', async () => {
      const playbook: Playbook = {
        name: 'test-isolation-shared',
        description: 'Test shared scope isolation',
        owner: 'Engineer',
        steps: [
          {
            name: 'shared-scope-step',
            action: 'mock-shared-scope',
            config: {
              steps: [
                {
                  name: 'inner-step',
                  action: 'mock-action',
                  config: { returnValue: 'inner-value' }
                }
              ]
            }
          },
          {
            name: 'outer-step',
            action: 'mock-action',
            config: { returnValue: 'outer-value' }
          }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('completed');

      // Check that inner-step variable propagated back to parent scope
      const state = statePersistence.getState(result.runId);
      expect(state?.variables['inner-step']).toBe('inner-value');
      expect(state?.variables['outer-step']).toBe('outer-value');
    });

    it('should NOT propagate variables back with isolated: true', async () => {
      const playbook: Playbook = {
        name: 'test-isolation-isolated',
        description: 'Test isolated scope',
        owner: 'Engineer',
        steps: [
          {
            name: 'isolated-scope-step',
            action: 'mock-isolated-scope',
            config: {
              steps: [
                {
                  name: 'inner-step',
                  action: 'mock-action',
                  config: { returnValue: 'inner-value' }
                }
              ]
            }
          },
          {
            name: 'outer-step',
            action: 'mock-action',
            config: { returnValue: 'outer-value' }
          }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('completed');

      // Check that inner-step variable did NOT propagate back
      const state = statePersistence.getState(result.runId);
      expect(state?.variables['inner-step']).toBeUndefined();
      expect(state?.variables['outer-step']).toBe('outer-value');
    });

    it('should respect step-level isolated override (isolated: true on shared-scope action)', async () => {
      const playbook: Playbook = {
        name: 'test-isolation-override-true',
        description: 'Test step-level isolation override',
        owner: 'Engineer',
        steps: [
          {
            name: 'shared-scope-step',
            action: 'mock-shared-scope',
            isolated: true, // Override action's default of false
            config: {
              steps: [
                {
                  name: 'inner-step',
                  action: 'mock-action',
                  config: { returnValue: 'inner-value' }
                }
              ]
            }
          },
          {
            name: 'outer-step',
            action: 'mock-action',
            config: { returnValue: 'outer-value' }
          }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('completed');

      // Check that inner-step variable did NOT propagate (override to isolated)
      const state = statePersistence.getState(result.runId);
      expect(state?.variables['inner-step']).toBeUndefined();
      expect(state?.variables['outer-step']).toBe('outer-value');
    });

    it('should respect step-level isolated override (isolated: false on isolated-scope action)', async () => {
      const playbook: Playbook = {
        name: 'test-isolation-override-false',
        description: 'Test step-level isolation override',
        owner: 'Engineer',
        steps: [
          {
            name: 'isolated-scope-step',
            action: 'mock-isolated-scope',
            isolated: false, // Override action's default of true
            config: {
              steps: [
                {
                  name: 'inner-step',
                  action: 'mock-action',
                  config: { returnValue: 'inner-value' }
                }
              ]
            }
          },
          {
            name: 'outer-step',
            action: 'mock-action',
            config: { returnValue: 'outer-value' }
          }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('completed');

      // Check that inner-step variable DID propagate (override to shared)
      const state = statePersistence.getState(result.runId);
      expect(state?.variables['inner-step']).toBe('inner-value');
      expect(state?.variables['outer-step']).toBe('outer-value');
    });

    it('should always scope variable overrides regardless of isolation setting', async () => {
      const playbook: Playbook = {
        name: 'test-override-scoping',
        description: 'Test variable override scoping',
        owner: 'Engineer',
        inputs: [
          { name: 'loop-var', type: 'string', required: false, default: 'original-value' }
        ],
        steps: [
          {
            name: 'with-overrides-step',
            action: 'mock-with-overrides',
            config: {
              overrideValue: 'override-value',
              steps: [
                {
                  name: 'inner-step',
                  action: 'mock-action',
                  config: { returnValue: 'inner-result' }
                }
              ]
            }
          },
          {
            name: 'check-step',
            action: 'mock-action',
            config: { returnValue: 'check-result' }
          }
        ]
      };

      const result = await engine.run(playbook, { 'loop-var': 'original-value' });

      expect(result.status).toBe('completed');

      // Check that loop-var was NOT modified by the override
      // (override was scoped even though action has isolated: false)
      const state = statePersistence.getState(result.runId);
      expect(state?.variables['loop-var']).toBe('original-value');

      // But inner-step should have propagated (isolated: false)
      expect(state?.variables['inner-step']).toBe('inner-result');
    });
  });

  /**
   * @req FR:playbook-engine/execution.log-capture
   * @req FR:playbook-definition/types.state.logs
   */
  describe('log capture', () => {
    it('should capture log action results in state logs', async () => {
      // Register a mock log-info action that returns a LogResult
      class MockLogInfoAction implements PlaybookAction<any> {
        static readonly actionType = 'log-info';
        async execute(config: any): Promise<PlaybookActionResult> {
          return {
            code: 'Success',
            message: 'Logged info message',
            value: {
              level: 'info',
              source: 'TestSource',
              action: 'test-action',
              message: config.message || 'Test log message',
            }
          };
        }
      }
      provider.registerAction('log-info', MockLogInfoAction);

      const playbook: Playbook = {
        name: 'test-log-capture',
        description: 'Test log capture',
        owner: 'test',
        steps: [
          { action: 'log-info', config: { message: 'Hello from logs' } },
        ]
      };

      const result = await engine.run(playbook);
      expect(result.status).toBe('completed');

      const state = statePersistence.getState(result.runId);
      expect(state).toBeDefined();
      expect(state!.logs).toBeDefined();
      expect(state!.logs!.length).toBe(1);
      expect(state!.logs![0].level).toBe('info');
      expect(state!.logs![0].source).toBe('TestSource');
      expect(state!.logs![0].action).toBe('test-action');
      expect(state!.logs![0].message).toBe('Hello from logs');
      expect(state!.logs![0].step).toBe('log-info-1');
      expect(state!.logs![0].timestamp).toBeDefined();
    });

    it('should not capture non-log action results in logs', async () => {
      provider.registerAction('mock-action', MockAction);

      const playbook: Playbook = {
        name: 'test-no-log-capture',
        description: 'Test non-log actions are not captured',
        owner: 'test',
        steps: [
          { action: 'mock-action', config: { returnValue: 'hello' } },
        ]
      };

      const result = await engine.run(playbook);
      expect(result.status).toBe('completed');

      const state = statePersistence.getState(result.runId);
      expect(state!.logs).toBeDefined();
      expect(state!.logs!.length).toBe(0);
    });

    // @req FR:playbook-engine/execution.result-storage
    // @req FR:playbook-engine/execution.log-capture
    it('should store unnamed log results only in logs, not in variables', async () => {
      class MockLogWarningAction implements PlaybookAction<any> {
        static readonly actionType = 'log-warning';
        async execute(config: any): Promise<PlaybookActionResult> {
          return {
            code: 'Success',
            message: 'Logged warning message',
            value: {
              level: 'warning',
              source: 'Playbook',
              action: 'validation',
              message: 'Something looks off',
              data: { field: 'email' }
            }
          };
        }
      }
      provider.registerAction('log-warning', MockLogWarningAction);

      const playbook: Playbook = {
        name: 'test-dual-storage',
        description: 'Test dual storage',
        owner: 'test',
        steps: [
          { action: 'log-warning', config: {} },
        ]
      };

      const result = await engine.run(playbook);
      const state = statePersistence.getState(result.runId);

      // Unnamed log step should NOT be in variables
      expect(state!.variables['log-warning-1']).toBeUndefined();

      // Should still be in logs
      expect(state!.logs!.length).toBe(1);
      expect(state!.logs![0].level).toBe('warning');
      expect(state!.logs![0].data).toEqual({ field: 'email' });
    });

    it('should capture log entries without data field when data is not provided', async () => {
      class MockLogDebugAction implements PlaybookAction<any> {
        static readonly actionType = 'log-debug';
        async execute(): Promise<PlaybookActionResult> {
          return {
            code: 'Success',
            message: 'Logged debug message',
            value: {
              level: 'debug',
              source: 'Engine',
              action: 'step',
              message: 'Debug info',
            }
          };
        }
      }
      provider.registerAction('log-debug', MockLogDebugAction);

      const playbook: Playbook = {
        name: 'test-no-data',
        description: 'Test log without data',
        owner: 'test',
        steps: [
          { action: 'log-debug', config: {} },
        ]
      };

      const result = await engine.run(playbook);
      const state = statePersistence.getState(result.runId);

      expect(state!.logs!.length).toBe(1);
      expect(state!.logs![0].data).toBeUndefined();
    });

    it('should initialize empty logs for resume of old state without logs field', async () => {
      provider.registerAction('mock-action', MockAction);

      const playbook: Playbook = {
        name: 'test-resume-no-logs',
        description: 'Test resume',
        owner: 'test',
        steps: [
          { action: 'mock-action', config: { returnValue: 'step1' }, name: 'step1' },
          { action: 'mock-action', config: { returnValue: 'step2' }, name: 'step2' },
        ]
      };

      // Simulate an old state without logs field
      const oldState: PlaybookState = {
        playbookName: 'test-resume-no-logs',
        runId: '20260322-120000-001',
        startTime: '2026-03-22T12:00:00Z',
        status: 'paused',
        inputs: {},
        variables: { 'step1': 'step1' },
        completedSteps: ['step1'],
        currentStepName: 'step2',
        // No logs field - simulating old state format
      };
      await statePersistence.save(oldState);

      const result = await engine.resume('20260322-120000-001', playbook);
      expect(result.status).toBe('completed');

      const state = statePersistence.getState(result.runId);
      expect(state!.logs).toBeDefined();
      expect(Array.isArray(state!.logs)).toBe(true);
    });
  });
});
