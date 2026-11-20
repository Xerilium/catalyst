/**
 * Schedule command implementation.
 *
 * @req FR:scheduling/cli.@cli
 * @req FR:scheduling/cli.list
 * @req FR:scheduling/cli.status
 * @req FR:scheduling/cli.explain
 * @req FR:scheduling/cli.run
 * @req FR:scheduling/cli.run.stop
 * @req FR:scheduling/cli.pause
 * @req FR:scheduling/cli.pause.resume
 * @req FR:scheduling/cli.pause.all
 * @req FR:scheduling/cli.json
 * @req FR:scheduling/cli.unknown
 * @req FR:scheduling/cli.scope
 * @req FR:scheduling/cli.scope.pick
 * @req FR:scheduling/tick.@cli
 * @req FR:scheduling/worker.@cli
 * @req FR:scheduling/install.@cli
 * @req FR:scheduling/install.approval
 * @req FR:scheduling/install.approval.no-tty
 * @req FR:scheduling/install.idempotent
 * @req FR:scheduling/install.uninstall
 * @req FR:scheduling/install.uninstall.all
 * @req FR:scheduling/install.doctor
 * @req FR:scheduling/install.doctor.stale
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';
import type { ScheduleOptions } from '../types';
import { CatalystError } from '../../core/errors';
import type { LedgerEvent, LoadedSchedule } from '../../scheduling/types';
import type { Runtime } from '../../scheduling/runtime';
import { tick, runNow } from '../../scheduling/tick';
import { runWorker } from '../../scheduling/worker';
import { enumerateSlots, machineTz } from '../../scheduling/slots';
import { FsStore, stateRoot } from '../../scheduling/adapters/fs-store';
import { FsScheduleSource } from '../../scheduling/adapters/fs-source';
import { NodeProcess } from '../../scheduling/adapters/node-process';
import { buildCommands } from '../../scheduling/adapters/commands';
import { Registry } from '../../scheduling/adapters/registry';
import { checkoutRoot as findCheckoutRoot, isDefaultBranch } from '../../scheduling/adapters/git';
import { applyInstall, applyUninstall, isInstalled, renderEntry, type InstallContext } from '../../scheduling/installers';

export type { Runtime } from '../../scheduling/runtime';

const STALE_TICK_MS = 15 * 60_000;
const iso = (ms: number): string => new Date(ms).toISOString();

const invalid = (message: string, guidance: string): CatalystError => new CatalystError(message, 'InvalidInput', guidance);

/** Next slot of a schedule after `now`, searching outward. */
function nextSlot(s: LoadedSchedule, now: number): number | undefined {
  for (const span of [3_600_000, 86_400_000, 32 * 86_400_000, 400 * 86_400_000]) {
    const slots = enumerateSlots(s.on, s.tz ?? machineTz(), now, now + span);
    if (slots.length > 0) { return slots[0]; }
  }
  return undefined;
}

const lastEvent = (events: LedgerEvent[]): LedgerEvent | undefined =>
  [...events].reverse().find((e) => e.type !== 'due' && e.type !== 'retry');

function find(rt: Runtime, id: string | undefined, options: ScheduleOptions = {}): LoadedSchedule {
  if (!id) { throw invalid('No schedule ID provided', 'Usage: catalyst schedule <status|explain|run> <id>'); }
  const all = rt.deps.source.load().schedules.filter((s) => s.id === id);
  const matches = options.scope ? all.filter((s) => s.scopeKey === options.scope) : all;
  if (matches.length === 0) { throw invalid(`Schedule "${id}" not found`, 'Run `catalyst schedule list` to see schedule IDs.'); }
  if (matches.length > 1) {
    throw invalid(`Schedule "${id}" exists in ${matches.length} scopes`, `Pass --scope with one of: ${matches.map((s) => s.scopeKey).join(', ')}`);
  }
  return matches[0];
}

function list(rt: Runtime, options: ScheduleOptions): void {
  const now = rt.deps.clock.now();
  const loaded = rt.deps.source.load();
  const rows = loaded.schedules.map((s) => {
    const label = s.scope === 'repo' && s.root ? `repo:${path.basename(s.root)}` : s.scope;
    const last = lastEvent(rt.deps.store.events(s.scopeKey, s.id));
    const next = nextSlot(s, now);
    return {
      id: s.id, scope: label, scopeKey: s.scopeKey, next: next ? iso(next) : '-', last: last ? last.type : '-',
      state: !s.enabled ? 'disabled' : rt.deps.store.state(s.scopeKey, s.id).paused ? 'paused' : 'active',
    };
  });
  if (options.json) {
    rt.out(JSON.stringify({ schedules: rows, errors: loaded.errors, warnings: loaded.warnings }));
    return;
  }
  const w = (k: 'id' | 'scope' | 'next' | 'last'): number => Math.max(k.length, ...rows.map((r) => r[k].length));
  const pad = (v: string, n: number): string => v.padEnd(n);
  rt.out(`${pad('ID', w('id'))}  ${pad('SCOPE', w('scope'))}  ${pad('NEXT', w('next'))}  LAST`);
  for (const r of rows) {
    rt.out(`${pad(r.id, w('id'))}  ${pad(r.scope, w('scope'))}  ${pad(r.next, w('next'))}  ${r.last}${r.state === 'active' ? '' : ` (${r.state})`}`);
  }
  for (const e of loaded.errors) { rt.out(`error: ${e}`); }
  for (const x of loaded.warnings) { rt.out(`warning: ${x}`); }
}

function eventLine(e: LedgerEvent): string {
  return `${e.t}  ${e.type.padEnd(9)} ${e.key}${e.reason ? `  ${e.reason}` : ''}`;
}

function status(rt: Runtime, id: string | undefined, options: ScheduleOptions): void {
  const s = find(rt, id, options);
  const st = rt.deps.store.state(s.scopeKey, s.id);
  const events = rt.deps.store.events(s.scopeKey, s.id);
  const last = lastEvent(events);
  if (options.json) {
    rt.out(JSON.stringify({ id: s.id, scope: s.scope, enabled: s.enabled, state: st, last: last ?? null }));
    return;
  }
  rt.out(`${s.id} (${s.scope})`);
  rt.out(`  enabled      ${s.enabled ? 'yes' : 'no'}`);
  rt.out(`  paused       ${st.paused ? 'yes' : 'no'}`);
  rt.out(`  failures     ${st.failures}`);
  rt.out(`  last tick    ${st.lastTick ? iso(st.lastTick) : 'never'}`);
  rt.out(`  last run     ${last ? eventLine(last) : 'none'}`);
}

function explain(rt: Runtime, id: string | undefined, options: ScheduleOptions): void {
  const s = find(rt, id, options);
  const now = rt.deps.clock.now();
  const st = rt.deps.store.state(s.scopeKey, s.id);
  const recent = rt.deps.store.events(s.scopeKey, s.id).slice(-10);
  const next = nextSlot(s, now);
  const warnings = rt.deps.source.load().warnings.filter((w) => w.includes(s.id) || (s.root !== undefined && w.includes(s.root)));
  const blockers = [
    rt.deps.store.stopped() ? 'STOP file present: nothing starts' : '',
    !s.enabled ? 'schedule is disabled' : '',
    st.paused ? 'schedule is paused' : '',
    s.host && s.host !== rt.deps.host ? `pinned to host ${s.host}` : '',
  ].filter(Boolean);
  if (options.json) {
    rt.out(JSON.stringify({ id: s.id, blockers, warnings, next: next ? iso(next) : null, recent }));
    return;
  }
  rt.out(`${s.id} (${s.scope})`);
  for (const b of blockers) { rt.out(`  blocked: ${b}`); }
  for (const w of warnings) { rt.out(`  warning: ${w}`); }
  rt.out(`  next slot: ${next ? iso(next) : 'none'}`);
  rt.out('  recent events:');
  for (const e of recent) { rt.out(`    ${eventLine(e)}`); }
  if (recent.length === 0) { rt.out('    none'); }
}

function setPaused(rt: Runtime, id: string | undefined, paused: boolean, options: ScheduleOptions): void {
  const targets = options.all ? rt.deps.source.load().schedules : [find(rt, id, options)];
  for (const s of targets) {
    const st = rt.deps.store.state(s.scopeKey, s.id);
    rt.deps.store.saveState(s.scopeKey, s.id, { ...st, paused, ...(paused ? {} : { failures: 0 }) });
  }
  rt.out(`${paused ? 'Paused' : 'Resumed'} ${targets.map((s) => s.id).join(', ') || 'nothing'}`);
}

async function install(rt: Runtime, options: ScheduleOptions): Promise<void> {
  rt.out(`Heartbeat entry: ${rt.os.entry.path ?? '(OS scheduler)'}`);
  rt.out(rt.os.entry.content.trimEnd());
  if (!options.yes) {
    if (!rt.interactive) {
      throw invalid('Install needs approval', 'Run in a terminal, or pass --yes to approve the entry above.');
    }
    if (!(await rt.confirm('Install this entry and register this checkout?'))) {
      rt.out('Nothing installed.');
      return;
    }
  }
  const result = rt.os.install();
  rt.registry.add(rt.checkoutRoot);
  rt.out(`${result === 'installed' ? 'Installed' : 'Entry unchanged'}; registered ${rt.checkoutRoot}`);
}

function uninstall(rt: Runtime, options: ScheduleOptions): void {
  if (options.all) { rt.registry.clear(); } else { rt.registry.remove(rt.checkoutRoot); }
  if (rt.registry.roots().length === 0) {
    rt.os.uninstall();
    rt.out('Removed the heartbeat entry.');
  } else {
    rt.out(`Unregistered ${rt.checkoutRoot}; the entry stays for ${rt.registry.roots().length} other checkout(s).`);
  }
}

function doctor(rt: Runtime): void {
  const d = rt.diag();
  const last = rt.heartbeat.last();
  const age = last === undefined ? undefined : rt.deps.clock.now() - last;
  rt.out(`OS entry      ${rt.os.isInstalled() ? 'installed' : 'missing'}`);
  rt.out(`env file      ${d.envFile}`);
  rt.out(`state folder  ${d.stateWritable ? 'ok' : 'not writable'}`);
  rt.out(`checkouts     ${rt.registry.roots().length} registered`);
  rt.out(`last tick     ${age === undefined ? 'never' : `${Math.round(age / 60_000)}m ago${age > STALE_TICK_MS ? ' (stale)' : ''}`}`);
}

async function exec(rt: Runtime, id: string | undefined, options: ScheduleOptions): Promise<void> {
  const s = rt.deps.source.load().schedules.find((x) => x.id === id && (!options.scope || x.scopeKey === options.scope));
  if (!s || !options.key || !options.slot) { throw invalid(`Schedule "${id}" not found`, 'This command is internal; use `catalyst schedule run <id>`.'); }
  const failures = rt.deps.store.events(s.scopeKey, s.id).filter((e) => e.key === options.key && (e.type === 'failed' || e.type === 'timeout')).length;
  await runWorker(rt.deps, { schedule: s, key: options.key, slot: Number(options.slot), ...(failures > 0 ? { attempt: failures + 1 } : {}) });
}

/** Execute one `catalyst schedule` action. */
export async function scheduleCommand(
  action: string, id: string | undefined, options: ScheduleOptions, runtime: Runtime = createRuntime()
): Promise<void> {
  const rt = runtime;
  switch (action) {
    case 'list': return list(rt, options);
    case 'status': return status(rt, id, options);
    case 'explain': return explain(rt, id, options);
    case 'run': {
      const s = find(rt, id, options);
      const r = runNow(rt.deps, s);
      if ('blocked' in r) { throw invalid(`Schedule "${s.id}" did not start: ${r.blocked}`, 'Check `catalyst schedule explain`.'); }
      rt.out(`Started ${r.key}`);
      return;
    }
    case 'pause': return setPaused(rt, id, true, options);
    case 'resume': return setPaused(rt, id, false, options);
    case 'tick': {
      const result = await tick(rt.deps);
      rt.heartbeat.touch();
      const seen = new Set(rt.heartbeat.warnings.read());
      for (const line of [...result.errors, ...result.warnings.filter((w) => !seen.has(w))]) { rt.err(line); }
      rt.heartbeat.warnings.write(result.warnings);
      return;
    }
    case 'exec': return exec(rt, id, options);
    case 'install': return install(rt, options);
    case 'uninstall': return uninstall(rt, options);
    case 'doctor': return doctor(rt);
    default:
      throw invalid(`Unknown schedule action "${action}"`, 'Use list, status, explain, run, pause, resume, tick, install, uninstall, or doctor.');
  }
}

/** Compose the real adapters. */
export function createRuntime(): Runtime {
  const home = os.homedir();
  const root = stateRoot(process.env, home);
  const configDir = path.join(home, '.config', 'catalyst');
  const envFile = path.join(configDir, 'env');
  const registry = new Registry(path.join(configDir, 'schedule.json'));
  const cli = path.resolve(process.argv[1]);
  const ctx: InstallContext = {
    platform: process.platform, node: process.execPath, cli, home, path: process.env.PATH ?? '', logDir: root,
  };
  const checkoutRoot = findCheckoutRoot(process.cwd());
  const beat = path.join(root, 'heartbeat');
  return {
    deps: {
      clock: { now: () => Date.now() },
      store: new FsStore(root),
      process: new NodeProcess(),
      host: os.hostname(),
      source: {
        load: () => new FsScheduleSource({ roots: registry.roots(), userDir: path.join(configDir, 'schedules'), isDefaultBranch }).load(),
      },
      commands: buildCommands({ node: process.execPath, cli, envFile, base: process.env, platform: process.platform, warn: (m) => console.error(m) }),
    },
    out: (line) => console.log(line),
    err: (line) => console.error(line),
    interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    confirm: (question) => new Promise((resolve) => {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question(`${question} [y/N] `, (a) => { rl.close(); resolve(/^y(es)?$/i.test(a.trim())); });
    }),
    checkoutRoot,
    registry,
    os: {
      entry: renderEntry(ctx),
      isInstalled: () => isInstalled(ctx),
      install: () => applyInstall(ctx),
      uninstall: () => applyUninstall(ctx),
    },
    heartbeat: {
      warnings: {
        read: () => { try { return JSON.parse(fs.readFileSync(`${beat}.warnings`, 'utf8')) as string[]; } catch { return []; } },
        write: (w) => { try { fs.mkdirSync(root, { recursive: true }); fs.writeFileSync(`${beat}.warnings`, JSON.stringify(w)); } catch { /* read-only state */ } },
      },
      touch: () => { try { fs.mkdirSync(root, { recursive: true }); fs.writeFileSync(beat, String(Date.now())); } catch { /* read-only state */ } },
      last: () => { try { return Number(fs.readFileSync(beat, 'utf8')) || undefined; } catch { return undefined; } },
    },
    diag: () => {
      let env: 'ok' | 'missing' | 'readable by others' = 'ok';
      try {
        if (process.platform !== 'win32' && (fs.statSync(envFile).mode & 0o077) !== 0) { env = 'readable by others'; }
      } catch { env = 'missing'; }
      let writable = true;
      try { fs.mkdirSync(root, { recursive: true }); fs.accessSync(root, fs.constants.W_OK); } catch { writable = false; }
      return { envFile: env, stateWritable: writable };
    },
  };
}
