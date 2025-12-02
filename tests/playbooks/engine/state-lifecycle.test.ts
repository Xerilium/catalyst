import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  Playbook,
  PlaybookAction,
  PlaybookActionResult
} from '../../../src/playbooks/scripts/playbooks/types';
import { Engine } from '../../../src/playbooks/scripts/engine/engine';
import { ActionRegistry } from '../../../src/playbooks/scripts/engine/action-registry';
import { StatePersistence } from '../../../src/playbooks/scripts/playbooks/persistence/state-persistence';
import { CatalystError } from '../../../src/playbooks/scripts/errors';

/**
 * Tests for playbook run state lifecycle management
 *
 * Validates the new architectural decision:
 * - Failed runs remain in .xe/runs/ for retry
 * - Completed runs archived automatically
 * - abandon() method archives specific runs
 * - cleanupStaleRuns() archives old failed/paused runs
 */
describe('State Lifecycle', () => {
  const testRunsDir = '.xe/runs-lifecycle-test';
  const testHistoryDir = path.join(testRunsDir, 'history');
  let engine: Engine;
  let actionRegistry: ActionRegistry;
  let statePersistence: StatePersistence;

  beforeEach(async () => {
    actionRegistry = new ActionRegistry();
    statePersistence = new StatePersistence(testRunsDir);
    engine = new Engine(undefined, statePersistence, actionRegistry);

    // Clean up test directories
    try {
      await fs.rm(testRunsDir, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test directories
    try {
      await fs.rm(testRunsDir, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  describe('failed run lifecycle', () => {
    it('should NOT archive failed runs automatically', async () => {
      class FailingAction implements PlaybookAction<unknown> {
        async execute(): Promise<PlaybookActionResult> {
          return {
            code: 'TestError',
            message: 'Test failure',
            error: new CatalystError('Test failure', 'TestError', 'This is expected')
          };
        }
      }

      actionRegistry.register('failing-action', new FailingAction());

      const playbook: Playbook = {
        name: 'failing-playbook',
        description: 'Test playbook that fails',
        owner: 'Engineer',
        steps: [
          { action: 'failing-action', config: {} }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('failed');

      // State should remain in .xe/runs/
      const stateFile = path.join(testRunsDir, `run-${result.runId}.json`);
      const stateExists = await fs.access(stateFile).then(() => true).catch(() => false);
      expect(stateExists).toBe(true);

      // Should NOT be in history
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const historyFile = path.join(testHistoryDir, year.toString(), month, day, `run-${result.runId}.json`);
      const inHistory = await fs.access(historyFile).then(() => true).catch(() => false);
      expect(inHistory).toBe(false);
    });

    it('should archive completed runs automatically', async () => {
      class SuccessAction implements PlaybookAction<unknown> {
        async execute(): Promise<PlaybookActionResult> {
          return {
            code: 'Success',
            message: 'Success',
            value: 'done'
          };
        }
      }

      actionRegistry.register('success-action', new SuccessAction());

      const playbook: Playbook = {
        name: 'success-playbook',
        description: 'Test playbook that succeeds',
        owner: 'Engineer',
        steps: [
          { action: 'success-action', config: {} }
        ]
      };

      const result = await engine.run(playbook);

      expect(result.status).toBe('completed');

      // State should NOT be in .xe/runs/
      const stateFile = path.join(testRunsDir, `run-${result.runId}.json`);
      const stateExists = await fs.access(stateFile).then(() => true).catch(() => false);
      expect(stateExists).toBe(false);

      // Should be in history
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const historyFile = path.join(testHistoryDir, year.toString(), month, day, `run-${result.runId}.json`);
      const inHistory = await fs.access(historyFile).then(() => true).catch(() => false);
      expect(inHistory).toBe(true);
    });

    it('should allow resuming failed runs', async () => {
      let attemptCount = 0;

      class FlakeyAction implements PlaybookAction<unknown> {
        async execute(): Promise<PlaybookActionResult> {
          attemptCount++;
          if (attemptCount === 1) {
            return {
              code: 'TransientError',
              message: 'First attempt failed',
              error: new CatalystError('Transient failure', 'TransientError', 'Retry')
            };
          }
          return {
            code: 'Success',
            message: 'Success on retry',
            value: 'done'
          };
        }
      }

      actionRegistry.register('flakey-action', new FlakeyAction());

      const playbook: Playbook = {
        name: 'flakey-playbook',
        description: 'Test playbook that fails then succeeds',
        owner: 'Engineer',
        steps: [
          { action: 'flakey-action', config: {} }
        ]
      };

      // First run fails
      const result1 = await engine.run(playbook);
      expect(result1.status).toBe('failed');

      // State should be in .xe/runs/
      const stateFile = path.join(testRunsDir, `run-${result1.runId}.json`);
      const stateExists = await fs.access(stateFile).then(() => true).catch(() => false);
      expect(stateExists).toBe(true);

      // Resume should succeed
      const result2 = await engine.resume(result1.runId, playbook);
      expect(result2.status).toBe('completed');

      // Now should be archived
      const stillInRuns = await fs.access(stateFile).then(() => true).catch(() => false);
      expect(stillInRuns).toBe(false);
    });
  });

  describe('abandon() method', () => {
    it('should archive a failed run', async () => {
      class FailingAction implements PlaybookAction<unknown> {
        async execute(): Promise<PlaybookActionResult> {
          return {
            code: 'TestError',
            message: 'Test failure',
            error: new CatalystError('Test failure', 'TestError', 'This is expected')
          };
        }
      }

      actionRegistry.register('failing-action', new FailingAction());

      const playbook: Playbook = {
        name: 'failing-playbook',
        description: 'Test playbook that fails',
        owner: 'Engineer',
        steps: [
          { action: 'failing-action', config: {} }
        ]
      };

      const result = await engine.run(playbook);
      expect(result.status).toBe('failed');

      // Abandon the failed run
      await engine.abandon(result.runId);

      // Should no longer be in .xe/runs/
      const stateFile = path.join(testRunsDir, `run-${result.runId}.json`);
      const stateExists = await fs.access(stateFile).then(() => true).catch(() => false);
      expect(stateExists).toBe(false);

      // Should be in history
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const historyFile = path.join(testHistoryDir, year.toString(), month, day, `run-${result.runId}.json`);
      const inHistory = await fs.access(historyFile).then(() => true).catch(() => false);
      expect(inHistory).toBe(true);
    });
  });

  describe('cleanupStaleRuns() method', () => {
    it('should cleanup old failed runs', async () => {
      class FailingAction implements PlaybookAction<unknown> {
        async execute(): Promise<PlaybookActionResult> {
          return {
            code: 'TestError',
            message: 'Test failure',
            error: new CatalystError('Test failure', 'TestError', 'This is expected')
          };
        }
      }

      actionRegistry.register('failing-action', new FailingAction());

      const playbook: Playbook = {
        name: 'failing-playbook',
        description: 'Test playbook that fails',
        owner: 'Engineer',
        steps: [
          { action: 'failing-action', config: {} }
        ]
      };

      // Create a failed run
      const result = await engine.run(playbook);
      expect(result.status).toBe('failed');

      const stateFile = path.join(testRunsDir, `run-${result.runId}.json`);

      // Modify file timestamp to be old
      const oldTime = new Date(Date.now() - (8 * 24 * 60 * 60 * 1000)); // 8 days ago
      await fs.utimes(stateFile, oldTime, oldTime);

      // Cleanup runs older than 7 days
      const cleaned = await engine.cleanupStaleRuns({
        olderThanDays: 7
      });

      expect(cleaned).toBe(1);

      // Should no longer be in .xe/runs/
      const stateExists = await fs.access(stateFile).then(() => true).catch(() => false);
      expect(stateExists).toBe(false);
    });

    it('should NOT cleanup recent failed runs', async () => {
      class FailingAction implements PlaybookAction<unknown> {
        async execute(): Promise<PlaybookActionResult> {
          return {
            code: 'TestError',
            message: 'Test failure',
            error: new CatalystError('Test failure', 'TestError', 'This is expected')
          };
        }
      }

      actionRegistry.register('failing-action', new FailingAction());

      const playbook: Playbook = {
        name: 'failing-playbook',
        description: 'Test playbook that fails',
        owner: 'Engineer',
        steps: [
          { action: 'failing-action', config: {} }
        ]
      };

      // Create a failed run
      const result = await engine.run(playbook);
      expect(result.status).toBe('failed');

      // Try to cleanup runs older than 7 days (but this one is recent)
      const cleaned = await engine.cleanupStaleRuns({
        olderThanDays: 7
      });

      expect(cleaned).toBe(0);

      // Should still be in .xe/runs/
      const stateFile = path.join(testRunsDir, `run-${result.runId}.json`);
      const stateExists = await fs.access(stateFile).then(() => true).catch(() => false);
      expect(stateExists).toBe(true);
    });

    it('should return 0 when no stale runs exist', async () => {
      const cleaned = await engine.cleanupStaleRuns({
        olderThanDays: 7
      });

      expect(cleaned).toBe(0);
    });

    it('should use default of 7 days when no options provided', async () => {
      const cleaned = await engine.cleanupStaleRuns();

      expect(cleaned).toBe(0);
    });
  });
});
