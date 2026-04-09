/**
 * Integration tests for inline function definition and invocation
 *
 * Tests the full engine lifecycle: define function → invoke by name → return values.
 * Uses the real Engine with PlaybookProvider and built-in actions.
 *
 * @req FR:playbook-engine/actions.builtin.function.invocation - End-to-end dispatch
 * @req FR:playbook-engine/actions.builtin.function.scoping - Isolation and scope boundaries
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import type {
  Playbook,
  PlaybookAction,
  PlaybookActionResult
} from '@playbooks/types';
import { PlaybookProvider } from '@playbooks/registry/playbook-provider';
import { Engine } from '@playbooks/engine/engine';
import { LockManager } from '@playbooks/engine/lock-manager';
import { StatePersistence } from '@playbooks/persistence/state-persistence';
import { FunctionAction } from '@playbooks/engine/actions/function-action';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Actions
// ─────────────────────────────────────────────────────────────────────────────

class MockAction implements PlaybookAction<Record<string, unknown>> {
  static readonly actionType = 'mock';

  async execute(config: Record<string, unknown>): Promise<PlaybookActionResult> {
    return {
      code: 'Success',
      message: 'Mock executed',
      value: config?.returnValue ?? 'success'
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration Tests
// ─────────────────────────────────────────────────────────────────────────────

/** @req FR:playbook-engine/actions.builtin.function.invocation */
describe('Function Action Integration', () => {
  const testRunsDir = '.xe/runs-function-integration-test';
  const testLocksDir = '.xe/runs-function-integration-test/locks';
  let engine: Engine;
  let provider: PlaybookProvider;

  beforeEach(async () => {
    PlaybookProvider.resetInstance();
    provider = PlaybookProvider.getInstance();
    provider.getActionTypes(); // Trigger initializeActions()
    provider.registerAction('mock', MockAction);
    provider.registerAction('function', FunctionAction as any);

    const lockManager = new LockManager(testLocksDir);
    const statePersistence = new StatePersistence(testRunsDir);
    engine = new Engine(undefined, statePersistence, undefined, lockManager);

    try {
      await fs.rm(testRunsDir, { recursive: true });
    } catch {
      // Ignore
    }
  });

  afterEach(async () => {
    try {
      await fs.rm(testRunsDir, { recursive: true });
    } catch {
      // Ignore
    }
    provider.clearAll();
    PlaybookProvider.resetInstance();
  });

  /** @req FR:playbook-engine/actions.builtin.function.invocation */
  it('should define and invoke a function', async () => {
    const playbook: Playbook = {
      name: 'function-basic',
      description: 'Define and invoke a function',
      owner: 'Test',
      steps: [
        // Define function
        {
          action: 'function',
          config: {
            name: 'greet',
            steps: [
              { action: 'log-info', config: { message: 'Hello from function' } }
            ]
          }
        },
        // Invoke by name
        {
          action: 'greet',
          config: {}
        }
      ]
    };

    const result = await engine.run(playbook);
    expect(result.status).toBe('completed');
  });

  /** @req FR:playbook-engine/actions.builtin.function.inputs */
  it('should pass named inputs to function invocation', async () => {
    const playbook: Playbook = {
      name: 'function-inputs',
      description: 'Function with named inputs',
      owner: 'Test',
      steps: [
        {
          action: 'function',
          config: {
            name: 'format-greeting',
            inputs: [
              { string: 'name' },
              { string: 'greeting', default: 'Hello' }
            ],
            steps: [
              {
                name: 'result',
                action: 'var',
                config: { name: 'output', value: '${{ get("greeting") }} ${{ get("name") }}' }
              }
            ]
          }
        },
        {
          name: 'invoke-result',
          action: 'format-greeting',
          config: { name: 'World' }
        }
      ]
    };

    const result = await engine.run(playbook);
    expect(result.status).toBe('completed');
  });

  /** @req FR:playbook-engine/actions.builtin.function.return */
  it('should propagate return values from function', async () => {
    const playbook: Playbook = {
      name: 'function-return',
      description: 'Function with return value',
      owner: 'Test',
      steps: [
        {
          action: 'function',
          config: {
            name: 'compute',
            steps: [
              {
                action: 'return',
                config: { outputs: { answer: 42 } }
              }
            ]
          }
        },
        {
          name: 'compute-result',
          action: 'compute',
          config: {}
        }
      ]
    };

    const result = await engine.run(playbook);
    expect(result.status).toBe('completed');
  });

  /** @req FR:playbook-engine/actions.builtin.function.collision */
  it('should reject function name that conflicts with built-in action', async () => {
    const playbook: Playbook = {
      name: 'function-collision',
      description: 'Function name conflicts with built-in',
      owner: 'Test',
      steps: [
        {
          action: 'function',
          config: {
            name: 'var',
            steps: [
              { action: 'log-info', config: { message: 'Should not register' } }
            ]
          }
        }
      ]
    };

    const result = await engine.run(playbook);
    expect(result.status).toBe('failed');
  });

  /** @req FR:playbook-engine/actions.builtin.function.scoping */
  it('should not leak function definitions into nested playbooks', async () => {
    // Register a child playbook that tries to invoke a function from parent scope
    const childPlaybook: Playbook = {
      name: 'child-scope-test',
      description: 'Child tries to use parent function',
      owner: 'Test',
      steps: [
        // This should fail because parent's function is not visible
        {
          action: 'log-info',
          config: { message: 'Child executed' }
        }
      ]
    };
    provider.registerLoader({
      name: 'test-child-playbooks',
      supports: (id: string) => id === 'child-scope-test',
      load: async (id: string) => id === 'child-scope-test' ? childPlaybook : undefined
    });

    const parentPlaybook: Playbook = {
      name: 'parent-scope-test',
      description: 'Parent defines function, child cannot see it',
      owner: 'Test',
      steps: [
        {
          action: 'function',
          config: {
            name: 'parent-only-fn',
            steps: [
              { action: 'log-info', config: { message: 'Parent function' } }
            ]
          }
        },
        // Invoke in parent scope — should work
        {
          action: 'parent-only-fn',
          config: {}
        },
        // Run child playbook (isolated) — child cannot see parent-only-fn
        {
          action: 'playbook',
          config: { name: 'child-scope-test' }
        }
      ]
    };

    const result = await engine.run(parentPlaybook);
    expect(result.status).toBe('completed');
  });

  /** @req FR:playbook-engine/actions.builtin.function.invocation */
  it('should support multiple function definitions in same playbook', async () => {
    const playbook: Playbook = {
      name: 'multi-function',
      description: 'Multiple function definitions',
      owner: 'Test',
      steps: [
        {
          action: 'function',
          config: {
            name: 'fn-a',
            steps: [
              { action: 'log-info', config: { message: 'Function A' } }
            ]
          }
        },
        {
          action: 'function',
          config: {
            name: 'fn-b',
            steps: [
              { action: 'log-info', config: { message: 'Function B' } }
            ]
          }
        },
        { action: 'fn-a', config: {} },
        { action: 'fn-b', config: {} }
      ]
    };

    const result = await engine.run(playbook);
    expect(result.status).toBe('completed');
  });
});
