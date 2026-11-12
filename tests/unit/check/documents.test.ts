/**
 * Tests for check document loading.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadSpecs, loadTrackedRollouts } from '../../../src/check/documents';

describe('loadSpecs', () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-docs-'));
    for (const id of ['b', 'a', 'group/c']) {
      const dir = path.join(root, '.xe', 'features', ...id.split('/'));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'spec.md'), `# ${id}`);
      fs.writeFileSync(path.join(dir, 'feedback.md'), 'not a spec');
    }
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  // @req FR:cli-check/spec.input
  it('loads every spec.md, nested included, as sorted repo-relative POSIX paths', () => {
    const docs = loadSpecs(root);
    expect(docs.map((d) => d.path)).toEqual([
      '.xe/features/a/spec.md',
      '.xe/features/b/spec.md',
      '.xe/features/group/c/spec.md',
    ]);
    expect(docs[0].content).toBe('# a');
  });

  // @req FR:cli-check/check.input
  it('filters by exact feature ID or wildcard', () => {
    expect(loadSpecs(root, 'group/c').map((d) => d.path)).toEqual(['.xe/features/group/c/spec.md']);
    expect(loadSpecs(root, 'group/*')).toHaveLength(1);
    expect(loadSpecs(root, '?')).toHaveLength(2);
    expect(loadSpecs(root, 'nope')).toEqual([]);
  });

  // @req FR:cli-check/spec.input
  it('returns nothing when the features directory is absent', () => {
    expect(loadSpecs(path.join(root, 'empty'))).toEqual([]);
  });
});

describe('loadTrackedRollouts', () => {
  let root: string;
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-rollouts-'));
    fs.mkdirSync(path.join(root, '.xe', 'rollouts'), { recursive: true });
    fs.writeFileSync(path.join(root, '.xe/rollouts/rollout-tracked.md'), '# t');
    fs.writeFileSync(path.join(root, '.xe/rollouts/rollout-scratch.md'), '# s');
    fs.writeFileSync(path.join(root, '.xe/rollouts/rollout-blueprint.md'), '# b');
    git('init', '-q');
    git('add', '.xe/rollouts/rollout-tracked.md', '.xe/rollouts/rollout-blueprint.md');
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  // @req FR:cli-check/rollout.input
  it('loads only git-tracked rollouts, never the blueprint rollout', () => {
    expect(loadTrackedRollouts(root).map((d) => d.path)).toEqual(['.xe/rollouts/rollout-tracked.md']);
  });

  // @req FR:cli-check/rollout.input
  it('returns nothing outside a git repo', () => {
    const plain = fs.mkdtempSync(path.join(os.tmpdir(), 'check-nogit-'));
    try {
      expect(loadTrackedRollouts(plain)).toEqual([]);
    } finally {
      fs.rmSync(plain, { recursive: true, force: true });
    }
  });

  // @req FR:cli-check/rollout.committed
  it('flags a tracked rollout with no unchecked tasks via runChecks', async () => {
    const { runChecks } = await import('../../../src/check/runner');
    const result = await runChecks({ root, patterns: ['rollout.*'] });
    expect(result.findings.map((f) => [f.file, f.rule])).toEqual([
      ['.xe/rollouts/rollout-tracked.md', 'rollout.committed'],
    ]);
  });

  // @req FR:cli-check/rollout.committed
  it('allows a tracked rollout with unchecked tasks, except under Final Review', async () => {
    const { runChecks } = await import('../../../src/check/runner');
    const rollout = (name: string, body: string) => {
      fs.writeFileSync(path.join(root, `.xe/rollouts/rollout-${name}.md`), body);
      git('add', `.xe/rollouts/rollout-${name}.md`);
    };
    rollout('partial', '# p\n\n## Run 1\n\n- [x] a\n- [ ] b\n\n## Final Review\n\n- [ ] sign off\n');
    rollout('signoff', '# s\n\n## Run 1\n\n- [x] a\n\n## Final Review\n\n- [ ] sign off\n\n## Notes\n\nn\n');
    rollout('tail', '# t\n\n## Final Review\n\n- [ ] sign off\n\n## Notes\n\n- [ ] open note\n');
    const result = await runChecks({ root, patterns: ['rollout.*'] });
    expect(result.findings.map((f) => f.file)).toEqual([
      '.xe/rollouts/rollout-signoff.md',
      '.xe/rollouts/rollout-tracked.md',
    ]);
  });
});
