/**
 * Tests for the heartbeat tick.
 */

import { tick } from '../../../src/scheduling/tick';
import { harness, sched } from './fakes';

const NOW = '2026-11-19T10:02:00Z';
const withGate = (over = {}) => sched({ gate: { script: '.xe/g.sh' }, ...over });

describe('tick', () => {
  // @req FR:scheduling/tick.stop
  it('starts nothing while STOP exists', async () => {
    const h = harness([sched()], NOW);
    h.store.stop = true;
    await tick(h.deps);
    expect(h.spawned).toEqual([]);
    expect(h.store.log).toEqual([]);
  });

  // @req FR:scheduling/tick.paused
  it('skips paused and disabled schedules', async () => {
    const h = harness([sched({ id: 'a' }), sched({ id: 'b', enabled: false })], NOW);
    h.store.saveState('repo-x', 'a', { paused: true, failures: 0 });
    await tick(h.deps);
    expect(h.spawned).toEqual([]);
  });

  // @req FR:scheduling/tick.host
  it('skips a schedule pinned to another host', async () => {
    const h = harness([sched({ host: 'other' })], NOW, 'laptop');
    await tick(h.deps);
    expect(h.spawned).toEqual([]);
  });

  // @req FR:scheduling/ledger.state
  it('records first and last tick without running pre-existing slots', async () => {
    const h = harness([sched()], NOW);
    await tick(h.deps);
    const st = h.store.state('repo-x', 'job');
    expect(st.firstTick).toBe(Date.parse(NOW));
    expect(st.lastTick).toBe(Date.parse(NOW));
    // the 10:00 slot is after first tick? no: it is before, so nothing runs on the very first tick
    expect(h.spawned).toEqual([]);
  });

  // @req FR:scheduling/tick.start
  // @req FR:scheduling/tick.start.inputs
  // @req FR:scheduling/tick.start.cwd
  // @req FR:scheduling/tick.tokens
  it('starts a detached worker for a due slot with no gate', async () => {
    const h = harness([sched()], NOW);
    h.store.saveState('repo-x', 'job', { firstTick: Date.parse('2026-11-19T09:30:00Z'), paused: false, failures: 0 });
    await tick(h.deps);
    expect(h.spawned).toHaveLength(1);
    expect(h.spawned[0]).toEqual({ file: 'worker', args: ['job', 'job@2026-11-19T10:00:00.000Z', String(Date.parse('2026-11-19T10:00:00Z'))] });
    expect(h.execs).toEqual([]);
    expect(h.store.types()).toEqual(['due']);
    expect(h.store.lock('repo-x', 'job')).toMatchObject({ key: 'job@2026-11-19T10:00:00.000Z' });
  });

  describe('gate', () => {
    const prime = (h: ReturnType<typeof harness>) =>
      h.store.saveState('repo-x', 'job', { firstTick: Date.parse('2026-11-19T09:30:00Z'), paused: false, failures: 0 });

    // @req FR:scheduling/tick.gate
    // @req FR:scheduling/tick.gate.contract
    it('starts the run when the last output line starts with run', async () => {
      const h = harness([withGate()], NOW);
      prime(h);
      h.gateResult.value = { code: 0, stdout: 'checking\nrun 3 PRs changed\n', timedOut: false };
      await tick(h.deps);
      expect(h.execs).toHaveLength(1);
      expect(h.spawned).toHaveLength(1);
    });

    // @req FR:scheduling/tick.gate.skip
    it('records skip with the reason and starts nothing', async () => {
      const h = harness([withGate()], NOW);
      prime(h);
      h.gateResult.value = { code: 0, stdout: 'skip nothing changed\n', timedOut: false };
      await tick(h.deps);
      expect(h.spawned).toEqual([]);
      expect(h.store.log.map((e) => [e.type, e.reason])).toEqual([['due', undefined], ['skip', 'nothing changed']]);
    });

    // @req FR:scheduling/tick.gate.error
    it.each([
      ['non-zero exit', { code: 1, stdout: 'run\n', timedOut: false }],
      ['timeout', { code: null, stdout: '', timedOut: true }],
      ['neither word', { code: 0, stdout: 'hello\n', timedOut: false }],
    ])('records failed on %s', async (_n, result) => {
      const h = harness([withGate()], NOW);
      prime(h);
      h.gateResult.value = result;
      await tick(h.deps);
      expect(h.spawned).toEqual([]);
      expect(h.store.types()).toEqual(['due', 'failed']);
    });

    // @req FR:scheduling/tick.gate.timeout
    it('gives the gate a timeout, 30 seconds by default', async () => {
      const h = harness([withGate()], NOW);
      prime(h);
      await tick(h.deps);
      expect(h.execs[0].timeoutMs).toBe(30_000);
    });

    it('tries the next due slot after a skip', async () => {
      const h = harness([withGate({ catchUp: 'all', on: [{ every: '5m' }] })], '2026-11-19T09:47:00Z');
      prime(h);
      const outs = ['skip a', 'skip b', 'run c'];
      h.gateResult.value = () => ({ code: 0, stdout: outs.shift() ?? 'skip z', timedOut: false });
      await tick(h.deps);
      expect(h.store.types()).toContain('skip');
      expect(h.spawned).toHaveLength(1);
    });
  });

  // @req FR:scheduling/tick.concurrency
  it('does not start a schedule whose run holds a live lock', async () => {
    const h = harness([sched()], NOW);
    h.store.saveState('repo-x', 'job', { firstTick: Date.parse('2026-11-19T09:30:00Z'), paused: false, failures: 0 });
    h.alive.add(7);
    h.store.setLock('repo-x', 'job', { pid: 7, key: 'job@old', started: 1 });
    await tick(h.deps);
    expect(h.spawned).toEqual([]);
  });

  // @req FR:scheduling/tick.concurrency.stale
  // @req FR:scheduling/worker.dead
  it('clears a stale lock and records failed for the dead run', async () => {
    const h = harness([sched()], NOW);
    h.store.saveState('repo-x', 'job', { firstTick: Date.parse('2026-11-19T09:30:00Z'), paused: false, failures: 0 });
    h.store.setLock('repo-x', 'job', { pid: 7, key: 'job@2026-11-19T09:00:00.000Z', started: 1 });
    h.store.append('repo-x', { t: 'x', schedule: 'job', type: 'start', key: 'job@2026-11-19T09:00:00.000Z' });
    await tick(h.deps);
    expect(h.store.log.some((e) => e.type === 'failed' && e.key === 'job@2026-11-19T09:00:00.000Z')).toBe(true);
    expect(h.spawned).toHaveLength(1);
  });

  // @req FR:scheduling/worker.pause
  it('pauses and escalates once when retries are exhausted', async () => {
    const h = harness([sched({ retry: { max: 1, backoffMs: 1000, on: ['error'] } })], '2026-11-19T10:30:00Z');
    h.store.saveState('repo-x', 'job', { firstTick: Date.parse('2026-11-19T09:30:00Z'), paused: false, failures: 2 });
    const key = 'job@2026-11-19T10:00:00.000Z';
    for (const t of ['10:01', '10:10']) {
      h.store.append('repo-x', { t: `2026-11-19T${t}:00.000Z`, schedule: 'job', type: 'failed', key });
    }
    await tick(h.deps);
    await tick(h.deps);
    expect(h.store.types().filter((x) => x === 'escalated')).toHaveLength(1);
    expect(h.store.state('repo-x', 'job').paused).toBe(true);
    expect(h.spawned).toEqual([]);
  });

  // @req FR:scheduling/due.catch-up.missed
  it('records missed slots', async () => {
    const h = harness([sched()], '2026-11-19T10:07:00Z');
    h.store.saveState('repo-x', 'job', { firstTick: Date.parse('2026-11-19T08:30:00Z'), paused: false, failures: 0 });
    await tick(h.deps);
    expect(h.store.types().filter((x) => x === 'missed')).toHaveLength(1);
  });

  // @req FR:scheduling/tick.input
  it('loads every schedule from the source', async () => {
    const h = harness([sched({ id: 'a' }), sched({ id: 'b', scopeKey: 'user', scope: 'user' })], NOW);
    for (const [k, id] of [['repo-x', 'a'], ['user', 'b']]) {
      h.store.saveState(k, id, { firstTick: Date.parse('2026-11-19T09:30:00Z'), paused: false, failures: 0 });
    }
    await tick(h.deps);
    expect(h.spawned.map((s) => s.args[0]).sort()).toEqual(['a', 'b']);
  });

  // @req FR:scheduling/file.invalid
  it('reports source errors without stopping other schedules', async () => {
    const h = harness([sched()], NOW);
    h.deps.source = { load: () => ({ schedules: [sched()], errors: ['bad.yaml: on'], warnings: [] }) };
    const r = await tick(h.deps);
    expect(r.errors).toEqual(['bad.yaml: on']);
  });

  // @req FR:scheduling/tick.exit
  // @req FR:scheduling/tick.output
  it('returns failed schedule lines and never throws on a gate crash', async () => {
    const h = harness([withGate()], NOW);
    h.store.saveState('repo-x', 'job', { firstTick: Date.parse('2026-11-19T09:30:00Z'), paused: false, failures: 0 });
    h.deps.process.exec = async () => { throw new Error('boom'); };
    const r = await tick(h.deps);
    expect(r.errors.join()).toMatch(/job/);
  });
});
