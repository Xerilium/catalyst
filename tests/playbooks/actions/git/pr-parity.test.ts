/**
 * finops-hubs parity actions: dead base, skip-checks, merge retries and holds,
 * dry runs, the PR list, and check runs
 */
import { execFileSync } from 'child_process';
import { GitHubPRGetAction } from '@playbooks/actions/git/pr-get-action';
import { GitHubPREditAction } from '@playbooks/actions/git/pr-edit-action';
import { GitHubPRMergeAction, mergeFailure } from '@playbooks/actions/git/pr-merge-action';
import { GitHubPRListAction } from '@playbooks/actions/git/pr-list-action';
import { GitHubCheckRunAction } from '@playbooks/actions/git/check-run-action';

jest.mock('child_process', () => ({ execSync: jest.fn(), execFileSync: jest.fn() }));
const gh = execFileSync as jest.MockedFunction<typeof execFileSync>;
const calls = () => gh.mock.calls.map((c) => (c[1] as string[]).join(' '));
const merges = () => calls().filter((c) => c.startsWith('pr merge'));

const baseView = {
  number: 5, title: 'T', url: 'u', author: { login: 'me' }, isDraft: false, state: 'OPEN',
  headRefOid: 'abc1234', headRefName: 'b', baseRefName: 'main',
  labels: [{ name: 'x' }], assignees: [{ login: 'me' }], mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN',
  latestReviews: [{ author: { login: 'rev' }, state: 'APPROVED' }],
  statusCheckRollup: [{ name: 'ci', status: 'COMPLETED', conclusion: 'SUCCESS' }],
};
const noThreads = JSON.stringify({ data: { repository: { pullRequest: { reviewThreads: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] } } } } });

interface Fake {
  /** Answers for `pr view`, one per call; the last repeats */
  views?: object[];
  /** `api repos/o/r/branches/...`: a message to throw, or the branch name */
  branch?: string | Error;
  defaultBranch?: string;
  config?: string | null;
  steps?: Record<string, number>;
  mergeErrors?: string[];
  checkRuns?: object[];
  prs?: object[];
  current?: object | Error;
}

/** Config that gates on GitHub checks */
const REMOTE = JSON.stringify({ 'pull-requests': { merge: { checks: 'remote' } } });

const github = (fake: Fake = {}) => {
  let viewCalls = 0;
  let mergeCalls = 0;
  gh.mockImplementation(((_: string, args: string[]) => {
    const a = args.join(' ');
    if (a.startsWith('pr merge')) {
      const err = fake.mergeErrors?.[mergeCalls++];
      if (err) { throw new Error(`Command failed: gh pr merge\n${err}`); }
      return '';
    }
    if (a.includes('--json commits')) { return JSON.stringify({ commits: [] }); }
    if (a.includes('--json labels,assignees')) { return JSON.stringify({ labels: baseView.labels, assignees: baseView.assignees }); }
    if (a.startsWith('pr view') && a.includes('headRefName,baseRefName,state')) {
      if (fake.current instanceof Error) { throw fake.current; }
      return JSON.stringify(fake.current ?? {});
    }
    if (a.startsWith('pr view')) {
      const views = fake.views ?? [baseView];
      return JSON.stringify(views[Math.min(viewCalls++, views.length - 1)]);
    }
    if (a.includes('graphql')) { return noThreads; }
    if (a.includes('/files')) { return JSON.stringify([[{ filename: 'a.ts' }]]); }
    if (a.includes('contents/.xe/config/catalyst.json')) {
      // Most tests here gate on GitHub checks; null is no config file, which is local CI mode
      if (fake.config === undefined) { return REMOTE; }
      if (fake.config === null) { throw new Error('HTTP 404'); }
      return fake.config;
    }
    if (a.includes('contents/')) { throw new Error('HTTP 404'); }
    if (a.startsWith('api repos/o/r/branches/')) {
      if (fake.branch instanceof Error) { throw fake.branch; }
      return fake.branch ?? 'main';
    }
    if (a === 'api repos/o/r --jq .default_branch') { return fake.defaultBranch ?? 'main'; }
    const job = a.match(/^api repos\/o\/r\/actions\/jobs\/(\d+) /);
    if (job) { return String(fake.steps?.[job[1]] ?? 3); }
    if (a.startsWith('api repos/o/r/actions/')) { return ''; }
    if (a.startsWith('api user')) { return 'me'; }
    if (/\/(comments|reviews|events) /.test(a)) { return '[[]]'; }
    if (a.includes('/check-runs?')) { return JSON.stringify({ check_runs: fake.checkRuns ?? [] }); }
    if (a.startsWith('api repos/o/r/pulls?')) { return JSON.stringify([fake.prs ?? []]); }
    return '';
  }) as never);
};

beforeEach(() => gh.mockReset().mockReturnValue('' as never));

const read = async (config: Record<string, unknown> = {}) => {
  const result = await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r', ...config });
  return result.value as { baseGone: boolean; checksFailed: boolean; checksPassed: boolean; checks: { name: string; state: string }[] };
};

describe('github-pr-get: base gone', () => {
  // @req FR:playbook-actions-git/github-pr-get.base-gone
  it('reports a base branch that no longer exists and is not long-lived', async () => {
    github({ branch: new Error('HTTP 404'), defaultBranch: 'main', views: [{ ...baseView, baseRefName: 'stack-1' }] });
    expect((await read()).baseGone).toBe(true);
  });

  // @req FR:playbook-actions-git/github-pr-get.base-gone
  it('reports a base branch that exists as not gone', async () => {
    github();
    expect((await read()).baseGone).toBe(false);
  });

  // @req FR:playbook-actions-git/github-pr-get.base-gone
  // @req FR:playbook-actions-git/github-pr-get.@json
  it('counts a configured long-lived branch as never gone', async () => {
    github({
      branch: new Error('HTTP 404'),
      config: JSON.stringify({ 'pull-requests': { 'long-lived-branches': ['release'] } }),
      views: [{ ...baseView, baseRefName: 'release' }],
    });
    expect((await read()).baseGone).toBe(false);
  });

  // @req FR:playbook-actions-git/github-pr-get.base-gone
  it('counts the default branch as never gone', async () => {
    github({ branch: new Error('HTTP 404'), defaultBranch: 'main' });
    expect((await read()).baseGone).toBe(false);
  });

  // @req FR:playbook-actions-git/github-pr-get.base-gone.unread
  it('does not report the base gone when it cannot tell', async () => {
    github({ branch: new Error('HTTP 502 Bad Gateway'), views: [{ ...baseView, baseRefName: 'stack-1' }] });
    expect((await read()).baseGone).toBe(false);
  });

  // @req FR:playbook-actions-git/github-pr-get.base-gone.config
  it('reads a deleted base branch\'s settings from its last commit, so a long-lived base stays exempt', async () => {
    github({ branch: new Error('HTTP 404'), views: [{ ...baseView, baseRefName: 'release', baseRefOid: 'deadbeef' }] });
    const inner = gh.getMockImplementation() as (...a: unknown[]) => string;
    gh.mockImplementation(((cmd: string, args: string[]) => {
      const a = args.join(' ');
      if (a.includes('contents/.xe/config/catalyst.json?ref=deadbeef')) { return JSON.stringify({ 'pull-requests': { 'long-lived-branches': ['release'] } }); }
      return inner(cmd, args);
    }) as never);
    expect((await read()).baseGone).toBe(false);
    expect(calls().some((c) => c.includes('catalyst.json?ref=release'))).toBe(false);
  });
});

describe('github-pr-get: same repository', () => {
  const sameRepository = async () =>
    ((await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' })).value as { sameRepository: boolean }).sameRepository;

  // @req FR:playbook-actions-git/github-pr-get.same-repository
  it('reports a head in this repository as the same, and a fork or a deleted fork as not', async () => {
    github({ views: [{ ...baseView, headRepository: { name: 'r' }, headRepositoryOwner: { login: 'O' } }] });
    expect(await sameRepository()).toBe(true);
    github({ views: [{ ...baseView, headRepository: { name: 'r' }, headRepositoryOwner: { login: 'someone' } }] });
    expect(await sameRepository()).toBe(false);
    github({ views: [{ ...baseView, headRepository: null, headRepositoryOwner: null }] });
    expect(await sameRepository()).toBe(false);
  });
});

describe('github-pr-get: head long-lived', () => {
  const headLongLived = async () =>
    ((await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' })).value as { headLongLived: boolean }).headLongLived;

  // @req FR:playbook-actions-git/github-pr-get.head-long-lived
  it('counts the default branch and configured branches as long-lived, and a feature branch as not', async () => {
    github({ views: [{ ...baseView, headRefName: 'main' }] });
    expect(await headLongLived()).toBe(true);
    github({ views: [{ ...baseView, headRefName: 'release' }], config: JSON.stringify({ 'pull-requests': { 'long-lived-branches': ['release'] } }) });
    expect(await headLongLived()).toBe(true);
    github({ views: [{ ...baseView, headRefName: 'feature' }] });
    expect(await headLongLived()).toBe(false);
  });

  // @req FR:playbook-actions-git/github-pr-get.head-long-lived
  it('counts the head as long-lived when the default branch cannot be read', async () => {
    github({ views: [{ ...baseView, headRefName: 'feature' }] });
    const inner = gh.getMockImplementation() as (...a: unknown[]) => string;
    gh.mockImplementation(((cmd: string, args: string[]) => {
      if (args.join(' ') === 'api repos/o/r --jq .default_branch') { throw new Error('HTTP 500'); }
      return inner(cmd, args);
    }) as never);
    expect(await headLongLived()).toBe(true);
  });
});

describe('github-pr-get: skip checks', () => {
  const failing = {
    ...baseView,
    statusCheckRollup: [
      { name: 'ci', status: 'COMPLETED', conclusion: 'SUCCESS' },
      { name: 'flaky', status: 'COMPLETED', conclusion: 'FAILURE' },
    ],
  };

  // @req FR:playbook-actions-git/github-pr-get.skip-checks
  it('leaves out a check named in Skip-Checks', async () => {
    github({ views: [failing] });
    expect((await read()).checksFailed).toBe(true);
    const skipped = await read({ skipChecks: ['Flaky'] });
    expect(skipped.checksFailed).toBe(false);
    expect(skipped.checks.map((c) => c.name)).toEqual(['ci']);
  });

  // @req FR:playbook-actions-git/github-pr-get.skip-checks.config
  // @req FR:playbook-actions-git/github-pr-get.@json
  it('leaves out a check named in pull-requests.reconcile.skip-checks on the base branch', async () => {
    github({ views: [failing], config: JSON.stringify({ 'pull-requests': { reconcile: { 'skip-checks': ['flaky'] }, merge: { checks: 'remote' } } }) });
    expect((await read()).checksFailed).toBe(false);
    expect(calls().some((c) => c.includes('contents/.xe/config/catalyst.json?ref=main'))).toBe(true);
  });

  // @req FR:playbook-actions-git/github-pr-get.skip-checks.config
  it('ignores a config file that is not valid JSON instead of failing the read', async () => {
    github({ views: [failing], config: 'not json' });
    // The defaults hold, so the read falls back to local CI mode
    expect((await read()).checks).toMatchObject([{ name: 'Local CI', state: 'pending' }]);
  });

  // @req FR:playbook-actions-git/github-pr-get.skip-checks.no-steps
  it('leaves out a failed job that ran no steps, and keeps one that did', async () => {
    const jobs = {
      ...baseView,
      statusCheckRollup: [
        { name: 'never-started', workflowName: 'CI', status: 'COMPLETED', conclusion: 'FAILURE', detailsUrl: 'https://github.com/o/r/actions/runs/9/job/101' },
        { name: 'real-failure', workflowName: 'CI', status: 'COMPLETED', conclusion: 'FAILURE', detailsUrl: 'https://github.com/o/r/actions/runs/9/job/102' },
      ],
    };
    github({ views: [jobs], steps: { '101': 0, '102': 4 } });
    const snap = await read();
    expect(snap.checks.map((c) => c.name)).toEqual(['real-failure']);
    expect(snap.checksFailed).toBe(true);
  });

  // @req FR:playbook-actions-git/github-pr-get.skip-checks.no-steps
  it('reads steps only for a GitHub Actions job, never another CI\'s job URL', async () => {
    const jenkins = {
      ...baseView,
      statusCheckRollup: [{ name: 'jenkins', context: 'jenkins', state: 'FAILURE', detailsUrl: 'https://ci.example.com/job/101' }],
    };
    github({ views: [jenkins], steps: { '101': 0 } });
    expect((await read()).checksFailed).toBe(true);
    expect(calls().some((c) => c.includes('/actions/jobs/'))).toBe(false);
  });

  // @req FR:playbook-actions-git/github-pr-get.skip-checks.report
  it('names each check it leaves out', async () => {
    const jobs = {
      ...failing,
      statusCheckRollup: [
        ...failing.statusCheckRollup,
        { name: 'never-started', workflowName: 'CI', status: 'COMPLETED', conclusion: 'FAILURE', detailsUrl: 'https://github.com/o/r/actions/runs/9/job/101' },
      ],
    };
    github({ views: [jobs], steps: { '101': 0 } });
    expect(((await read({ skipChecks: 'flaky' })) as unknown as { skippedChecks: string[] }).skippedChecks).toEqual(['flaky', 'never-started']);
  });

  // @req FR:playbook-actions-git/github-pr-get.skip-checks.no-steps
  it('keeps a failed job when its steps cannot be read', async () => {
    const jobs = {
      ...baseView,
      statusCheckRollup: [{ name: 'j', workflowName: 'CI', status: 'COMPLETED', conclusion: 'FAILURE', detailsUrl: 'https://github.com/o/r/actions/runs/9/job/101' }],
    };
    github({ views: [jobs] });
    gh.mockImplementationOnce(gh.getMockImplementation() as never);
    const inner = gh.getMockImplementation() as (...a: unknown[]) => string;
    gh.mockImplementation(((cmd: string, args: string[]) => {
      if (args.join(' ').includes('/actions/jobs/')) { throw new Error('HTTP 500'); }
      return inner(cmd, args);
    }) as never);
    expect((await read()).checksFailed).toBe(true);
  });

  // @req FR:pull-request-workflow/reconcile.own-checks.check-runs
  it('does not count the check runs reconcile writes', async () => {
    const own = {
      ...baseView,
      statusCheckRollup: [
        { name: 'Threads resolved', status: 'COMPLETED', conclusion: 'FAILURE' },
        { name: 'Codeowner approved', status: 'COMPLETED', conclusion: 'FAILURE' },
        { name: 'ci', status: 'COMPLETED', conclusion: 'SUCCESS' },
      ],
    };
    github({ views: [own] });
    const snap = await read();
    expect(snap.checks.map((c) => c.name)).toEqual(['ci']);
    expect(snap.checksFailed).toBe(false);
  });
});

describe('github-pr-merge', () => {
  const merge = (config: Record<string, unknown> = {}) =>
    new GitHubPRMergeAction().execute({ pr: 5, repository: 'o/r', retryDelaySeconds: 0, ...config });

  // @req FR:playbook-actions-git/github-pr-merge.retry.unknown
  // @req FR:playbook-actions-git/github-pr-merge.retry.recheck
  it('retries while GitHub reports the merge state as UNKNOWN, then merges', async () => {
    github({ views: [{ ...baseView, mergeStateStatus: 'UNKNOWN' }, { ...baseView, mergeStateStatus: 'UNKNOWN' }, baseView] });
    const result = await merge();
    expect(result.value).toEqual({ merged: true });
    expect(merges()).toHaveLength(1);
    expect(calls().filter((c) => c.startsWith('pr view') && c.includes('statusCheckRollup'))).toHaveLength(3);
  });

  // @req FR:playbook-actions-git/github-pr-merge.retry
  it('stops retrying at the attempt limit and reports why it did not merge', async () => {
    github({ views: [{ ...baseView, mergeStateStatus: 'UNKNOWN' }] });
    const result = await merge({ retries: 2 });
    expect(result.value).toMatchObject({ merged: false, code: 'PullRequestNotMergeable' });
    expect(calls().filter((c) => c.startsWith('pr view') && c.includes('statusCheckRollup'))).toHaveLength(2);
    expect(merges()).toHaveLength(0);
  });

  // @req FR:playbook-actions-git/github-pr-merge.retry.server
  it('retries a 5xx from GitHub', async () => {
    github({ mergeErrors: ['HTTP 502: Bad Gateway'] });
    const result = await merge();
    expect(result.value).toEqual({ merged: true });
    expect(merges()).toHaveLength(2);
  });

  // @req FR:playbook-actions-git/github-pr-merge.retry.base-race
  it('retries when the base branch was modified', async () => {
    github({ mergeErrors: ['Base branch was modified. Review and try the merge again.'] });
    expect((await merge()).value).toEqual({ merged: true });
    expect(merges()).toHaveLength(2);
  });

  // @req FR:playbook-actions-git/github-pr-merge.retry.server
  it('judges the retry from what GitHub said, not from the trailers echoed in the command', async () => {
    gh.mockReset();
    github();
    const inner = gh.getMockImplementation() as (...a: unknown[]) => string;
    gh.mockImplementation(((cmd: string, args: string[]) => {
      if (args.join(' ').includes('--json commits')) { return JSON.stringify({ commits: [{ messageHeadline: 'x', authors: [{ name: 'Bot 502', email: '502@x.com' }] }] }); }
      if (args[0] === 'pr' && args[1] === 'merge') { throw new Error(`Command failed: gh pr merge 5 --body ${args[args.indexOf('--body') + 1]}\nHTTP 405: Required status check is expected`); }
      return inner(cmd, args);
    }) as never);
    const result = await merge();
    expect(result.value).toMatchObject({ merged: false, code: 'PullRequestMergeFailed' });
    expect(merges()).toHaveLength(1);
    expect((result.value as { message: string }).message).not.toContain('502@x.com');
  });

  // @req FR:playbook-actions-git/github-pr-merge.retry.server
  it('judges the retry from what gh printed when the error carries it', async () => {
    github();
    const inner = gh.getMockImplementation() as (...a: unknown[]) => string;
    let failed = false;
    gh.mockImplementation(((cmd: string, args: string[]) => {
      if (args[0] === 'pr' && args[1] === 'merge' && !failed) {
        failed = true;
        // A trailer email that looks like a 5xx is in the echoed command, not in what gh printed
        throw Object.assign(new Error('Command failed: gh pr merge 5 --body Co-authored-by: X <500+x@users.noreply.github.com>\nHTTP 405'), { stderr: 'HTTP 405: Required status check is expected' });
      }
      return inner(cmd, args);
    }) as never);
    const result = await merge();
    expect(result.value).toMatchObject({ merged: false, code: 'PullRequestMergeFailed', message: "GitHub wouldn't merge the PR: HTTP 405: Required status check is expected" });
    expect(merges()).toHaveLength(1);
  });

  // @req FR:playbook-actions-git/github-pr-merge.retry.read
  it('retries a PR read that fails with a 5xx, then merges', async () => {
    github();
    const inner = gh.getMockImplementation() as (...a: unknown[]) => string;
    let failed = false;
    gh.mockImplementation(((cmd: string, args: string[]) => {
      if (args[0] === 'pr' && args[1] === 'view' && args.join(' ').includes('statusCheckRollup') && !failed) {
        failed = true;
        throw new Error('Command failed: gh pr view\nHTTP 502: Bad Gateway');
      }
      return inner(cmd, args);
    }) as never);
    expect((await merge()).value).toEqual({ merged: true });
    expect(merges()).toHaveLength(1);
  });

  // @req FR:playbook-actions-git/github-pr-merge.retry.read
  it('fails a PR read that no retry can fix', async () => {
    github();
    const inner = gh.getMockImplementation() as (...a: unknown[]) => string;
    gh.mockImplementation(((cmd: string, args: string[]) => {
      if (args[0] === 'pr' && args[1] === 'view' && args.join(' ').includes('statusCheckRollup')) { throw new Error('Command failed: gh pr view\nHTTP 404: Not Found'); }
      return inner(cmd, args);
    }) as never);
    expect((await merge()).code).not.toBe('Success');
    expect(calls().filter((c) => c.startsWith('pr view') && c.includes('statusCheckRollup'))).toHaveLength(1);
  });

  // @req FR:playbook-actions-git/github-pr-merge.skip-checks
  it('ignores the checks named in Skip-Checks on every read', async () => {
    github({ views: [{ ...baseView, statusCheckRollup: [{ name: 'ci', status: 'COMPLETED', conclusion: 'SUCCESS' }, { name: 'flaky', status: 'COMPLETED', conclusion: 'FAILURE' }] }] });
    expect((await merge()).value).toMatchObject({ merged: false, code: 'PullRequestChecksNotPassing' });
    expect((await merge({ skipChecks: 'flaky' })).value).toEqual({ merged: true });
  });

  // @req FR:playbook-actions-git/github-pr-merge.retry.conflict
  it('never retries a 409', async () => {
    github({ mergeErrors: ['HTTP 409: Head branch was modified. Review and try the merge again.'] });
    const result = await merge();
    expect(result.value).toMatchObject({ merged: false, code: 'PullRequestMergeFailed' });
    expect(merges()).toHaveLength(1);
  });

  // @req FR:playbook-actions-git/github-pr-merge.retry
  it('returns a retryable failure once the attempts run out', async () => {
    github({ mergeErrors: ['HTTP 500', 'HTTP 500', 'HTTP 500'] });
    const result = await merge({ retries: 3 });
    expect(result.value).toMatchObject({ merged: false, code: 'PullRequestMergeFailed' });
    expect(merges()).toHaveLength(3);
  });

  // @req FR:playbook-actions-git/github-pr-merge.retry.recheck
  // @req FR:playbook-actions-git/github-pr-merge.hold-labels
  it('checks the hold labels again on every attempt', async () => {
    github({
      mergeErrors: ['HTTP 502'],
      views: [baseView, { ...baseView, labels: [{ name: 'Paused' }] }],
    });
    const result = await merge({ holdLabels: ['Paused', 'WIP'] });
    expect(result.value).toMatchObject({ merged: false, code: 'PullRequestHeld' });
    expect(merges()).toHaveLength(1);
  });

  // @req FR:playbook-actions-git/github-pr-merge.hold-labels
  it('refuses a PR with a hold label before it merges anything', async () => {
    github({ views: [{ ...baseView, labels: [{ name: 'WIP' }] }] });
    const result = await merge({ holdLabels: ['', 'wip'] });
    expect(result.value).toMatchObject({ merged: false, code: 'PullRequestHeld' });
    expect(merges()).toHaveLength(0);
  });

  // @req FR:playbook-actions-git/github-pr-merge.already-merged
  it('reports an already merged PR as merged', async () => {
    github({ views: [{ ...baseView, state: 'MERGED' }] });
    const result = await merge();
    expect(result.value).toEqual({ merged: true });
    expect(merges()).toHaveLength(0);
  });

  // @req FR:playbook-actions-git/github-pr-merge.already-merged
  it('reports a PR merged by someone else during a failed attempt as merged', async () => {
    github({ mergeErrors: ['HTTP 409'], views: [baseView, { ...baseView, state: 'MERGED' }] });
    expect((await merge()).value).toEqual({ merged: true });
  });

  // @req FR:playbook-actions-git/github-pr-merge.dry-run
  it('says it would merge, and merges nothing, on a dry run', async () => {
    github();
    const result = await merge({ dryRun: true });
    expect(result.value).toMatchObject({ merged: false, code: 'PullRequestWouldMerge' });
    expect(merges()).toHaveLength(0);
  });

  // @req FR:playbook-actions-git/github-pr-merge.dry-run
  it('still names the rule that holds a PR on a dry run', async () => {
    github({ views: [{ ...baseView, isDraft: true }] });
    expect((await merge({ dryRun: true })).value).toMatchObject({ code: 'PullRequestNotPublished' });
  });

  // @req FR:playbook-actions-git/github-pr-merge.retry
  it('tells retryable failures from final ones', () => {
    expect(mergeFailure('HTTP 503 Service Unavailable').retry).toBe(true);
    expect(mergeFailure('Base branch was modified').retry).toBe(true);
    expect(mergeFailure('HTTP 409').retry).toBe(false);
    expect(mergeFailure('HTTP 405: Required status check is expected').retry).toBe(false);
    // A stray number, such as a PR number, is not a status
    expect(mergeFailure('PR 502 has a required check that is expected').retry).toBe(false);
    expect(mergeFailure('').reason).toBe('no reason given');
  });

  // @req FR:playbook-actions-git/github-pr-merge.input
  it('rejects bad retry settings', async () => {
    github();
    expect((await merge({ retries: 0 })).code).toBe('GitHubPRMergeConfigInvalid');
    expect((await merge({ retryDelaySeconds: -1 })).code).toBe('GitHubPRMergeConfigInvalid');
    expect((await merge({ holdLabels: 'x' })).code).toBe('GitHubPRMergeConfigInvalid');
  });
});

describe('github-pr-edit dry run', () => {
  // @req FR:playbook-actions-git/github-pr-edit.dry-run
  it('reports the changes it would make and makes none', async () => {
    github();
    const result = await new GitHubPREditAction().execute({
      pr: 5, repository: 'o/r', addLabels: ['Ready'], removeLabels: ['x'], assignees: ['rev'], dryRun: true,
    });
    expect(result.code).toBe('Success');
    expect(calls().some((c) => c.startsWith('pr edit'))).toBe(false);
    expect(result.message).toContain('Would');
    expect(result.message).toContain('add labels Ready');
    expect(result.message).toContain('remove labels x');
    expect(result.message).toContain('add assignees rev');
    expect(result.message).toContain('remove assignees me');
  });

  // @req FR:playbook-actions-git/github-pr-edit.dry-run.projected
  it('returns the labels and assignees as the edit would leave them', async () => {
    github();
    const result = await new GitHubPREditAction().execute({
      pr: 5, repository: 'o/r', addLabels: ['Ready'], removeLabels: ['x'], assignees: ['rev'], dryRun: true,
    });
    expect(result.value).toMatchObject({ labels: ['Ready'], assignees: ['rev'] });
  });
});

describe('github-pr-list', () => {
  const list = (config: Record<string, unknown> = {}) => new GitHubPRListAction().execute({ repository: 'o/r', ...config });
  const pr = (number: number, head = `h${number}`, base = 'main') => ({ number, title: `PR ${number}`, state: 'open', head: { ref: head }, base: { ref: base } });

  // @req FR:playbook-actions-git/github-pr-list.@action
  it('is the github-pr-list action', () => {
    expect(GitHubPRListAction.actionType).toBe('github-pr-list');
  });

  // @req FR:playbook-actions-git/github-pr-list.paginate
  // @req FR:playbook-actions-git/github-pr-list.output
  // @req FR:playbook-actions-git/github-pr-list.no-shell
  it('lists every open PR, oldest first', async () => {
    github({ prs: [pr(9), pr(3), pr(7)] });
    const result = await list();
    expect(result.value).toEqual([
      { number: 3, title: 'PR 3', headRef: 'h3', baseRef: 'main', state: 'OPEN' },
      { number: 7, title: 'PR 7', headRef: 'h7', baseRef: 'main', state: 'OPEN' },
      { number: 9, title: 'PR 9', headRef: 'h9', baseRef: 'main', state: 'OPEN' },
    ]);
    expect(calls()[0]).toContain('--paginate');
    expect(calls()[0]).toContain('state=open');
  });

  // @req FR:playbook-actions-git/github-pr-list.input
  it('filters by base and head branch', async () => {
    github({ prs: [pr(1, 'a', 'main'), pr(2, 'b', 'stack'), pr(3, 'a', 'stack')] });
    expect(((await list({ base: 'stack' })).value as { number: number }[]).map((p) => p.number)).toEqual([2, 3]);
    expect(calls()[0]).toContain('base=stack');
    expect(((await list({ head: 'a' })).value as { number: number }[]).map((p) => p.number)).toEqual([1, 3]);
  });

  // @req FR:playbook-actions-git/github-pr-list.current-branch
  it('returns the PR for the checked-out branch', async () => {
    github({ current: { number: 4, title: 'Mine', headRefName: 'me', baseRefName: 'main', state: 'OPEN' } });
    expect((await list({ currentBranch: true })).value).toEqual([{ number: 4, title: 'Mine', headRef: 'me', baseRef: 'main', state: 'OPEN' }]);
    // gh rejects -R without a PR argument
    expect(calls()[0]).toBe('pr view --json number,title,headRefName,baseRefName,state');
  });

  // @req FR:playbook-actions-git/github-pr-list.current-branch
  it('returns an empty list when the checked-out branch has no PR', async () => {
    github({ current: new Error('no pull requests found for branch "x"') });
    const result = await list({ currentBranch: true });
    expect(result.code).toBe('Success');
    expect(result.value).toEqual([]);
  });

  // @req FR:playbook-actions-git/github-pr-list.input
  it('rejects an unknown state', async () => {
    github();
    expect((await list({ state: 'merged' })).code).toBe('GitHubPRListConfigInvalid');
  });
});

describe('github-check-run', () => {
  const check = (config: Record<string, unknown> = {}) =>
    new GitHubCheckRunAction().execute({ name: 'Threads resolved', sha: 'abc1234', conclusion: 'success', title: 'All resolved', repository: 'o/r', ...config });
  const writes = () => calls().filter((c) => /-X (POST|PATCH)/.test(c));

  // @req FR:playbook-actions-git/github-check-run.@action
  it('is the github-check-run action, taking the name first', () => {
    expect(GitHubCheckRunAction.actionType).toBe('github-check-run');
    expect(GitHubCheckRunAction.primaryProperty).toBe('name');
  });

  // @req FR:playbook-actions-git/github-check-run.input
  it('adds a completed check run on the commit', async () => {
    github();
    expect((await check()).code).toBe('Success');
    const [write] = writes();
    expect(write).toContain('-X POST repos/o/r/check-runs');
    expect(write).toContain('name=Threads resolved');
    expect(write).toContain('head_sha=abc1234');
    expect(write).toContain('status=completed');
    expect(write).toContain('conclusion=success');
    expect(write).toContain('output[title]=All resolved');
    expect(write).toContain('output[summary]=All resolved');
  });

  // @req FR:playbook-actions-git/github-check-run.upsert
  it('updates the existing check run of that name instead of adding another', async () => {
    github({ checkRuns: [{ id: 77, name: 'Threads resolved', conclusion: 'failure', output: { summary: 'old' }, app: { slug: 'github-actions' } }] });
    await check();
    expect(writes()).toHaveLength(1);
    expect(writes()[0]).toContain('-X PATCH repos/o/r/check-runs/77');
  });

  // @req FR:playbook-actions-git/github-check-run.upsert.app
  it('adds its own check run beside a same-named run from another app', async () => {
    github({ checkRuns: [{ id: 77, name: 'Threads resolved', conclusion: 'failure', output: { summary: 'old' }, app: { slug: 'other-ci' } }] });
    await check();
    expect(writes()).toHaveLength(1);
    expect(writes()[0]).toContain('-X POST repos/o/r/check-runs');
  });

  // @req FR:playbook-actions-git/github-check-run.idempotent
  it('writes nothing when the conclusion and summary already match', async () => {
    github({ checkRuns: [{ id: 77, name: 'Threads resolved', conclusion: 'success', output: { summary: 'All resolved' }, app: { slug: 'github-actions' } }] });
    expect((await check()).code).toBe('Success');
    expect(writes()).toHaveLength(0);
  });

  // @req FR:playbook-actions-git/github-check-run.dry-run
  it('reports the check it would write and writes none on a dry run', async () => {
    github();
    const result = await check({ dryRun: true });
    expect(writes()).toHaveLength(0);
    expect(result.message).toContain('Would');
    expect(result.message).toContain('Threads resolved');
    expect(result.message).toContain('success');
  });

  // @req FR:playbook-actions-git/github-check-run.input
  it('rejects a missing name, sha, or an unknown conclusion', async () => {
    github();
    expect((await check({ name: '' })).code).toBe('GitHubCheckRunConfigInvalid');
    expect((await check({ sha: 'nope' })).code).toBe('GitHubCheckRunConfigInvalid');
    expect((await check({ conclusion: 'maybe' })).code).toBe('GitHubCheckRunConfigInvalid');
  });

  // @req FR:playbook-actions-git/github-check-run.no-shell
  // @req FR:playbook-actions-git/github-check-run.token
  it('runs gh with the checks token when the workflow provides one, never changing its own environment', async () => {
    github();
    const seen: (string | undefined)[] = [];
    const inner = gh.getMockImplementation() as (...a: unknown[]) => string;
    gh.mockImplementation(((cmd: string, args: string[], opts?: { env?: NodeJS.ProcessEnv }) => {
      seen.push(opts?.env?.GH_TOKEN);
      expect(process.env.GH_TOKEN).toBe('merge-token');
      return inner(cmd, args);
    }) as never);
    process.env.GH_TOKEN = 'merge-token';
    process.env.CATALYST_CHECKS_TOKEN = 'checks-token';
    try {
      await check();
      expect(seen.length).toBeGreaterThan(0);
      expect(seen.every((t) => t === 'checks-token')).toBe(true);
      expect(process.env.GH_TOKEN).toBe('merge-token');
    } finally {
      delete process.env.GH_TOKEN;
      delete process.env.CATALYST_CHECKS_TOKEN;
    }
  });
});
