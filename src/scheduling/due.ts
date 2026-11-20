/**
 * Due-run computation: dedupe, grace, catch-up, max-age, retry.
 *
 * @req FR:scheduling/due.input
 * @req FR:scheduling/due.key
 * @req FR:scheduling/due.dedupe
 * @req FR:scheduling/due.grace
 * @req FR:scheduling/due.grace.on-time
 * @req FR:scheduling/due.catch-up
 * @req FR:scheduling/due.catch-up.latest
 * @req FR:scheduling/due.catch-up.all
 * @req FR:scheduling/due.catch-up.none
 * @req FR:scheduling/due.catch-up.missed
 * @req FR:scheduling/due.max-age
 * @req FR:scheduling/due.first-tick
 * @req FR:scheduling/due.output
 * @req FR:scheduling/worker.retry
 * @req FR:scheduling/worker.retry.on
 * @req FR:scheduling/worker.pause.manual
 */

import type { LedgerEvent, RetryCause, Schedule } from './types';
import { enumerateSlots, machineTz } from './slots';

export const GRACE_MS = 5 * 60_000;

export interface DueRun { slot: number; key: string; attempt: number }
export interface MissedSlot { slot: number; key: string }

export const slotKey = (id: string, slot: number): string => `${id}@${new Date(slot).toISOString()}`;

const FINAL = new Set(['done', 'skip', 'missed', 'escalated']);
const causeOf = (type: string): RetryCause => (type === 'timeout' ? 'timeout' : 'error');

/** Last meaningful event of a key, ignoring `due` and `retry` markers, plus its failure count. */
function summarize(events: LedgerEvent[]): Map<string, { last: LedgerEvent; failures: number }> {
  const byKey = new Map<string, { last: LedgerEvent; failures: number }>();
  for (const e of events) {
    if (e.type === 'due' || e.type === 'retry') { continue; }
    const cur = byKey.get(e.key) ?? { last: e, failures: 0 };
    cur.last = e;
    if (e.type === 'failed' || e.type === 'timeout') { cur.failures += 1; }
    byKey.set(e.key, cur);
  }
  return byKey;
}

/** Keys whose retries are used up and that were never escalated. */
export function exhaustedKeys(schedule: Schedule, events: LedgerEvent[]): string[] {
  const escalated = new Set(events.filter((e) => e.type === 'escalated').map((e) => e.key));
  const out: string[] = [];
  for (const [key, { last, failures }] of summarize(events)) {
    if (escalated.has(key) || key.includes('@manual-') || (last.type !== 'failed' && last.type !== 'timeout')) { continue; }
    if (failures > schedule.retry.max || !schedule.retry.on.includes(causeOf(last.type))) { out.push(key); }
  }
  return out;
}

/** Work out which slots to run now and which to record as missed. */
export function computeDue(args: {
  schedule: Schedule;
  now: number;
  firstTick: number;
  events: LedgerEvent[];
}): { due: DueRun[]; missed: MissedSlot[] } {
  const { schedule, now, firstTick, events } = args;
  const tz = schedule.tz ?? machineTz();
  const windowStart = now - schedule.maxAgeMs;
  const timed = schedule.on.filter((t) => !('at' in t));
  const at = schedule.on.filter((t) => 'at' in t);
  const slots = [...new Set([
    ...enumerateSlots(timed, tz, Math.max(firstTick, windowStart), now),
    ...enumerateSlots(at, tz, windowStart, now),
  ])].sort((a, b) => a - b);

  const state = summarize(events);
  const fresh: MissedSlot[] = [];
  const retries: DueRun[] = [];
  for (const slot of slots) {
    const key = slotKey(schedule.id, slot);
    const s = state.get(key);
    if (!s) { fresh.push({ slot, key }); continue; }
    if (FINAL.has(s.last.type) || s.last.type === 'start') { continue; }
    const waited = now - Date.parse(s.last.t) >= schedule.retry.backoffMs;
    if (s.failures <= schedule.retry.max && schedule.retry.on.includes(causeOf(s.last.type)) && waited) {
      retries.push({ slot, key, attempt: s.failures + 1 });
    }
  }

  const onTime = fresh.filter((f) => now - f.slot <= GRACE_MS);
  let runNow: MissedSlot[];
  if (schedule.catchUp === 'all') { runNow = fresh; }
  else if (schedule.catchUp === 'none') { runNow = onTime; }
  else { runNow = onTime.length > 0 ? onTime : fresh.slice(-1); }
  const runKeys = new Set(runNow.map((r) => r.key));

  const due: DueRun[] = [
    ...retries,
    ...runNow.map((r) => ({ ...r, attempt: 1 })),
  ].sort((a, b) => a.slot - b.slot);
  return { due, missed: fresh.filter((f) => !runKeys.has(f.key)) };
}
