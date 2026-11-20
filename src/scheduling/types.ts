/**
 * Scheduling types and ports.
 *
 * Portable: imports nothing outside `src/scheduling/`.
 *
 * @req NFR:scheduling/portable
 * @req FR:scheduling/$schedule
 * @req FR:scheduling/$ledger-event
 */

export type Scope = 'repo' | 'user';

export type Trigger = { cron: string } | { every: string } | { at: string };

export type Gate = { script: string; timeout?: string } | { playbook: string; timeout?: string };

export type CatchUp = 'none' | 'latest' | 'all';

export type RetryCause = 'error' | 'timeout';

export interface Schedule {
  id: string;
  description?: string;
  enabled: boolean;
  tz?: string;
  on: Trigger[];
  gate?: Gate;
  run: { playbook: string; inputs?: Record<string, string>; ai?: boolean; cwd?: string };
  catchUp: CatchUp;
  maxAgeMs: number;
  timeoutMs: number;
  retry: { max: number; backoffMs: number; on: RetryCause[] };
  host?: string;
  env: string[];
  scope: Scope;
}

/** A schedule plus where it lives (state folder key and working root). */
export interface LoadedSchedule extends Schedule {
  /** State folder key: `user` or `repo-{hash}` */
  scopeKey: string;
  /** Repo root for repo scope; unset for user scope */
  root?: string;
}

export type EventType =
  | 'due' | 'skip' | 'start' | 'done' | 'failed' | 'retry' | 'timeout' | 'missed' | 'escalated';

export interface LedgerEvent {
  t: string;
  schedule: string;
  type: EventType;
  key: string;
  reason?: string;
  attempt?: number;
}

export interface ScheduleState {
  firstTick?: number;
  lastTick?: number;
  paused: boolean;
  failures: number;
}

export interface LockInfo {
  pid: number;
  key: string;
  started: number;
}

export interface ExecSpec {
  file: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

export interface ExecResult {
  code: number | null;
  stdout: string;
  timedOut: boolean;
}

// ── Ports ──────────────────────────────────────────────────────────────

export interface Clock {
  now(): number;
}

export interface Store {
  stopped(): boolean;
  state(scopeKey: string, id: string): ScheduleState;
  saveState(scopeKey: string, id: string, state: ScheduleState): void;
  events(scopeKey: string, id: string): LedgerEvent[];
  append(scopeKey: string, event: LedgerEvent): void;
  lock(scopeKey: string, id: string): LockInfo | undefined;
  /** Take the lock only if none exists. True when taken. */
  acquire(scopeKey: string, id: string, lock: LockInfo): boolean;
  setLock(scopeKey: string, id: string, lock: LockInfo): void;
  /** Remove the lock. With `owner`, only when the lock still belongs to that run. */
  clearLock(scopeKey: string, id: string, owner?: { key: string; started?: number }): void;
}

export interface ProcessPort {
  /** Run to completion; kill the whole process tree on timeout. */
  exec(spec: ExecSpec): Promise<ExecResult>;
  spawnDetached(spec: ExecSpec): { pid: number };
  isAlive(pid: number): boolean;
}

export interface ScheduleSource {
  load(): { schedules: LoadedSchedule[]; errors: string[]; warnings: string[] };
}

/** Builds the process specs; owns env, shell choice, and the CLI entry point. */
export interface Commands {
  gate(s: LoadedSchedule): ExecSpec | undefined;
  worker(s: LoadedSchedule, key: string, slot: number): ExecSpec;
  playbook(s: LoadedSchedule): ExecSpec;
}

export interface Deps {
  clock: Clock;
  store: Store;
  process: ProcessPort;
  source: ScheduleSource;
  commands: Commands;
  host: string;
}
