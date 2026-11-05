// @req FR:playbook-actions-git/pr-lifecycle.get
// @req FR:playbook-actions-git/pr-lifecycle.edit
// @req FR:playbook-actions-git/pr-lifecycle.merge
// @req FR:playbook-actions-git/pr-lifecycle.no-shell

import { execFileSync } from 'child_process';
import { GitHubPRGetAction, codeOwnersFor } from '@playbooks/actions/git/pr-get-action';
import { GitHubPREditAction } from '@playbooks/actions/git/pr-edit-action';
import { GitHubPRMergeAction } from '@playbooks/actions/git/pr-merge-action';

jest.mock('child_process', () => ({ execSync: jest.fn(), execFileSync: jest.fn() }));
const gh = execFileSync as jest.MockedFunction<typeof execFileSync>;
const calls = () => gh.mock.calls.map((c) => (c[1] as string[]).join(' '));

beforeEach(() => gh.mockReset().mockReturnValue('' as any));

describe('codeOwnersFor', () => {
  const file = '# owners\n* @default\n/docs/ @docs-owner\n*.ts @ts-owner @org/team\n';

  it('takes the last matching rule and drops teams', () => {
    expect(codeOwnersFor(file, ['src/a.ts'])).toEqual({ owners: ['ts-owner'], covered: true });
    expect(codeOwnersFor(file, ['docs/x.md', 'README.md'])).toEqual({ owners: ['docs-owner', 'default'], covered: true });
  });

  it('reports no coverage without CODEOWNERS', () => {
    expect(codeOwnersFor('', ['a.ts'])).toEqual({ owners: [], covered: false });
  });
});

describe('GitHubPRGetAction', () => {
  const view = {
    author: { login: 'me' }, isDraft: false, state: 'OPEN', headRefOid: 'abc1234', baseRefName: 'main',
    labels: [{ name: 'x' }], assignees: [{ login: 'me' }], mergeable: 'MERGEABLE',
    latestReviews: [{ author: { login: 'rev' }, state: 'APPROVED' }, { author: { login: 'github-actions[bot]' }, state: 'COMMENTED' }],
    statusCheckRollup: [
      { name: 'ci', status: 'COMPLETED', conclusion: 'FAILURE' },
      { name: 'ci', status: 'COMPLETED', conclusion: 'SUCCESS' },
      { name: 'lint', status: 'IN_PROGRESS', conclusion: '' },
      { context: 'legacy', state: 'SUCCESS' },
    ],
  };
  const page = (hasNext: boolean, resolved: boolean) => JSON.stringify({
    data: { repository: { pullRequest: { reviewThreads: {
      pageInfo: { hasNextPage: hasNext, endCursor: 'c1' },
      nodes: [{ isResolved: resolved, comments: { nodes: [{ author: { login: 'rev' }, body: 'fix' }] } }],
    } } } },
  });

  // @req FR:playbook-actions-git/pr-lifecycle.get.paginate
  it('reads the full snapshot, paging every thread', async () => {
    gh.mockImplementation(((_: string, args: string[]) => {
      const a = args.join(' ');
      if (a.startsWith('pr view')) { return JSON.stringify(view); }
      if (a.includes('graphql')) { return a.includes('endCursor=c1') ? page(false, true) : page(true, false); }
      if (a.includes('/files')) { return JSON.stringify([[{ filename: 'src/a.ts' }], [{ filename: 'b.md' }]]); }
      if (a.includes('contents/.github/CODEOWNERS')) { return '*.ts @ts-owner'; }
      if (a.includes('/comments')) { return JSON.stringify([[{ body: '☑️ Finalized at abc1234' }, { body: 'later' }]]); }
      return '';
    }) as any);

    const result = await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' });

    expect(result.code).toBe('Success');
    expect(result.value).toMatchObject({
      author: 'me', headSha: 'abc1234', labels: ['x'], assignees: ['me'], certifiedSha: 'abc1234',
      changedFiles: ['src/a.ts', 'b.md'], codeOwners: ['ts-owner'], signOffRequired: true,
      reviews: [{ author: 'rev', state: 'APPROVED', bot: false }, { author: 'github-actions[bot]', state: 'COMMENTED', bot: true }],
      checks: [{ name: 'ci', state: 'pass' }, { name: 'lint', state: 'pending' }, { name: 'legacy', state: 'pass' }],
    });
    expect((result.value as any).threads.map((t: any) => t.resolved)).toEqual([false, true]);
  });

  it('treats a missing CODEOWNERS as no sign-off', async () => {
    gh.mockImplementation(((_: string, args: string[]) => {
      const a = args.join(' ');
      if (a.startsWith('pr view')) { return JSON.stringify(view); }
      if (a.includes('graphql')) { return page(false, true); }
      if (a.includes('contents/')) { throw new Error('HTTP 404'); }
      return '[[]]';
    }) as any);

    const result = await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' });

    expect(result.value).toMatchObject({ codeOwners: [], signOffRequired: false, certifiedSha: undefined });
  });

  it('rejects a bad PR number', async () => {
    expect((await new GitHubPRGetAction().execute({ pr: 0 })).code).toBe('GitHubPRGetConfigInvalid');
  });
});

describe('GitHubPREditAction', () => {
  it('edits labels and assignees in one gh call without a shell', async () => {
    const result = await new GitHubPREditAction().execute({
      pr: 5, repository: 'o/r', addLabels: ['a b', 'c'], removeLabels: ['d'], addAssignees: ['u'], removeAssignees: ['v'],
    });

    expect(result.code).toBe('Success');
    expect(gh).toHaveBeenCalledTimes(1);
    expect(gh.mock.calls[0][1]).toEqual([
      'pr', 'edit', '5', '-R', 'o/r',
      '--add-label', 'a b,c', '--remove-label', 'd', '--add-assignee', 'u', '--remove-assignee', 'v',
    ]);
  });

  // @req FR:pull-request-workflow/lifecycle.idempotent
  it('makes no gh call when nothing changes', async () => {
    const result = await new GitHubPREditAction().execute({ pr: 5, repository: 'o/r', addLabels: [], removeLabels: [] });

    expect(result.message).toBe('PR already up to date');
    expect(gh).not.toHaveBeenCalled();
  });
});

describe('GitHubPRMergeAction', () => {
  // @req FR:pull-request-workflow/lifecycle.autopilot-merge.head-sha
  // @req FR:playbook-actions-git/pr-lifecycle.merge.no-bypass
  // @req FR:pull-request-workflow/lifecycle.autopilot-merge.no-bypass
  it('squash-merges at the given head, never with --admin', async () => {
    const result = await new GitHubPRMergeAction().execute({ pr: 5, sha: 'abc1234', repository: 'o/r' });

    expect(result.value).toEqual({ merged: true });
    expect(calls()).toEqual(['pr merge 5 -R o/r --squash --match-head-commit abc1234']);
    expect(calls().join()).not.toContain('--admin');
  });

  // @req FR:playbook-actions-git/pr-lifecycle.merge.refused
  // @req FR:pull-request-workflow/lifecycle.autopilot-merge.no-fail
  it('returns a refused merge with its reason instead of throwing', async () => {
    gh.mockImplementation((() => { throw new Error('Head branch was modified'); }) as any);

    const result = await new GitHubPRMergeAction().execute({ pr: 5, sha: 'abc1234', repository: 'o/r' });

    expect(result.code).toBe('Success');
    expect(result.value).toMatchObject({ merged: false, reason: expect.stringContaining('modified') });
  });

  it('requires a head commit', async () => {
    expect((await new GitHubPRMergeAction().execute({ pr: 5, sha: '' })).code).toBe('GitHubPRMergeConfigInvalid');
  });
});
