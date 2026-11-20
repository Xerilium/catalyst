/**
 * Tests for the gh adapter's parsing, with a fake runner.
 */

import { GhAutonomyGitHub, splitDiff } from '../../../src/autonomy/adapters/gh';

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
