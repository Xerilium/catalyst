/**
 * Tests for trigger slots: duration, cron, every, at.
 */

import { parseDuration } from '../../../src/scheduling/duration';
import { cronSlots } from '../../../src/scheduling/cron';
import { enumerateSlots } from '../../../src/scheduling/slots';

const iso = (ms: number[]) => ms.map((m) => new Date(m).toISOString());
const t = (s: string) => Date.parse(s);

describe('parseDuration', () => {
  // @req FR:scheduling/slots.every.units
  it('parses m, h, and d', () => {
    expect(parseDuration('5m')).toBe(300_000);
    expect(parseDuration('2h')).toBe(7_200_000);
    expect(parseDuration('1d')).toBe(86_400_000);
  });
  it('rejects other units and shapes', () => {
    expect(parseDuration('30s')).toBe(30_000);
    expect(() => parseDuration('5w')).toThrow();
    expect(() => parseDuration('abc')).toThrow();
    expect(() => parseDuration('0m')).toThrow();
  });
});

describe('cronSlots', () => {
  // @req FR:scheduling/slots.cron
  it('fires at each local time that matches', () => {
    const out = cronSlots('20 16 * * 1-5', 'America/New_York', t('2026-11-16T00:00:00Z'), t('2026-11-23T00:00:00Z'));
    expect(iso(out)).toEqual([
      '2026-11-16T21:20:00.000Z',
      '2026-11-17T21:20:00.000Z',
      '2026-11-18T21:20:00.000Z',
      '2026-11-19T21:20:00.000Z',
      '2026-11-20T21:20:00.000Z',
    ]);
  });

  it('excludes the start instant and includes the end instant', () => {
    const out = cronSlots('0 * * * *', 'UTC', t('2026-11-19T01:00:00Z'), t('2026-11-19T03:00:00Z'));
    expect(iso(out)).toEqual(['2026-11-19T02:00:00.000Z', '2026-11-19T03:00:00.000Z']);
  });

  // @req FR:scheduling/slots.cron.fields
  it('supports lists, ranges, and steps', () => {
    const out = cronSlots('*/20 9,10 * * *', 'UTC', t('2026-11-19T00:00:00Z'), t('2026-11-20T00:00:00Z'));
    expect(iso(out).map((s) => s.slice(11, 16))).toEqual(['09:00', '09:20', '09:40', '10:00', '10:20', '10:40']);
    const range = cronSlots('0 8-10/2 * * *', 'UTC', t('2026-11-19T00:00:00Z'), t('2026-11-20T00:00:00Z'));
    expect(iso(range).map((s) => s.slice(11, 16))).toEqual(['08:00', '10:00']);
  });

  // @req FR:scheduling/slots.cron.dow
  it('fires on day-of-month OR day-of-week when both are restricted', () => {
    // 2026-11-13 is a Friday and the 13th; 2026-11-20 is a Friday; 2026-12-13 is a Sunday
    const out = cronSlots('0 9 13 * 5', 'UTC', t('2026-11-12T00:00:00Z'), t('2026-12-14T00:00:00Z'));
    expect(iso(out).map((s) => s.slice(0, 10))).toEqual([
      '2026-11-13', '2026-11-20', '2026-11-27', '2026-12-04', '2026-12-11', '2026-12-13',
    ]);
  });

  it('accepts 7 as Sunday', () => {
    const out = cronSlots('0 9 * * 7', 'UTC', t('2026-11-19T00:00:00Z'), t('2026-11-23T00:00:00Z'));
    expect(iso(out)).toEqual(['2026-11-22T09:00:00.000Z']);
  });

  // @req FR:scheduling/slots.cron.gap
  it('fires a slot inside a daylight-saving gap once, right after the gap', () => {
    // US spring forward 2026-03-08: 02:00 EST jumps to 03:00 EDT; 02:30 does not exist
    const out = cronSlots('30 2 * * *', 'America/New_York', t('2026-03-07T12:00:00Z'), t('2026-03-10T12:00:00Z'));
    expect(iso(out)).toEqual([
      '2026-03-08T07:30:00.000Z', // shifted to 03:30 EDT
      '2026-03-09T06:30:00.000Z',
      '2026-03-10T06:30:00.000Z',
    ]);
  });

  // @req FR:scheduling/slots.cron.overlap
  it('fires a slot inside a daylight-saving overlap once, at its first occurrence', () => {
    // US fall back 2026-11-01: 01:30 happens twice
    const out = cronSlots('30 1 * * *', 'America/New_York', t('2026-10-31T12:00:00Z'), t('2026-11-02T12:00:00Z'));
    expect(iso(out)).toEqual(['2026-11-01T05:30:00.000Z', '2026-11-02T06:30:00.000Z']);
  });

  it('rejects malformed expressions', () => {
    expect(() => cronSlots('* * * *', 'UTC', 0, 1)).toThrow();
    expect(() => cronSlots('61 * * * *', 'UTC', 0, 1)).toThrow();
    expect(() => cronSlots('a * * * *', 'UTC', 0, 1)).toThrow();
  });
});

describe('enumerateSlots', () => {
  // @req FR:scheduling/slots.every
  it('fires every at each multiple of the interval since the epoch', () => {
    const out = enumerateSlots([{ every: '2h' }], 'UTC', t('2026-11-19T00:00:00Z'), t('2026-11-19T06:00:00Z'));
    expect(iso(out)).toEqual(['2026-11-19T02:00:00.000Z', '2026-11-19T04:00:00.000Z', '2026-11-19T06:00:00.000Z']);
  });

  // @req FR:scheduling/slots.at
  it('fires at once at its instant', () => {
    const on = [{ at: '2026-11-19T09:00:00-08:00' }];
    expect(iso(enumerateSlots(on, 'UTC', t('2026-11-19T00:00:00Z'), t('2026-11-20T00:00:00Z')))).toEqual([
      '2026-11-19T17:00:00.000Z',
    ]);
    expect(enumerateSlots(on, 'UTC', t('2026-11-19T17:00:00Z'), t('2026-11-20T00:00:00Z'))).toEqual([]);
  });

  // @req FR:scheduling/slots.output
  it('returns ascending slots with no duplicates across triggers', () => {
    const out = enumerateSlots(
      [{ every: '1h' }, { cron: '0 * * * *' }, { at: '2026-11-19T01:00:00Z' }],
      'UTC',
      t('2026-11-19T00:00:00Z'),
      t('2026-11-19T03:00:00Z')
    );
    expect(iso(out)).toEqual(['2026-11-19T01:00:00.000Z', '2026-11-19T02:00:00.000Z', '2026-11-19T03:00:00.000Z']);
  });
});
