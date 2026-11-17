/**
 * Tests for the stale-plugin warning.
 *
 * @req FR:cli.plugin-stale
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

  it('matches a project install from a subdirectory', () => {
    writeRecord(dir, [
      { scope: 'user', version: '0.3.0-dev' },
      { scope: 'project', projectPath: '/x', version: '0.4.0' },
    ]);
    expect(getStalePluginWarning('0.4.0', dir, '/x/sub/dir')).toBeUndefined();
    expect(getStalePluginWarning('0.4.0', dir, '/xy')).toBeDefined();
  });

  it('does not warn for a prerelease CLI', () => {
    writeRecord(dir, [{ scope: 'user', version: '0.4.0' }]);
    expect(getStalePluginWarning('0.4.1-dev', dir, '/x')).toBeUndefined();
  });

  it('reads CLAUDE_CONFIG_DIR by default', () => {
    writeRecord(dir, [{ scope: 'user', version: '0.3.0' }]);
    process.env.CLAUDE_CONFIG_DIR = dir;
    try {
      expect(getStalePluginWarning('0.4.0')).toContain('0.3.0');
    } finally {
      delete process.env.CLAUDE_CONFIG_DIR;
    }
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

  it('compares prerelease identifiers by SemVer precedence', () => {
    writeRecord(dir, [{ scope: 'user', version: '0.4.0-beta.1' }]);
    expect(getStalePluginWarning('0.4.0', dir, '/x')).toBeDefined();
    writeRecord(dir, [{ scope: 'user', version: '0.4.0-beta.2' }]);
    expect(getStalePluginWarning('0.4.0', dir, '/x')).toBeDefined();
    writeRecord(dir, [{ scope: 'user', version: '0.4.0-beta.10' }]);
    expect(getStalePluginWarning('0.4.0', dir, '/x')).toBeDefined();
  });

  it('ignores local installs for other projects', () => {
    writeRecord(dir, [
      { scope: 'user', version: '0.3.0' },
      { scope: 'local', projectPath: '/other', version: '0.4.0' },
    ]);
    expect(getStalePluginWarning('0.4.0', dir, '/x')).toContain('0.3.0');
    expect(getStalePluginWarning('0.4.0', dir, '/other')).toBeUndefined();
  });

  it('targets the scope of the stale install in the update command', () => {
    writeRecord(dir, [{ scope: 'project', projectPath: '/x', version: '0.3.0' }]);
    expect(getStalePluginWarning('0.4.0', dir, '/x')).toContain('catalyst@xerilium --scope project');
    writeRecord(dir, [{ scope: 'user', version: '0.3.0' }]);
    expect(getStalePluginWarning('0.4.0', dir, '/x')).toMatch(/catalyst@xerilium$/);
  });

  it('matches project paths through symlinks', () => {
    const real = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-real-'));
    const link = real + '-link';
    fs.symlinkSync(real, link);
    try {
      writeRecord(dir, [
        { scope: 'user', version: '0.3.0' },
        { scope: 'project', projectPath: real, version: '0.4.0' },
      ]);
      expect(getStalePluginWarning('0.4.0', dir, link)).toBeUndefined();
    } finally {
      fs.rmSync(link, { force: true });
      fs.rmSync(real, { recursive: true, force: true });
    }
  });
});
