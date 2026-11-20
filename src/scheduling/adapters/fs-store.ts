/**
 * Filesystem store: ledger, per-schedule state, locks, and the STOP kill switch.
 *
 * @req FR:scheduling/ledger.@file
 * @req FR:scheduling/ledger.@file.override
 * @req FR:scheduling/ledger.append
 * @req FR:scheduling/ledger.events
 * @req FR:scheduling/ledger.state
 */

import * as fs from 'fs';
import * as path from 'path';
import type { LedgerEvent, LockInfo, ScheduleState, Store } from '../types';

/** State folder: `CATALYST_SCHEDULE_STATE`, else `~/.cache/catalyst/schedule`. */
export function stateRoot(env: Record<string, string | undefined>, home: string): string {
  return env.CATALYST_SCHEDULE_STATE || path.join(home, '.cache', 'catalyst', 'schedule');
}

const readJson = <T>(file: string): T | undefined => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return undefined; }
};

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value));
  fs.renameSync(tmp, file);
}

export class FsStore implements Store {
  constructor(private readonly root: string) {}

  private file(scopeKey: string, ...parts: string[]): string {
    return path.join(this.root, scopeKey, ...parts);
  }

  stopped(): boolean {
    return fs.existsSync(path.join(this.root, 'STOP'));
  }

  state(scopeKey: string, id: string): ScheduleState {
    return readJson<ScheduleState>(this.file(scopeKey, 'state', `${id}.json`)) ?? { paused: false, failures: 0 };
  }

  saveState(scopeKey: string, id: string, state: ScheduleState): void {
    writeJson(this.file(scopeKey, 'state', `${id}.json`), state);
  }

  events(scopeKey: string, id: string): LedgerEvent[] {
    let text: string;
    try { text = fs.readFileSync(this.file(scopeKey, 'runs.jsonl'), 'utf8'); } catch { return []; }
    const out: LedgerEvent[] = [];
    for (const line of text.split('\n')) {
      if (!line) { continue; }
      try {
        const e = JSON.parse(line) as LedgerEvent;
        if (e.schedule === id) { out.push(e); }
      } catch { /* torn or foreign line */ }
    }
    return out;
  }

  append(scopeKey: string, event: LedgerEvent): void {
    const file = this.file(scopeKey, 'runs.jsonl');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify(event)}\n`);
  }

  lock(scopeKey: string, id: string): LockInfo | undefined {
    const file = this.file(scopeKey, 'locks', `${id}.json`);
    if (!fs.existsSync(file)) { return undefined; }
    // A torn lock file reads as a dead run, so the next tick reaps it
    return readJson<LockInfo>(file) ?? { pid: 0, key: '', started: 0 };
  }

  acquire(scopeKey: string, id: string, lock: LockInfo): boolean {
    const file = this.file(scopeKey, 'locks', `${id}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(lock));
    try {
      fs.linkSync(tmp, file); // atomic: fails when the lock exists, never leaves a half-written file
      return true;
    } catch {
      return false;
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  }

  setLock(scopeKey: string, id: string, lock: LockInfo): void {
    writeJson(this.file(scopeKey, 'locks', `${id}.json`), lock);
  }

  logPath(scopeKey: string, id: string): string | undefined {
    const file = this.file(scopeKey, 'logs', `${id}.log`);
    return fs.existsSync(file) ? file : undefined;
  }

  writeLog(scopeKey: string, id: string, text: string): void {
    const file = this.file(scopeKey, 'logs', `${id}.log`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }

  clearLock(scopeKey: string, id: string, owner?: { key: string; started?: number }): void {
    if (owner) {
      const cur = this.lock(scopeKey, id);
      if (cur && cur.pid !== 0 && (cur.key !== owner.key || (owner.started !== undefined && cur.started !== owner.started))) { return; }
    }
    fs.rmSync(this.file(scopeKey, 'locks', `${id}.json`), { force: true });
  }
}
