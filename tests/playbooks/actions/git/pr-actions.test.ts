import { execFileSync } from 'child_process';
import { GitHubPRGetAction, codeOwnersFor } from '@playbooks/actions/git/pr-get-action';
import { GitHubPREditAction } from '@playbooks/actions/git/pr-edit-action';
import { GitHubPRMergeAction, mergeRefusal } from '@playbooks/actions/git/pr-merge-action';
import type { PRSnapshot } from '@playbooks/actions/git/types';

jest.mock('child_process', () => ({ execSync: jest.fn(), execFileSync: jest.fn() }));
const gh = execFileSync as jest.MockedFunction<typeof execFileSync>;
const calls = () => gh.mock.calls.map((c) => (c[1] as string[]).join(' '));

beforeEach(() => gh.mockReset().mockReturnValue('' as any));

const view = {
  number: 5, title: 'T', url: 'u',
  author: { login: 'me' }, isDraft: false, state: 'OPEN', headRefOid: 'abc1234', headRefName: 'b', baseRefName: 'main',
  labels: [{ name: 'x' }], assignees: [{ login: 'me' }], mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN',
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

/** Answer `gh` as GitHub would for a PR; `extra` overrides a path's answer */
const github = (opts: { view?: object; codeowners?: string | null; merge?: () => string } = {}) => {
  gh.mockImplementation(((_: string, args: string[]) => {
    const a = args.join(' ');
    if (a.startsWith('pr view')) { return JSON.stringify(opts.view ?? view); }
    if (a.includes('graphql')) { return a.includes('endCursor=c1') ? page(false, true) : page(false, true); }
    if (a.includes('/files')) { return JSON.stringify([[{ filename: 'src/a.ts' }], [{ filename: 'b.md' }]]); }
    if (a.includes('contents/')) {
      if (opts.codeowners === null || opts.codeowners === undefined) { throw new Error('HTTP 404'); }
      return opts.codeowners;
    }
    if (a.includes('/comments')) { return JSON.stringify([[{ user: { login: 'me' }, body: '☑️ Finalized at abc1234' }, { user: { login: 'rev' }, body: 'later' }]]); }
    if (a.startsWith('pr merge')) { return opts.merge ? opts.merge() : ''; }
    return '';
  }) as any);
};

describe('codeOwnersFor', () => {
  const file = '# owners\n* @default\n/docs/ @docs-owner\n*.ts @ts-owner @org/team\n';

  // @req FR:playbook-actions-git/github-pr-get.output
  it('takes the last matching rule and drops teams', () => {
    expect(codeOwnersFor(file, ['src/a.ts'])).toEqual({ owners: ['ts-owner'], covered: true });
    expect(codeOwnersFor(file, ['docs/x.md', 'README.md'])).toEqual({ owners: ['docs-owner', 'default'], covered: true });
  });

  // @req FR:playbook-actions-git/github-pr-get.output
  it('reports no coverage without CODEOWNERS', () => {
    expect(codeOwnersFor('', ['a.ts'])).toEqual({ owners: [], covered: false });
  });
});

describe('GitHubPRGetAction', () => {
  // @req FR:playbook-actions-git/github-pr-get.@action
  it('is the github-pr-get action, taking the PR number first', () => {
    expect(GitHubPRGetAction.actionType).toBe('github-pr-get');
    expect(GitHubPRGetAction.primaryProperty).toBe('pr');
  });

  // @req FR:playbook-actions-git/github-pr-get.input
  // @req FR:playbook-actions-git/github-pr-get.output
  // @req FR:playbook-actions-git/github-pr-get.neutral
  // @req FR:playbook-actions-git/github-pr-get.paginate
  it('reads the full snapshot from the PR number alone, paging every thread', async () => {
    gh.mockImplementation(((_: string, args: string[]) => {
      const a = args.join(' ');
      if (a.startsWith('pr view')) { return JSON.stringify(view); }
      if (a.includes('graphql')) { return a.includes('endCursor=c1') ? page(false, true) : page(true, false); }
      if (a.includes('/files')) { return JSON.stringify([[{ filename: 'src/a.ts' }], [{ filename: 'b.md' }]]); }
      if (a.includes('contents/.github/CODEOWNERS')) { return '*.ts @ts-owner'; }
      if (a.includes('/comments')) { return JSON.stringify([[{ user: { login: 'me' }, body: '☑️ Finalized at abc1234' }, { user: { login: 'rev' }, body: 'later' }]]); }
      return '';
    }) as any);

    const result = await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' });

    expect(result.code).toBe('Success');
    expect(result.value).toMatchObject({
      number: 5, title: 'T', author: 'me', headSha: 'abc1234', headRef: 'b', baseRef: 'main',
      labels: ['x'], assignees: ['me'], mergeStateStatus: 'CLEAN', mergeable: 'MERGEABLE',
      comments: [{ author: 'me', body: '☑️ Finalized at abc1234' }, { author: 'rev', body: 'later' }],
      changedFiles: ['src/a.ts', 'b.md'], codeOwners: ['ts-owner'], codeOwned: true,
      reviews: [{ author: 'rev', state: 'APPROVED', bot: false }, { author: 'github-actions[bot]', state: 'COMMENTED', bot: true }],
      checks: [{ name: 'ci', state: 'pass' }, { name: 'lint', state: 'pending' }, { name: 'legacy', state: 'pass' }],
    });
    expect((result.value as any).threads.map((t: any) => t.resolved)).toEqual([false, true]);
    // Catalyst's reading of comments belongs to its playbooks, not the action
    expect(result.value).not.toHaveProperty('certifiedSha');
  });

  // @req FR:playbook-actions-git/github-pr-get.output
  it('treats a missing CODEOWNERS as no code owners', async () => {
    github();

    const result = await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' });

    expect(result.value).toMatchObject({ codeOwners: [], codeOwned: false });
  });

  // @req FR:playbook-actions-git/github-pr-get.no-shell
  it('runs gh without a shell', async () => {
    github();
    await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' });
    expect(gh).toHaveBeenCalled();
    expect(require('child_process').execSync).not.toHaveBeenCalled();
  });

  // @req FR:playbook-actions-git/common.validation
  it('rejects a bad PR number', async () => {
    expect((await new GitHubPRGetAction().execute({ pr: 0 })).code).toBe('GitHubPRGetConfigInvalid');
  });
});

describe('GitHubPREditAction', () => {
  // @req FR:playbook-actions-git/github-pr-edit.@action
  it('is the github-pr-edit action, taking the PR number first', () => {
    expect(GitHubPREditAction.actionType).toBe('github-pr-edit');
    expect(GitHubPREditAction.primaryProperty).toBe('pr');
  });

  // @req FR:playbook-actions-git/github-pr-edit.input
  // @req FR:playbook-actions-git/github-pr-edit.output
  // @req FR:playbook-actions-git/github-pr-edit.no-shell
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
    expect(result.value).toEqual({ addLabels: ['a b', 'c'], removeLabels: ['d'], addAssignees: ['u'], removeAssignees: ['v'] });
  });

  // @req FR:playbook-actions-git/github-pr-edit.input
  it('edits the title, body, base, milestone, reviewers, and projects too', async () => {
    await new GitHubPREditAction().execute({
      pr: 5, repository: 'o/r', title: 'New', body: 'Text', base: 'dev', milestone: 'v1',
      addReviewers: ['r1', 'r2'], removeReviewers: ['r3'], addProjects: ['p'], removeProjects: ['q'],
    });

    expect(gh.mock.calls[0][1]).toEqual([
      'pr', 'edit', '5', '-R', 'o/r',
      '--title', 'New', '--body', 'Text', '--base', 'dev', '--milestone', 'v1',
      '--add-reviewer', 'r1,r2', '--remove-reviewer', 'r3', '--add-project', 'p', '--remove-project', 'q',
    ]);
  });

  // @req FR:playbook-actions-git/github-pr-edit.input
  it('clears the milestone', async () => {
    await new GitHubPREditAction().execute({ pr: 5, repository: 'o/r', removeMilestone: true });

    expect(gh.mock.calls[0][1]).toEqual(['pr', 'edit', '5', '-R', 'o/r', '--remove-milestone']);
  });

  // @req FR:playbook-actions-git/github-pr-edit.idempotent
  // @req FR:pull-request-workflow/lifecycle.idempotent
  it('makes no gh call when nothing changes', async () => {
    const result = await new GitHubPREditAction().execute({ pr: 5, repository: 'o/r', addLabels: [], removeLabels: [] });

    expect(result.message).toBe('PR already up to date');
    expect(gh).not.toHaveBeenCalled();
  });

  // @req FR:playbook-actions-git/common.validation
  it('rejects a bad PR number', async () => {
    expect((await new GitHubPREditAction().execute({ pr: -1 })).code).toBe('GitHubPREditConfigInvalid');
  });
});

describe('mergeRefusal', () => {
  const snap = (over: Partial<PRSnapshot> = {}): PRSnapshot => ({
    number: 5, title: 'T', url: 'u', author: 'me', isDraft: false, state: 'OPEN', headSha: 'abc1234def', headRef: 'b', baseRef: 'main',
    labels: [], assignees: [], reviews: [], checks: [{ name: 'ci', state: 'pass' }], threads: [], comments: [],
    changedFiles: ['a.ts'], codeOwners: [], codeOwned: false, mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN',
    ...over,
  });
  const code = (over: Partial<PRSnapshot>, override?: any[], sha?: string) => mergeRefusal(snap(over), override, sha)?.code;
  const approval = { author: 'owner', state: 'APPROVED', bot: false };
  const open = { resolved: false, comments: [{ author: 'rev', body: 'x' }] };

  // @req FR:playbook-actions-git/github-pr-merge.gates
  it('allows a clean PR, with no code-owner approval when no owner covers a file', () => {
    expect(mergeRefusal(snap())).toBeUndefined();
    expect(mergeRefusal(snap({ checks: [{ name: 'a', state: 'skip' }, { name: 'b', state: 'pass' }] }))).toBeUndefined();
  });

  // @req FR:playbook-actions-git/github-pr-merge.gates
  it('never merges a PR that is closed, merged, or a draft', () => {
    expect(code({ state: 'MERGED' })).toBe('PullRequestNotOpen');
    expect(code({ state: 'CLOSED' })).toBe('PullRequestNotOpen');
    expect(code({ isDraft: true }, ['checks', 'code-owners', 'threads', 'merge-state'])).toBe('PullRequestDraft');
  });

  // @req FR:playbook-actions-git/github-pr-merge.gates
  it('requires every check to pass, unless overridden', () => {
    expect(code({ checks: [{ name: 'ci', state: 'pending' }] })).toBe('ChecksNotPassing');
    expect(code({ checks: [{ name: 'ci', state: 'fail' }] })).toBe('ChecksNotPassing');
    expect(code({ checks: [{ name: 'ci', state: 'fail' }] }, ['checks'])).toBeUndefined();
    expect(mergeRefusal(snap({ checks: [{ name: 'ci', state: 'fail' }] }))?.message).toContain('ci (failed)');
  });

  // @req FR:playbook-actions-git/github-pr-merge.gates
  it('requires a code owner to approve when one covers a changed file, unless overridden', () => {
    const owned = { codeOwned: true, codeOwners: ['owner', 'other'] };
    expect(code(owned)).toBe('CodeOwnerApprovalMissing');
    expect(code({ ...owned, reviews: [{ ...approval, author: 'rando' }] })).toBe('CodeOwnerApprovalMissing');
    expect(code({ ...owned, reviews: [{ ...approval, author: 'Owner' }] })).toBeUndefined();
    expect(code(owned, ['code-owners'])).toBeUndefined();
  });

  // @req FR:playbook-actions-git/github-pr-merge.gates
  it('leaves team-only code owners to branch protection', () => {
    expect(code({ codeOwned: true, codeOwners: [] })).toBeUndefined();
  });

  // @req FR:playbook-actions-git/github-pr-merge.gates
  it('requires every thread resolved, unless overridden', () => {
    expect(code({ threads: [open] })).toBe('ThreadsUnresolved');
    expect(code({ threads: [open] }, ['threads'])).toBeUndefined();
    expect(mergeRefusal(snap({ threads: [open, open] }))?.message).toBe('2 review threads are still unresolved.');
  });

  // @req FR:playbook-actions-git/github-pr-merge.gates
  it('requires a clean merge state, unless overridden', () => {
    expect(code({ mergeable: 'CONFLICTING', mergeStateStatus: 'DIRTY' })).toBe('MergeStateNotClean');
    expect(code({ mergeStateStatus: 'BEHIND' })).toBe('MergeStateNotClean');
    expect(code({ mergeStateStatus: 'UNKNOWN' })).toBe('MergeStateNotClean');
    expect(code({ mergeStateStatus: 'UNSTABLE' })).toBeUndefined();
    expect(code({ mergeStateStatus: 'BLOCKED' }, ['merge-state'])).toBeUndefined();
  });

  // @req FR:playbook-actions-git/github-pr-merge.head-sha
  it('refuses when the head is not the one the caller expects', () => {
    expect(code({}, [], 'def5678')).toBe('HeadCommitChanged');
    expect(code({}, [], 'abc1234')).toBeUndefined();
  });
});

describe('GitHubPRMergeAction', () => {
  // @req FR:playbook-actions-git/github-pr-merge.@action
  it('is the github-pr-merge action, taking the PR number first', () => {
    expect(GitHubPRMergeAction.actionType).toBe('github-pr-merge');
    expect(GitHubPRMergeAction.primaryProperty).toBe('pr');
  });

  // @req FR:playbook-actions-git/github-pr-merge.input
  // @req FR:playbook-actions-git/github-pr-merge.head-sha
  // @req FR:playbook-actions-git/github-pr-merge.no-bypass
  // @req FR:playbook-actions-git/github-pr-merge.no-shell
  it('reads the PR itself and squash-merges the head it read, never with --admin', async () => {
    github({ view: { ...view, statusCheckRollup: [{ name: 'ci', status: 'COMPLETED', conclusion: 'SUCCESS' }] } });

    const result = await new GitHubPRMergeAction().execute({ pr: 5, repository: 'o/r' });

    expect(result.value).toEqual({ merged: true });
    expect(calls().filter((c) => c.startsWith('pr merge'))).toEqual(['pr merge 5 -R o/r --squash --match-head-commit abc1234']);
    expect(calls().join()).not.toContain('--admin');
  });

  // @req FR:playbook-actions-git/github-pr-merge.input
  it('merges with another method and deletes the branch on request', async () => {
    github({ view: { ...view, statusCheckRollup: [] } });

    await new GitHubPRMergeAction().execute({ pr: 5, repository: 'o/r', method: 'rebase', deleteBranch: true });

    expect(calls().filter((c) => c.startsWith('pr merge'))).toEqual([
      'pr merge 5 -R o/r --rebase --match-head-commit abc1234 --delete-branch',
    ]);
  });

  // @req FR:playbook-actions-git/github-pr-merge.gates
  // @req FR:playbook-actions-git/github-pr-merge.output
  it('refuses with a code and a message, and does not call merge, when a rule is unmet', async () => {
    github();

    const result = await new GitHubPRMergeAction().execute({ pr: 5, repository: 'o/r' });

    expect(result.code).toBe('Success');
    expect(result.value).toMatchObject({ merged: false, code: 'ChecksNotPassing', message: expect.stringContaining('lint') });
    expect(result.message).toMatch(/\(Code: ChecksNotPassing\)$/);
    expect(calls().some((c) => c.startsWith('pr merge'))).toBe(false);
  });

  // @req FR:playbook-actions-git/github-pr-merge.input
  it('merges past a rule named in override', async () => {
    github({ view: { ...view, statusCheckRollup: [{ name: 'ci', status: 'COMPLETED', conclusion: 'FAILURE' }] } });

    const result = await new GitHubPRMergeAction().execute({ pr: 5, repository: 'o/r', override: ['checks'] });

    expect(result.value).toEqual({ merged: true });
  });

  // @req FR:playbook-actions-git/github-pr-merge.head-sha
  it('refuses when the PR head is not the expected sha', async () => {
    github({ view: { ...view, statusCheckRollup: [] } });

    const result = await new GitHubPRMergeAction().execute({ pr: 5, repository: 'o/r', sha: 'def5678' });

    expect(result.value).toMatchObject({ merged: false, code: 'HeadCommitChanged' });
  });

  // @req FR:playbook-actions-git/github-pr-merge.refused
  it('returns a merge GitHub rejects with its reason instead of throwing', async () => {
    github({
      view: { ...view, statusCheckRollup: [] },
      merge: () => { throw new Error('Command failed: gh pr merge 5\nHead branch was modified'); },
    });

    const result = await new GitHubPRMergeAction().execute({ pr: 5, repository: 'o/r' });

    expect(result.code).toBe('Success');
    expect(result.value).toMatchObject({ merged: false, code: 'MergeFailed', message: expect.stringContaining('modified') });
    expect((result.value as any).message).not.toContain('Command failed');
  });

  // @req FR:playbook-actions-git/common.validation
  it.each([
    [{ pr: 5, sha: 'nope' }],
    [{ pr: 5, method: 'fast-forward' }],
    [{ pr: 5, override: ['everything'] }],
    [{ pr: 0 }],
  ])('rejects bad config %j', async (config) => {
    expect((await new GitHubPRMergeAction().execute(config as any)).code).toBe('GitHubPRMergeConfigInvalid');
  });
});
