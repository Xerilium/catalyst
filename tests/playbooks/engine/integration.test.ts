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
import { CatalystError } from '@core/errors';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Actions for Integration Tests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic mock action that returns config values
 *
 * Config options:
 * - returnValue: value to return (default: 'success')
 * - fail: if true, return error result
 * - errorCode: error code when failing (default: 'MockError')
 * - delay: optional delay in ms before returning
 */
interface MockConfig {
  returnValue?: unknown;
  fail?: boolean;
  errorCode?: string;
  delay?: number;
}

class MockAction implements PlaybookAction<MockConfig> {
  static readonly actionType = 'mock';

  async execute(config: MockConfig): Promise<PlaybookActionResult> {
    if (config?.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

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
 * User fetch action - simulates fetching user data
 */
interface GetUserConfig {
  email: string;
}

class GetUserAction implements PlaybookAction<GetUserConfig> {
  static readonly actionType = 'get-user';

  async execute(config: GetUserConfig): Promise<PlaybookActionResult> {
    return {
      code: 'Success',
      message: 'User fetched',
      value: { id: 123, email: config.email }
    };
  }
}

/**
 * Project creation action - simulates creating a project
 */
interface CreateProjectConfig {
  userId: string | number;
}

class CreateProjectAction implements PlaybookAction<CreateProjectConfig> {
  static readonly actionType = 'create-project';

  async execute(config: CreateProjectConfig): Promise<PlaybookActionResult> {
    return {
      code: 'Success',
      message: 'Project created',
      value: { projectId: 'proj-456', owner: config.userId }
    };
  }
}

/**
 * Notification action - simulates sending notifications
 */
interface SendNotificationConfig {
  email: string;
  message?: string;
}

class SendNotificationAction implements PlaybookAction<SendNotificationConfig> {
  static readonly actionType = 'send-notification';

  async execute(config: SendNotificationConfig): Promise<PlaybookActionResult> {
    return {
      code: 'Success',
      message: 'Notification sent',
      value: { notified: true, to: config.email }
    };
  }
}

/**
 * Validation action - validates input value
 */
interface ValidateConfig {
  value: string;
}

class ValidateAction implements PlaybookAction<ValidateConfig> {
  static readonly actionType = 'validate';

  async execute(config: ValidateConfig): Promise<PlaybookActionResult> {
    const isValid = config.value && config.value.length > 0;
    return {
      code: isValid ? 'Success' : 'ValidationFailed',
      message: isValid ? 'Valid' : 'Invalid',
      value: isValid,
      error: isValid ? undefined : new CatalystError('Validation failed', 'ValidationFailed', 'Check input')
    };
  }
}

/**
 * No-op action - does nothing, returns null
 */
class NoOpAction implements PlaybookAction<unknown> {
  static readonly actionType = 'noop';

  async execute(): Promise<PlaybookActionResult> {
    return {
      code: 'Success',
      message: 'NoOp',
      value: null
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration Tests
// ─────────────────────────────────────────────────────────────────────────────

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
  const testRunsDir = '.xe/runs-integration-test';
  const testLocksDir = '.xe/runs-integration-test/locks';
  let engine: Engine;
  let provider: PlaybookProvider;
  let lockManager: LockManager;
  let statePersistence: StatePersistence;

  beforeEach(async () => {
    // Reset singleton and create fresh provider for each test
    PlaybookProvider.resetInstance();
    provider = PlaybookProvider.getInstance();

    // Initialize actions from generated catalog first (includes 'playbook' action)
    // This is needed because registerAction won't trigger initializeActions
    provider.getActionTypes(); // This triggers initializeActions()

    // Register test-specific actions (these override or add to the catalog)
    provider.registerAction('mock', MockAction);
    provider.registerAction('get-user', GetUserAction);
    provider.registerAction('create-project', CreateProjectAction);
    provider.registerAction('send-notification', SendNotificationAction);
    provider.registerAction('validate', ValidateAction);
    provider.registerAction('noop', NoOpAction);

    lockManager = new LockManager(testLocksDir);
    statePersistence = new StatePersistence(testRunsDir);
    engine = new Engine(undefined, statePersistence, undefined, lockManager);

    // Clean up test directories
    try {
      await fs.rm(testRunsDir, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test directories first
    try {
      await fs.rm(testRunsDir, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }

    // Clean up provider state
    provider.clearAll();
    PlaybookProvider.resetInstance();
  });

  describe('end-to-end workflows', () => {
    it('should execute multi-step workflow with variable passing', async () => {
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

      // Register child playbook
      provider.registerLoader({
        name: 'test-playbooks',
        supports: (id: string) => id === 'validate-input',
        load: async (id: string) => id === 'validate-input' ? validationPlaybook : undefined
      });

      // Define parent playbook that uses validation
      const parentPlaybook: Playbook = {
        name: 'process-with-validation',
        description: 'Process data with validation',
        owner: 'Engineer',
        inputs: [
          { name: 'data', type: 'string', required: true }
        ],
        outputs: {
          'validation-result': 'boolean'  // The playbook action returns the last step's value (boolean)
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
      // Note: The playbook action returns the last step's value, not the full outputs object
      // This is the value from the 'validate' action which returns boolean
      expect(result.outputs['validation-result']).toBe(true);
    });

    it('should handle errors with catch blocks', async () => {
      const playbook: Playbook = {
        name: 'workflow-with-recovery',
        description: 'Workflow with error recovery',
        owner: 'Engineer',
        steps: [
          {
            action: 'mock',
            config: { fail: true, errorCode: 'ServiceError' }
          }
        ],
        catch: [
          {
            code: 'ServiceError',
            steps: [
              {
                name: 'recovery',
                action: 'mock',
                config: { returnValue: 'recovered' }
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
      const playbook1: Playbook = {
        name: 'locked-workflow-1',
        description: 'First workflow with lock',
        owner: 'Engineer',
        resources: {
          paths: ['src/api']
        },
        steps: [
          {
            action: 'mock',
            config: { returnValue: 'done', delay: 100 }
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
            action: 'mock',
            config: { returnValue: 'done', delay: 100 }
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
      // Use var action to log execution
      const playbook: Playbook = {
        name: 'workflow-with-finally',
        description: 'Workflow with finally block',
        owner: 'Engineer',
        steps: [
          {
            name: 'main-step',
            action: 'mock',
            config: { returnValue: 'main-executed' }
          },
          {
            action: 'mock',
            config: { fail: true, errorCode: 'Error' }
          }
        ],
        finally: [
          {
            name: 'finally-step',
            action: 'mock',
            config: { returnValue: 'finally-executed' }
          }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('failed');
      // Finally block should have executed
    });

    it('should detect and prevent circular playbook references', async () => {
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

      // Register circular playbooks
      provider.registerLoader({
        name: 'circular-playbooks',
        supports: (id: string) => id === 'circular-1' || id === 'circular-2',
        load: async (id: string) => {
          if (id === 'circular-1') return playbook1;
          if (id === 'circular-2') return playbook2;
          return undefined;
        }
      });

      const result = await engine.run(playbook1);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('CircularPlaybookReference');
      expect(result.error?.message).toContain('circular-1');
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
