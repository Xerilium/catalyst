/**
 * Tests for the filesystem, process, and command adapters.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FsStore, stateRoot } from '../../../src/scheduling/adapters/fs-store';
import { FsScheduleSource, repoScopeKey } from '../../../src/scheduling/adapters/fs-source';
import { NodeProcess } from '../../../src/scheduling/adapters/node-process';
import { buildCommands, buildEnv, parseEnvFile } from '../../../src/scheduling/adapters/commands';
import { isDefaultBranch } from '../../../src/scheduling/adapters/git';
import { Registry } from '../../../src/scheduling/adapters/registry';
import { sched } from './fakes';

let tmp: string;
beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sched-')); });
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('FsStore', () => {
  // @req FR:scheduling/ledger.@file
  // @req FR:scheduling/ledger.append
  it('appends one JSON line per event and filters by schedule', () => {
    const store = new FsStore(tmp);
    store.append('repo-a', { t: 't1', schedule: 'a', type: 'due', key: 'a@1' });
    store.append('repo-a', { t: 't2', schedule: 'b', type: 'done', key: 'b@1' });
    store.append('repo-a', { t: 't3', schedule: 'a', type: 'done', key: 'a@1' });
    const lines = fs.readFileSync(path.join(tmp, 'repo-a', 'runs.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(store.events('repo-a', 'a').map((e) => e.type)).toEqual(['due', 'done']);
  });

  it('ignores a torn last line', () => {
    const store = new FsStore(tmp);
    store.append('s', { t: 't', schedule: 'a', type: 'due', key: 'k' });
    fs.appendFileSync(path.join(tmp, 's', 'runs.jsonl'), '{"t":"x","sch');
    expect(store.events('s', 'a')).toHaveLength(1);
  });

  // @req FR:scheduling/ledger.state
  it('keeps state per schedule with a default', () => {
    const store = new FsStore(tmp);
    expect(store.state('s', 'a')).toEqual({ paused: false, failures: 0 });
    store.saveState('s', 'a', { paused: true, failures: 3, firstTick: 5, lastTick: 6 });
    expect(new FsStore(tmp).state('s', 'a')).toEqual({ paused: true, failures: 3, firstTick: 5, lastTick: 6 });
    expect(fs.existsSync(path.join(tmp, 's', 'state', 'a.json'))).toBe(true);
  });

  it('keeps one lock per schedule', () => {
    const store = new FsStore(tmp);
    expect(store.lock('s', 'a')).toBeUndefined();
    store.setLock('s', 'a', { pid: 9, key: 'k', started: 1 });
    expect(store.lock('s', 'a')).toEqual({ pid: 9, key: 'k', started: 1 });
    store.clearLock('s', 'a');
    expect(store.lock('s', 'a')).toBeUndefined();
  });

  // @req FR:scheduling/tick.stop
  it('reports STOP when the file exists', () => {
    const store = new FsStore(tmp);
    expect(store.stopped()).toBe(false);
    fs.writeFileSync(path.join(tmp, 'STOP'), '');
    expect(store.stopped()).toBe(true);
  });

  // @req FR:scheduling/ledger.@file.override
  it('moves with CATALYST_SCHEDULE_STATE', () => {
    expect(stateRoot({ CATALYST_SCHEDULE_STATE: '/x/y' }, '/home/u')).toBe('/x/y');
    expect(stateRoot({}, '/home/u')).toBe(path.join('/home/u', '.cache', 'catalyst', 'schedule'));
  });
});

describe('FsScheduleSource', () => {
  const yaml = (id: string) => `id: ${id}\non: [{ every: 1h }]\nrun: { playbook: p }\n`;
  const mk = (root: string, id: string, dir = '.xe/schedules') => {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
    fs.writeFileSync(path.join(root, dir, `${id}.yaml`), yaml(id));
  };

  // @req FR:scheduling/file.@yaml
  // @req FR:scheduling/tick.input
  it('loads user-scope and registered repo schedules', () => {
    const repo = path.join(tmp, 'repo');
    const user = path.join(tmp, 'user');
    mk(repo, 'a');
    fs.mkdirSync(user);
    fs.writeFileSync(path.join(user, 'b.yaml'), yaml('b'));
    const r = new FsScheduleSource({ roots: [repo], userDir: user, isDefaultBranch: () => true }).load();
    expect(r.schedules.map((s) => [s.id, s.scope, s.scopeKey])).toEqual([
      ['b', 'user', 'user'],
      ['a', 'repo', repoScopeKey(repo)],
    ]);
    expect(r.schedules[1].root).toBe(repo);
  });

  // @req FR:scheduling/file.default-branch
  it('skips repo schedules off the default branch and says so', () => {
    const repo = path.join(tmp, 'repo');
    mk(repo, 'a');
    const r = new FsScheduleSource({ roots: [repo], userDir: path.join(tmp, 'none'), isDefaultBranch: () => false }).load();
    expect(r.schedules).toEqual([]);
    expect(r.warnings.join()).toMatch(/default branch/);
  });

  // @req FR:scheduling/file.invalid
  it('keeps valid schedules when one file is invalid', () => {
    const repo = path.join(tmp, 'repo');
    mk(repo, 'a');
    fs.writeFileSync(path.join(repo, '.xe/schedules/bad.yaml'), 'id: bad\non: []\n');
    const r = new FsScheduleSource({ roots: [repo], userDir: path.join(tmp, 'none'), isDefaultBranch: () => true }).load();
    expect(r.schedules.map((s) => s.id)).toEqual(['a']);
    expect(r.errors.join()).toMatch(/bad\.yaml/);
  });

  it('warns about a registered root that no longer exists', () => {
    const r = new FsScheduleSource({ roots: [path.join(tmp, 'gone')], userDir: path.join(tmp, 'none'), isDefaultBranch: () => true }).load();
    expect(r.warnings.join()).toMatch(/gone/);
  });

  it('rejects the same id twice in one scope key', () => {
    const user = path.join(tmp, 'user');
    fs.mkdirSync(user);
    fs.writeFileSync(path.join(user, 'a.yaml'), yaml('a'));
    fs.writeFileSync(path.join(user, 'a.yml'), yaml('a'));
    const r = new FsScheduleSource({ roots: [], userDir: user, isDefaultBranch: () => true }).load();
    expect(r.schedules).toHaveLength(1);
    expect(r.errors.join()).toMatch(/duplicate/);
  });
});

describe('isDefaultBranch', () => {
  const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, stdio: 'pipe' });
  // @req FR:scheduling/file.default-branch
  it('is true on main and false on another branch', () => {
    git(tmp, 'init', '-q', '-b', 'main');
    git(tmp, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'x');
    expect(isDefaultBranch(tmp)).toBe(true);
    git(tmp, 'checkout', '-q', '-b', 'feature');
    expect(isDefaultBranch(tmp)).toBe(false);
  });
  it('is false outside a git repo', () => {
    expect(isDefaultBranch(tmp)).toBe(false);
  });
});

describe('NodeProcess', () => {
  const p = new NodeProcess();
  const node = process.execPath;

  it('captures stdout and exit code', async () => {
    const r = await p.exec({ file: node, args: ['-e', 'console.log("hi"); process.exit(3)'] });
    expect(r).toMatchObject({ code: 3, timedOut: false });
    expect(r.stdout).toContain('hi');
  });

  // @req FR:scheduling/worker.timeout
  it('kills the whole tree on timeout', async () => {
    const marker = path.join(tmp, 'alive');
    const child = `setTimeout(()=>require("fs").writeFileSync(${JSON.stringify(marker)},"x"),1500)`;
    const parent = `require("child_process").spawn(process.execPath,["-e",${JSON.stringify(child)}],{stdio:"inherit"});setInterval(()=>{},1000)`;
    const r = await p.exec({ file: node, args: ['-e', parent], timeoutMs: 400 });
    expect(r.timedOut).toBe(true);
    await new Promise((res) => setTimeout(res, 1800));
    expect(fs.existsSync(marker)).toBe(false);
  }, 10_000);

  it('reports a missing program as a non-zero result', async () => {
    const r = await p.exec({ file: path.join(tmp, 'nope'), args: [] });
    expect(r.code).not.toBe(0);
  });

  it('starts a detached process and tracks it', async () => {
    const { pid } = p.spawnDetached({ file: node, args: ['-e', 'setTimeout(()=>{},800)'] });
    expect(p.isAlive(pid)).toBe(true);
    await new Promise((res) => setTimeout(res, 1500));
    expect(p.isAlive(pid)).toBe(false);
  });
});

describe('env and commands', () => {
  // @req FR:scheduling/tick.env
  it('parses KEY=VALUE lines, comments, quotes, and export', () => {
    expect(parseEnvFile('# c\nA=1\nexport B="two words"\nC=\'x\'\n\nbad line\n')).toEqual({ A: '1', B: 'two words', C: 'x' });
  });

  it('passes only base variables and the listed names from the env file', () => {
    const file = path.join(tmp, 'env');
    fs.writeFileSync(file, 'GH_TOKEN=abc\nOTHER=zzz\n', { mode: 0o600 });
    const { env } = buildEnv(sched({ env: ['GH_TOKEN', 'MISSING'] }), {
      envFile: file, base: { PATH: '/bin', HOME: '/h', SECRET: 's' },
    });
    expect(env).toEqual({ PATH: '/bin', HOME: '/h', GH_TOKEN: 'abc' });
  });

  // @req FR:scheduling/tick.env-mode
  (process.platform === 'win32' ? it.skip : it)('ignores an env file others can read and warns', () => {
    const file = path.join(tmp, 'env');
    fs.writeFileSync(file, 'GH_TOKEN=abc\n');
    fs.chmodSync(file, 0o644);
    const { env, warnings } = buildEnv(sched({ env: ['GH_TOKEN'] }), { envFile: file, base: { PATH: '/bin' } });
    expect(env).toEqual({ PATH: '/bin' });
    expect(warnings.join()).toMatch(/readable/);
  });

  const cmds = buildCommands({ node: '/n', cli: '/cli.js', envFile: '/none', base: { PATH: '/bin' }, platform: 'darwin' });

  // @req FR:scheduling/tick.start.inputs
  // @req FR:scheduling/tick.start.cwd
  it('builds the catalyst run command with inputs and the repo cwd', () => {
    const spec = cmds.playbook(sched({ run: { playbook: 'pb', inputs: { a: '1', b: 'x y' } } }));
    expect(spec).toMatchObject({ file: '/n', cwd: '/repo', timeoutMs: 3600_000 });
    expect(spec.args).toEqual(['/cli.js', 'run', 'pb', '--input', 'a=1', '--input', 'b=x y']);
  });

  it('uses run.cwd for user scope', () => {
    const spec = cmds.playbook(sched({ scope: 'user', root: undefined, scopeKey: 'user', run: { playbook: 'pb', cwd: '/work/x' } }));
    expect(spec.cwd).toBe('/work/x');
  });

  // @req FR:scheduling/tick.gate
  it('runs a gate script by extension, from the repo, with the gate timeout', () => {
    const g = (script: string, timeout?: string) => cmds.gate(sched({ gate: { script, timeout } }))!;
    expect(g('.xe/g.sh')).toMatchObject({ file: 'bash', args: ['.xe/g.sh'], cwd: '/repo', timeoutMs: 30_000 });
    expect(g('.xe/g.js', '5m')).toMatchObject({ file: '/n', args: ['.xe/g.js'], timeoutMs: 300_000 });
    expect(g('.xe/g.ps1').file).toBe('pwsh');
    expect(g('.xe/g')).toMatchObject({ file: '.xe/g', args: [] });
  });

  it('runs a gate playbook through catalyst run', () => {
    const spec = cmds.gate(sched({ gate: { playbook: 'survey' } }))!;
    expect(spec.args).toEqual(['/cli.js', 'run', 'survey']);
  });

  it('has no gate command when the schedule has no gate', () => {
    expect(cmds.gate(sched())).toBeUndefined();
  });

  // @req FR:scheduling/worker.@cli
  it('builds the internal worker command', () => {
    const spec = cmds.worker(sched(), 'job@k', 42);
    expect(spec.args).toEqual(['/cli.js', 'schedule', 'exec', 'job', '--scope', 'repo-x', '--key', 'job@k', '--slot', '42']);
  });
});

describe('Registry', () => {
  // @req FR:scheduling/install.register
  it('registers and unregisters checkouts without duplicates', () => {
    const r = new Registry(path.join(tmp, 'schedule.json'));
    expect(r.roots()).toEqual([]);
    r.add('/a'); r.add('/b'); r.add('/a');
    expect(r.roots()).toEqual(['/a', '/b']);
    r.remove('/a');
    expect(new Registry(path.join(tmp, 'schedule.json')).roots()).toEqual(['/b']);
    r.clear();
    expect(r.roots()).toEqual([]);
  });
});
