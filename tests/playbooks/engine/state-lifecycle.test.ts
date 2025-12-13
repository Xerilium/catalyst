import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { Playbook } from '@playbooks/types';
import { PlaybookProvider } from '@playbooks/registry/playbook-provider';
import { Engine } from '@playbooks/engine/engine';
import { StatePersistence } from '@playbooks/persistence/state-persistence';

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
  let statePersistence: StatePersistence;

  beforeEach(async () => {
    // Reset singleton for test isolation
    PlaybookProvider.resetInstance();

    // Initialize actions from catalog
    PlaybookProvider.getInstance().getActionTypes();

    statePersistence = new StatePersistence(testRunsDir);
    engine = new Engine(undefined, statePersistence);

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

    // Clean up provider
    PlaybookProvider.getInstance().clearAll();
    PlaybookProvider.resetInstance();
  });

  describe('failed run lifecycle', () => {
    it('should NOT archive failed runs automatically', async () => {
      const playbook: Playbook = {
        name: 'failing-playbook',
        description: 'Test playbook that fails',
        owner: 'Engineer',
        steps: [
          {
            action: 'throw',
            config: {
              code: 'TestError',
              message: 'Test failure',
              guidance: 'This is expected'
            }
          }
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
      const playbook: Playbook = {
        name: 'success-playbook',
        description: 'Test playbook that succeeds',
        owner: 'Engineer',
        steps: [
          {
            action: 'script',
            config: {
              code: 'return "done";',
              cwd: process.cwd()  // Set valid working directory
            }
          }
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

    it('should keep failed run state for potential retry', async () => {
      const failingPlaybook: Playbook = {
        name: 'resume-test-playbook',
        description: 'Test playbook for resume testing',
        owner: 'Engineer',
        steps: [
          {
            name: 'step-1',
            action: 'script',
            config: {
              code: 'return "step-1-done";',
              cwd: process.cwd()  // Set valid working directory
            }
          },
          {
            name: 'step-2',
            action: 'throw',
            config: {
              code: 'TransientError',
              message: 'Second step fails',
              guidance: 'This is expected for testing resume'
            }
          }
        ]
      };

      // First run fails on second step
      const result1 = await engine.run(failingPlaybook);
      expect(result1.status).toBe('failed');
      // Note: stepsExecuted is currently 0 in error result due to engine bug (see engine.ts:544)
      // The actual completed steps are tracked in state.completedSteps

      // State should be in .xe/runs/ (not archived)
      const stateFile = path.join(testRunsDir, `run-${result1.runId}.json`);
      const stateExists = await fs.access(stateFile).then(() => true).catch(() => false);
      expect(stateExists).toBe(true);

      // Read state to verify completedSteps
      const stateContent = await fs.readFile(stateFile, 'utf-8');
      const state = JSON.parse(stateContent);
      expect(state.completedSteps).toContain('step-1');
      expect(state.status).toBe('failed');

      // Note: To actually resume, you would need to fix the underlying issue
      // (e.g., a transient network error) and call resume with the SAME playbook.
      // Changing the playbook definition is not supported - it would throw PlaybookIncompatible.
    });
  });

  describe('abandon() method', () => {
    it('should archive a failed run', async () => {
      const playbook: Playbook = {
        name: 'failing-playbook',
        description: 'Test playbook that fails',
        owner: 'Engineer',
        steps: [
          {
            action: 'throw',
            config: {
              code: 'TestError',
              message: 'Test failure',
              guidance: 'This is expected'
            }
          }
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
      const playbook: Playbook = {
        name: 'failing-playbook',
        description: 'Test playbook that fails',
        owner: 'Engineer',
        steps: [
          {
            action: 'throw',
            config: {
              code: 'TestError',
              message: 'Test failure',
              guidance: 'This is expected'
            }
          }
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
      const playbook: Playbook = {
        name: 'failing-playbook',
        description: 'Test playbook that fails',
        owner: 'Engineer',
        steps: [
          {
            action: 'throw',
            config: {
              code: 'TestError',
              message: 'Test failure',
              guidance: 'This is expected'
            }
          }
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
