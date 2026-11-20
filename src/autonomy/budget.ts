/**
 * Budget caps, computed from the ledger.
 * @req FR:autonomy/budget.source
 */

import type { AutonomyConfig, LedgerEntry, LedgerStats, Reason } from './types';

const utcDay = (d: Date): string => d.toISOString().slice(0, 10);

/** Totals for one PR, plus the repository's Autopilot applies on `now`'s UTC day. */
export function ledgerStats(entries: LedgerEntry[], pr: number, now: Date): LedgerStats {
  const today = utcDay(now);
  const stats: LedgerStats = { rounds: 0, tokens: 0, nonClean: 0, appliedToday: 0 };
  for (const e of entries) {
    const at = new Date(e.at);
    if (e.action === 'autopilot' && !Number.isNaN(at.getTime()) && utcDay(at) === today) {
      stats.appliedToday += 1;
    }
    if (e.pr !== pr) {continue;}
    stats.rounds += e.rounds ?? 0;
    stats.tokens += e.tokens ?? 0;
    if (e.action === 'loop' && e.result && e.result !== 'clean') {stats.nonClean += 1;}
    if (!Number.isNaN(at.getTime()) && (!stats.firstAt || at < stats.firstAt)) {stats.firstAt = at;}
  }
  return stats;
}

/** Every budget the PR has spent. */
export function budgetReasons(stats: LedgerStats, config: AutonomyConfig, now: Date): Reason[] {
  const { budget } = config;
  const reasons: Reason[] = [];
  // @req FR:autonomy/budget.rounds
  if (stats.rounds > budget.loopRounds) {
    reasons.push({ trigger: 'budget-rounds', detail: `${stats.rounds} pr-loop rounds (budget ${budget.loopRounds})` });
  }
  // @req FR:autonomy/budget.minutes
  if (stats.firstAt) {
    const minutes = Math.floor((now.getTime() - stats.firstAt.getTime()) / 60_000);
    if (minutes > budget.minutes) {
      reasons.push({ trigger: 'budget-minutes', detail: `${minutes} minutes since the first action (budget ${budget.minutes})` });
    }
  }
  // @req FR:autonomy/budget.tokens
  if (stats.tokens > budget.tokens) {
    reasons.push({ trigger: 'budget-tokens', detail: `${stats.tokens} tokens recorded (budget ${budget.tokens})` });
  }
  // @req FR:autonomy/budget.daily
  if (stats.appliedToday >= budget.prsPerDay) {
    reasons.push({ trigger: 'budget-daily', detail: `${stats.appliedToday} Autopilot applies today (budget ${budget.prsPerDay})` });
  }
  return reasons;
}
