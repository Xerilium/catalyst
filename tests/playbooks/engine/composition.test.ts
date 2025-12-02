import { describe, it, expect, beforeEach } from '@jest/globals';
import type {
  Playbook,
  PlaybookAction,
  PlaybookActionResult,
  PlaybookState
} from '../../../src/playbooks/scripts/playbooks/types';
import { Engine } from '../../../src/playbooks/scripts/engine/engine';
import { ActionRegistry } from '../../../src/playbooks/scripts/engine/action-registry';
import { PlaybookRegistry } from '../../../src/playbooks/scripts/engine/playbook-registry';
import { TemplateEngine } from '../../../src/playbooks/scripts/playbooks/template/engine';
import { StatePersistence } from '../../../src/playbooks/scripts/playbooks/persistence/state-persistence';
import { CatalystError } from '../../../src/playbooks/scripts/errors';

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

  clear(): void {
    this.states.clear();
  }
}

describe('Composition', () => {
  let engine: Engine;
  let actionRegistry: ActionRegistry;
  let playbookRegistry: PlaybookRegistry;
  let templateEngine: MockTemplateEngine;
  let statePersistence: MockStatePersistence;

  beforeEach(() => {
    actionRegistry = new ActionRegistry();
    playbookRegistry = new PlaybookRegistry();
    templateEngine = new MockTemplateEngine();
    statePersistence = new MockStatePersistence();
    engine = new Engine(templateEngine, statePersistence, actionRegistry, undefined, playbookRegistry);
  });

  describe('child playbook invocation', () => {
    it('should invoke child playbook and return outputs', async () => {
      // Register mock action
      actionRegistry.register('mock-action', new MockAction('child-result'));

      // Define child playbook
      const childPlaybook: Playbook = {
        name: 'child-playbook',
        description: 'Child playbook',
        owner: 'Engineer',
        outputs: {
          'result': 'string'
        },
        steps: [
          { name: 'result', action: 'mock-action', config: {} }
        ]
      };

      // Register child playbook
      engine.registerPlaybook('child-playbook', childPlaybook);

      // Define parent playbook
      const parentPlaybook: Playbook = {
        name: 'parent-playbook',
        description: 'Parent playbook',
        owner: 'Engineer',
        outputs: {
          'child-data': 'object'
        },
        steps: [
          {
            name: 'child-data',
            action: 'playbook',
            config: {
              name: 'child-playbook',
              inputs: {}
            }
          }
        ]
      };

      const result = await engine.run(parentPlaybook);

      expect(result.status).toBe('completed');
      expect(result.outputs['child-data']).toEqual({ 'result': 'child-result' });
    });

    it('should map inputs from parent to child', async () => {
      actionRegistry.register('mock-action', new MockAction('from-child'));

      // Define child playbook that takes inputs
      const childPlaybook: Playbook = {
        name: 'child-with-inputs',
        description: 'Child that takes inputs',
        owner: 'Engineer',
        inputs: [
          { name: 'message', type: 'string', required: true }
        ],
        outputs: {
          'result': 'string'
        },
        steps: [
          {
            name: 'result',
            action: 'mock-action',
            config: {}
          }
        ]
      };

      engine.registerPlaybook('child-with-inputs', childPlaybook);

      // Parent playbook passes inputs to child
      const parentPlaybook: Playbook = {
        name: 'parent-with-child-inputs',
        description: 'Parent passes inputs to child',
        owner: 'Engineer',
        outputs: {
          'child-output': 'object'
        },
        steps: [
          {
            name: 'child-output',
            action: 'playbook',
            config: {
              name: 'child-with-inputs',
              inputs: {
                message: 'hello from parent'
              }
            }
          }
        ]
      };

      const result = await engine.run(parentPlaybook);

      expect(result.status).toBe('completed');
      // Child received the input and returned its output
      expect(result.outputs['child-output']).toEqual({
        'result': 'from-child'
      });
    });

    it('should propagate child failures to parent', async () => {
      // Create failing action
      class FailingAction implements PlaybookAction<unknown> {
        async execute(config: unknown): Promise<PlaybookActionResult> {
          return {
            code: 'ChildError',
            message: 'Child action failed',
            error: new CatalystError('Child failed', 'ChildError', 'Fix the child')
          };
        }
      }

      actionRegistry.register('failing-action', new FailingAction());

      // Define failing child playbook
      const childPlaybook: Playbook = {
        name: 'failing-child',
        description: 'Child that fails',
        owner: 'Engineer',
        steps: [
          { action: 'failing-action', config: {} }
        ]
      };

      engine.registerPlaybook('failing-child', childPlaybook);

      // Parent invokes failing child
      const parentPlaybook: Playbook = {
        name: 'parent-with-failing-child',
        description: 'Parent with failing child',
        owner: 'Engineer',
        steps: [
          {
            action: 'playbook',
            config: {
              name: 'failing-child',
              inputs: {}
            }
          }
        ]
      };

      const result = await engine.run(parentPlaybook);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('ChildError');
    });
  });

  describe('circular reference detection', () => {
    it('should detect and prevent circular references', async () => {
      actionRegistry.register('mock-action', new MockAction());

      // Create playbook-a that calls playbook-b
      const playbookA: Playbook = {
        name: 'playbook-a',
        description: 'Playbook A',
        owner: 'Engineer',
        steps: [
          {
            action: 'playbook',
            config: {
              name: 'playbook-b',
              inputs: {}
            }
          }
        ]
      };

      // Create playbook-b that calls playbook-a (circular!)
      const playbookB: Playbook = {
        name: 'playbook-b',
        description: 'Playbook B',
        owner: 'Engineer',
        steps: [
          {
            action: 'playbook',
            config: {
              name: 'playbook-a',
              inputs: {}
            }
          }
        ]
      };

      engine.registerPlaybook('playbook-a', playbookA);
      engine.registerPlaybook('playbook-b', playbookB);

      const result = await engine.run(playbookA);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('CircularReferenceDetected');
      expect(result.error?.message).toContain('playbook-a');
      expect(result.error?.message).toContain('playbook-b');
    });

    it('should detect self-referencing playbook', async () => {
      actionRegistry.register('mock-action', new MockAction());

      // Create playbook that calls itself
      const selfReferencing: Playbook = {
        name: 'self-referencing',
        description: 'Calls itself',
        owner: 'Engineer',
        steps: [
          {
            action: 'playbook',
            config: {
              name: 'self-referencing',
              inputs: {}
            }
          }
        ]
      };

      engine.registerPlaybook('self-referencing', selfReferencing);

      const result = await engine.run(selfReferencing);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('CircularReferenceDetected');
    });
  });

  describe('recursion depth limit', () => {
    it('should enforce default recursion depth limit of 10', async () => {
      actionRegistry.register('mock-action', new MockAction());

      // Create a chain of 11 playbooks (0-10)
      for (let i = 0; i <= 11; i++) {
        const playbook: Playbook = {
          name: `level-${i}`,
          description: `Level ${i}`,
          owner: 'Engineer',
          steps: i < 11 ? [
            {
              action: 'playbook',
              config: {
                name: `level-${i + 1}`,
                inputs: {}
              }
            }
          ] : [
            { action: 'mock-action', config: {} }
          ]
        };
        engine.registerPlaybook(`level-${i}`, playbook);
      }

      const result = await engine.run(engine['playbookRegistry'].get('level-0')!);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('MaxRecursionDepthExceeded');
      expect(result.error?.message).toContain('10');
    });

    it('should respect custom maxRecursionDepth option', async () => {
      actionRegistry.register('mock-action', new MockAction('leaf'));

      // Create a chain of 3 playbooks
      for (let i = 0; i < 4; i++) {
        const playbook: Playbook = {
          name: `depth-${i}`,
          description: `Depth ${i}`,
          owner: 'Engineer',
          steps: i < 3 ? [
            {
              action: 'playbook',
              config: {
                name: `depth-${i + 1}`,
                inputs: {}
              }
            }
          ] : [
            { action: 'mock-action', config: {} }
          ]
        };
        engine.registerPlaybook(`depth-${i}`, playbook);
      }

      // Set maxRecursionDepth to 2 (should fail)
      const result = await engine.run(
        engine['playbookRegistry'].get('depth-0')!,
        {},
        { maxRecursionDepth: 2 }
      );

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('MaxRecursionDepthExceeded');
    });
  });

  describe('execution context isolation', () => {
    it('should isolate child execution context from parent', async () => {
      // Create action that reads from variables
      class ReadVariableAction implements PlaybookAction<unknown> {
        async execute(config: unknown): Promise<PlaybookActionResult> {
          const configObj = config as Record<string, unknown>;
          return {
            code: 'Success',
            message: 'Read variable',
            value: configObj.value
          };
        }
      }

      actionRegistry.register('read-var', new ReadVariableAction());
      actionRegistry.register('mock-action', new MockAction('child-value'));

      // Child playbook should not see parent variables
      const childPlaybook: Playbook = {
        name: 'isolated-child',
        description: 'Isolated child',
        owner: 'Engineer',
        outputs: {
          'result': 'string'
        },
        steps: [
          { name: 'result', action: 'mock-action', config: {} }
        ]
      };

      engine.registerPlaybook('isolated-child', childPlaybook);

      // Parent sets a variable, then calls child
      const parentPlaybook: Playbook = {
        name: 'parent-with-variable',
        description: 'Parent with variable',
        owner: 'Engineer',
        steps: [
          {
            name: 'parent-var',
            action: 'read-var',
            config: { value: 'parent-value' }
          },
          {
            name: 'child-result',
            action: 'playbook',
            config: {
              name: 'isolated-child',
              inputs: {}
            }
          }
        ]
      };

      const result = await engine.run(parentPlaybook);

      expect(result.status).toBe('completed');
      // Child should return its own result, not parent's variable
      expect(result.outputs).not.toHaveProperty('parent-var');
    });
  });

  describe('playbook not found', () => {
    it('should fail when child playbook not registered', async () => {
      const parentPlaybook: Playbook = {
        name: 'parent-missing-child',
        description: 'Parent calls unregistered child',
        owner: 'Engineer',
        steps: [
          {
            action: 'playbook',
            config: {
              name: 'nonexistent-child',
              inputs: {}
            }
          }
        ]
      };

      const result = await engine.run(parentPlaybook);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('PlaybookNotFound');
      expect(result.error?.message).toContain('nonexistent-child');
    });
  });

  describe('invalid playbook config', () => {
    it('should fail when playbook config is not an object', async () => {
      const parentPlaybook: Playbook = {
        name: 'parent-invalid-config',
        description: 'Parent with invalid playbook config',
        owner: 'Engineer',
        steps: [
          {
            action: 'playbook',
            config: 'invalid-config' as any
          }
        ]
      };

      const result = await engine.run(parentPlaybook);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('InvalidPlaybookConfig');
    });

    it('should fail when playbook config missing name', async () => {
      const parentPlaybook: Playbook = {
        name: 'parent-no-name',
        description: 'Parent with playbook config missing name',
        owner: 'Engineer',
        steps: [
          {
            action: 'playbook',
            config: {
              inputs: {}
            } as any
          }
        ]
      };

      const result = await engine.run(parentPlaybook);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('InvalidPlaybookConfig');
    });
  });
});
