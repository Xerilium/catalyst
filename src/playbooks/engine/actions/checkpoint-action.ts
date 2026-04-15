/**
 * Checkpoint Action (Built-in)
 *
 * Privileged action that prompts users for interactive decisions at critical points
 * in playbook execution. Supports 1-9 options with optional text input,
 * accelerator keys (& prefix), optional expandable context, single/multi-select,
 * timeout with auto-default, and autonomous auto-selection.
 *
 * @example
 * ```yaml
 * steps:
 *   # Shorthand syntax (primary property) — simple Enter-to-continue
 *   - checkpoint: Review the research findings before proceeding
 *
 *   # Full syntax with options and accelerator keys
 *   - name: review-spec
 *     checkpoint:
 *       message: How should we proceed with the specification?
 *       context: |
 *         The spec covers 3 scenarios with 12 FRs.
 *         All dependencies are satisfied.
 *       options:
 *         - key: approve
 *           label: "&Approve and continue"
 *           emphasis: recommended
 *         - key: revise
 *           label: "&Revise"
 *           description: Describe what needs to change
 *           allowText: true
 *       default: approve
 * ```
 */

import type { PlaybookAction, PlaybookActionResult } from '../../types';
import type { PlaybookContext } from '../../types/state';
import type { CheckpointPrompter, CheckpointResponse, CheckpointDisplayOption } from '../checkpoint-prompter';
import { CatalystError } from '@core/errors';

/**
 * A single checkpoint option as defined in YAML config.
 */
export interface CheckpointOptionConfig {
  /** Unique key for this option (used as result value if no explicit value) */
  key: string;
  /** Display label shown to user. Use & before a character for accelerator key (e.g., "&Continue") */
  label: string;
  /** Optional description shown alongside the label */
  description?: string;
  /** Optional value returned when selected (defaults to key) */
  value?: unknown;
  /** Mark as "Recommended" or "Suggested" with visual emphasis */
  emphasis?: 'recommended' | 'suggested';
  /** When true, selecting this option prompts for text input */
  allowText?: boolean;
}

/**
 * Configuration for checkpoint action.
 *
 * @req FR:playbook-engine/actions.builtin.checkpoint.interface - CheckpointConfig interface
 */
export interface CheckpointConfig {
  /** Question or prompt text (inline formatting only: bold, italic, code) */
  message: string;
  /** Extended context (full markdown, displayed collapsed/expandable) */
  context?: string;
  /** 1-9 selectable options; use allowText on individual options for text input */
  options?: CheckpointOptionConfig[];
  /** Key of the default option (used for autonomous mode and optional timeout) */
  default?: string;
  /** Timeout in seconds; auto-selects default when elapsed (requires default) */
  timeout?: number;
  /** Allow multiple selections (default: false) */
  multiSelect?: boolean;
  /** Optional header title displayed above the message (default: none, dim HR only) */
  header?: string;
  /** Optional header color: named ("yellow", "bold cyan"), hex ("#ff8800"), or ANSI code (default: dim) */
  headerColor?: string;
}

/**
 * Extended context with checkpoint prompter.
 */
interface CheckpointActionContext extends PlaybookContext {
  /** Prompter for collecting user input (injected by Engine) */
  checkpointPrompter?: CheckpointPrompter;
}

/**
 * Parse accelerator key from label. The & character marks the next character
 * as the accelerator (e.g., "&Continue" → accelerator "c", display "Continue").
 */
function parseAccelerator(label: string): { displayLabel: string; accelerator?: string } {
  const idx = label.indexOf('&');
  if (idx < 0 || idx >= label.length - 1) {
    return { displayLabel: label };
  }
  const accelerator = label[idx + 1].toLowerCase();
  const displayLabel = label.slice(0, idx) + label.slice(idx + 1);
  return { displayLabel, accelerator };
}

/**
 * CheckpointAction - Built-in action for interactive user prompts
 *
 * This action has privileged access to PlaybookContext and can:
 * - Display interactive prompts with options
 * - Collect user selections via a CheckpointPrompter
 * - Store responses for resume support
 * - Auto-select in autonomous mode
 *
 * Security: Context is injected via property after instantiation by Engine.
 * External actions cannot spoof this - Engine uses instanceof validation.
 *
 * @req FR:playbook-engine/actions.builtin.checkpoint.interface - Checkpoint config interface
 * @req FR:playbook-engine/actions.builtin.checkpoint.display - Render prompt to terminal
 * @req FR:playbook-engine/actions.builtin.checkpoint.interactive - Collect user input
 * @req FR:playbook-engine/actions.builtin.checkpoint.autonomous - Auto-select in autonomous mode
 * @req FR:playbook-engine/actions.builtin.checkpoint.timeout - Optional timeout
 * @req FR:playbook-engine/actions.builtin.checkpoint.result - Return selection as step result
 * @req FR:playbook-engine/actions.builtin.checkpoint.persistence - Persist responses
 * @req FR:playbook-engine/actions.builtin.checkpoint.resume - Respect previous responses
 */
export class CheckpointAction implements PlaybookAction<CheckpointConfig> {
  static readonly actionType = 'checkpoint';
  static readonly primaryProperty = 'message';

  /**
   * Privileged context access (injected by Engine after instantiation)
   * @internal
   */
  private __context?: CheckpointActionContext;

  constructor() {
    // Engine injects context via __context property
  }

  /**
   * Execute checkpoint — prompt user or auto-select.
   */
  async execute(config: CheckpointConfig): Promise<PlaybookActionResult> {
    if (!this.__context) {
      throw new CatalystError(
        'CheckpointAction requires privileged context access',
        'MissingPrivilegedAccess',
        'This action must be instantiated by Engine with context injection'
      );
    }

    if (!config || typeof config !== 'object') {
      throw new CatalystError(
        'Checkpoint configuration must be an object',
        'CheckpointConfigInvalid',
        'Provide config with "message" property'
      );
    }

    if (!config.message || typeof config.message !== 'string') {
      throw new CatalystError(
        'Checkpoint message is required and must be a string',
        'CheckpointMessageRequired',
        'Provide a human-readable message explaining what to review'
      );
    }

    if (config.options && config.options.length > 9) {
      throw new CatalystError(
        'Checkpoint supports a maximum of 9 options',
        'CheckpointConfigInvalid',
        'Reduce the number of options to 9 or fewer'
      );
    }

    const stepName = this.__context.currentStepName;
    const isAutonomous = this.__context.executionOptions?.autonomous ?? false;

    if (!this.__context.checkpointResponses) {
      this.__context.checkpointResponses = {};
    }

    // @req FR:playbook-engine/actions.builtin.checkpoint.resume
    const storedResponse = this.__context.checkpointResponses[stepName];
    if (storedResponse) {
      return {
        code: 'CheckpointRestored',
        message: `Checkpoint "${stepName}" restored from previous response`,
        value: storedResponse,
        error: undefined,
      };
    }

    let response: CheckpointResponse;

    if (isAutonomous) {
      // @req FR:playbook-engine/actions.builtin.checkpoint.autonomous
      response = this.autoSelect(config);
    } else {
      // @req FR:playbook-engine/actions.builtin.checkpoint.interactive
      response = await this.promptUser(config);
    }

    // @req FR:playbook-engine/actions.builtin.checkpoint.persistence
    this.__context.checkpointResponses[stepName] = response;

    return {
      code: isAutonomous ? 'CheckpointAutoSelected' : 'CheckpointAnswered',
      message: `Checkpoint "${stepName}": selected "${response.selected}"`,
      value: response,
      error: undefined,
    };
  }

  private autoSelect(config: CheckpointConfig): CheckpointResponse {
    if (config.default && config.options) {
      const defaultOpt = config.options.find(o => o.key === config.default);
      if (defaultOpt) {
        return {
          selected: defaultOpt.key,
          value: defaultOpt.value ?? defaultOpt.key,
          hasTextInput: false,
        };
      }
    }

    if (config.options && config.options.length > 0) {
      const first = config.options[0];
      return {
        selected: first.key,
        value: first.value ?? first.key,
        hasTextInput: false,
      };
    }

    return { selected: 'continue', value: true, hasTextInput: false };
  }

  private async promptUser(config: CheckpointConfig): Promise<CheckpointResponse> {
    if (!this.__context?.checkpointPrompter) {
      throw new CatalystError(
        'No checkpoint prompter available for interactive mode',
        'CheckpointPrompterMissing',
        'Ensure the engine is configured with a CheckpointPrompter for manual execution'
      );
    }

    const displayOptions: CheckpointDisplayOption[] = [];

    if (config.options) {
      for (let i = 0; i < config.options.length; i++) {
        const opt = config.options[i];
        const { displayLabel, accelerator } = parseAccelerator(opt.label);
        displayOptions.push({
          key: opt.key,
          label: displayLabel,
          description: opt.description,
          emphasis: opt.emphasis,
          number: i + 1,
          accelerator,
          allowText: opt.allowText,
        });
      }
    }

    const promptResponse = await this.__context.checkpointPrompter.prompt({
      message: config.message,
      context: config.context,
      options: displayOptions,
      multiSelect: config.multiSelect ?? false,
      timeout: config.timeout,
      defaultKey: config.default,
      header: config.header,
      headerColor: config.headerColor,
    });

    // Map back to option values if not text input
    if (!promptResponse.hasTextInput && config.options) {
      const selectedKeys = Array.isArray(promptResponse.selected)
        ? promptResponse.selected
        : [promptResponse.selected];

      const values = selectedKeys.map(key => {
        const opt = config.options!.find(o => o.key === key);
        return opt?.value ?? key;
      });

      return {
        selected: promptResponse.selected,
        value: Array.isArray(promptResponse.selected) ? values : values[0],
        hasTextInput: false,
      };
    }

    return promptResponse;
  }
}
