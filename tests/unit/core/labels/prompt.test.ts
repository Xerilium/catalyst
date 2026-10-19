/**
 * Unit tests for the terminal prompt (streams are injected)
 */

import { PassThrough } from 'stream';
import { createPrompt } from '../../../../src/core/labels/prompt';

function harness(answers: string[]) {
  const input = new PassThrough();
  const output = new PassThrough();
  const written: string[] = [];
  output.on('data', chunk => {
    written.push(String(chunk));
    const next = answers.shift();
    if (next !== undefined) setImmediate(() => input.write(`${next}\n`));
  });
  return { prompt: createPrompt(input, output), written };
}

describe('terminal prompt', () => {
  // @req FR:pr-labels/ask.cli
  it('returns the chosen option by number or name', async () => {
    const { prompt, written } = harness(['2', 'simple']);
    expect(await prompt.choose('Pick a style', ['key-value', 'simple'], 'key-value')).toBe(
      'simple',
    );
    expect(await prompt.choose('Pick a style', ['key-value', 'simple'], 'key-value')).toBe(
      'simple',
    );
    expect(written.join('')).toContain('[key-value]');
    prompt.close();
  });

  // @req FR:pr-labels/ask.cli
  it('falls back to the default on empty or unknown input', async () => {
    const { prompt } = harness(['', 'wat']);
    expect(await prompt.choose('Pick', ['key-value', 'simple'], 'key-value')).toBe('key-value');
    expect(await prompt.choose('Pick', ['key-value', 'simple'], 'key-value')).toBe('key-value');
    prompt.close();
  });

  // @req FR:pr-labels/ask.cli
  it('confirms on y or yes and declines otherwise', async () => {
    const { prompt } = harness(['y', 'YES', 'n', '']);
    expect(await prompt.confirm('Rename?')).toBe(true);
    expect(await prompt.confirm('Rename?')).toBe(true);
    expect(await prompt.confirm('Rename?')).toBe(false);
    expect(await prompt.confirm('Rename?')).toBe(false);
    prompt.close();
  });
});

describe('terminal selection', () => {
  const { createTerminalPrompt } = jest.requireActual(
    '../../../../src/core/labels/prompt',
  ) as typeof import('../../../../src/core/labels/prompt');
  const streams = () => ({ input: new PassThrough(), output: new PassThrough() });

  // @req FR:pr-labels/ask.tty
  it('uses standard input when it is a terminal', () => {
    const stdin = Object.assign(new PassThrough(), { isTTY: true });
    const openTty = jest.fn();
    const prompt = createTerminalPrompt({
      stdin,
      stdout: new PassThrough(),
      platform: 'linux',
      openTty,
    });
    expect(prompt).toBeDefined();
    expect(openTty).not.toHaveBeenCalled();
    prompt?.close();
  });

  // @req FR:pr-labels/ask.tty
  it('opens the controlling terminal when standard input is piped', () => {
    const openTty = jest.fn((_path: string) => streams());
    const env = { stdin: new PassThrough(), stdout: new PassThrough() };
    createTerminalPrompt({ ...env, platform: 'linux', openTty })?.close();
    createTerminalPrompt({ ...env, platform: 'win32', openTty })?.close();
    expect(openTty.mock.calls.map(c => c[0])).toEqual(['/dev/tty', 'CON']);
  });

  // @req FR:pr-labels/ask.non-interactive
  it('returns undefined when no terminal is reachable', () => {
    const openTty = () => {
      throw new Error('ENXIO');
    };
    expect(
      createTerminalPrompt({
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        platform: 'linux',
        openTty,
      }),
    ).toBeUndefined();
  });
});
