/**
 * Tests for the filesystem store: ledger and STOP files.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FsAutonomyStore, stopPaths } from '../../../src/autonomy/adapters/fs-store';
import { formatEntry, parseLedger } from '../../../src/autonomy/ledger';

describe('FsAutonomyStore', () => {
  let root: string;
  let home: string;
  let store: FsAutonomyStore;
  const ledgerFile = () => path.join(root, '.xe', 'runs', 'autonomy', 'ledger.jsonl');

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'autonomy-repo-'));
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'autonomy-home-'));
    store = new FsAutonomyStore(root, {}, home);
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  });

  // @req FR:autonomy/ledger.@file
  // @req FR:autonomy/ledger.append-only
  // @req FR:autonomy/$ledger-entry
  it('appends one JSON line per entry and never rewrites earlier lines', () => {
    store.append({ at: '2026-11-19T00:00:00Z', pr: 1, action: 'loop', rounds: 1 });
    const first = fs.readFileSync(ledgerFile(), 'utf-8');
    store.append({ at: '2026-11-19T00:01:00Z', pr: 1, action: 'autopilot' });
    const both = fs.readFileSync(ledgerFile(), 'utf-8');
    expect(both.startsWith(first)).toBe(true);
    expect(both.trim().split('\n')).toHaveLength(2);
    expect(store.readLedger().map((e) => e.action)).toEqual(['loop', 'autopilot']);
  });

  // @req FR:autonomy/ledger.unreadable
  it('skips ledger lines it cannot parse', () => {
    fs.mkdirSync(path.dirname(ledgerFile()), { recursive: true });
    fs.writeFileSync(ledgerFile(), `not json\n${formatEntry({ at: 'x', action: 'loop' })}\n{"no":"action"}\n`);
    expect(store.readLedger()).toEqual([{ at: 'x', action: 'loop' }]);
    expect(parseLedger('')).toEqual([]);
  });

  // @req FR:autonomy/stop.files
  it('halts on a repo STOP file or the scheduler STOP file', () => {
    expect(store.stopFile()).toBeUndefined();
    const sched = path.join(home, '.cache', 'catalyst', 'schedule');
    fs.mkdirSync(sched, { recursive: true });
    fs.writeFileSync(path.join(sched, 'STOP'), '');
    expect(store.stopFile()).toBe(path.join(sched, 'STOP'));
    fs.rmSync(path.join(sched, 'STOP'));
    fs.mkdirSync(path.join(root, '.xe', 'runs', 'autonomy'), { recursive: true });
    fs.writeFileSync(path.join(root, '.xe', 'runs', 'autonomy', 'STOP'), '');
    expect(store.stopFile()).toBe(path.join(root, '.xe', 'runs', 'autonomy', 'STOP'));
  });

  // @req FR:autonomy/stop.files
  it('uses CATALYST_SCHEDULE_STATE for the scheduler folder, like the scheduler', () => {
    expect(stopPaths(root, { CATALYST_SCHEDULE_STATE: '/x/y' }, home).scheduler).toBe(path.join('/x/y', 'STOP'));
    expect(stopPaths(root, {}, home)).toEqual({
      repo: path.join(root, '.xe', 'runs', 'autonomy', 'STOP'),
      scheduler: path.join(home, '.cache', 'catalyst', 'schedule', 'STOP'),
    });
  });

  // @req FR:autonomy/stop.create
  // @req FR:autonomy/stop.remove
  it('stop creates and resume deletes the repo STOP file', () => {
    const { repo, scheduler } = stopPaths(root, {}, home);
    store.createStop(false);
    expect([fs.existsSync(repo), fs.existsSync(scheduler)]).toEqual([true, false]);
    store.removeStop(false);
    expect(fs.existsSync(repo)).toBe(false);
  });

  // @req FR:autonomy/stop.create.all
  // @req FR:autonomy/stop.remove.all
  it('--all also creates and deletes the scheduler STOP file', () => {
    const { repo, scheduler } = stopPaths(root, {}, home);
    store.createStop(true);
    expect([fs.existsSync(repo), fs.existsSync(scheduler)]).toEqual([true, true]);
    store.removeStop(true);
    expect([fs.existsSync(repo), fs.existsSync(scheduler)]).toEqual([false, false]);
  });
});
