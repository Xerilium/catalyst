/**
 * @req FR:playbook-engine/execution.playbook-output
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import type { Playbook, PlaybookAction, PlaybookActionResult } from '@playbooks/types';
import { PlaybookProvider } from '@playbooks/registry/playbook-provider';
import { Engine } from '@playbooks/engine/engine';
import type { CheckpointPrompter, CheckpointPromptConfig, CheckpointResponse } from '@playbooks/engine/checkpoint-prompter';
import { LogManager } from '@core/logging';
import type { Logger } from '@core/logging';

class NoopPrompter implements CheckpointPrompter {
  async prompt(_config: CheckpointPromptConfig): Promise<CheckpointResponse> {
    return { selected: 'continue', value: true, hasTextInput: false };
  }
}

function mockLogger(): Logger {
  return {
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  };
}

class CaptureLoggerAction implements PlaybookAction {
  static readonly actionType = 'capture-logger';
  private static captured: Logger | undefined;

  async execute(): Promise<PlaybookActionResult> {
    CaptureLoggerAction.captured = LogManager.current();
    return { code: 'Success', message: 'captured', value: null };
  }

  static consume(): Logger | undefined {
    const v = CaptureLoggerAction.captured;
    CaptureLoggerAction.captured = undefined;
    return v;
  }
}

describe('Engine logger scope', () => {
  beforeEach(() => {
    LogManager.reset();
    PlaybookProvider.resetInstance();
    const provider = PlaybookProvider.getInstance();
    provider.registerAction('capture-logger', CaptureLoggerAction);
  });

  const minimalPlaybook: Playbook = {
    name: 'logger-scope-test',
    description: 'captures active logger during execution',
    owner: 'test',
    steps: [{ action: 'capture-logger', config: {} }],
  };

  it('log actions inside a run resolve to the engine-provided logger', async () => {
    const framework = mockLogger();
    const playbookLogger = mockLogger();
    LogManager.setFramework(framework);

    const engine = new Engine(undefined, undefined, undefined, undefined, new NoopPrompter(), playbookLogger);
    await engine.run(minimalPlaybook);

    expect(CaptureLoggerAction.consume()).toBe(playbookLogger);
  });

  it('calls outside a run resolve to the framework logger', async () => {
    const framework = mockLogger();
    const playbookLogger = mockLogger();
    LogManager.setFramework(framework);

    const engine = new Engine(undefined, undefined, undefined, undefined, new NoopPrompter(), playbookLogger);
    await engine.run(minimalPlaybook);

    expect(LogManager.current()).toBe(framework);
  });

  it('defaults to a distinct logger instance when none provided', async () => {
    const framework = mockLogger();
    LogManager.setFramework(framework);

    const engine = new Engine(undefined, undefined, undefined, undefined, new NoopPrompter());
    await engine.run(minimalPlaybook);

    const captured = CaptureLoggerAction.consume();
    expect(captured).toBeDefined();
    expect(captured).not.toBe(framework);
  });
});
