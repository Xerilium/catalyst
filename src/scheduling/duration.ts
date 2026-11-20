/**
 * Duration parsing for schedule values (`5m`, `2h`, `1d`).
 *
 * @req FR:scheduling/slots.every.units
 */

const UNITS: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** Parse `{n}{s|m|h|d}` into milliseconds. Throws on any other shape. */
export function parseDuration(text: string): number {
  const match = /^(\d+)([smhd])$/.exec(String(text).trim());
  if (!match || Number(match[1]) <= 0) {
    throw new Error(`"${text}" is not a duration; use a number then s, m, h, or d (for example 30m)`);
  }
  return Number(match[1]) * UNITS[match[2]];
}
