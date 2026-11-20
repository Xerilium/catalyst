/**
 * OS heartbeat entries: one launchd agent, crontab line, or scheduled task that runs `catalyst schedule tick`.
 *
 * @req FR:scheduling/install.entry
 * @req FR:scheduling/install.entry.macos
 * @req FR:scheduling/install.entry.linux
 * @req FR:scheduling/install.entry.windows
 * @req FR:scheduling/install.idempotent
 * @req FR:scheduling/install.uninstall
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { ExecSpec } from '../types';

export interface InstallContext {
  platform: NodeJS.Platform;
  /** Absolute node binary */
  node: string;
  /** Absolute Catalyst CLI entry */
  cli: string;
  home: string;
  /** PATH to hand the heartbeat (launchd and cron start with a bare one) */
  path: string;
  logDir: string;
}

export interface Entry {
  /** File the entry lives in, when it is a file */
  path?: string;
  content: string;
}

export interface Plan {
  entry: Entry;
  /** Run after the entry file is written */
  commands: ExecSpec[];
  /** Run to remove the entry */
  uninstall: ExecSpec[];
  mergeCrontab?: (current: string) => string;
  removeCrontab?: (current: string) => string;
}

export const LABEL = 'com.xerilium.catalyst.schedule';
export const TASK_NAME = 'catalyst-schedule';
const MARKER = '# catalyst-schedule';
const INTERVAL_SECONDS = 300;

const xml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sh = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`;
const ps = (s: string): string => `'${s.replace(/'/g, "''")}'`;

export function renderEntry(c: InstallContext): Entry {
  if (c.platform === 'darwin') {
    const args = [c.node, c.cli, 'schedule', 'tick'].map((a) => `    <string>${xml(a)}</string>`).join('\n');
    return {
      path: path.join(c.home, 'Library', 'LaunchAgents', `${LABEL}.plist`),
      content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${args}
  </array>
  <key>StartInterval</key>
  <integer>${INTERVAL_SECONDS}</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${xml(c.path)}</string>
  </dict>
  <key>StandardErrorPath</key>
  <string>${xml(path.join(c.logDir, 'tick.log'))}</string>
</dict>
</plist>
`,
    };
  }
  if (c.platform === 'win32') {
    return {
      content: [
        `$action = New-ScheduledTaskAction -Execute ${ps(c.node)} -Argument ${ps(`"${c.cli}" schedule tick`)}`,
        '$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)',
        '$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries',
        `Register-ScheduledTask -TaskName ${ps(TASK_NAME)} -Action $action -Trigger $trigger -Settings $settings -Force`,
        '',
      ].join('\n'),
    };
  }
  return {
    content: `${MARKER}\n*/5 * * * * PATH=${sh(c.path)} ${sh(c.node)} ${sh(c.cli)} schedule tick >>${sh(path.join(c.logDir, 'tick.log'))} 2>&1\n`,
  };
}

export function installPlan(c: InstallContext): Plan {
  const entry = renderEntry(c);
  if (c.platform === 'darwin') {
    const domain = `gui/${process.getuid?.() ?? 501}`;
    return {
      entry,
      commands: [{ file: 'launchctl', args: ['bootstrap', domain, entry.path!] }],
      uninstall: [{ file: 'launchctl', args: ['bootout', `${domain}/${LABEL}`] }],
    };
  }
  if (c.platform === 'win32') {
    return {
      entry,
      commands: [{ file: 'powershell', args: ['-NoProfile', '-Command', entry.content] }],
      uninstall: [{ file: 'powershell', args: ['-NoProfile', '-Command', `Unregister-ScheduledTask -TaskName ${ps(TASK_NAME)} -Confirm:$false`] }],
    };
  }
  const strip = (cur: string): string => {
    const lines = cur.split('\n');
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === MARKER) { i += 1; continue; }
      out.push(lines[i]);
    }
    return out.join('\n');
  };
  return {
    entry,
    commands: [],
    uninstall: [],
    mergeCrontab: (cur) => `${strip(cur).replace(/\n*$/, cur.trim() === '' ? '' : '\n')}${entry.content}`,
    removeCrontab: (cur) => strip(cur),
  };
}

const run = (spec: ExecSpec, input?: string): string =>
  execFileSync(spec.file, spec.args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] });

const readCrontab = (): string => {
  try { return run({ file: 'crontab', args: ['-l'] }); } catch { return ''; }
};

/** True when the OS entry is present. */
export function isInstalled(c: InstallContext): boolean {
  if (c.platform === 'darwin') { return fs.existsSync(renderEntry(c).path!); }
  if (c.platform === 'win32') {
    try { run({ file: 'powershell', args: ['-NoProfile', '-Command', `Get-ScheduledTask -TaskName ${ps(TASK_NAME)} | Out-Null`] }); return true; } catch { return false; }
  }
  return readCrontab().includes(MARKER);
}

/** Install or refresh the OS entry. Leaves an identical entry untouched. */
export function applyInstall(c: InstallContext, exec: (spec: ExecSpec, input?: string) => string = run): 'installed' | 'unchanged' {
  const plan = installPlan(c);
  if (c.platform === 'darwin') {
    const file = plan.entry.path!;
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === plan.entry.content) { return 'unchanged'; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.mkdirSync(c.logDir, { recursive: true });
    fs.writeFileSync(file, plan.entry.content);
    for (const u of plan.uninstall) { try { exec(u); } catch { /* not loaded yet */ } }
    try {
      for (const cmd of plan.commands) { exec(cmd); }
    } catch (e) {
      fs.rmSync(file, { force: true }); // a plist without a loaded agent would read as installed
      throw e;
    }
    return 'installed';
  }
  if (c.platform === 'win32') {
    for (const cmd of plan.commands) { exec(cmd); }
    return 'installed';
  }
  fs.mkdirSync(c.logDir, { recursive: true });
  const current = readCrontab();
  const merged = plan.mergeCrontab!(current);
  if (merged === current) { return 'unchanged'; }
  exec({ file: 'crontab', args: ['-'] }, merged);
  return 'installed';
}

/** Remove the OS entry. Safe to call when absent. */
export function applyUninstall(c: InstallContext): void {
  const plan = installPlan(c);
  if (c.platform === 'darwin') {
    for (const u of plan.uninstall) { try { run(u); } catch { /* not loaded */ } }
    fs.rmSync(plan.entry.path!, { force: true });
  } else if (c.platform === 'win32') {
    for (const u of plan.uninstall) { try { run(u); } catch { /* absent */ } }
  } else {
    const current = readCrontab();
    const next = plan.removeCrontab!(current);
    if (next !== current) { run({ file: 'crontab', args: ['-'] }, next); }
  }
}
