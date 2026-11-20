/**
 * Workspace cleanup: read-only inventory of clones/worktrees and phase-b removal report.
 *
 * Never mutates anything: only read-only git/gh commands are issued.
 *
 * @req FR:cli-clean/inventory.read-only
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { CatalystError } from '../errors';

export type PrState = 'OPEN' | 'MERGED' | 'CLOSED' | '';

export interface InventoryRow {
  repo: string;
  primary: boolean;
  type: 'clone' | 'worktree';
  branch: string;
  folder: string;
  pr: string;
  prState: PrState;
  uncommitted: number;
  /** null = unknown (no upstream) */
  unpushed: number | null;
  lastCommit: string;
}

export interface Exec {
  git(cwd: string, args: string[]): string;
  gh(cwd: string, args: string[]): string;
}

export interface Fs {
  readdir(dir: string): string[];
  isGitRoot(dir: string): boolean;
}

export type Classification = 'candidate' | 'flagged' | 'keep';

export const CSV_HEADER =
  'repo,primary,type,branch,folder,pr,pr_state,uncommitted,unpushed,last_commit,remove_candidate';

/** @req FR:cli-clean/inventory.discover */
export function parseWorktreePorcelain(
  text: string
): { path: string; branch: string; primary: boolean }[] {
  const out: { path: string; branch: string; primary: boolean }[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split('\n').map((l) => l.trim());
    const wt = lines.find((l) => l.startsWith('worktree '));
    if (!wt) {continue;}
    const br = lines.find((l) => l.startsWith('branch '));
    out.push({
      path: wt.slice('worktree '.length),
      branch: br ? br.slice('branch '.length).replace(/^refs\/heads\//, '') : 'HEAD',
      primary: out.length === 0,
    });
  }
  return out;
}

/**
 * @req FR:cli-clean/report.safe-candidate
 * @req FR:cli-clean/report.never
 * @req FR:cli-clean/report.flagged
 */
export function classifyRow(r: InventoryRow): Classification {
  if (r.primary) {return 'keep';}
  if (r.uncommitted > 0 || r.unpushed === null || r.unpushed > 0) {return 'flagged';}
  if (r.prState === 'MERGED' || r.prState === 'CLOSED') {return 'candidate';}
  return 'keep';
}

const q = (v: string | number | null): string => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** @req FR:cli-clean/inventory.output */
export function toCsv(rows: InventoryRow[]): string {
  const lines = rows.map((r) =>
    [
      q(r.repo), q(r.primary ? 'yes' : 'no'), q(r.type), q(r.branch), q(r.folder),
      q(r.pr), q(r.prState), q(r.uncommitted), q(r.unpushed), q(r.lastCommit),
      q(classifyRow(r) === 'candidate' ? 'yes' : ''),
    ].join(',')
  );
  return [CSV_HEADER, ...lines].join('\n') + '\n';
}

/**
 * @req FR:cli-clean/report.output
 * @req FR:cli-clean/report.size
 */
export function buildReport(rows: InventoryRow[], sizes: Record<string, number> = {}): string {
  const cands = rows.filter((r) => classifyRow(r) === 'candidate');
  const flagged = rows.filter((r) => classifyRow(r) === 'flagged');
  const bytes = cands.reduce((s, r) => s + (sizes[r.folder] ?? 0), 0);
  const lines = cands.map(
    (r) => `${r.folder}\t${r.repo}\t${r.prState}\t${((sizes[r.folder] ?? 0) / 1024 ** 3).toFixed(1)} GB`
  );
  return [
    'folder\trepo\tpr\tsize',
    ...lines,
    `candidates: ${cands.length}`,
    `flagged: ${flagged.length}`,
    `total: ${(bytes / 1024 ** 3).toFixed(1)} GB`,
    'dry-run: nothing removed',
  ].join('\n');
}

/** @req FR:cli-clean/inventory.apply-refused */
export function assertDryRun(apply: boolean): void {
  if (apply) {
    throw new CatalystError(
      'clean: apply is not supported yet; this slice is read-only',
      'CleanApplyUnsupported', 'Run without --apply; apply arrives in a later phase.'
    );
  }
}

export const realExec: Exec = {
  git: (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(),
  gh: (cwd, args) => execFileSync('gh', args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(),
};

export const realFs: Fs = {
  readdir: (d) => fs.readdirSync(d),
  isGitRoot: (d) => fs.existsSync(path.join(d, '.git', 'HEAD')),
};

function repoSlug(url: string): string {
  const m = url.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?$/);
  return m ? m[1] : url;
}

export interface CollectOptions {
  root: string;
  repos?: string;
  exec?: Exec;
  fs?: Fs;
}

/**
 * Scan root for primary clones and list their worktrees. Read-only.
 * @req FR:cli-clean/inventory.discover
 * @req FR:cli-clean/inventory.git-state
 * @req FR:cli-clean/inventory.pr-state
 * @req FR:cli-clean/inventory.degraded
 */
export function collectInventory(opts: CollectOptions): { rows: InventoryRow[]; warnings: string[] } {
  const exec = opts.exec ?? realExec;
  const f = opts.fs ?? realFs;
  const rows: InventoryRow[] = [];
  const warnings: string[] = [];
  let ghOk = true;
  const safe = (fn: () => string, dflt = ''): string => {
    try { return fn(); } catch { return dflt; }
  };

  for (const name of f.readdir(opts.root).sort()) {
    const dir = path.join(opts.root, name);
    if (!f.isGitRoot(dir)) {continue;}
    const slug = repoSlug(safe(() => exec.git(dir, ['remote', 'get-url', 'origin']), name));
    if (opts.repos && !slug.toLowerCase().includes(opts.repos.toLowerCase())) {continue;}

    const wts = parseWorktreePorcelain(safe(() => exec.git(dir, ['worktree', 'list', '--porcelain'])));
    for (const wt of wts) {
      const status = safe(() => exec.git(wt.path, ['status', '--porcelain']));
      const uncommitted = status ? status.split('\n').filter(Boolean).length : 0;
      const ahead = safe(() => exec.git(wt.path, ['rev-list', '--count', '@{upstream}..HEAD']), 'x');
      let pr = '';
      let prState: PrState = '';
      if (ghOk && wt.branch !== 'HEAD') {
        try {
          const list = JSON.parse(
            exec.gh(wt.path, ['pr', 'list', '--head', wt.branch, '--state', 'all', '--json', 'number,state', '--limit', '1']) || '[]'
          );
          if (list[0]) { pr = String(list[0].number); prState = list[0].state; }
        } catch {
          ghOk = false;
          warnings.push('gh unavailable or unauthenticated; PR state left blank');
        }
      }
      rows.push({
        repo: slug,
        primary: wt.primary,
        type: wt.primary ? 'clone' : 'worktree',
        branch: wt.branch,
        folder: wt.path,
        pr,
        prState,
        uncommitted,
        unpushed: ahead === 'x' ? null : parseInt(ahead, 10),
        lastCommit: safe(() => exec.git(wt.path, ['log', '-1', '--format=%cs'])),
      });
    }
  }
  return { rows, warnings };
}

/** Folder size in bytes via `du -sk` (read-only). */
export function folderSize(dir: string): number {
  try {
    const out = execFileSync('du', ['-sk', dir], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    return parseInt(out.split('\t')[0], 10) * 1024;
  } catch {
    return 0;
  }
}
