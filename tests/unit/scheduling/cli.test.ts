/**
 * Tests for `catalyst schedule` commands.
 */

import { scheduleCommand, type Runtime } from '../../../src/cli/commands/schedule';
import { CatalystError } from '../../../src/core/errors';
import { harness, sched } from './fakes';

const NOW = '2026-11-19T10:02:00Z';
const ms = (s: string) => Date.parse(s);

function runtime(over: Partial<Runtime> = {}, schedules = [sched()]) {
  const h = harness(schedules, NOW);
  h.store.saveState('repo-x', 'job', { firstTick: ms('2026-11-19T09:30:00Z'), lastTick: ms(NOW), paused: false, failures: 0 });
  const lines: string[] = [];
  const errs: string[] = [];
  const calls: string[] = [];
  let roots = ['/other'];
  let heartbeat: number | undefined;
  const rt: Runtime = {
    deps: h.deps,
    out: (l) => lines.push(l),
    err: (l) => errs.push(l),
    interactive: true,
    confirm: async () => true,
    checkoutRoot: '/repo',
    registry: {
      roots: () => roots,
      add: (r) => { roots = [...new Set([...roots, r])]; },
      remove: (r) => { roots = roots.filter((x) => x !== r); },
      clear: () => { roots = []; },
    },
    os: {
      entry: { path: '/x/plist', content: '<plist/>' },
      isInstalled: () => calls.includes('install'),
      install: () => { calls.push('install'); return 'installed'; },
      uninstall: () => { calls.push('uninstall'); },
    },
    heartbeat: { touch: () => { heartbeat = ms(NOW); }, last: () => heartbeat },
    diag: () => ({ envFile: 'ok', stateWritable: true }),
    ...over,
  };
  return { rt, h, lines, errs, calls, roots: () => roots };
}

const run = (rt: Runtime, action: string, id?: string, options = {}) => scheduleCommand(action, id, options, rt);

describe('schedule list/status/explain', () => {
  // @req FR:scheduling/cli.list
  // @req FR:scheduling/cli.@cli
  it('lists id, scope, next slot, last status', async () => {
    const { rt, h, lines } = runtime();
    h.store.append('repo-x', { t: '2026-11-19T10:00:00.000Z', schedule: 'job', type: 'done', key: 'job@k' });
    await run(rt, 'list');
    expect(lines.join('\n')).toMatch(/job\s+repo\s+2026-11-19T11:00:00.000Z\s+done/);
  });

  it('shows warnings from loading', async () => {
    const { rt, lines } = runtime();
    rt.deps.source = { load: () => ({ schedules: [sched()], errors: [], warnings: ['a.yaml: run.ai is true with no gate'] }) };
    await run(rt, 'list');
    expect(lines.join('\n')).toMatch(/run\.ai is true/);
  });

  // @req FR:scheduling/cli.json
  it('prints JSON when asked', async () => {
    const { rt, lines } = runtime();
    await run(rt, 'list', undefined, { json: true });
    const parsed = JSON.parse(lines.join('\n'));
    expect(parsed.schedules[0]).toMatchObject({ id: 'job', scope: 'repo', next: '2026-11-19T11:00:00.000Z' });
  });

  // @req FR:scheduling/cli.status
  it('prints the state and last run', async () => {
    const { rt, h, lines } = runtime();
    h.store.append('repo-x', { t: '2026-11-19T10:00:00.000Z', schedule: 'job', type: 'failed', key: 'job@k', reason: 'exit 1' });
    await run(rt, 'status', 'job');
    expect(lines.join('\n')).toMatch(/paused\s+no/);
    expect(lines.join('\n')).toMatch(/failed.*exit 1/);
  });

  // @req FR:scheduling/cli.explain
  it('explains why slots ran, skipped, or did not run', async () => {
    const { rt, h, lines } = runtime();
    h.store.append('repo-x', { t: '2026-11-19T10:00:00.000Z', schedule: 'job', type: 'skip', key: 'job@k', reason: 'nothing changed' });
    h.store.saveState('repo-x', 'job', { paused: true, failures: 0 });
    await run(rt, 'explain', 'job');
    const text = lines.join('\n');
    expect(text).toMatch(/skip.*nothing changed/);
    expect(text).toMatch(/paused/);
    expect(text).toMatch(/next/i);
  });

  // @req FR:scheduling/cli.unknown
  it('fails with InvalidInput for an unknown schedule', async () => {
    const { rt } = runtime();
    await expect(run(rt, 'status', 'nope')).rejects.toMatchObject({ code: 'InvalidInput', message: expect.stringContaining('nope') });
    await expect(run(rt, 'explain', undefined)).rejects.toBeInstanceOf(CatalystError);
  });
});

describe('schedule run/pause/resume', () => {
  // @req FR:scheduling/cli.run
  it('starts the schedule now without the gate', async () => {
    const { rt, h } = runtime({}, [sched({ gate: { script: '.xe/g.sh' } })]);
    await run(rt, 'run', 'job');
    expect(h.execs).toEqual([]);
    expect(h.spawned).toHaveLength(1);
    expect(h.store.log[0].key).toMatch(/^job@manual-/);
  });

  it('refuses to start a schedule that is already running', async () => {
    const { rt, h } = runtime();
    h.alive.add(5);
    h.store.setLock('repo-x', 'job', { pid: 5, key: 'k', started: h.now.value - 60_000 });
    await expect(run(rt, 'run', 'job')).rejects.toMatchObject({ code: 'InvalidInput' });
  });

  // @req FR:scheduling/cli.run.stop
  it('refuses a manual run while STOP exists', async () => {
    const { rt, h } = runtime();
    h.store.stop = true;
    await expect(run(rt, 'run', 'job')).rejects.toMatchObject({ code: 'InvalidInput', message: expect.stringContaining('STOP') });
    expect(h.spawned).toEqual([]);
  });

  // @req FR:scheduling/cli.pause
  // @req FR:scheduling/cli.pause.resume
  it('sets and clears the paused flag', async () => {
    const { rt, h } = runtime();
    await run(rt, 'pause', 'job');
    expect(h.store.state('repo-x', 'job').paused).toBe(true);
    await run(rt, 'resume', 'job');
    expect(h.store.state('repo-x', 'job').paused).toBe(false);
  });

  // @req FR:scheduling/cli.pause.all
  it('targets every schedule with --all', async () => {
    const { rt, h } = runtime({}, [sched({ id: 'a' }), sched({ id: 'b' })]);
    await run(rt, 'pause', undefined, { all: true });
    expect(h.store.state('repo-x', 'a').paused && h.store.state('repo-x', 'b').paused).toBe(true);
    await expect(run(rt, 'pause')).rejects.toMatchObject({ code: 'InvalidInput' });
  });
});

describe('schedule tick/exec', () => {
  // @req FR:scheduling/tick.@cli
  // @req FR:scheduling/tick.output
  it('ticks, touches the heartbeat, and prints one line per problem', async () => {
    const { rt, lines, errs } = runtime();
    rt.deps.source = { load: () => ({ schedules: [], errors: ['bad.yaml: on needs at least one trigger'], warnings: [] }) };
    await run(rt, 'tick');
    expect(errs).toEqual(['bad.yaml: on needs at least one trigger']);
    expect(lines).toEqual([]);
    expect(rt.heartbeat.last()).toBeDefined();
  });

  it('prints load warnings on stderr', async () => {
    const { rt, errs } = runtime();
    rt.deps.source = { load: () => ({ schedules: [], errors: [], warnings: ['/r: not on its default branch; repo schedules skipped'] }) };
    await run(rt, 'tick');
    expect(errs).toEqual(['/r: not on its default branch; repo schedules skipped']);
  });

  it('explain shows load warnings for the schedule', async () => {
    const { rt, lines } = runtime();
    rt.deps.source = { load: () => ({ schedules: [sched()], errors: [], warnings: ['/repo: not on its default branch; repo schedules skipped'] }) };
    await run(rt, 'explain', 'job');
    expect(lines.join('\n')).toMatch(/warning: \/repo: not on its default branch/);
  });

  it('prints nothing on a quiet tick', async () => {
    const { rt, lines } = runtime();
    await run(rt, 'tick');
    expect(lines).toEqual([]);
  });

  // @req FR:scheduling/worker.@cli
  it('exec runs the worker for a key', async () => {
    const { rt, h } = runtime();
    await run(rt, 'exec', 'job', { scope: 'repo-x', key: 'job@2026-11-19T10:00:00.000Z', slot: String(ms('2026-11-19T10:00:00Z')) });
    expect(h.store.types()).toEqual(['start', 'done']);
  });

  it('exec fails for an unknown schedule', async () => {
    const { rt } = runtime();
    await expect(run(rt, 'exec', 'nope', { scope: 'x', key: 'k', slot: '1' })).rejects.toMatchObject({ code: 'InvalidInput' });
  });
});

describe('schedule install/uninstall/doctor', () => {
  // @req FR:scheduling/install.approval
  // @req FR:scheduling/install.@cli
  it('prints the entry and installs after a yes', async () => {
    const { rt, lines, calls, roots } = runtime();
    await run(rt, 'install');
    expect(lines.join('\n')).toContain('<plist/>');
    expect(calls).toEqual(['install']);
    expect(roots()).toContain('/repo');
  });

  it('installs nothing after a no', async () => {
    const { rt, calls, roots } = runtime({ confirm: async () => false });
    await run(rt, 'install');
    expect(calls).toEqual([]);
    expect(roots()).not.toContain('/repo');
  });

  it('skips the question with --yes', async () => {
    const { rt, calls } = runtime({ confirm: async () => { throw new Error('asked'); } });
    await run(rt, 'install', undefined, { yes: true });
    expect(calls).toEqual(['install']);
  });

  // @req FR:scheduling/install.approval.no-tty
  it('installs nothing and fails with exit-2 InvalidInput without a terminal and --yes', async () => {
    const { rt, calls } = runtime({ interactive: false });
    await expect(run(rt, 'install')).rejects.toMatchObject({ code: 'InvalidInput' });
    expect(calls).toEqual([]);
  });

  // @req FR:scheduling/install.idempotent
  it('reports an unchanged entry', async () => {
    const { rt, lines } = runtime();
    rt.os.install = () => 'unchanged';
    await run(rt, 'install', undefined, { yes: true });
    expect(lines.join('\n')).toMatch(/unchanged/);
  });

  // @req FR:scheduling/install.uninstall
  it('unregisters the checkout and keeps the OS entry while others stay registered', async () => {
    const { rt, calls, roots } = runtime();
    rt.registry.add('/repo');
    await run(rt, 'uninstall');
    expect(roots()).toEqual(['/other']);
    expect(calls).toEqual([]);
  });

  it('removes the OS entry when no checkout stays registered', async () => {
    const { rt, calls } = runtime();
    rt.registry.clear();
    rt.registry.add('/repo');
    await run(rt, 'uninstall');
    expect(calls).toEqual(['uninstall']);
  });

  // @req FR:scheduling/install.uninstall.all
  it('removes everything with --all', async () => {
    const { rt, calls, roots } = runtime();
    await run(rt, 'uninstall', undefined, { all: true });
    expect(roots()).toEqual([]);
    expect(calls).toEqual(['uninstall']);
  });

  // @req FR:scheduling/install.doctor
  it('reports entry, env file, state folder, and tick age', async () => {
    const { rt, lines } = runtime();
    rt.heartbeat.touch();
    await run(rt, 'doctor');
    const text = lines.join('\n');
    expect(text).toMatch(/OS entry/);
    expect(text).toMatch(/env file\s+ok/);
    expect(text).toMatch(/state folder\s+ok/);
    expect(text).toMatch(/last tick/);
  });

  // @req FR:scheduling/install.doctor.stale
  it('flags a tick older than fifteen minutes', async () => {
    const { rt, lines, h } = runtime();
    rt.heartbeat.last = () => h.now.value - 16 * 60_000;
    await run(rt, 'doctor');
    expect(lines.join('\n')).toMatch(/last tick.*stale/);
  });

  it('flags a tick that never happened', async () => {
    const { rt, lines } = runtime();
    await run(rt, 'doctor');
    expect(lines.join('\n')).toMatch(/last tick.*never/);
  });
});
