import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import type {
  Playbook,
  PlaybookAction,
  PlaybookActionResult
} from '../../../src/playbooks/scripts/playbooks/types';
import { Engine } from '../../../src/playbooks/scripts/engine/engine';
import { ActionRegistry } from '../../../src/playbooks/scripts/engine/action-registry';
import { PlaybookRegistry } from '../../../src/playbooks/scripts/engine/playbook-registry';
import { LockManager } from '../../../src/playbooks/scripts/engine/lock-manager';
import { CatalystError } from '../../../src/playbooks/scripts/errors';

/**
 * Integration tests for the full playbook engine
 *
 * These tests validate end-to-end workflows including:
 * - Multi-step execution with variables
 * - Playbook composition (parent/child)
 * - Error handling and recovery
 * - Resource locking
 */
describe('Playbook Engine Integration', () => {
  const testLocksDir = '.xe/runs/locks-integration-test';
  let engine: Engine;
  let actionRegistry: ActionRegistry;
  let playbookRegistry: PlaybookRegistry;
  let lockManager: LockManager;

  beforeEach(async () => {
    actionRegistry = new ActionRegistry();
    playbookRegistry = new PlaybookRegistry();
    lockManager = new LockManager(testLocksDir);
    engine = new Engine(undefined, undefined, actionRegistry, undefined, playbookRegistry, lockManager);

    // Clean up test directory
    try {
      await fs.rm(testLocksDir, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testLocksDir, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  describe('end-to-end workflows', () => {
    it('should execute multi-step workflow with variable passing', async () => {
      // Create actions that simulate real operations
      class GetUserAction implements PlaybookAction<unknown> {
        async execute(config: any): Promise<PlaybookActionResult> {
          return {
            code: 'Success',
            message: 'User fetched',
            value: { id: 123, email: config.email }
          };
        }
      }

      class CreateProjectAction implements PlaybookAction<unknown> {
        async execute(config: any): Promise<PlaybookActionResult> {
          return {
            code: 'Success',
            message: 'Project created',
            value: { projectId: 'proj-456', owner: config.userId }
          };
        }
      }

      class SendNotificationAction implements PlaybookAction<unknown> {
        async execute(config: any): Promise<PlaybookActionResult> {
          return {
            code: 'Success',
            message: 'Notification sent',
            value: { notified: true, to: config.email }
          };
        }
      }

      actionRegistry.register('get-user', new GetUserAction());
      actionRegistry.register('create-project', new CreateProjectAction());
      actionRegistry.register('send-notification', new SendNotificationAction());

      const playbook: Playbook = {
        name: 'setup-user-project',
        description: 'Setup user project workflow',
        owner: 'Engineer',
        inputs: [
          { name: 'user-email', type: 'string', required: true }
        ],
        outputs: {
          'project': 'object',
          'notification': 'object'
        },
        steps: [
          {
            name: 'user',
            action: 'get-user',
            config: { email: '${user-email}' }
          },
          {
            name: 'project',
            action: 'create-project',
            config: { userId: '${user.id}' }
          },
          {
            name: 'notification',
            action: 'send-notification',
            config: {
              email: '${user.email}',
              message: 'Project ${project.projectId} created'
            }
          }
        ]
      };

      const result = await engine.run(playbook, { 'user-email': 'alice@example.com' });

      expect(result.status).toBe('completed');
      expect(result.stepsExecuted).toBe(3);
      expect(result.outputs['project']).toBeDefined();
      expect(result.outputs['notification']).toBeDefined();
    });

    it('should execute playbook composition workflow', async () => {
      // Define reusable child playbook for validation
      class ValidateAction implements PlaybookAction<unknown> {
        async execute(config: any): Promise<PlaybookActionResult> {
          const isValid = config.value && config.value.length > 0;
          return {
            code: isValid ? 'Success' : 'ValidationFailed',
            message: isValid ? 'Valid' : 'Invalid',
            value: isValid,
            error: isValid ? undefined : new CatalystError('Validation failed', 'ValidationFailed', 'Check input')
          };
        }
      }

      actionRegistry.register('validate', new ValidateAction());

      const validationPlaybook: Playbook = {
        name: 'validate-input',
        description: 'Validate input',
        owner: 'Engineer',
        inputs: [
          { name: 'value', type: 'string', required: true }
        ],
        outputs: {
          'is-valid': 'boolean'
        },
        steps: [
          {
            name: 'is-valid',
            action: 'validate',
            config: { value: '${value}' }
          }
        ]
      };

      engine.registerPlaybook('validate-input', validationPlaybook);

      // Define parent playbook that uses validation
      const parentPlaybook: Playbook = {
        name: 'process-with-validation',
        description: 'Process data with validation',
        owner: 'Engineer',
        inputs: [
          { name: 'data', type: 'string', required: true }
        ],
        outputs: {
          'validation-result': 'object'
        },
        steps: [
          {
            name: 'validation-result',
            action: 'playbook',
            config: {
              name: 'validate-input',
              inputs: {
                value: '${data}'
              }
            }
          }
        ]
      };

      const result = await engine.run(parentPlaybook, { data: 'test-data' });

      expect(result.status).toBe('completed');
      expect(result.outputs['validation-result']).toEqual({ 'is-valid': true });
    });

    it('should handle errors with catch blocks', async () => {
      class FailingAction implements PlaybookAction<unknown> {
        async execute(): Promise<PlaybookActionResult> {
          return {
            code: 'ServiceError',
            message: 'Service failed',
            error: new CatalystError('Service unavailable', 'ServiceError', 'Retry later')
          };
        }
      }

      class RecoveryAction implements PlaybookAction<unknown> {
        async execute(): Promise<PlaybookActionResult> {
          return {
            code: 'Success',
            message: 'Recovery successful',
            value: 'recovered'
          };
        }
      }

      actionRegistry.register('failing-action', new FailingAction());
      actionRegistry.register('recovery-action', new RecoveryAction());

      const playbook: Playbook = {
        name: 'workflow-with-recovery',
        description: 'Workflow with error recovery',
        owner: 'Engineer',
        steps: [
          {
            action: 'failing-action',
            config: {}
          }
        ],
        catch: [
          {
            code: 'ServiceError',
            steps: [
              {
                name: 'recovery',
                action: 'recovery-action',
                config: {}
              }
            ]
          }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('failed');
      // Catch block executed but main execution still failed
    });

    it('should enforce resource locking', async () => {
      class LongRunningAction implements PlaybookAction<unknown> {
        async execute(): Promise<PlaybookActionResult> {
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            code: 'Success',
            message: 'Completed',
            value: 'done'
          };
        }
      }

      actionRegistry.register('long-running', new LongRunningAction());

      const playbook1: Playbook = {
        name: 'locked-workflow-1',
        description: 'First workflow with lock',
        owner: 'Engineer',
        resources: {
          paths: ['src/api']
        },
        steps: [
          {
            action: 'long-running',
            config: {}
          }
        ]
      };

      const playbook2: Playbook = {
        name: 'locked-workflow-2',
        description: 'Second workflow with same lock',
        owner: 'Engineer',
        resources: {
          paths: ['src/api']
        },
        steps: [
          {
            action: 'long-running',
            config: {}
          }
        ]
      };

      // Start first playbook (will acquire lock)
      const promise1 = engine.run(playbook1, {}, { actor: 'user1@example.com' });

      // Give it time to acquire lock
      await new Promise(resolve => setTimeout(resolve, 10));

      // Try to start second playbook (should fail due to lock)
      const result2 = await engine.run(playbook2, {}, { actor: 'user2@example.com' });

      expect(result2.status).toBe('failed');
      expect(result2.error?.code).toBe('ResourceLocked');

      // Wait for first playbook to complete
      const result1 = await promise1;
      expect(result1.status).toBe('completed');

      // Now second playbook should succeed
      const result3 = await engine.run(playbook2, {}, { actor: 'user2@example.com' });
      expect(result3.status).toBe('completed');
    });

    it('should execute finally blocks always', async () => {
      const executionLog: string[] = [];

      class LogAction implements PlaybookAction<unknown> {
        constructor(private readonly message: string) {}

        async execute(): Promise<PlaybookActionResult> {
          executionLog.push(this.message);
          return {
            code: 'Success',
            message: this.message,
            value: this.message
          };
        }
      }

      class FailingAction implements PlaybookAction<unknown> {
        async execute(): Promise<PlaybookActionResult> {
          executionLog.push('main-failed');
          return {
            code: 'Error',
            message: 'Failed',
            error: new CatalystError('Failed', 'Error', 'Fix it')
          };
        }
      }

      actionRegistry.register('log-1', new LogAction('main-step'));
      actionRegistry.register('fail', new FailingAction());
      actionRegistry.register('log-2', new LogAction('finally-step'));

      const playbook: Playbook = {
        name: 'workflow-with-finally',
        description: 'Workflow with finally block',
        owner: 'Engineer',
        steps: [
          {
            action: 'log-1',
            config: {}
          },
          {
            action: 'fail',
            config: {}
          }
        ],
        finally: [
          {
            action: 'log-2',
            config: {}
          }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('failed');
      expect(executionLog).toContain('main-step');
      expect(executionLog).toContain('main-failed');
      expect(executionLog).toContain('finally-step');
    });

    it('should detect and prevent circular playbook references', async () => {
      class NoOpAction implements PlaybookAction<unknown> {
        async execute(): Promise<PlaybookActionResult> {
          return {
            code: 'Success',
            message: 'NoOp',
            value: null
          };
        }
      }

      actionRegistry.register('noop', new NoOpAction());

      const playbook1: Playbook = {
        name: 'circular-1',
        description: 'Playbook 1',
        owner: 'Engineer',
        steps: [
          {
            action: 'playbook',
            config: {
              name: 'circular-2',
              inputs: {}
            }
          }
        ]
      };

      const playbook2: Playbook = {
        name: 'circular-2',
        description: 'Playbook 2',
        owner: 'Engineer',
        steps: [
          {
            action: 'playbook',
            config: {
              name: 'circular-1',
              inputs: {}
            }
          }
        ]
      };

      engine.registerPlaybook('circular-1', playbook1);
      engine.registerPlaybook('circular-2', playbook2);

      const result = await engine.run(playbook1);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('CircularReferenceDetected');
      expect(result.error?.message).toContain('circular-1');
      expect(result.error?.message).toContain('circular-2');
    });
  });

  describe('error scenarios', () => {
    it('should provide clear error when action not found', async () => {
      const playbook: Playbook = {
        name: 'missing-action',
        description: 'Playbook with missing action',
        owner: 'Engineer',
        steps: [
          {
            action: 'nonexistent-action',
            config: {}
          }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('ActionNotFound');
      expect(result.error?.message).toContain('nonexistent-action');
    });

    it('should provide clear error when playbook not found', async () => {
      const playbook: Playbook = {
        name: 'missing-child',
        description: 'Playbook with missing child',
        owner: 'Engineer',
        steps: [
          {
            action: 'playbook',
            config: {
              name: 'nonexistent-playbook',
              inputs: {}
            }
          }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('PlaybookNotFound');
      expect(result.error?.message).toContain('nonexistent-playbook');
    });

    it('should provide clear error when input validation fails', async () => {
      class NoOpAction implements PlaybookAction<unknown> {
        async execute(): Promise<PlaybookActionResult> {
          return {
            code: 'Success',
            message: 'NoOp',
            value: null
          };
        }
      }

      actionRegistry.register('noop', new NoOpAction());

      const playbook: Playbook = {
        name: 'invalid-input',
        description: 'Playbook with invalid input',
        owner: 'Engineer',
        inputs: [
          { name: 'required-field', type: 'string', required: true }
        ],
        steps: [
          {
            action: 'noop',
            config: {}
          }
        ]
      };

      const result = await engine.run(playbook, {});

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('InputValidationFailed');
      expect(result.error?.message).toContain('required-field');
    });
  });
});
