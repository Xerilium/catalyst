/**
 * Tests for the gh adapter's parsing, with a fake runner.
 */

import { GhAutonomyGitHub, GitHubRepoConfig, mainCheckout, parseDiff, splitDiff } from '../../../src/autonomy/adapters/gh';

const DIFF = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index 1..2 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -1 +1 @@',
  '-old',
  '+new',
  'diff --git a/package.json b/package.json',
  '--- a/package.json',
  '+++ b/package.json',
  '@@ -2 +2 @@',
  '-  "version": "1.0.0",',
  '+  "version": "1.1.0",',
  '',
].join('\n');

describe('gh adapter', () => {
  // @req NFR:autonomy/portable.ports
  it('splits a unified diff into per-file patches', () => {
    const patches = splitDiff(DIFF);
    expect(Object.keys(patches)).toEqual(['src/a.ts', 'package.json']);
    expect(patches['package.json']).toMatch(/\+ {2}"version": "1.1.0"/);
  });

  it('reads PR facts, the viewer, and writes through gh', async () => {
    const calls: string[][] = [];
    const run = async (args: string[], input?: string) => {
      calls.push(input ? [...args, `<${input}`] : args);
      if (args[0] === 'api') {return 'bot\n';}
      if (args[1] === 'diff') {return DIFF;}
      if (args[1] === 'view') {
        return JSON.stringify({
          number: 3,
          author: { login: 'bot' },
          state: 'OPEN',
          isDraft: false,
          labels: [{ name: 'x' }],
          files: [
            { path: 'src/a.ts', additions: 1, deletions: 1 },
            { path: 'package.json', additions: 1, deletions: 1 },
          ],
        });
      }
      return '';
    };
    const gh = new GhAutonomyGitHub(run);
    expect(await gh.viewer()).toBe('bot');
    const facts = await gh.pullRequest(3);
    expect(facts).toMatchObject({ number: 3, author: 'bot', state: 'OPEN', isDraft: false, labels: ['x'] });
    expect(facts.files[1].patch).toMatch(/version/);
    await gh.addLabel(3, 'Status: 🤖 Autopilot');
    await gh.comment(3, 'hi');
    expect(calls.slice(-2)).toEqual([
      ['pr', 'edit', '3', '--add-label', 'Status: 🤖 Autopilot'],
      ['pr', 'comment', '3', '--body-file', '-', '<hi'],
    ]);
  });
});

describe('git adapters', () => {
  const fake = (answers: Record<string, string | Error>) => async (args: string[]) => {
    const key = args.join(' ');
    const hit = Object.entries(answers).find(([k]) => key.startsWith(k));
    if (!hit || hit[1] instanceof Error) {throw hit?.[1] ?? new Error(`no answer: ${key}`);}
    return hit[1];
  };

  // @req FR:autonomy/config.repo-only.merged
  it('reads the config from the default branch on GitHub, never a local file or ref', async () => {
    const repo = await new GitHubRepoConfig(
      fake({
        'repo view': 'main\n',
        'api repos/{owner}/{repo}/contents/.xe/config/catalyst.json?ref=main': '{"autonomy":{"enabled":true}}',
        'api repos/{owner}/{repo}/commits?path=.xe/config/catalyst.json&sha=main': 'abc1234\n',
      })
    ).load();
    expect(repo.configText()).toBe('{"autonomy":{"enabled":true}}');
    expect(repo.configCommit()).toBe('abc1234');
  });

  // @req FR:autonomy/config.repo-only.merged.missing
  it('has no config when GitHub has none or cannot be read', async () => {
    const none = await new GitHubRepoConfig(fake({ 'repo view': new Error('offline') })).load();
    expect(none.configText()).toBeUndefined();
    expect(none.configNote()).toMatch(/offline/);
    const missing = await new GitHubRepoConfig(fake({ 'repo view': 'main\n', api: new Error('HTTP 404: Not Found') })).load();
    expect(missing.configText()).toBeUndefined();
    expect(missing.configNote()).toBeUndefined();
  });

  // @req FR:autonomy/ledger.@file.shared
  it('stores the ledger in the main checkout for every worktree', async () => {
    expect(await mainCheckout('/wt/x', fake({ 'rev-parse': '/repo/.git\n' }))).toBe('/repo');
    expect(await mainCheckout('/wt/x', fake({ 'rev-parse': new Error('not git') }))).toBe('/wt/x');
  });

  it('reads the old path of a renamed file', () => {
    const d = parseDiff('diff --git a/old.yml b/new.yml\nsimilarity index 90%\nrename from old.yml\nrename to new.yml\n');
    expect(d['new.yml'].previousPath).toBe('old.yml');
  });
});
