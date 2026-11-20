/**
 * Tests for the plugin-vs-repo-pin check in the CLI entry point.
 *
 * @req FR:cli-engine/cli.plugin-pin
 */

import { main } from '../../src/cli/index';
import { checkPluginPin } from '../../src/ai/plugin/bootstrap';
import { LogManager } from '../../src/core/logging';

jest.mock('../../src/ai/plugin/bootstrap', () => ({
  ...jest.requireActual('../../src/ai/plugin/bootstrap'),
  checkPluginPin: jest.fn(),
}));

describe('plugin pin check in main()', () => {
  let stderr: string;
  beforeEach(() => {
    LogManager.reset();
    stderr = '';
    (checkPluginPin as jest.Mock).mockReset().mockReturnValue({ exitCode: 0 });
    jest.spyOn(process.stderr, 'write').mockImplementation(((chunk: string | Uint8Array) => {
      stderr += String(chunk);
      return true;
    }) as never);
    jest.spyOn(process.stdout, 'write').mockImplementation((() => true) as never);
    jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit ${code}`);
    }) as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([['check'], ['init']])('stops `catalyst %s` with exit 1 and the message', async command => {
    (checkPluginPin as jest.Mock).mockReturnValue({ exitCode: 1, message: 'plugin is stale' });
    await expect(main([command])).rejects.toThrow('exit 1');
    expect(stderr).toContain('plugin is stale');
  });

  it('warns on stderr and still runs the command when the check only warns', async () => {
    (checkPluginPin as jest.Mock).mockReturnValue({ exitCode: 0, message: 'local marketplace' });
    await main(['check', '--rules', 'nope-no-such-rule']).catch(() => undefined);
    expect(stderr).toContain('local marketplace');
  });

  it('does not check other commands', async () => {
    await main(['no-such-command']).catch(() => undefined);
    expect(checkPluginPin).not.toHaveBeenCalled();
  });

  it.each([['-q'], ['--quiet'], ['--json'], ['--version'], ['--help']])('is skipped with %s', async flag => {
    await main([flag, 'check']).catch(() => undefined);
    expect(checkPluginPin).not.toHaveBeenCalled();
  });
});
