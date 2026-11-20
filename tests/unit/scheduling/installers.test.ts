/**
 * Tests for OS heartbeat entries.
 */

import { renderEntry, installPlan, type InstallContext } from '../../../src/scheduling/installers';

const ctx = (platform: NodeJS.Platform): InstallContext => ({
  platform,
  node: '/usr/local/bin/node',
  cli: '/opt/catalyst/launchers/catalyst.js',
  home: platform === 'win32' ? 'C:\\Users\\u' : '/Users/u',
  path: '/usr/local/bin:/usr/bin',
  logDir: '/Users/u/.cache/catalyst/schedule',
});

describe('renderEntry', () => {
  // @req FR:scheduling/install.entry
  // @req FR:scheduling/install.entry.macos
  it('renders a launchd agent that runs tick every 300 seconds', () => {
    const e = renderEntry(ctx('darwin'));
    expect(e.path).toBe('/Users/u/Library/LaunchAgents/com.xerilium.catalyst.schedule.plist');
    expect(e.content).toContain('<key>StartInterval</key>');
    expect(e.content).toContain('<integer>300</integer>');
    expect(e.content).toContain('<string>/usr/local/bin/node</string>');
    expect(e.content).toContain('<string>/opt/catalyst/launchers/catalyst.js</string>');
    expect(e.content).toContain('<string>schedule</string>');
    expect(e.content).toContain('<string>tick</string>');
    expect(e.content).toContain('/usr/local/bin:/usr/bin');
    expect(e.content).not.toContain('RunAtLoad</key>\n  <false');
  });

  it('escapes XML in paths', () => {
    const e = renderEntry({ ...ctx('darwin'), cli: '/a&b/<c>.js' });
    expect(e.content).toContain('/a&amp;b/&lt;c&gt;.js');
  });

  // @req FR:scheduling/install.entry.linux
  it('renders one crontab line every five minutes', () => {
    const e = renderEntry(ctx('linux'));
    expect(e.content.trim().split('\n')).toHaveLength(2); // marker comment + the line
    expect(e.content).toContain('*/5 * * * * ');
    expect(e.content).toContain("'/usr/local/bin/node' '/opt/catalyst/launchers/catalyst.js' schedule tick");
    expect(e.content).toContain('# catalyst-schedule');
    expect(e.content).toContain("tick >>'/Users/u/.cache/catalyst/schedule/tick.log' 2>&1");
    expect(e.content).not.toContain('/dev/null');
  });

  // @req FR:scheduling/install.entry.windows
  it('renders a Task Scheduler command that starts when available', () => {
    const e = renderEntry(ctx('win32'));
    expect(e.content).toContain('Register-ScheduledTask');
    expect(e.content).toContain('-RepetitionInterval (New-TimeSpan -Minutes 5)');
    expect(e.content).toContain('-RepetitionDuration');
    expect(e.content).toContain('catalyst-schedule');
    expect(e.content).toContain('-StartWhenAvailable');
  });
});

describe('installPlan', () => {
  // @req FR:scheduling/install.entry
  it('plans file write and launchctl on macOS', () => {
    const plan = installPlan(ctx('darwin'));
    expect(plan.commands.map((c) => c.file)).toEqual(['launchctl']);
    expect(plan.uninstall.map((c) => c.file)).toEqual(['launchctl']);
  });

  it('plans a crontab merge on Linux that replaces only the marked block', () => {
    const plan = installPlan(ctx('linux'));
    expect(plan.mergeCrontab?.('0 1 * * * other\n')).toBe(`0 1 * * * other\n${renderEntry(ctx('linux')).content}`);
    const again = plan.mergeCrontab!(`0 1 * * * other\n${renderEntry(ctx('linux')).content}`);
    expect(again.match(/schedule tick/g)).toHaveLength(1);
    expect(plan.removeCrontab!(again)).toBe('0 1 * * * other\n');
  });
});

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { applyInstall } from '../../../src/scheduling/installers';

describe('applyInstall', () => {
  // @req FR:scheduling/install.idempotent
  it('removes the plist when launchctl bootstrap fails, so a retry installs again', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sched-home-'));
    try {
      const c = { ...ctx('darwin'), home, logDir: path.join(home, 'log') };
      const plist = renderEntry(c).path!;
      const failing = (spec: { args: string[] }) => { if (spec.args[0] === 'bootstrap') { throw new Error('boom'); } return ''; };
      expect(() => applyInstall(c, failing)).toThrow('boom');
      expect(fs.existsSync(plist)).toBe(false);
      expect(applyInstall(c, () => '')).toBe('installed');
      expect(applyInstall(c, () => '')).toBe('unchanged');
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  // @req FR:scheduling/install.idempotent
  it('restores the previous plist and reloads it when an upgrade fails to bootstrap', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sched-home-'));
    try {
      const c = { ...ctx('darwin'), home, logDir: path.join(home, 'log') };
      const plist = renderEntry(c).path!;
      fs.mkdirSync(path.dirname(plist), { recursive: true });
      fs.writeFileSync(plist, 'old-entry');
      const calls: string[] = [];
      const failing = (spec: { args: string[] }) => { calls.push(spec.args[0]); if (spec.args[0] === 'bootstrap') { throw new Error('boom'); } return ''; };
      expect(() => applyInstall(c, failing)).toThrow('boom');
      expect(fs.readFileSync(plist, 'utf8')).toBe('old-entry');
      expect(calls.filter((x) => x === 'bootstrap')).toHaveLength(2); // new entry, then the old one again
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });
});
