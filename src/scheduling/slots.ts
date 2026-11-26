/**
 * Slot enumeration for `cron`, `every`, and `at` triggers.
 *
 * @req FR:scheduling/slots.input
 * @req FR:scheduling/slots.every
 * @req FR:scheduling/slots.at
 * @req FR:scheduling/slots.output
 */

import type { Trigger } from './types';
import { cronSlots } from './cron';
import { parseDuration } from './duration';

export const machineTz = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** All slots of the triggers in (after, until], ascending, no duplicates. */
export function enumerateSlots(on: Trigger[], tz: string, after: number, until: number): number[] {
  const out = new Set<number>();
  for (const trigger of on) {
    if ('cron' in trigger) {
      for (const s of cronSlots(trigger.cron, tz, after, until)) { out.add(s); }
    } else if ('every' in trigger) {
      const step = parseDuration(trigger.every);
      for (let s = (Math.floor(after / step) + 1) * step; s <= until; s += step) { out.add(s); }
    } else {
      const at = Date.parse(trigger.at);
      if (at > after && at <= until) { out.add(at); }
    }
  }
  return [...out].sort((a, b) => a - b);
}
