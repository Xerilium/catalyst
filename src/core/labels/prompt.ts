/**
 * Minimal terminal prompt for label setup
 */

import * as fs from 'fs';
import * as readline from 'readline';
import type { Readable, Writable } from 'stream';

export interface Prompt {
  choose(question: string, options: string[], defaultOption: string): Promise<string>;
  confirm(question: string): Promise<boolean>;
  close(): void;
}

export function createPrompt(input: Readable, output: Writable): Prompt {
  const rl = readline.createInterface({ input, output, terminal: false });
  const ask = (text: string) =>
    new Promise<string>(resolve => rl.question(text, answer => resolve(answer.trim())));

  return {
    async choose(question, options, defaultOption) {
      const list = options.map((o, i) => `${i + 1}) ${o}`).join('  ');
      const answer = (await ask(`${question}\n  ${list}  [${defaultOption}]: `)).toLowerCase();
      return options[Number(answer) - 1] ?? options.find(o => o === answer) ?? defaultOption;
    },
    async confirm(question) {
      return /^y(es)?$/i.test(await ask(`${question} [y/N]: `));
    },
    close: () => rl.close(),
  };
}

export interface TerminalEnv {
  stdin: Readable & { isTTY?: boolean };
  stdout: Writable;
  platform: string;
  /** Opens the controlling terminal; throws when there is none. */
  openTty: (path: string) => { input: Readable; output: Writable };
}

const defaultEnv: TerminalEnv = {
  stdin: process.stdin,
  stdout: process.stdout,
  platform: process.platform,
  openTty: path => ({
    input: fs.createReadStream('', { fd: fs.openSync(path, 'r') }),
    output: fs.createWriteStream('', { fd: fs.openSync(path, 'w') }),
  }),
};

/**
 * Returns a prompt on the terminal, or undefined when none is reachable.
 *
 * @req FR:pr-labels/ask.tty
 */
export function createTerminalPrompt(env: TerminalEnv = defaultEnv): Prompt | undefined {
  if (env.stdin.isTTY) {
    return createPrompt(env.stdin, env.stdout);
  }
  try {
    const { input, output } = env.openTty(env.platform === 'win32' ? 'CON' : '/dev/tty');
    return createPrompt(input, output);
  } catch {
    // Source: no controlling terminal (CI, detached process)
    // Reason: prompting is impossible, not an error
    // Action: return undefined so setup falls back to the non-interactive default
    return undefined;
  }
}
