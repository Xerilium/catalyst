/**
 * Tests for the run worker.
 */

import { runWorker } from '../../../src/scheduling/worker';
import { harness, sched } from './fakes';

const KEY = 'job@2026-11-19T10:00:00.000Z';
const SLOT = Date.parse('2026-11-19T10:00:00Z');

describe('runWorker', () => {
  const setup = () => {
    const h = harness([sched()], '2026-11-19T10:03:00Z');
    h.store.setLock('repo-x', 'job', { pid: 1, key: KEY, started: 1 });
    return h;
  };

  // @req FR:scheduling/worker.events
  // @req FR:scheduling/worker.release
  it('records start then done and releases the lock', async () => {
    const h = setup();
    h.gateResult.value = { code: 0, stdout: 'ok', timedOut: false };
    await runWorker(h.deps, { schedule: h.schedules[0], key: KEY, slot: SLOT });
    expect(h.store.types()).toEqual(['start', 'done']);
    expect(h.store.lock('repo-x', 'job')).toBeUndefined();
    expect(h.execs[0]).toMatchObject({ file: 'catalyst', args: ['run', 'pb'] });
  });

  // @req FR:scheduling/worker.events
  // @req FR:scheduling/ledger.no-content
  it('records failed on a non-zero exit without run output', async () => {
    const h = setup();
    h.gateResult.value = { code: 3, stdout: 'secret-token-123', timedOut: false };
    await runWorker(h.deps, { schedule: h.schedules[0], key: KEY, slot: SLOT });
    expect(h.store.types()).toEqual(['start', 'failed']);
    expect(JSON.stringify(h.store.log)).not.toContain('secret-token');
    expect(h.store.log[1].reason).toBe('exit 3');
    expect(h.store.state('repo-x', 'job').failures).toBe(1);
  });

  // @req FR:scheduling/worker.timeout
  it('records timeout when the run exceeds its timeout', async () => {
    const h = setup();
    h.gateResult.value = { code: null, stdout: '', timedOut: true };
    await runWorker(h.deps, { schedule: h.schedules[0], key: KEY, slot: SLOT });
    expect(h.store.types()).toEqual(['start', 'timeout']);
    expect(h.execs[0].timeoutMs).toBe(3600_000);
  });

  it('resets consecutive failures on success', async () => {
    const h = setup();
    h.store.saveState('repo-x', 'job', { paused: false, failures: 2 });
    await runWorker(h.deps, { schedule: h.schedules[0], key: KEY, slot: SLOT });
    expect(h.store.state('repo-x', 'job').failures).toBe(0);
  });

  it('releases the lock when the process port throws', async () => {
    const h = setup();
    h.deps.process.exec = async () => { throw new Error('spawn failed'); };
    await runWorker(h.deps, { schedule: h.schedules[0], key: KEY, slot: SLOT });
    expect(h.store.types()).toEqual(['start', 'failed']);
    expect(h.store.lock('repo-x', 'job')).toBeUndefined();
  });

  // @req FR:scheduling/worker.retry
  it('records an attempt number on start', async () => {
    const h = setup();
    await runWorker(h.deps, { schedule: h.schedules[0], key: KEY, slot: SLOT, attempt: 2 });
    expect(h.store.log[0].attempt).toBe(2);
  });
});
