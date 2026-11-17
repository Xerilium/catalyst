/**
 * Tests for the stale-plugin warning.
 *
 * @req FR:cli-engine/cli.plugin-stale
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getStalePluginWarning } from '../../../src/cli/utils/plugin-version';

function writeRecord(dir: string, entries: unknown, key = 'catalyst@xerilium'): void {
  fs.mkdirSync(path.join(dir, 'plugins'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'plugins', 'installed_plugins.json'),
    JSON.stringify({ version: 2, plugins: { [key]: entries } })
  );
}

describe('getStalePluginWarning', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-ver-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('warns with both versions and the fix when the plugin is older', () => {
    writeRecord(dir, [{ scope: 'user', version: '0.3.0-dev' }]);
    const msg = getStalePluginWarning('0.4.0', dir, '/x');
    expect(msg).toContain('0.3.0-dev');
    expect(msg).toContain('0.4.0');
    expect(msg).toContain('claude plugin update catalyst@xerilium');
  });

  it('treats a prerelease as older than its release', () => {
    writeRecord(dir, [{ scope: 'user', version: '0.4.0-dev' }]);
    expect(getStalePluginWarning('0.4.0', dir, '/x')).toBeDefined();
  });

  it('does not warn when the plugin is current or newer', () => {
    writeRecord(dir, [{ scope: 'user', version: '0.4.0' }]);
    expect(getStalePluginWarning('0.4.0', dir, '/x')).toBeUndefined();
    expect(getStalePluginWarning('0.3.3', dir, '/x')).toBeUndefined();
  });

  it('uses the newest applicable install and ignores other projects', () => {
    writeRecord(dir, [
      { scope: 'user', version: '0.3.0-dev' },
      { scope: 'project', projectPath: '/other', version: '0.1.0' },
      { scope: 'project', projectPath: '/x', version: '0.4.0' },
    ]);
    expect(getStalePluginWarning('0.4.0', dir, '/x')).toBeUndefined();
    expect(getStalePluginWarning('0.4.0', dir, '/y')).toContain('0.3.0-dev');
  });

  it('stays silent for a missing, corrupt, or unrecognized record', () => {
    expect(getStalePluginWarning('0.4.0', dir, '/x')).toBeUndefined();
    fs.mkdirSync(path.join(dir, 'plugins'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'plugins', 'installed_plugins.json'), '{nope');
    expect(getStalePluginWarning('0.4.0', dir, '/x')).toBeUndefined();
    writeRecord(dir, [{ scope: 'user', version: 'unknown' }]);
    expect(getStalePluginWarning('0.4.0', dir, '/x')).toBeUndefined();
    writeRecord(dir, [{ scope: 'user', version: '0.1.0' }], 'other@xerilium');
    expect(getStalePluginWarning('0.4.0', dir, '/x')).toBeUndefined();
    expect(getStalePluginWarning('0.0.0', dir, '/x')).toBeUndefined();
  });
});
