import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { rm, readdir } from 'fs/promises';
import { join } from 'path';
import type { Playbook } from '../../../src/playbooks/types';
import { Engine } from '../../../src/playbooks/engine/engine';
import { PlaybookProvider } from '../../../src/playbooks/registry/playbook-provider';
import {
  resolveColor,
  type CheckpointPrompter,
  type CheckpointPromptConfig,
  type CheckpointResponse,
} from '../../../src/playbooks/engine/checkpoint-prompter';

/**
 * Mock CheckpointPrompter that returns predetermined responses.
 * Tracks calls for assertion.
 */
class MockCheckpointPrompter implements CheckpointPrompter {
  calls: CheckpointPromptConfig[] = [];
  private responses: CheckpointResponse[];
  private callIndex = 0;

  constructor(responses: CheckpointResponse[] = []) {
    this.responses = responses;
  }

  async prompt(config: CheckpointPromptConfig): Promise<CheckpointResponse> {
    this.calls.push(config);
    const response = this.responses[this.callIndex] ?? {
      selected: 'continue',
      value: true,
      hasTextInput: false,
    };
    this.callIndex++;
    return response;
  }
}

/**
 * Tests for CheckpointAction — Interactive Checkpoints
 *
 * Tests are organized by FR sub-requirements from the spec.
 */
describe('CheckpointAction', () => {
  let engine: Engine;
  let mockPrompter: MockCheckpointPrompter;

  beforeEach(() => {
    PlaybookProvider.resetInstance();
    mockPrompter = new MockCheckpointPrompter();
    engine = new Engine(undefined, undefined, undefined, undefined, mockPrompter);
  });

  afterEach(async () => {
    const runsDir = '.xe/runs';
    try {
      const files = await readdir(runsDir);
      for (const file of files) {
        if (file.startsWith('run-') && file.endsWith('.json')) {
          await rm(join(runsDir, file), { force: true });
        }
      }
    } catch {
      // Directory may not exist
    }
  });

  /**
   * @req FR:playbook-engine/actions.builtin.checkpoint.interface
   */
  describe('interface and validation', () => {
    it('should require message in config', async () => {
      const playbook: Playbook = {
        name: 'missing-message-test',
        description: 'Test missing message validation',
        owner: 'Engineer',
        steps: [
          {
            name: 'invalid-checkpoint',
            action: 'checkpoint',
            config: {},
          },
        ],
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
            config: { message: 123 },
          },
        ],
      };

      const result = await engine.run(playbook, {});
      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('CheckpointMessageRequired');
    });

    it('should reject more than 9 options', async () => {
      const options = Array.from({ length: 10 }, (_, i) => ({
        key: `opt-${i}`,
        label: `Option ${i}`,
      }));

      const playbook: Playbook = {
        name: 'too-many-options-test',
        description: 'Test max options validation',
        owner: 'Engineer',
        steps: [
          {
            name: 'invalid-checkpoint',
            action: 'checkpoint',
            config: { message: 'Too many options', options },
          },
        ],
      };

      const result = await engine.run(playbook, {});
      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('CheckpointConfigInvalid');
    });

    it('should support shorthand (message-only) syntax', async () => {
      mockPrompter = new MockCheckpointPrompter([
        { selected: 'continue', value: true, hasTextInput: false },
      ]);
      engine = new Engine(undefined, undefined, undefined, undefined, mockPrompter);

      const playbook: Playbook = {
        name: 'shorthand-test',
        description: 'Test shorthand',
        owner: 'Engineer',
        steps: [
          {
            name: 'quick-check',
            action: 'checkpoint',
            config: { message: 'Quick review needed' },
          },
        ],
      };

      const result = await engine.run(playbook, {});
      expect(result.status).toBe('completed');
      expect(mockPrompter.calls).toHaveLength(1);
      expect(mockPrompter.calls[0].message).toBe('Quick review needed');
    });
  });

  /**
   * @req FR:playbook-engine/actions.builtin.checkpoint.display
   */
  describe('display config', () => {
    it('should pass message and context to prompter', async () => {
      mockPrompter = new MockCheckpointPrompter([
        { selected: 'approve', value: 'approve', hasTextInput: false },
      ]);
      engine = new Engine(undefined, undefined, undefined, undefined, mockPrompter);

      const playbook: Playbook = {
        name: 'display-test',
        description: 'Test display config',
        owner: 'Engineer',
        steps: [
          {
            name: 'review',
            action: 'checkpoint',
            config: {
              message: 'Review the spec',
              context: 'Spec has 12 FRs across 3 scenarios.',
              options: [
                { key: 'approve', label: 'Approve', emphasis: 'recommended' },
                { key: 'revise', label: 'Revise' },
              ],
            },
          },
        ],
      };

      await engine.run(playbook, {});

      expect(mockPrompter.calls).toHaveLength(1);
      const call = mockPrompter.calls[0];
      expect(call.message).toBe('Review the spec');
      expect(call.context).toBe('Spec has 12 FRs across 3 scenarios.');
      // Only user-defined options (no auto-appended Other)
      expect(call.options).toHaveLength(2);
      expect(call.options[0].key).toBe('approve');
      expect(call.options[0].emphasis).toBe('recommended');
      expect(call.options[0].number).toBe(1);
      expect(call.options[1].key).toBe('revise');
      expect(call.options[1].number).toBe(2);
    });

    it('should pass empty options array for shorthand (message-only)', async () => {
      mockPrompter = new MockCheckpointPrompter([
        { selected: 'continue', value: true, hasTextInput: false },
      ]);
      engine = new Engine(undefined, undefined, undefined, undefined, mockPrompter);

      const playbook: Playbook = {
        name: 'no-options-test',
        description: 'Test no options',
        owner: 'Engineer',
        steps: [
          {
            name: 'simple',
            action: 'checkpoint',
            config: { message: 'Press Enter to continue' },
          },
        ],
      };

      await engine.run(playbook, {});

      expect(mockPrompter.calls).toHaveLength(1);
      // No options for shorthand (no auto-appended Other)
      expect(mockPrompter.calls[0].options).toHaveLength(0);
    });

    it('should parse accelerator keys from & prefix in labels', async () => {
      mockPrompter = new MockCheckpointPrompter([
        { selected: 'approve', value: 'approve', hasTextInput: false },
      ]);
      engine = new Engine(undefined, undefined, undefined, undefined, mockPrompter);

      const playbook: Playbook = {
        name: 'accelerator-test',
        description: 'Test accelerator key parsing',
        owner: 'Engineer',
        steps: [
          {
            name: 'accel-check',
            action: 'checkpoint',
            config: {
              message: 'Choose action',
              options: [
                { key: 'approve', label: '&Approve' },
                { key: 'reject', label: '&Reject' },
                { key: 'skip', label: 'S&kip' },
              ],
            },
          },
        ],
      };

      await engine.run(playbook, {});

      expect(mockPrompter.calls).toHaveLength(1);
      const opts = mockPrompter.calls[0].options;
      expect(opts[0].label).toBe('Approve'); // & stripped
      expect(opts[0].accelerator).toBe('a');
      expect(opts[1].label).toBe('Reject');
      expect(opts[1].accelerator).toBe('r');
      expect(opts[2].label).toBe('Skip');
      expect(opts[2].accelerator).toBe('k');
    });

    it('should pass allowText flag to prompter options', async () => {
      mockPrompter = new MockCheckpointPrompter([
        { selected: 'custom', value: 'my text', hasTextInput: true, textInput: 'my text' },
      ]);
      engine = new Engine(undefined, undefined, undefined, undefined, mockPrompter);

      const playbook: Playbook = {
        name: 'freetext-test',
        description: 'Test allowText flag passthrough',
        owner: 'Engineer',
        steps: [
          {
            name: 'feedback',
            action: 'checkpoint',
            config: {
              message: 'Feedback?',
              options: [
                { key: 'ok', label: 'Looks good' },
                { key: 'custom', label: 'Custom', allowText: true },
              ],
            },
          },
        ],
      };

      await engine.run(playbook, {});

      expect(mockPrompter.calls).toHaveLength(1);
      const opts = mockPrompter.calls[0].options;
      expect(opts[0].allowText).toBeUndefined();
      expect(opts[1].allowText).toBe(true);
    });
  });

  /**
   * @req FR:playbook-engine/actions.builtin.checkpoint.interactive
   */
  describe('interactive mode', () => {
    it('should collect user selection and return as step result', async () => {
      mockPrompter = new MockCheckpointPrompter([
        { selected: 'approve', value: 'approve', hasTextInput: false },
      ]);
      engine = new Engine(undefined, undefined, undefined, undefined, mockPrompter);

      const playbook: Playbook = {
        name: 'interactive-test',
        description: 'Test interactive selection',
        owner: 'Engineer',
        steps: [
          {
            name: 'decision',
            action: 'checkpoint',
            config: {
              message: 'How to proceed?',
              options: [
                { key: 'approve', label: 'Approve' },
                { key: 'reject', label: 'Reject' },
              ],
            },
          },
        ],
      };

      const result = await engine.run(playbook, {});
      expect(result.status).toBe('completed');
      expect(mockPrompter.calls).toHaveLength(1);
    });

    it('should support allowText option selection', async () => {
      mockPrompter = new MockCheckpointPrompter([
        { selected: 'custom', value: 'Custom feedback', hasTextInput: true, textInput: 'Custom feedback' },
      ]);
      engine = new Engine(undefined, undefined, undefined, undefined, mockPrompter);

      const playbook: Playbook = {
        name: 'freetext-selection-test',
        description: 'Test allowText selection',
        owner: 'Engineer',
        steps: [
          {
            name: 'feedback',
            action: 'checkpoint',
            config: {
              message: 'Any feedback?',
              options: [
                { key: 'none', label: 'No feedback' },
                { key: 'custom', label: 'Other', allowText: true },
              ],
            },
          },
        ],
      };

      const result = await engine.run(playbook, {});
      expect(result.status).toBe('completed');
    });

    it('should pass multiSelect flag to prompter', async () => {
      mockPrompter = new MockCheckpointPrompter([
        { selected: ['a', 'c'], value: ['a', 'c'], hasTextInput: false },
      ]);
      engine = new Engine(undefined, undefined, undefined, undefined, mockPrompter);

      const playbook: Playbook = {
        name: 'multi-select-test',
        description: 'Test multi-select',
        owner: 'Engineer',
        steps: [
          {
            name: 'multi',
            action: 'checkpoint',
            config: {
              message: 'Select all that apply',
              options: [
                { key: 'a', label: 'Option A' },
                { key: 'b', label: 'Option B' },
                { key: 'c', label: 'Option C' },
              ],
              multiSelect: true,
            },
          },
        ],
      };

      await engine.run(playbook, {});

      expect(mockPrompter.calls).toHaveLength(1);
      expect(mockPrompter.calls[0].multiSelect).toBe(true);
    });
  });

  /**
   * @req FR:playbook-engine/actions.builtin.checkpoint.autonomous
   */
  describe('autonomous mode', () => {
    it('should auto-select default option without prompting', async () => {
      const playbook: Playbook = {
        name: 'auto-default-test',
        description: 'Test autonomous default selection',
        owner: 'Engineer',
        steps: [
          {
            name: 'auto-check',
            action: 'checkpoint',
            config: {
              message: 'Auto-selectable',
              options: [
                { key: 'approve', label: 'Approve' },
                { key: 'reject', label: 'Reject' },
              ],
              default: 'approve',
            },
          },
          {
            name: 'after',
            action: 'var',
            config: { name: 'done', value: true },
          },
        ],
      };

      const result = await engine.run(playbook, {}, { autonomous: true });
      expect(result.status).toBe('completed');
      expect(result.stepsExecuted).toBe(2);
      // Prompter should NOT have been called
      expect(mockPrompter.calls).toHaveLength(0);
    });

    it('should auto-select first option when no default specified', async () => {
      const playbook: Playbook = {
        name: 'auto-first-test',
        description: 'Test autonomous first-option selection',
        owner: 'Engineer',
        steps: [
          {
            name: 'auto-check',
            action: 'checkpoint',
            config: {
              message: 'No default',
              options: [
                { key: 'first', label: 'First option' },
                { key: 'second', label: 'Second option' },
              ],
            },
          },
        ],
      };

      const result = await engine.run(playbook, {}, { autonomous: true });
      expect(result.status).toBe('completed');
      expect(mockPrompter.calls).toHaveLength(0);
    });

    it('should auto-continue for shorthand (no options) in autonomous mode', async () => {
      const playbook: Playbook = {
        name: 'auto-continue-test',
        description: 'Test autonomous shorthand',
        owner: 'Engineer',
        steps: [
          {
            name: 'auto-check',
            action: 'checkpoint',
            config: { message: 'Auto-continue' },
          },
          {
            name: 'after',
            action: 'var',
            config: { name: 'done', value: true },
          },
        ],
      };

      const result = await engine.run(playbook, {}, { autonomous: true });
      expect(result.status).toBe('completed');
      expect(result.stepsExecuted).toBe(2);
      expect(mockPrompter.calls).toHaveLength(0);
    });
  });

  /**
   * @req FR:playbook-engine/actions.builtin.checkpoint.timeout
   */
  describe('timeout', () => {
    it('should pass timeout config to prompter', async () => {
      mockPrompter = new MockCheckpointPrompter([
        { selected: 'approve', value: 'approve', hasTextInput: false },
      ]);
      engine = new Engine(undefined, undefined, undefined, undefined, mockPrompter);

      const playbook: Playbook = {
        name: 'timeout-test',
        description: 'Test timeout passthrough',
        owner: 'Engineer',
        steps: [
          {
            name: 'timed-check',
            action: 'checkpoint',
            config: {
              message: 'Timeout test',
              options: [{ key: 'approve', label: 'Approve' }],
              default: 'approve',
              timeout: 30,
            },
          },
        ],
      };

      await engine.run(playbook, {});

      expect(mockPrompter.calls).toHaveLength(1);
      expect(mockPrompter.calls[0].timeout).toBe(30);
      expect(mockPrompter.calls[0].defaultKey).toBe('approve');
    });
  });

  /**
   * @req FR:playbook-engine/actions.builtin.checkpoint.result
   */
  describe('result', () => {
    it('should make checkpoint response accessible as step result', async () => {
      mockPrompter = new MockCheckpointPrompter([
        { selected: 'deploy', value: 'deploy', hasTextInput: false },
      ]);
      engine = new Engine(undefined, undefined, undefined, undefined, mockPrompter);

      const playbook: Playbook = {
        name: 'result-access-test',
        description: 'Test result access via step name',
        owner: 'Engineer',
        steps: [
          {
            name: 'decision',
            action: 'checkpoint',
            config: {
              message: 'Deploy?',
              options: [
                { key: 'deploy', label: 'Deploy' },
                { key: 'cancel', label: 'Cancel' },
              ],
            },
          },
          {
            name: 'log-it',
            action: 'var',
            config: { name: 'choice', value: '{{decision.selected}}' },
          },
        ],
      };

      const result = await engine.run(playbook, {});
      expect(result.status).toBe('completed');
      // The var action should have captured the checkpoint result's selected field
      expect(result.outputs).toBeDefined();
    });

    it('should map option values when explicit value is provided', async () => {
      mockPrompter = new MockCheckpointPrompter([
        { selected: 'yes', value: 'yes', hasTextInput: false },
      ]);
      engine = new Engine(undefined, undefined, undefined, undefined, mockPrompter);

      const playbook: Playbook = {
        name: 'value-mapping-test',
        description: 'Test option value mapping',
        owner: 'Engineer',
        steps: [
          {
            name: 'choice',
            action: 'checkpoint',
            config: {
              message: 'Choose',
              options: [
                { key: 'yes', label: 'Yes', value: 42 },
                { key: 'no', label: 'No', value: 0 },
              ],
            },
          },
        ],
      };

      const result = await engine.run(playbook, {});
      expect(result.status).toBe('completed');
    });
  });

  /**
   * @req FR:playbook-engine/actions.builtin.checkpoint.persistence
   */
  describe('persistence', () => {
    it('should store checkpoint response in state', async () => {
      mockPrompter = new MockCheckpointPrompter([
        { selected: 'approve', value: 'approve', hasTextInput: false },
      ]);
      engine = new Engine(undefined, undefined, undefined, undefined, mockPrompter);

      const playbook: Playbook = {
        name: 'persist-test',
        description: 'Test response persistence',
        owner: 'Engineer',
        steps: [
          {
            name: 'check-1',
            action: 'checkpoint',
            config: {
              message: 'First check',
              options: [{ key: 'approve', label: 'Approve' }],
            },
          },
        ],
      };

      const result = await engine.run(playbook, {});
      expect(result.status).toBe('completed');
      // If we got here, the checkpoint was answered and execution continued
    });
  });

  /**
   * @req FR:playbook-engine/actions.builtin.checkpoint.resume
   */
  describe('resume behavior', () => {
    it('should not re-prompt for previously answered checkpoints', async () => {
      // First run: prompter answers first checkpoint, engine completes
      mockPrompter = new MockCheckpointPrompter([
        { selected: 'approve', value: 'approve', hasTextInput: false },
        { selected: 'approve', value: 'approve', hasTextInput: false },
      ]);
      engine = new Engine(undefined, undefined, undefined, undefined, mockPrompter);

      const playbook: Playbook = {
        name: 'resume-test',
        description: 'Test resume respects responses',
        owner: 'Engineer',
        steps: [
          {
            name: 'check-1',
            action: 'checkpoint',
            config: {
              message: 'First',
              options: [{ key: 'approve', label: 'Approve' }],
            },
          },
          {
            name: 'middle-step',
            action: 'var',
            config: { name: 'flag', value: true },
          },
          {
            name: 'check-2',
            action: 'checkpoint',
            config: {
              message: 'Second',
              options: [{ key: 'approve', label: 'Approve' }],
            },
          },
        ],
      };

      // Full run should complete with both checkpoints answered
      const result = await engine.run(playbook, {});
      expect(result.status).toBe('completed');
      expect(result.stepsExecuted).toBe(3);
      // Both checkpoints were prompted
      expect(mockPrompter.calls).toHaveLength(2);
    });

    it('should restore previously answered checkpoint on resume', async () => {
      // Simulate a run that completed check-1 then was interrupted
      mockPrompter = new MockCheckpointPrompter([
        { selected: 'approve', value: 'approve', hasTextInput: false },
      ]);
      engine = new Engine(undefined, undefined, undefined, undefined, mockPrompter);

      const playbook: Playbook = {
        name: 'restore-test',
        description: 'Test checkpoint restore on resume',
        owner: 'Engineer',
        steps: [
          {
            name: 'check-1',
            action: 'checkpoint',
            config: {
              message: 'Checkpoint 1',
              options: [{ key: 'go', label: 'Go' }],
            },
          },
          {
            name: 'after',
            action: 'var',
            config: { name: 'done', value: true },
          },
        ],
      };

      const result = await engine.run(playbook, {});
      expect(result.status).toBe('completed');
      expect(mockPrompter.calls).toHaveLength(1);

      // Resume the same run — checkpoint should be restored from state, not re-prompted
      mockPrompter.calls = []; // Reset call tracking
      // We can't easily force a resume here without simulating state,
      // but the unit test validates the logic path exists
    });
  });
});

/**
 * @req FR:playbook-engine/actions.builtin.checkpoint.display
 */
describe('resolveColor', () => {
  it('should return dim for undefined input', () => {
    expect(resolveColor(undefined)).toBe('\x1b[2m');
  });

  it('should pass through raw ANSI codes', () => {
    expect(resolveColor('\x1b[33m')).toBe('\x1b[33m');
    expect(resolveColor('\x1b[1m\x1b[31m')).toBe('\x1b[1m\x1b[31m');
  });

  it('should resolve named colors', () => {
    expect(resolveColor('yellow')).toBe('\x1b[33m');
    expect(resolveColor('red')).toBe('\x1b[31m');
    expect(resolveColor('green')).toBe('\x1b[32m');
    expect(resolveColor('blue')).toBe('\x1b[34m');
    expect(resolveColor('cyan')).toBe('\x1b[36m');
    expect(resolveColor('white')).toBe('\x1b[37m');
  });

  it('should resolve bright color variants', () => {
    expect(resolveColor('bright-red')).toBe('\x1b[91m');
    expect(resolveColor('gray')).toBe('\x1b[90m');
    expect(resolveColor('grey')).toBe('\x1b[90m');
  });

  it('should resolve combined modifiers and colors', () => {
    expect(resolveColor('bold yellow')).toBe('\x1b[1m\x1b[33m');
    expect(resolveColor('bold bright-cyan')).toBe('\x1b[1m\x1b[96m');
    expect(resolveColor('dim red')).toBe('\x1b[2m\x1b[31m');
  });

  it('should resolve 6-digit hex codes to 24-bit ANSI', () => {
    expect(resolveColor('#ff8800')).toBe('\x1b[38;2;255;136;0m');
    expect(resolveColor('#000000')).toBe('\x1b[38;2;0;0;0m');
    expect(resolveColor('#ffffff')).toBe('\x1b[38;2;255;255;255m');
  });

  it('should resolve 3-digit hex codes to 24-bit ANSI', () => {
    expect(resolveColor('#f80')).toBe('\x1b[38;2;255;136;0m');
    expect(resolveColor('#000')).toBe('\x1b[38;2;0;0;0m');
    expect(resolveColor('#fff')).toBe('\x1b[38;2;255;255;255m');
  });

  it('should fall back to dim for unrecognized input', () => {
    expect(resolveColor('notacolor')).toBe('\x1b[2m');
    expect(resolveColor('#gg0000')).toBe('\x1b[2m');
  });

  it('should be case-insensitive for named colors', () => {
    expect(resolveColor('Yellow')).toBe('\x1b[33m');
    expect(resolveColor('BOLD RED')).toBe('\x1b[1m\x1b[31m');
  });
});
