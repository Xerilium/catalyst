/**
 * Tests for due-run computation.
 */

import { computeDue } from '../../../src/scheduling/due';
import type { LedgerEvent } from '../../../src/scheduling/types';
import { sched } from './fakes';

const t = (s: string) => Date.parse(s);
const ev = (type: LedgerEvent['type'], slot: string, at = slot): LedgerEvent => ({
  t: new Date(t(at)).toISOString(), schedule: 'job', type, key: `job@${new Date(t(slot)).toISOString()}`,
});
const hours = (xs: { slot: number }[]) => xs.map((x) => new Date(x.slot).toISOString().slice(11, 13));
const first = t('2026-11-19T00:00:00Z');

describe('computeDue', () => {
  // @req FR:scheduling/due.key
  // @req FR:scheduling/due.input
  // @req FR:scheduling/due.output
  it('keys each run {id}@{slot}', () => {
    const r = computeDue({ schedule: sched(), now: t('2026-11-19T10:02:00Z'), firstTick: first, events: [] });
    expect(r.due[0].key).toBe('job@2026-11-19T10:00:00.000Z');
  });

  // @req FR:scheduling/due.grace.on-time
  it('runs a slot inside the five-minute grace under every catch-up value', () => {
    for (const catchUp of ['none', 'latest', 'all'] as const) {
      const r = computeDue({ schedule: sched({ catchUp }), now: t('2026-11-19T10:05:00Z'), firstTick: first, events: [] });
      expect(hours(r.due).includes('10')).toBe(true);
    }
  });

  // @req FR:scheduling/due.grace
  // @req FR:scheduling/due.catch-up.latest
  it('runs only the newest missed slot under latest', () => {
    const r = computeDue({ schedule: sched(), now: t('2026-11-19T10:07:00Z'), firstTick: first, events: [] });
    expect(hours(r.due)).toEqual(['10']);
    expect(hours(r.missed)).toEqual(['05', '06', '07', '08', '09']);
  });

  it('under latest, an on-time slot replaces the newest missed one', () => {
    const r = computeDue({ schedule: sched(), now: t('2026-11-19T10:02:00Z'), firstTick: first, events: [] });
    expect(hours(r.due)).toEqual(['10']);
    expect(hours(r.missed)).toEqual(['05', '06', '07', '08', '09']);
  });

  // @req FR:scheduling/due.catch-up.all
  it('runs every missed slot oldest first under all', () => {
    const r = computeDue({ schedule: sched({ catchUp: 'all' }), now: t('2026-11-19T10:07:00Z'), firstTick: first, events: [] });
    expect(hours(r.due)).toEqual(['05', '06', '07', '08', '09', '10']);
    expect(r.missed).toEqual([]);
  });

  // @req FR:scheduling/due.catch-up.none
  // @req FR:scheduling/due.catch-up.missed
  it('runs no missed slot under none and reports each one', () => {
    const r = computeDue({ schedule: sched({ catchUp: 'none' }), now: t('2026-11-19T10:07:00Z'), firstTick: first, events: [] });
    expect(r.due).toEqual([]);
    expect(hours(r.missed)).toEqual(['05', '06', '07', '08', '09', '10']);
  });

  // @req FR:scheduling/due.max-age
  it('ignores slots older than max-age', () => {
    const r = computeDue({ schedule: sched({ maxAgeMs: 2 * 3600_000 }), now: t('2026-11-19T10:07:00Z'), firstTick: first, events: [] });
    expect(hours(r.missed)).toEqual(['09']);
  });

  // @req FR:scheduling/due.first-tick
  it('does not run slots before the first tick', () => {
    const r = computeDue({ schedule: sched({ catchUp: 'all' }), now: t('2026-11-19T10:02:00Z'), firstTick: t('2026-11-19T09:30:00Z'), events: [] });
    expect(hours(r.due)).toEqual(['10']);
  });

  it('runs an at slot before the first tick when inside max-age', () => {
    const s = sched({ on: [{ at: '2026-11-19T09:00:00Z' }] });
    const r = computeDue({ schedule: s, now: t('2026-11-19T10:02:00Z'), firstTick: t('2026-11-19T09:30:00Z'), events: [] });
    expect(hours(r.due)).toEqual(['09']);
    const old = computeDue({ schedule: sched({ on: [{ at: '2026-11-18T09:00:00Z' }] }), now: t('2026-11-19T10:02:00Z'), firstTick: t('2026-11-19T09:30:00Z'), events: [] });
    expect(old.due).toEqual([]);
  });

  // @req FR:scheduling/due.dedupe
  it('skips keys already done, skipped, or missed', () => {
    const events = [ev('done', '2026-11-19T10:00:00Z'), ev('skip', '2026-11-19T09:00:00Z'), ev('missed', '2026-11-19T08:00:00Z')];
    const r = computeDue({ schedule: sched({ catchUp: 'all' }), now: t('2026-11-19T10:02:00Z'), firstTick: first, events });
    expect(hours(r.due)).toEqual(['05', '06', '07']);
  });

  it('keeps a key that only has a due event', () => {
    const r = computeDue({ schedule: sched(), now: t('2026-11-19T10:02:00Z'), firstTick: first, events: [ev('due', '2026-11-19T10:00:00Z')] });
    expect(hours(r.due)).toEqual(['10']);
  });

  // @req FR:scheduling/worker.retry
  it('retries a failed key after the backoff with the next attempt', () => {
    const events = [ev('failed', '2026-11-19T10:00:00Z', '2026-11-19T10:03:00Z')];
    const wait = computeDue({ schedule: sched(), now: t('2026-11-19T10:05:00Z'), firstTick: t('2026-11-19T09:30:00Z'), events });
    expect(wait.due).toEqual([]);
    const go = computeDue({ schedule: sched(), now: t('2026-11-19T10:09:00Z'), firstTick: t('2026-11-19T09:30:00Z'), events });
    expect(go.due).toMatchObject([{ attempt: 2 }]);
  });

  it('stops retrying once max retries are used', () => {
    const events = [
      ev('failed', '2026-11-19T10:00:00Z', '2026-11-19T10:01:00Z'),
      ev('failed', '2026-11-19T10:00:00Z', '2026-11-19T10:07:00Z'),
      ev('failed', '2026-11-19T10:00:00Z', '2026-11-19T10:13:00Z'),
    ];
    const r = computeDue({ schedule: sched(), now: t('2026-11-19T10:30:00Z'), firstTick: t('2026-11-19T09:30:00Z'), events });
    expect(r.due).toEqual([]);
  });

  // @req FR:scheduling/worker.retry.on
  it('retries only the listed causes', () => {
    const s = sched({ retry: { max: 2, backoffMs: 300_000, on: ['timeout'] } });
    const failed = computeDue({ schedule: s, now: t('2026-11-19T10:30:00Z'), firstTick: t('2026-11-19T09:30:00Z'), events: [ev('failed', '2026-11-19T10:00:00Z', '2026-11-19T10:01:00Z')] });
    expect(failed.due).toEqual([]);
    const timeout = computeDue({ schedule: s, now: t('2026-11-19T10:30:00Z'), firstTick: t('2026-11-19T09:30:00Z'), events: [ev('timeout', '2026-11-19T10:00:00Z', '2026-11-19T10:01:00Z')] });
    expect(timeout.due).toMatchObject([{ attempt: 2 }]);
  });

  it('does not rerun a key that has started but not ended', () => {
    const r = computeDue({ schedule: sched(), now: t('2026-11-19T10:02:00Z'), firstTick: t('2026-11-19T09:30:00Z'), events: [ev('start', '2026-11-19T10:00:00Z')] });
    expect(r.due).toEqual([]);
  });
});
