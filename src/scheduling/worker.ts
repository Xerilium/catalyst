/**
 * Run worker: runs the playbook, records the outcome, frees the lock.
 *
 * @req FR:scheduling/worker.events
 * @req FR:scheduling/worker.timeout
 * @req FR:scheduling/worker.release
 * @req FR:scheduling/ledger.no-content
 */

import type { Deps, EventType, LoadedSchedule } from './types';

/** Run one scheduled playbook to its end. Never throws. */
export async function runWorker(
  deps: Deps,
  args: { schedule: LoadedSchedule; key: string; slot: number; attempt?: number }
): Promise<EventType> {
  const { schedule: s, key } = args;
  const log = (type: EventType, extra: { reason?: string; attempt?: number } = {}): void =>
    deps.store.append(s.scopeKey, { t: new Date(deps.clock.now()).toISOString(), schedule: s.id, type, key, ...extra });

  log('start', args.attempt ? { attempt: args.attempt } : {});
  let outcome: EventType = 'done';
  try {
    const res = await deps.process.exec({ ...deps.commands.playbook(s), timeoutMs: s.timeoutMs });
    if (res.timedOut) { outcome = 'timeout'; log('timeout', { reason: 'run exceeded its timeout' }); }
    else if (res.code !== 0) { outcome = 'failed'; log('failed', { reason: `exit ${res.code}` }); }
    else { log('done'); }
  } catch {
    outcome = 'failed';
    log('failed', { reason: 'run could not start' });
  } finally {
    const state = deps.store.state(s.scopeKey, s.id);
    state.failures = outcome === 'done' ? 0 : state.failures + 1;
    deps.store.saveState(s.scopeKey, s.id, state);
    deps.store.clearLock(s.scopeKey, s.id, { key });
  }
  return outcome;
}
