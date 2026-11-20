/**
 * In-memory ports for scheduling tests.
 */

import type {
  Deps, ExecResult, ExecSpec, LedgerEvent, LoadedSchedule, LockInfo, ScheduleState, Store,
} from '../../../src/scheduling/types';

export class MemStore implements Store {
  stop = false;
  states = new Map<string, ScheduleState>();
  log: LedgerEvent[] = [];
  locks = new Map<string, LockInfo>();
  private k = (s: string, id: string) => `${s}/${id}`;
  stopped() { return this.stop; }
  state(s: string, id: string) { return this.states.get(this.k(s, id)) ?? { paused: false, failures: 0 }; }
  saveState(s: string, id: string, st: ScheduleState) { this.states.set(this.k(s, id), { ...st }); }
  events(_s: string, id: string) { return this.log.filter((e) => e.schedule === id); }
  append(_s: string, e: LedgerEvent) { this.log.push(e); }
  lock(s: string, id: string) { return this.locks.get(this.k(s, id)); }
  setLock(s: string, id: string, l: LockInfo) { this.locks.set(this.k(s, id), l); }
  clearLock(s: string, id: string) { this.locks.delete(this.k(s, id)); }
  types(id?: string) { return this.log.filter((e) => !id || e.schedule === id).map((e) => e.type); }
}

export const sched = (over: Partial<LoadedSchedule> = {}): LoadedSchedule => ({
  id: 'job',
  enabled: true,
  tz: 'UTC',
  on: [{ every: '1h' }],
  run: { playbook: 'pb', inputs: { a: '1' } },
  catchUp: 'latest',
  maxAgeMs: 6 * 3600_000,
  timeoutMs: 3600_000,
  retry: { max: 2, backoffMs: 300_000, on: ['error', 'timeout'] },
  env: [],
  scope: 'repo',
  scopeKey: 'repo-x',
  root: '/repo',
  ...over,
});

export interface Harness {
  deps: Deps;
  store: MemStore;
  now: { value: number };
  execs: ExecSpec[];
  spawned: ExecSpec[];
  gateResult: { value: ExecResult | ((s: ExecSpec) => ExecResult) };
  alive: Set<number>;
  schedules: LoadedSchedule[];
  nextPid: { value: number };
}

export function harness(schedules: LoadedSchedule[], nowIso: string, host = 'laptop'): Harness {
  const store = new MemStore();
  const now = { value: Date.parse(nowIso) };
  const execs: ExecSpec[] = [];
  const spawned: ExecSpec[] = [];
  const alive = new Set<number>();
  const nextPid = { value: 100 };
  const gateResult: Harness['gateResult'] = { value: { code: 0, stdout: 'run\n', timedOut: false } };
  const deps: Deps = {
    clock: { now: () => now.value },
    store,
    host,
    source: { load: () => ({ schedules: h.schedules, errors: [], warnings: [] }) },
    commands: {
      gate: (s) => (s.gate ? { file: 'gate', args: [s.id], timeoutMs: 30_000 } : undefined),
      worker: (s, key, slot) => ({ file: 'worker', args: [s.id, key, String(slot)] }),
      playbook: (s) => ({ file: 'catalyst', args: ['run', s.run.playbook], timeoutMs: s.timeoutMs }),
    },
    process: {
      exec: async (spec) => {
        execs.push(spec);
        const r = gateResult.value;
        return typeof r === 'function' ? r(spec) : r;
      },
      spawnDetached: (spec) => {
        spawned.push(spec);
        const pid = nextPid.value++;
        alive.add(pid);
        return { pid };
      },
      isAlive: (pid) => alive.has(pid),
    },
  };
  const h: Harness = { deps, store, now, execs, spawned, gateResult, alive, schedules, nextPid };
  return h;
}
