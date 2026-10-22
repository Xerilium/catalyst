/**
 * Tests for `catalyst check` registration in the CLI entry point.
 */

import { main } from '../../../src/cli/index';

describe('catalyst check registration', () => {
  // @req FR:cli-check/check.@cli
  it('registers `check [feature]` with a --rules option', async () => {
    let help = '';
    jest.spyOn(process.stdout, 'write').mockImplementation(((chunk: string | Uint8Array) => {
      help += String(chunk);
      return true;
    }) as never);
    jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
    // Commander exits after printing help; the mock turns that into a rejection.
    await main(['check', '--help']).catch(() => undefined);
    jest.restoreAllMocks();
    expect(help).toMatch(/Usage: catalyst check \[options\] \[feature\]/);
    expect(help).toContain('--rules <patterns>');
  });
});
