/**
 * Unit tests for workspace cleanup inventory + phase-b report
 *
 * @req FR:cli-clean/inventory.discover
 * @req FR:cli-clean/inventory.git-state
 * @req FR:cli-clean/inventory.pr-state
 * @req FR:cli-clean/inventory.degraded
 * @req FR:cli-clean/inventory.output
 * @req FR:cli-clean/inventory.read-only
 * @req FR:cli-clean/inventory.apply-refused
 * @req FR:cli-clean/report.safe-candidate
 * @req FR:cli-clean/report.never
 * @req FR:cli-clean/report.flagged
 * @req FR:cli-clean/report.size
 * @req FR:cli-clean/report.output
 */

import {
  parseWorktreePorcelain,
  classifyRow,
  toCsv,
  buildReport,
  collectInventory,
  assertDryRun,
  type InventoryRow,
  type Exec,
} from '../../../../src/core/workspace/inventory';

const row = (o: Partial<InventoryRow> = {}): InventoryRow => ({
  repo: 'o/r', primary: false, type: 'worktree', branch: 'b', folder: '/d/r.wt/b',
  pr: '1', prState: 'MERGED', uncommitted: 0, unpushed: 0, lastCommit: '2026-01-01', ...o,
});

describe('parseWorktreePorcelain', () => {
  // @req FR:cli-clean/inventory.discover
  it('marks first entry primary and reads branch', () => {
    const out = parseWorktreePorcelain(
      'worktree /d/r\nHEAD abc\nbranch refs/heads/main\n\nworktree /d/r.wt/x\nHEAD def\nbranch refs/heads/xe/x\n\nworktree /d/r.wt/y\nHEAD 123\ndetached\n'
    );
    expect(out).toEqual([
      { path: '/d/r', branch: 'main', primary: true },
      { path: '/d/r.wt/x', branch: 'xe/x', primary: false },
      { path: '/d/r.wt/y', branch: 'HEAD', primary: false },
    ]);
  });
});

describe('classifyRow', () => {
  // @req FR:cli-clean/report.safe-candidate
  it.each(['MERGED', 'CLOSED'])('candidate when clean and %s', (s) => {
    expect(classifyRow(row({ prState: s as any }))).toBe('candidate');
  });
  // @req FR:cli-clean/report.never
  it('keeps primary, open, unknown', () => {
    expect(classifyRow(row({ primary: true }))).toBe('keep');
    expect(classifyRow(row({ prState: 'OPEN' }))).toBe('keep');
    expect(classifyRow(row({ prState: '' }))).toBe('keep');
  });
  // @req FR:cli-clean/report.never
  // @req FR:cli-clean/report.flagged
  it('flags dirty or unpushed, never candidate', () => {
    expect(classifyRow(row({ uncommitted: 2 }))).toBe('flagged');
    expect(classifyRow(row({ unpushed: 1 }))).toBe('flagged');
    expect(classifyRow(row({ unpushed: null }))).toBe('flagged');
  });
  // @req FR:cli-clean/report.never
  it('never flags primary clones as candidates even when merged', () => {
    expect(classifyRow(row({ primary: true, uncommitted: 3 }))).toBe('keep');
  });
});

describe('toCsv', () => {
  // @req FR:cli-clean/inventory.output
  it('writes header, quotes, and remove_candidate', () => {
    const csv = toCsv([row(), row({ prState: 'OPEN', branch: 'a,b' })]).split('\n');
    expect(csv[0]).toBe('repo,primary,type,branch,folder,pr,pr_state,uncommitted,unpushed,last_commit,remove_candidate');
    expect(csv[1]).toContain('"o/r","no","worktree","b"');
    expect(csv[1].endsWith('"yes"')).toBe(true);
    expect(csv[2]).toContain('"a,b"');
    expect(csv[2].endsWith('""')).toBe(true);
  });
});

describe('buildReport', () => {
  // @req FR:cli-clean/report.output
  // @req FR:cli-clean/report.size
  // @req FR:cli-clean/report.flagged
  it('lists candidates, counts, and GB', () => {
    const rows = [row(), row({ folder: '/d/dirty', uncommitted: 1 }), row({ prState: 'OPEN', folder: '/d/open' })];
    const out = buildReport(rows, { '/d/r.wt/b': 2 * 1024 ** 3 });
    expect(out).toContain('/d/r.wt/b');
    expect(out).not.toContain('/d/open');
    expect(out).toMatch(/candidates: 1/);
    expect(out).toMatch(/flagged: 1/);
    expect(out).toMatch(/2\.0 GB/);
  });
});

describe('assertDryRun', () => {
  // @req FR:cli-clean/inventory.apply-refused
  it('throws when apply is true', () => {
    expect(() => assertDryRun(true)).toThrow(/apply/i);
    expect(() => assertDryRun(false)).not.toThrow();
  });
});

describe('collectInventory', () => {
  const fsMock = {
    readdir: (d: string) => (d === '/root' ? ['r', 'plain'] : []),
    isGitRoot: (d: string) => d === '/root/r',
  };
  const mk = (gh: Exec['gh']): { exec: Exec; calls: string[][] } => {
    const calls: string[][] = [];
    return {
      calls,
      exec: {
        git: (cwd, args) => {
          calls.push(args);
          const k = args.join(' ');
          if (k === 'worktree list --porcelain') return 'worktree /root/r\nbranch refs/heads/main\n\nworktree /root/r.wt/x\nbranch refs/heads/xe/x\n';
          if (k === 'remote get-url origin') return 'git@github.com:o/r.git';
          if (k === 'status --porcelain') return cwd.endsWith('x') ? ' M a\n?? b\n' : '';
          if (k.startsWith('rev-list')) return '0';
          if (k.startsWith('log -1')) return '2026-02-02';
          return '';
        },
        gh,
      },
    };
  };

  // @req FR:cli-clean/inventory.discover
  // @req FR:cli-clean/inventory.git-state
  // @req FR:cli-clean/inventory.pr-state
  // @req FR:cli-clean/inventory.read-only
  it('builds rows and only runs read-only git commands', () => {
    const { exec, calls } = mk(() => JSON.stringify([{ number: 7, state: 'MERGED' }]));
    const { rows, warnings } = collectInventory({ root: '/root', exec, fs: fsMock });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ repo: 'o/r', primary: true, branch: 'main', pr: '7', prState: 'MERGED' });
    expect(rows[1]).toMatchObject({ primary: false, uncommitted: 2, lastCommit: '2026-02-02' });
    expect(warnings).toEqual([]);
    const allowed = ['worktree', 'remote', 'status', 'rev-list', 'log', 'rev-parse'];
    expect(calls.every((a) => allowed.includes(a[0]) && !['remove', 'prune', 'add'].includes(a[1]))).toBe(true);
  });

  // @req FR:cli-clean/inventory.degraded
  it('warns and blanks PR state when gh fails', () => {
    const { exec } = mk(() => { throw new Error('no gh'); });
    const { rows, warnings } = collectInventory({ root: '/root', exec, fs: fsMock });
    expect(rows[0].prState).toBe('');
    expect(warnings.length).toBeGreaterThan(0);
  });

  // @req FR:cli-clean/inventory.input
  it('filters by repo', () => {
    const { exec } = mk(() => '[]');
    const { rows } = collectInventory({ root: '/root', repos: 'nomatch', exec, fs: fsMock });
    expect(rows).toHaveLength(0);
  });
});
