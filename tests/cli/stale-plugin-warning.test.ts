/**
 * Tests for when the CLI entry point emits the stale-plugin warning.
 *
 * @req FR:cli.plugin-stale
 */

import { main } from '../../src/cli/index';
import { getStalePluginWarning } from '../../src/cli/utils/plugin-version';

jest.mock('../../src/cli/utils/plugin-version');

describe('stale plugin warning in main()', () => {
  let stderr: string;
  beforeEach(() => {
    stderr = '';
    (getStalePluginWarning as jest.Mock).mockReturnValue('plugin is stale');
    jest.spyOn(process.stderr, 'write').mockImplementation(((chunk: string | Uint8Array) => {
      stderr += String(chunk);
      return true;
    }) as never);
    jest.spyOn(process.stdout, 'write').mockImplementation((() => true) as never);
    jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it('writes the warning to stderr on a normal invocation', async () => {
    await main(['no-such-command']).catch(() => undefined);
    expect(getStalePluginWarning).toHaveBeenCalledTimes(1);
    expect(stderr).toContain('Warning: plugin is stale');
  });

  it.each([['-q'], ['--quiet'], ['--json'], ['--version'], ['--help']])(
    'is silent with %s',
    async flag => {
      await main([flag, 'no-such-command']).catch(() => undefined);
      expect(stderr).not.toContain('plugin is stale');
    }
  );
});
