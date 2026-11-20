/**
 * Five-field cron math with IANA time zones and daylight-saving rules.
 *
 * @req FR:scheduling/slots.cron
 * @req FR:scheduling/slots.cron.fields
 * @req FR:scheduling/slots.cron.dow
 * @req FR:scheduling/slots.cron.gap
 * @req FR:scheduling/slots.cron.overlap
 */

interface CronFields {
  minute: number[];
  hour: number[];
  dom: Set<number>;
  month: Set<number>;
  dow: Set<number>;
  domStar: boolean;
  dowStar: boolean;
}

const DAY = 86_400_000;

function parseField(text: string, min: number, max: number, name: string): number[] {
  const out = new Set<number>();
  for (const part of text.split(',')) {
    const m = /^(\*|(\d+)(?:-(\d+))?)(?:\/(\d+))?$/.exec(part);
    if (!m) { throw new Error(`bad ${name} field "${text}"`); }
    const step = m[4] === undefined ? 1 : Number(m[4]);
    if (step < 1) { throw new Error(`bad ${name} step in "${text}"`); }
    let lo = min;
    let hi = max;
    if (m[1] !== '*') {
      lo = Number(m[2]);
      hi = m[3] !== undefined ? Number(m[3]) : (m[4] !== undefined ? max : lo);
    }
    if (lo < min || hi > max || lo > hi) { throw new Error(`${name} value out of range in "${text}"`); }
    for (let v = lo; v <= hi; v += step) { out.add(v); }
  }
  return [...out].sort((a, b) => a - b);
}

/** Parse a five-field cron expression. Throws with a field-level message. */
export function parseCron(expr: string): CronFields {
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5) { throw new Error(`cron needs 5 fields, got ${f.length}`); }
  const dow = parseField(f[4], 0, 7, 'day-of-week').map((d) => d % 7);
  return {
    minute: parseField(f[0], 0, 59, 'minute'),
    hour: parseField(f[1], 0, 23, 'hour'),
    dom: new Set(parseField(f[2], 1, 31, 'day-of-month')),
    month: new Set(parseField(f[3], 1, 12, 'month')),
    dow: new Set(dow),
    domStar: f[2].startsWith('*'),
    dowStar: f[4].startsWith('*'),
  };
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    formatters.set(tz, f);
  }
  return f;
}

/** Local wall-clock parts of an instant, as a UTC-based epoch ms. */
function localMs(ms: number, tz: string): number {
  const p: Record<string, number> = {};
  for (const part of formatter(tz).formatToParts(new Date(ms))) {
    if (part.type !== 'literal') { p[part.type] = Number(part.value); }
  }
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/** Offset (local minus UTC) in ms at an instant. */
const offsetAt = (ms: number, tz: string): number => localMs(ms - (ms % 1000), tz) - (ms - (ms % 1000));

/** Convert local wall-clock to an instant: gap → right after the gap, overlap → first occurrence. */
function localToUtc(local: number, tz: string): number {
  const before = offsetAt(local - DAY, tz);
  const after = offsetAt(local + DAY, tz);
  const valid = [...new Set([local - before, local - after])].filter((c) => c + offsetAt(c, tz) === local);
  return valid.length > 0 ? Math.min(...valid) : local - before;
}

/** Slots of a cron expression in (after, until], ascending. */
export function cronSlots(expr: string, tz: string, after: number, until: number): number[] {
  const c = parseCron(expr);
  const out = new Set<number>();
  const firstDay = Math.floor((localMs(after, tz) - DAY) / DAY) * DAY;
  const lastDay = Math.floor((localMs(until, tz) + DAY) / DAY) * DAY;
  for (let day = firstDay; day <= lastDay; day += DAY) {
    const d = new Date(day);
    if (!c.month.has(d.getUTCMonth() + 1)) { continue; }
    const domOk = c.dom.has(d.getUTCDate());
    const dowOk = c.dow.has(d.getUTCDay());
    const match = c.domStar || c.dowStar ? domOk && dowOk : domOk || dowOk;
    if (!match) { continue; }
    for (const h of c.hour) {
      for (const m of c.minute) {
        const t = localToUtc(day + h * 3_600_000 + m * 60_000, tz);
        if (t > after && t <= until) { out.add(t); }
      }
    }
  }
  return [...out].sort((a, b) => a - b);
}
