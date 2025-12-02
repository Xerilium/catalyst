import { describe, it, expect, beforeEach } from '@jest/globals';
import type {
  Playbook,
  PlaybookAction,
  PlaybookActionResult,
  PlaybookState
} from '../../../src/playbooks/scripts/playbooks/types';
import { Engine } from '../../../src/playbooks/scripts/engine/engine';
import { ActionRegistry } from '../../../src/playbooks/scripts/engine/action-registry';
import { TemplateEngine } from '../../../src/playbooks/scripts/playbooks/template/engine';
import { StatePersistence } from '../../../src/playbooks/scripts/playbooks/persistence/state-persistence';

// Mock action for testing
class MockAction implements PlaybookAction<unknown> {
  private readonly responseValue: unknown;

  constructor(responseValue: unknown = 'success') {
    this.responseValue = responseValue;
  }

  async execute(config: unknown): Promise<PlaybookActionResult> {
    return {
      code: 'Success',
      message: 'Mock action executed',
      value: this.responseValue
    };
  }
}

// Mock template engine
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

describe('Engine.resume', () => {
  let engine: Engine;
  let actionRegistry: ActionRegistry;
  let templateEngine: MockTemplateEngine;
  let statePersistence: MockStatePersistence;

  beforeEach(() => {
    actionRegistry = new ActionRegistry();
    templateEngine = new MockTemplateEngine();
    statePersistence = new MockStatePersistence();
    engine = new Engine(templateEngine, statePersistence, actionRegistry);
  });

  it('should resume from saved state', async () => {
    actionRegistry.register('step-one', new MockAction('value-1'));
    actionRegistry.register('step-two', new MockAction('value-2'));

    const playbook: Playbook = {
      name: 'test-playbook',
      description: 'Test playbook',
      owner: 'Engineer',
      steps: [
        { name: 'step-one', action: 'step-one', config: {} },
        { name: 'step-two', action: 'step-two', config: {} }
      ]
    };

    // Run playbook partially (we'll simulate stopping after step 1)
    const result1 = await engine.run(playbook);

    // Get the saved state
    const state = statePersistence.getState(result1.runId);
    expect(state).toBeDefined();
    expect(state?.completedSteps).toEqual(['step-one', 'step-two']);

    // Modify state to simulate stopping after step 1
    if (state) {
      state.completedSteps = ['step-one'];
      state.status = 'paused';
      await statePersistence.save(state);
    }

    // Resume execution
    const result2 = await engine.resume(result1.runId, playbook);

    expect(result2.status).toBe('completed');
    expect(result2.stepsExecuted).toBe(1); // Only step-two was executed
    expect(result2.runId).toBe(result1.runId);

    const finalState = statePersistence.getState(result1.runId);
    expect(finalState?.completedSteps).toEqual(['step-one', 'step-two']);
  });

  it('should skip completed steps on resume', async () => {
    actionRegistry.register('action', new MockAction());

    const playbook: Playbook = {
      name: 'test-playbook',
      description: 'Test playbook',
      owner: 'Engineer',
      steps: [
        { name: 'step-1', action: 'action', config: {} },
        { name: 'step-2', action: 'action', config: {} },
        { name: 'step-3', action: 'action', config: {} }
      ]
    };

    // Run and get state
    const result1 = await engine.run(playbook);
    const state = statePersistence.getState(result1.runId);

    // Modify state to simulate stopping after step 2
    if (state) {
      state.completedSteps = ['step-1', 'step-2'];
      state.status = 'paused';
      await statePersistence.save(state);
    }

    // Resume - should only execute step-3
    const result2 = await engine.resume(result1.runId, playbook);

    expect(result2.status).toBe('completed');
    expect(result2.stepsExecuted).toBe(1);
  });

  it('should fail if state not found', async () => {
    const playbook: Playbook = {
      name: 'test-playbook',
      description: 'Test playbook',
      owner: 'Engineer',
      steps: [
        { action: 'mock', config: {} }
      ]
    };

    const result = await engine.resume('nonexistent-run-id', playbook);

    expect(result.status).toBe('failed');
    expect(result.error?.code).toBe('ResumeFailed');
  });

  it('should fail if playbook name mismatch', async () => {
    actionRegistry.register('action', new MockAction());

    const playbook1: Playbook = {
      name: 'playbook-one',
      description: 'First playbook',
      owner: 'Engineer',
      steps: [
        { action: 'action', config: {} }
      ]
    };

    const playbook2: Playbook = {
      name: 'playbook-two',
      description: 'Second playbook',
      owner: 'Engineer',
      steps: [
        { action: 'action', config: {} }
      ]
    };

    // Run playbook1
    const result1 = await engine.run(playbook1);

    // Try to resume with playbook2
    const result2 = await engine.resume(result1.runId, playbook2);

    expect(result2.status).toBe('failed');
    expect(result2.error?.code).toBe('PlaybookIncompatible');
  });

  it('should validate state structure', async () => {
    const playbook: Playbook = {
      name: 'test-playbook',
      description: 'Test playbook',
      owner: 'Engineer',
      steps: [
        { action: 'action', config: {} }
      ]
    };

    // Create corrupted state
    const corruptedState: any = {
      runId: 'corrupted-run',
      // Missing required fields
    };
    await statePersistence.save(corruptedState);

    const result = await engine.resume('corrupted-run', playbook);

    expect(result.status).toBe('failed');
    expect(result.error?.code).toBe('StateCorrupted');
  });
});
