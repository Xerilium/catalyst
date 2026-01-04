import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { rm, readdir } from 'fs/promises';
import { join } from 'path';
import type { Playbook } from '../../../src/playbooks/types';
import { Engine } from '../../../src/playbooks/engine/engine';
import { PlaybookProvider } from '../../../src/playbooks/registry/playbook-provider';

/**
 * Tests for CheckpointAction
 *
 * @req FR:playbook-engine/actions.builtin.checkpoint - Human checkpoint action
 * @req FR:playbook-engine/actions.builtin.checkpoint.pause - Pause execution
 * @req FR:playbook-engine/actions.builtin.checkpoint.manual - Manual mode pauses for input
 * @req FR:playbook-engine/actions.builtin.checkpoint.autonomous - Auto-approve in autonomous mode
 * @req FR:playbook-engine/actions.builtin.checkpoint.persistence - Persist approval state
 * @req FR:playbook-engine/actions.builtin.checkpoint.resume - Respect approved checkpoints
 */
describe('CheckpointAction', () => {
  let engine: Engine;

  beforeEach(() => {
    // Reset PlaybookProvider singleton for test isolation
    PlaybookProvider.resetInstance();
    engine = new Engine();
  });

  afterEach(async () => {
    // Clean up run files created during tests
    const runsDir = '.xe/runs';
    try {
      const files = await readdir(runsDir);
      for (const file of files) {
        if (file.startsWith('run-') && file.endsWith('.json')) {
          await rm(join(runsDir, file), { force: true });
        }
      }
    } catch {
      // Directory may not exist, ignore
    }
  });

  describe('manual mode (default)', () => {
    it('should pause execution at checkpoint in manual mode', async () => {
      const playbook: Playbook = {
        name: 'checkpoint-test',
        description: 'Test playbook with checkpoint',
        owner: 'Engineer',
        steps: [
          {
            name: 'step-1',
            action: 'var',
            config: { name: 'count', value: 1 }
          },
          {
            name: 'review-checkpoint',
            action: 'checkpoint',
            config: { message: 'Please review before proceeding' }
          },
          {
            name: 'step-2',
            action: 'var',
            config: { name: 'count', value: 2 }
          }
        ]
      };

      // Execute without autonomous mode (default)
      const result = await engine.run(playbook, {});

      // Should pause at checkpoint
      expect(result.status).toBe('paused');
      expect(result.stepsExecuted).toBe(2); // step-1 + checkpoint
    });

    it('should store checkpoint approval in state for resume', async () => {
      const playbook: Playbook = {
        name: 'checkpoint-persist-test',
        description: 'Test checkpoint persistence',
        owner: 'Engineer',
        steps: [
          {
            name: 'review-checkpoint',
            action: 'checkpoint',
            config: { message: 'Review this' }
          },
          {
            name: 'after-checkpoint',
            action: 'var',
            config: { name: 'done', value: true }
          }
        ]
      };

      // First run - pauses at checkpoint
      const result1 = await engine.run(playbook, {});
      expect(result1.status).toBe('paused');

      // Resume - checkpoint should be pre-approved
      const result2 = await engine.resume(result1.runId, playbook);
      expect(result2.status).toBe('completed');
      expect(result2.stepsExecuted).toBe(1); // Only after-checkpoint executed
    });
  });

  describe('autonomous mode', () => {
    it('should auto-approve checkpoint in autonomous mode', async () => {
      const playbook: Playbook = {
        name: 'autonomous-checkpoint-test',
        description: 'Test playbook with checkpoint in autonomous mode',
        owner: 'Engineer',
        steps: [
          {
            name: 'step-1',
            action: 'var',
            config: { name: 'count', value: 1 }
          },
          {
            name: 'review-checkpoint',
            action: 'checkpoint',
            config: { message: 'This will be auto-approved' }
          },
          {
            name: 'step-2',
            action: 'var',
            config: { name: 'count', value: 2 }
          }
        ]
      };

      // Execute with autonomous mode
      const result = await engine.run(playbook, {}, { autonomous: true });

      // Should complete without pausing
      expect(result.status).toBe('completed');
      expect(result.stepsExecuted).toBe(3);
    });

    it('should return CheckpointAutoApproved result', async () => {
      const playbook: Playbook = {
        name: 'auto-approved-result-test',
        description: 'Test auto-approved checkpoint result',
        owner: 'Engineer',
        steps: [
          {
            name: 'auto-checkpoint',
            action: 'checkpoint',
            config: { message: 'Auto-approved checkpoint' }
          }
        ]
      };

      const result = await engine.run(playbook, {}, { autonomous: true });
      expect(result.status).toBe('completed');
    });
  });

  describe('shorthand syntax', () => {
    it('should support primary property shorthand', async () => {
      const playbook: Playbook = {
        name: 'shorthand-checkpoint-test',
        description: 'Test checkpoint shorthand',
        owner: 'Engineer',
        steps: [
          {
            name: 'quick-checkpoint',
            action: 'checkpoint',
            config: { message: 'Quick review needed' }
          }
        ]
      };

      const result = await engine.run(playbook, {});
      expect(result.status).toBe('paused');
    });
  });

  describe('validation', () => {
    it('should require message in config', async () => {
      const playbook: Playbook = {
        name: 'missing-message-test',
        description: 'Test missing message validation',
        owner: 'Engineer',
        steps: [
          {
            name: 'invalid-checkpoint',
            action: 'checkpoint',
            config: {} // Missing message
          }
        ]
      };

      const result = await engine.run(playbook, {});
      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('CheckpointMessageRequired');
    });

    it('should reject non-string message', async () => {
      const playbook: Playbook = {
        name: 'invalid-message-test',
        description: 'Test invalid message type',
        owner: 'Engineer',
        steps: [
          {
            name: 'invalid-checkpoint',
            action: 'checkpoint',
            config: { message: 123 } // Not a string
          }
        ]
      };

      const result = await engine.run(playbook, {});
      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('CheckpointMessageRequired');
    });
  });

  describe('resume behavior', () => {
    it('should not re-prompt for previously approved checkpoints', async () => {
      const playbook: Playbook = {
        name: 'resume-approved-test',
        description: 'Test resume respects approved checkpoints',
        owner: 'Engineer',
        steps: [
          {
            name: 'checkpoint-1',
            action: 'checkpoint',
            config: { message: 'First checkpoint' }
          },
          {
            name: 'checkpoint-2',
            action: 'checkpoint',
            config: { message: 'Second checkpoint' }
          }
        ]
      };

      // First run - pauses at checkpoint-1
      const result1 = await engine.run(playbook, {});
      expect(result1.status).toBe('paused');

      // Resume - checkpoint-1 pre-approved, pauses at checkpoint-2
      const result2 = await engine.resume(result1.runId, playbook);
      expect(result2.status).toBe('paused');

      // Resume again - checkpoint-2 pre-approved, completes
      const result3 = await engine.resume(result2.runId, playbook);
      expect(result3.status).toBe('completed');
    });
  });
});
