/**
 * Heartbeat tick: decide what is due, run the gate, start a detached worker.
 * Never calls an AI provider.
 *
 * @req FR:scheduling/tick.input
 * @req FR:scheduling/tick.tokens
 * @req FR:scheduling/tick.stop
 * @req FR:scheduling/tick.paused
 * @req FR:scheduling/tick.host
 * @req FR:scheduling/tick.gate
 * @req FR:scheduling/tick.gate.contract
 * @req FR:scheduling/tick.gate.skip
 * @req FR:scheduling/tick.gate.error
 * @req FR:scheduling/tick.gate.timeout
 * @req FR:scheduling/tick.start
 * @req FR:scheduling/tick.concurrency
 * @req FR:scheduling/tick.concurrency.stale
 * @req FR:scheduling/tick.exit
 * @req FR:scheduling/tick.output
 * @req FR:scheduling/worker.pause
 * @req FR:scheduling/worker.dead
 * @req FR:scheduling/ledger.state
 * @req NFR:scheduling/idle-cost
 */

import type { Deps, EventType, LoadedSchedule } from './types';
import { computeDue, exhaustedKeys } from './due';

export interface TickResult {
  /** One line per problem: bad schedule files and failed schedules */
  errors: string[];
  started: number;
}

const iso = (ms: number): string => new Date(ms).toISOString();

function record(deps: Deps, s: LoadedSchedule, type: EventType, key: string, extra: { reason?: string; attempt?: number } = {}): void {
  deps.store.append(s.scopeKey, { t: iso(deps.clock.now()), schedule: s.id, type, key, ...extra });
}

/** Gate contract: the last output line starts with `run` or `skip`. */
export function parseGate(stdout: string): { verdict: 'run' | 'skip'; reason?: string } | undefined {
  const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const m = /^(run|skip)\b\s*(.*)$/i.exec(lines[lines.length - 1] ?? '');
  if (!m) { return undefined; }
  return { verdict: m[1].toLowerCase() as 'run' | 'skip', ...(m[2] ? { reason: m[2].slice(0, 200) } : {}) };
}

/** Start the detached worker; the lock already exists, so point it at the worker. */
export function startWorker(deps: Deps, s: LoadedSchedule, key: string, slot: number): void {
  const { pid } = deps.process.spawnDetached(deps.commands.worker(s, key, slot));
  deps.store.setLock(s.scopeKey, s.id, { pid, key, started: deps.clock.now() });
}

const LOCK_SLACK_MS = 5 * 60_000;

/**
 * Free a stale lock. A lock is stale when its process is gone, or it outlived the run timeout
 * (a reused process ID after a reboot). A run with no end event counts as failed.
 */
function reapLock(deps: Deps, s: LoadedSchedule): boolean {
  const lock = deps.store.lock(s.scopeKey, s.id);
  if (!lock) { return false; }
  const expired = deps.clock.now() - lock.started > s.timeoutMs + LOCK_SLACK_MS;
  if (!expired && deps.process.isAlive(lock.pid)) { return true; }
  const last = deps.store.events(s.scopeKey, s.id).filter((e) => e.key === lock.key && e.type !== 'due' && e.type !== 'retry').pop();
  if (last === undefined || last.type === 'start') { record(deps, s, 'failed', lock.key, { reason: 'worker exited' }); }
  deps.store.clearLock(s.scopeKey, s.id);
  return false;
}

async function tickOne(deps: Deps, s: LoadedSchedule, errors: string[]): Promise<boolean> {
  const now = deps.clock.now();
  const state = deps.store.state(s.scopeKey, s.id);
  state.firstTick ??= now;
  state.lastTick = now;
  deps.store.saveState(s.scopeKey, s.id, state);
  if (!s.enabled || state.paused || (s.host && s.host !== deps.host)) { return false; }
  if (reapLock(deps, s)) { return false; }

  const events = deps.store.events(s.scopeKey, s.id);
  const exhausted = exhaustedKeys(s, events);
  if (exhausted.length > 0) {
    for (const key of exhausted) { record(deps, s, 'escalated', key, { reason: 'retries exhausted' }); }
    state.paused = true;
    deps.store.saveState(s.scopeKey, s.id, state);
    errors.push(`${s.id}: paused after retries ran out (${exhausted.join(', ')})`);
    return false;
  }

  const { due, missed } = computeDue({ schedule: s, now, firstTick: state.firstTick, events });
  for (const m of missed) { record(deps, s, 'missed', m.key); }

  for (const d of due) {
    if (!deps.store.acquire(s.scopeKey, s.id, { pid: process.pid, key: d.key, started: deps.clock.now() })) { return false; }
    record(deps, s, d.attempt > 1 ? 'retry' : 'due', d.key, d.attempt > 1 ? { attempt: d.attempt } : {});
    const gate = deps.commands.gate(s);
    if (gate) {
      let out;
      try {
        out = await deps.process.exec(gate);
      } catch (e) {
        deps.store.clearLock(s.scopeKey, s.id);
        record(deps, s, 'failed', d.key, { reason: 'gate could not start' });
        errors.push(`${s.id}: gate could not start: ${(e as Error).message}`);
        continue;
      }
      const verdict = out.timedOut || out.code !== 0 ? undefined : parseGate(out.stdout);
      if (!verdict) {
        const reason = out.timedOut ? 'gate timed out' : out.code !== 0 ? `gate exit ${out.code}` : 'gate printed neither run nor skip';
        deps.store.clearLock(s.scopeKey, s.id);
        record(deps, s, 'failed', d.key, { reason });
        const fresh = deps.store.state(s.scopeKey, s.id);
        deps.store.saveState(s.scopeKey, s.id, { ...fresh, failures: fresh.failures + 1 });
        errors.push(`${s.id}: ${reason}`);
        continue;
      }
      if (verdict.verdict === 'skip') {
        deps.store.clearLock(s.scopeKey, s.id);
        record(deps, s, 'skip', d.key, verdict.reason ? { reason: verdict.reason } : {});
        continue;
      }
    }
    startWorker(deps, s, d.key, d.slot);
    return true;
  }
  return false;
}

/** One heartbeat over every schedule the source returns. */
export async function tick(deps: Deps): Promise<TickResult> {
  const { schedules, errors: loadErrors } = deps.source.load();
  const result: TickResult = { errors: [...loadErrors], started: 0 };
  if (deps.store.stopped()) { return result; }
  for (const s of schedules) {
    try {
      if (await tickOne(deps, s, result.errors)) { result.started += 1; }
    } catch (e) {
      result.errors.push(`${s.id}: ${(e as Error).message}`);
    }
  }
  return result;
}

/** Manual run: skips the gate and the slot math, still honors the lock. */
export function runNow(deps: Deps, s: LoadedSchedule): { key: string } | undefined {
  if (reapLock(deps, s)) { return undefined; }
  const now = deps.clock.now();
  const key = `${s.id}@manual-${iso(now)}`;
  if (!deps.store.acquire(s.scopeKey, s.id, { pid: process.pid, key, started: now })) { return undefined; }
  record(deps, s, 'due', key, { reason: 'manual' });
  startWorker(deps, s, key, now);
  return { key };
}
