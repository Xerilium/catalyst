/**
 * Current autonomy state, and the scheduler gate line.
 * @req FR:autonomy/status.@cli
 */

import { ledgerStats } from './budget';
import { readAutonomyConfig } from './config';
import type { AutonomyPorts, LedgerEntry } from './types';

export interface AutonomyStatus {
  enabled: boolean;
  problems: string[];
  stopFile: string | null;
  appliedToday: number;
  prsPerDay: number;
  /** `pr-loop` round budget per PR */
  loopRounds: number;
  /** Why the config could not be read, if so */
  note: string | null;
}

/** @req FR:autonomy/status.show */
export function autonomyStatus(ports: Pick<AutonomyPorts, 'repo' | 'store' | 'clock'>): AutonomyStatus {
  const { config, problems } = readAutonomyConfig(ports.repo.configText());
  const { appliedToday } = ledgerStats(ports.store.readLedger(), -1, ports.clock());
  return {
    enabled: config.enabled,
    problems,
    stopFile: ports.store.stopFile() ?? null,
    appliedToday,
    prsPerDay: config.budget.prsPerDay,
    loopRounds: config.budget.loopRounds,
    note: ports.repo.configNote?.() ?? null,
  };
}

/** Text lines for `status`. */
export function statusLines(s: AutonomyStatus): string[] {
  return [
    `Full autonomy: ${s.enabled ? 'on' : 'off'}`,
    ...s.problems.map((p) => `  Problem: ${p}`),
    ...(s.note ? [`  Note: ${s.note}`] : []),
    `  STOP: ${s.stopFile ?? 'none'}`,
    `  Autopilot applies today: ${s.appliedToday} of ${s.prsPerDay}`,
  ];
}

/**
 * `run`, or `skip` with a reason, for the scheduler's gate contract.
 * @req FR:autonomy/status.gate
 * @req FR:autonomy/status.gate.skip
 */
export function gateLine(s: AutonomyStatus): string {
  if (!s.enabled) {
    if (s.problems.length > 0) {return 'skip autonomy is off (invalid config)';}
    return s.note ? 'skip autonomy is off (config unreadable)' : 'skip autonomy is off';
  }
  if (s.stopFile) {return `skip STOP file present: ${s.stopFile}`;}
  if (s.appliedToday >= s.prsPerDay) {return `skip daily budget spent (${s.appliedToday} of ${s.prsPerDay})`;}
  return 'run';
}

/**
 * A ledger entry for an agent-recorded step.
 * @req FR:autonomy/ledger.@cli
 */
export function recordEntry(now: Date, e: Omit<LedgerEntry, 'at'>): LedgerEntry {
  return { at: now.toISOString(), ...e };
}
