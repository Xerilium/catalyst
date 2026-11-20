/**
 * Filesystem store: the ledger and the STOP kill switch.
 * @req FR:autonomy/ledger.@file
 * @req FR:autonomy/stop.files
 */

import * as fs from 'fs';
import * as path from 'path';
import { formatEntry, parseLedger } from '../ledger';
import type { LedgerEntry, StorePort } from '../types';

/**
 * STOP file locations. The scheduler folder matches the scheduler's own rule:
 * `CATALYST_SCHEDULE_STATE`, else `~/.cache/catalyst/schedule`.
 */
export function stopPaths(
  repoRoot: string,
  env: Record<string, string | undefined>,
  home: string
): { repo: string; scheduler: string } {
  const schedulerRoot = env.CATALYST_SCHEDULE_STATE || path.join(home, '.cache', 'catalyst', 'schedule');
  return {
    repo: path.join(repoRoot, '.xe', 'runs', 'autonomy', 'STOP'),
    scheduler: path.join(schedulerRoot, 'STOP'),
  };
}

export class FsAutonomyStore implements StorePort {
  private readonly dir: string;
  private readonly stops: { repo: string; scheduler: string };

  constructor(repoRoot: string, env: Record<string, string | undefined>, home: string) {
    this.dir = path.join(repoRoot, '.xe', 'runs', 'autonomy');
    this.stops = stopPaths(repoRoot, env, home);
  }

  private get ledgerFile(): string {
    return path.join(this.dir, 'ledger.jsonl');
  }

  readLedger(): LedgerEntry[] {
    try {
      return parseLedger(fs.readFileSync(this.ledgerFile, 'utf-8'));
    } catch {
      return [];
    }
  }

  /** @req FR:autonomy/ledger.append-only */
  append(entry: LedgerEntry): void {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.appendFileSync(this.ledgerFile, `${formatEntry(entry)}\n`);
  }

  stopFile(): string | undefined {
    return [this.stops.scheduler, this.stops.repo].find((p) => fs.existsSync(p));
  }

  /**
   * @req FR:autonomy/stop.create
   * @req FR:autonomy/stop.create.all
   */
  createStop(all: boolean): string[] {
    const files = all ? [this.stops.repo, this.stops.scheduler] : [this.stops.repo];
    for (const f of files) {
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, '');
    }
    return files;
  }

  /**
   * @req FR:autonomy/stop.remove
   * @req FR:autonomy/stop.remove.all
   */
  removeStop(all: boolean): string[] {
    const files = all ? [this.stops.repo, this.stops.scheduler] : [this.stops.repo];
    for (const f of files) {fs.rmSync(f, { force: true });}
    return files;
  }
}
