import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type {
  Playbook,
  PlaybookAction,
  PlaybookActionResult,
  PlaybookState
} from '../../../src/playbooks/scripts/playbooks/types';
import { PlaybookProvider } from '../../../src/playbooks/scripts/playbooks/registry/playbook-provider';
import { Engine } from '../../../src/playbooks/scripts/engine/engine';
import { TemplateEngine } from '../../../src/playbooks/scripts/playbooks/template/engine';
import { StatePersistence } from '../../../src/playbooks/scripts/playbooks/persistence/state-persistence';
import { CatalystError } from '../../../src/playbooks/scripts/errors';

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

    it('should auto-generate step names when not specified', async () => {
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
      expect(state?.variables['mock-action-1']).toBe('result');
      expect(state?.variables['mock-action-2']).toBe('result');
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
});
