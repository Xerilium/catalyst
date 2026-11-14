import { execFileSync } from 'child_process';
import { GitHubPRGetAction, codeOwnersFor, hashCommands, workflowRunsOnPR } from '@playbooks/actions/git/pr-get-action';
import { GitHubPREditAction } from '@playbooks/actions/git/pr-edit-action';
import { GitHubPRMergeAction, mergeBody, mergeRefusal } from '@playbooks/actions/git/pr-merge-action';
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

/** Top-level comments, reviews, and issue events, as the REST API lists them */
interface Said { comments?: object[]; reviews?: object[]; events?: object[] }

/** Answer `gh` as GitHub would for a PR; `extra` overrides a path's answer */
const github = (opts: { view?: object; codeowners?: string | null; merge?: () => string; said?: Said } = {}) => {
  gh.mockImplementation(((_: string, args: string[]) => {
    const a = args.join(' ');
    const said = a.match(/^api repos\/o\/r\/(?:issues|pulls)\/5\/(comments|reviews|events) /);
    if (said) { return JSON.stringify([opts.said?.[said[1] as keyof Said] ?? []]); }
    if (a.includes('--json commits')) { return JSON.stringify({ commits: [{ messageHeadline: 'feat: A', authors: [{ name: 'Me', email: 'me@x.com' }] }] }); }
    if (a.startsWith('pr view')) { return JSON.stringify(opts.view ?? view); }
    if (a.includes('graphql')) { return a.includes('endCursor=c1') ? page(false, true) : page(false, true); }
    if (a.includes('/files')) { return JSON.stringify([[{ filename: 'src/a.ts' }], [{ filename: 'b.md' }]]); }
    if (a.includes('contents/')) {
      if (opts.codeowners === null || opts.codeowners === undefined) { throw new Error('HTTP 404'); }
      return opts.codeowners;
    }
    if (a.startsWith('pr merge')) { return opts.merge ? opts.merge() : ''; }
    return '';
  }) as any);
};

describe('codeOwnersFor', () => {
  const file = '# owners\n* @default\n/docs/ @docs-owner\n*.ts @ts-owner @org/team\n';

  // @req FR:playbook-actions-git/github-pr-get.output
  it('takes the last matching rule and drops teams', () => {
    expect(codeOwnersFor(file, ['src/a.ts'])).toEqual({ owners: ['ts-owner'], covered: true, perFile: [['ts-owner']] });
    expect(codeOwnersFor(file, ['docs/x.md', 'README.md'])).toEqual({ owners: ['docs-owner', 'default'], covered: true, perFile: [['docs-owner'], ['default']] });
  });

  // @req FR:playbook-actions-git/github-pr-get.output
  it('reports no coverage without CODEOWNERS', () => {
    expect(codeOwnersFor('', ['a.ts'])).toEqual({ owners: [], covered: false, perFile: [] });
  });

  // @req FR:playbook-actions-git/github-pr-get.code-owners
  // @req FR:github-provider/codeowners.match
  // @req FR:github-provider/codeowners.match.globstar
  it('lets a leading **/ match a file at the root', () => {
    expect(codeOwnersFor('**/foo @root', ['foo', 'a/b/foo', 'foobar'])).toEqual({ owners: ['root'], covered: true, perFile: [['root'], ['root']] });
    expect(codeOwnersFor('docs/**/x.md @d', ['docs/x.md', 'docs/a/x.md']).perFile).toEqual([['d'], ['d']]);
  });

  // @req FR:github-provider/codeowners.match.single-star
  it('matches a trailing /* only to files directly in the folder', () => {
    expect(codeOwnersFor('docs/* @d', ['docs/a.md', 'docs/sub/b.md']).perFile).toEqual([['d']]);
  });

  // @req FR:github-provider/codeowners.match.unowned
  it('treats a last matching rule with no owners as unowned', () => {
    expect(codeOwnersFor('* @all\n/docs/', ['docs/a.md'])).toEqual({ owners: [], covered: false, perFile: [] });
    expect(codeOwnersFor('* @all\n/docs/', ['docs/a.md', 'x.ts'])).toEqual({ owners: ['all'], covered: true, perFile: [['all']] });
  });

  // @req FR:github-provider/codeowners.email
  it('skips owners given by email', () => {
    expect(codeOwnersFor('* a@b.com @user', ['x.ts'])).toEqual({ owners: ['user'], covered: true, perFile: [['user']] });
    expect(codeOwnersFor('* a@b.com', ['x.ts'])).toEqual({ owners: [], covered: true, perFile: [] });
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
  // @req FR:playbook-actions-git/github-pr-get.paginate
  // @req FR:playbook-actions-git/$pull-request
  // @req FR:playbook-actions-git/github-pr-get.derived
  // @req FR:playbook-actions-git/github-pr-get.hash-commands.inline
  // @req FR:playbook-actions-git/github-pr-get.approved
  it('reads the full snapshot from the PR number alone, paging every thread', async () => {
    gh.mockImplementation(((_: string, args: string[]) => {
      const a = args.join(' ');
      if (a.startsWith('pr view')) { return JSON.stringify(view); }
      if (/\/(comments|reviews|events) /.test(a)) { return '[[]]'; }
      if (a.includes('graphql')) { return a.includes('endCursor=c1') ? page(false, true) : page(true, false); }
      if (a.includes('/files')) { return JSON.stringify([[{ filename: 'src/a.ts' }], [{ filename: 'b.md' }]]); }
      if (a.includes('contents/.github/CODEOWNERS')) { return '*.ts @ts-owner'; }
      return '';
    }) as any);

    const result = await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' });

    expect(result.code).toBe('Success');
    expect(result.value).toMatchObject({
      number: 5, title: 'T', author: 'me', headSha: 'abc1234', headRef: 'b', baseRef: 'main',
      labels: ['x'], assignees: ['me'], mergeStateStatus: 'CLEAN', mergeable: 'MERGEABLE',
      changedFiles: ['src/a.ts', 'b.md'], codeOwners: ['ts-owner'], codeOwned: true, pendingCodeOwners: ['ts-owner'],
      codeOwnerApproved: false, changesRequested: false,
      approved: true, checksFailed: false, checksPassed: false, threadsUnresolved: 1, threadsAwaitingAuthor: 1,
      reviews: [{ author: 'rev', state: 'APPROVED', bot: false }, { author: 'github-actions[bot]', state: 'COMMENTED', bot: true }],
      checks: [{ name: 'ci', state: 'pass' }, { name: 'lint', state: 'pending' }, { name: 'legacy', state: 'pass' }],
    });
    expect((result.value as any).threads.map((t: any) => t.resolved)).toEqual([false, true]);
    expect(result.value).toMatchObject({ hashCommands: {}, latestHashCommands: {}, authorCommentedAt: '', labelsRemovedAt: {} });
    // Inline review comments and thread replies are never read for hash commands
    expect(calls().some((c) => c.includes('pulls/5/comments'))).toBe(false);
  });

  // @req FR:playbook-actions-git/github-pr-get.awaiting-author
  // @req FR:playbook-actions-git/github-pr-get.awaiting-author.self
  // @req FR:playbook-actions-git/github-pr-get.awaiting-author.marker
  it('counts the unresolved threads waiting on the author', async () => {
    const thread = (resolved: boolean, ...comments: [string, string][]) => ({
      isResolved: resolved, comments: { nodes: comments.map(([login, body]) => ({ author: { login }, body })) },
    });
    gh.mockImplementation(((_: string, args: string[]) => {
      const a = args.join(' ');
      if (a.startsWith('pr view')) { return JSON.stringify(view); }
      if (a.includes('graphql')) {
        return JSON.stringify({ data: { repository: { pullRequest: { reviewThreads: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [
          thread(false, ['rev', 'fix'], ['me', 'done']),
          thread(false, ['me', 'done'], ['rev', 'not quite']),
          thread(false, ['me', 'note to self']),
          thread(false, ['rev', 'which?'], ['me', '🧭 A or B?']),
          thread(true, ['rev', 'fix']),
        ] } } } } });
      }
      if (a === 'api user --jq .login') { return 'ME\n'; }
      if (/\/(files|comments|reviews|events) /.test(a)) { return '[]'; }
      throw new Error('HTTP 404');
    }) as any);

    const result = await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' });

    expect(result.value).toMatchObject({ threadsUnresolved: 4, threadsAwaitingAuthor: 3, viewer: 'ME', authoredByViewer: true });
  });

  // @req FR:playbook-actions-git/github-pr-get.awaiting-author.partial
  it('does not call a thread the author\'s alone when older comments went unread', async () => {
    gh.mockImplementation(((_: string, args: string[]) => {
      const a = args.join(' ');
      if (a.startsWith('pr view')) { return JSON.stringify(view); }
      if (a.includes('graphql')) {
        return JSON.stringify({ data: { repository: { pullRequest: { reviewThreads: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [
          { isResolved: false, comments: { totalCount: 101, nodes: [{ author: { login: 'me' }, body: 'done' }] } },
          { isResolved: false, comments: { totalCount: 1, nodes: [{ author: { login: 'me' }, body: 'note to self' }] } },
        ] } } } } });
      }
      if (a === 'api user --jq .login') { return 'me\n'; }
      if (/\/(files|comments|reviews|events) /.test(a)) { return '[]'; }
      throw new Error('HTTP 404');
    }) as any);

    const result = await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' });

    expect(calls().find((c) => c.includes('graphql'))).toContain('totalCount');
    expect(result.value).toMatchObject({ threadsUnresolved: 2, threadsAwaitingAuthor: 1 });
  });

  // @req FR:playbook-actions-git/github-pr-get.pending-code-owners
  it('leaves the author and approvers out of pending code owners', async () => {
    github({ codeowners: '*.ts @ME @rev @other' });
    expect((await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' })).value).toMatchObject({ pendingCodeOwners: ['other'] });
  });

  describe('hashCommands', () => {
    const me = { login: 'me', type: 'User' };
    const comment = (body: string, over: object = {}) => ({
      user: me, body, html_url: 'c1', created_at: '2026-01-02T00:00:00Z', ...over,
    });
    const commands = async (said: Said) => {
      github({ said });
      return ((await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' })).value as PRSnapshot).hashCommands;
    };

    // @req FR:playbook-actions-git/github-pr-get.hash-commands
    it("reports each user's latest PR comment or submitted review for each hash command", async () => {
      expect(await commands({ comments: [comment('LGTM\n#autopilot')] })).toEqual({ autopilot: { me: { url: 'c1', at: '2026-01-02T00:00:00Z' } } });
      expect(await commands({ comments: [comment('#ship #AutoPilot', { updated_at: '2026-01-03T00:00:00Z' })] })).toEqual({
        ship: { me: { url: 'c1', at: '2026-01-03T00:00:00Z' } },
        autopilot: { me: { url: 'c1', at: '2026-01-03T00:00:00Z' } },
      });
      expect(await commands({
        comments: [comment('#autopilot'), comment('#autopilot', { user: { login: 'rev', type: 'User' }, html_url: 'c2' })],
        reviews: [{ user: me, body: '#autopilot', html_url: 'r1', state: 'COMMENTED', submitted_at: '2026-01-05T00:00:00Z' }],
      })).toEqual({ autopilot: { me: { url: 'r1', at: '2026-01-05T00:00:00Z' }, rev: { url: 'c2', at: '2026-01-02T00:00:00Z' } } });
      expect(await commands({ reviews: [{ user: me, body: '#autopilot', html_url: 'r1', state: 'PENDING' }] })).toEqual({});
      expect(await commands({ comments: [comment('#autopilot', { user: { login: 'bot', type: 'Bot' } })] })).toEqual({});
    });

    // @req FR:playbook-actions-git/github-pr-get.hash-commands.line
    // @req FR:playbook-actions-git/github-pr-get.hash-commands.agent
    // @req FR:playbook-actions-git/github-pr-get.hash-commands.quote
    // @req FR:playbook-actions-git/github-pr-get.hash-commands.code
    it.each([
      ['a sentence that mentions it', 'Turn on #autopilot please'],
      ['an agent comment', '🤖 [AI] Done.\n#autopilot'],
      ['a Catalyst comment', '⚛️ [Catalyst] #autopilot'],
      ['a comment that quotes', '> #autopilot\nok'],
      ['fenced code', '```\n#autopilot\n```'],
      ['an unclosed fence', '~~~\n#autopilot'],
      ['inline code', '`#autopilot`'],
    ])('ignores %s', (_, body) => {
      expect(hashCommands(body)).toEqual([]);
    });

    // @req FR:playbook-actions-git/github-pr-get.hash-commands.line
    it('takes each hashtag on a line of only hashtags, lowercase', () => {
      expect(hashCommands('Looks good.\n\n  #lgtm #autopilot  ')).toEqual(['lgtm', 'autopilot']);
      expect(hashCommands('```\ncode\n```\n#AUTOPILOT')).toEqual(['autopilot']);
      expect(hashCommands('#autopilot2\n#autopilots')).toEqual(['autopilot2', 'autopilots']);
    });

    // @req FR:playbook-actions-git/github-pr-get.hash-commands
    it('reports the latest comment from anyone for each hash command', async () => {
      github({ said: {
        comments: [comment('#needs-info', { user: { login: 'rev', type: 'User' }, html_url: 'c2', created_at: '2026-01-03T00:00:00Z' }), comment('#needs-info')],
      } });
      const pr = (await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' })).value as PRSnapshot;
      expect(pr.latestHashCommands).toEqual({ 'needs-info': { user: 'rev', url: 'c2', at: '2026-01-03T00:00:00Z' } });
    });

    // @req FR:playbook-actions-git/github-pr-get.author-commented
    it('reports when the author last commented or reviewed, agent replies included', async () => {
      github({ said: {
        comments: [comment('🤖 [AI] Fixed.', { created_at: '2026-01-03T00:00:00Z' }), comment('?', { user: { login: 'rev', type: 'User' }, created_at: '2026-01-09T00:00:00Z' })],
        reviews: [{ user: me, body: '', html_url: 'r1', state: 'PENDING' }],
      } });
      const pr = (await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' })).value as PRSnapshot;
      expect(pr.authorCommentedAt).toBe('2026-01-03T00:00:00Z');
    });

    // @req FR:playbook-actions-git/github-pr-get.labels-removed
    it('reports when each label was last removed', async () => {
      github({ said: { events: [
        { event: 'unlabeled', label: { name: 'A' }, created_at: '2026-01-03T00:00:00Z' },
        { event: 'unlabeled', label: { name: 'A' }, created_at: '2026-01-01T00:00:00Z' },
        { event: 'labeled', label: { name: 'B' }, created_at: '2026-01-04T00:00:00Z' },
      ] } });
      const pr = (await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' })).value as PRSnapshot;
      expect(pr.labelsRemovedAt).toEqual({ A: '2026-01-03T00:00:00Z' });
    });
  });

  // @req FR:playbook-actions-git/github-pr-get.approved
  it('is not approved without a human approval or with a change request', async () => {
    const reviewed = (latestReviews: object[]) => {
      github({ view: { ...view, latestReviews } });
      return new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' }).then((r) => (r.value as any).approved);
    };
    expect(await reviewed([{ author: { login: 'copilot-pull-request-reviewer' }, state: 'APPROVED' }])).toBe(false);
    expect(await reviewed([{ author: { login: 'rev' }, state: 'APPROVED' }, { author: { login: 'x' }, state: 'CHANGES_REQUESTED' }])).toBe(false);
  });

  // @req FR:playbook-actions-git/github-pr-get.approved.any-commit
  it('counts an approval given on an older commit', async () => {
    github({ view: { ...view, headRefOid: 'def5678', latestReviews: [{ author: { login: 'rev' }, state: 'APPROVED', commit: { oid: 'abc1234' } }] } });
    expect((await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' })).value).toMatchObject({ approved: true });
  });

  // @req FR:playbook-actions-git/github-pr-get.checks-passed
  it('reports checks passed only when every check passed or was skipped', async () => {
    github({ view: { ...view, statusCheckRollup: [
      { name: 'ci', status: 'COMPLETED', conclusion: 'SUCCESS' },
      { name: 'opt', status: 'COMPLETED', conclusion: 'SKIPPED' },
    ] } });
    expect((await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' })).value).toMatchObject({ checksPassed: true, checksFailed: false });
  });

  // @req FR:playbook-actions-git/github-pr-get.code-owner-approved
  it('reports code-owner approval when a code owner approved, or no user owns a changed file', async () => {
    const get = async () => (await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' })).value;
    github({ codeowners: '*.ts @rev' });
    expect(await get()).toMatchObject({ codeOwnerApproved: true });
    github({ codeowners: '*.ts @other' });
    expect(await get()).toMatchObject({ codeOwnerApproved: false });
    github({ codeowners: '*.ts @org/team' });
    expect(await get()).toMatchObject({ codeOwned: true, codeOwnerApproved: true });
    github();
    expect(await get()).toMatchObject({ codeOwned: false, codeOwnerApproved: true });
    // The author's own files are not gated on the author
    github({ codeowners: '*.ts @rev\n*.md @me' });
    expect(await get()).toMatchObject({ codeOwnerApproved: true });
    // Each owned file needs its own owner's approval
    github({ codeowners: '*.ts @rev\n*.md @other' });
    expect(await get()).toMatchObject({ codeOwnerApproved: false });
  });

  // @req FR:playbook-actions-git/github-pr-get.output
  it('treats a missing CODEOWNERS as no code owners', async () => {
    github();

    const result = await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' });

    expect(result.value).toMatchObject({ codeOwners: [], codeOwned: false });
  });

  // @req FR:playbook-actions-git/github-pr-get.code-owners.read-error
  it('fails rather than skip the code-owner gate when CODEOWNERS can\'t be read', async () => {
    github();
    const answer = gh.getMockImplementation() as (file: string, args: string[]) => string;
    gh.mockImplementation(((file: string, args: string[]) => {
      if (args.join(' ').includes('contents/')) { throw new Error('HTTP 502: Bad Gateway'); }
      return answer(file, args);
    }) as any);
    expect((await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' })).code).not.toBe('Success');
  });

  // @req FR:playbook-actions-git/github-pr-get.viewer
  it('reports no signed-in user when the token can\'t read one', async () => {
    github();
    const answer = gh.getMockImplementation() as (file: string, args: string[]) => string;
    gh.mockImplementation(((file: string, args: string[]) => {
      if (args.join(' ').startsWith('api user')) { throw new Error('HTTP 403: Resource not accessible by integration'); }
      return answer(file, args);
    }) as any);
    const result = await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' });
    expect(result.code).toBe('Success');
    expect(result.value).toMatchObject({ viewer: '', authoredByViewer: false });
  });

  // @req FR:playbook-actions-git/github-pr-get.checks-passed.cancelled
  it('counts a cancelled check as failed', async () => {
    github({ view: { ...view, statusCheckRollup: [{ name: 'ci', status: 'COMPLETED', conclusion: 'CANCELLED' }] } });
    expect((await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' })).value).toMatchObject({
      checks: [{ name: 'ci', state: 'fail' }], checksPassed: false, checksFailed: true,
    });
  });

  // @req FR:playbook-actions-git/github-pr-get.checks-passed.none
  // @req FR:playbook-actions-git/github-pr-get.checks-passed.none.unreadable
  // @req FR:playbook-actions-git/github-pr-get.checks-passed.none.dynamic
  it('waits for checks when the head has none yet and an active workflow would run on the PR', async () => {
    const withWorkflows = (files: Record<string, string | Error>) => {
      github({ view: { ...view, statusCheckRollup: [] } });
      const answer = gh.getMockImplementation() as (file: string, args: string[]) => string;
      gh.mockImplementation(((file: string, args: string[]) => {
        const a = args.join(' ');
        if (a.includes('actions/workflows')) { return [...Object.keys(files), 'dynamic/dependabot/dependabot-updates'].join('\n'); }
        const path = Object.keys(files).find((p) => a.includes(`contents/${p}?`));
        if (path) {
          const body = files[path];
          if (body instanceof Error) { throw body; }
          return body;
        }
        return answer(file, args);
      }) as any);
      return new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' }).then((r) => (r.value as any).checksPassed);
    };
    expect(await withWorkflows({ '.github/workflows/ci.yml': 'on: [pull_request]\n' })).toBe(false);
    expect(await withWorkflows({})).toBe(true);
    // Workflows that never run on this PR don't hold it
    expect(await withWorkflows({
      '.github/workflows/deploy.yml': 'on:\n  push:\n    branches: [main]\n',
      '.github/workflows/nightly.yml': 'on:\n  schedule:\n    - cron: "0 0 * * *"\n',
    })).toBe(true);
    // Can't read it: assume it runs
    expect(await withWorkflows({ '.github/workflows/ci.yml': new Error('HTTP 502') })).toBe(false);
  });

  // @req FR:playbook-actions-git/github-pr-get.checks-passed.none
  // @req FR:playbook-actions-git/github-pr-get.checks-passed.none.types
  it('reads a workflow trigger the way Actions does', () => {
    const pr = { headRef: 'feat/x', baseRef: 'main', files: ['src/a.ts'] };
    expect(workflowRunsOnPR('pull_request', pr)).toBe(true);
    expect(workflowRunsOnPR({ pull_request: { branches: ['dev'] } }, pr)).toBe(false);
    expect(workflowRunsOnPR({ pull_request: { paths: ['docs/**'] } }, pr)).toBe(false);
    expect(workflowRunsOnPR({ pull_request: { paths: ['**', '!src/**'] } }, pr)).toBe(false);
    expect(workflowRunsOnPR({ pull_request: { paths: ['**', '!src/**', 'src/a.ts'] } }, pr)).toBe(true);
    expect(workflowRunsOnPR({ pull_request_target: { 'paths-ignore': ['docs/**'] } }, pr)).toBe(true);
    expect(workflowRunsOnPR({ push: null }, pr)).toBe(true);
    expect(workflowRunsOnPR({ push: { branches: ['feat/**'] } }, pr)).toBe(true);
    expect(workflowRunsOnPR({ push: { tags: ['v*'] } }, pr)).toBe(false);
    expect(workflowRunsOnPR(['workflow_dispatch', 'release'], pr)).toBe(false);
    expect(workflowRunsOnPR({ pull_request: { types: ['closed'] } }, pr)).toBe(false);
    expect(workflowRunsOnPR({ pull_request: { types: ['labeled', 'synchronize'] } }, pr)).toBe(true);
  });

  // @req FR:playbook-actions-git/github-pr-get.checks-passed.workflow
  it('keeps same-named jobs in different workflows apart', async () => {
    github({ view: { ...view, statusCheckRollup: [
      { name: 'build', workflowName: 'A', status: 'COMPLETED', conclusion: 'FAILURE' },
      { name: 'build', workflowName: 'B', status: 'COMPLETED', conclusion: 'SUCCESS' },
    ] } });
    expect((await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' })).value).toMatchObject({
      checks: [{ name: 'build', state: 'fail' }, { name: 'build', state: 'pass' }], checksPassed: false, checksFailed: true,
    });
  });

  // @req FR:playbook-actions-git/github-pr-get.approved
  // @req FR:playbook-actions-git/github-pr-get.review-required
  it('follows GitHub\'s review decision when the repository sets review rules', async () => {
    const decided = async (reviewDecision: string, latestReviews = view.latestReviews) => {
      github({ view: { ...view, reviewDecision, latestReviews } });
      return (await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' })).value as any;
    };
    // Two approvals required, one given
    expect(await decided('REVIEW_REQUIRED')).toMatchObject({ approved: false, reviewRequired: true });
    expect(await decided('APPROVED', [])).toMatchObject({ approved: true, reviewRequired: true });
    expect(await decided('CHANGES_REQUESTED')).toMatchObject({ approved: false, reviewRequired: true });
  });

  // @req FR:playbook-actions-git/github-pr-get.approved.default
  // @req FR:playbook-actions-git/github-pr-get.review-required
  it('takes one human approval when the repository sets no review rule', async () => {
    github({ view: { ...view, reviewDecision: '' } });
    expect((await new GitHubPRGetAction().execute({ pr: 5, repository: 'o/r' })).value).toMatchObject({ approved: true, reviewRequired: false });
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

/** Answer `gh pr view --json labels,assignees` with the PR's current values, and the rest as GitHub would */
const current = ({ labels = [] as string[], assignees = [] as string[] }) => {
  github();
  const snapshot = gh.getMockImplementation() as (file: string, args: string[]) => string;
  gh.mockImplementation(((file: string, args: string[]) =>
    args.join(' ').includes('--json labels,assignees')
      ? JSON.stringify({ labels: labels.map((name) => ({ name })), assignees: assignees.map((login) => ({ login })) })
      : snapshot(file, args)) as any);
};
const edits = () => calls().filter((c) => c.startsWith('pr edit'));

describe('GitHubPREditAction', () => {
  beforeEach(() => current({}));

  // @req FR:playbook-actions-git/github-pr-edit.@action
  it('is the github-pr-edit action, taking the PR number first', () => {
    expect(GitHubPREditAction.actionType).toBe('github-pr-edit');
    expect(GitHubPREditAction.primaryProperty).toBe('pr');
  });

  // @req FR:playbook-actions-git/github-pr-edit.input
  // @req FR:playbook-actions-git/github-pr-edit.output
  // @req FR:playbook-actions-git/github-pr-edit.no-shell
  it('edits labels and assignees in one gh call without a shell', async () => {
    current({ labels: ['d'], assignees: ['v'] });
    const result = await new GitHubPREditAction().execute({
      pr: 5, repository: 'o/r', addLabels: ['a b', 'c'], removeLabels: ['d'], addAssignees: ['u'], removeAssignees: ['v'],
    });

    expect(result.code).toBe('Success');
    expect(calls().filter((c) => c.startsWith('pr edit'))).toHaveLength(1);
    expect(gh.mock.calls[1][1]).toEqual([
      'pr', 'edit', '5', '-R', 'o/r',
      '--add-label', 'a b,c', '--remove-label', 'd', '--add-assignee', 'u', '--remove-assignee', 'v',
    ]);
    // The PR as it stands after the edit
    expect(result.value).toMatchObject({ number: 5, headSha: 'abc1234', checksPassed: false });
    expect(result.message).toBe('Edited PR (4 properties)');
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
  it('makes no edit call when nothing changes', async () => {
    const result = await new GitHubPREditAction().execute({ pr: 5, repository: 'o/r', addLabels: [], removeLabels: [] });

    expect(result.message).toBe('PR already up to date');
    expect(edits()).toEqual([]);
  });

  // @req FR:playbook-actions-git/github-pr-edit.idempotent
  it('skips a label or assignee already as asked, so an unchanged PR gets no edit', async () => {
    current({ labels: ['a'], assignees: ['u'] });

    const result = await new GitHubPREditAction().execute({
      pr: 5, repository: 'o/r', addLabels: ['a'], removeLabels: ['gone'], addAssignees: ['U'], removeAssignees: ['nobody'],
    });

    expect(result.message).toBe('PR already up to date');
    expect(calls().some((c) => c.startsWith('pr edit'))).toBe(false);
  });

  it('ignores blank entries', async () => {
    current({});
    await new GitHubPREditAction().execute({ pr: 5, repository: 'o/r', addLabels: ['', 'a', null, 'a'] as any });

    expect(calls().filter((c) => c.startsWith('pr edit'))).toEqual(['pr edit 5 -R o/r --add-label a']);
  });

  // @req FR:playbook-actions-git/github-pr-edit.assignees
  it('sets the exact assignees, leaving them alone when unset', async () => {
    current({ assignees: ['keep', 'drop'] });
    await new GitHubPREditAction().execute({ pr: 5, repository: 'o/r', assignees: ['keep', 'new'] });
    expect(calls().filter((c) => c.startsWith('pr edit'))).toEqual(['pr edit 5 -R o/r --add-assignee new --remove-assignee drop']);

    gh.mockClear();
    await new GitHubPREditAction().execute({ pr: 5, repository: 'o/r', assignees: null });
    expect(edits()).toEqual([]);
  });

  // @req FR:playbook-actions-git/common.validation
  it('rejects a bad PR number', async () => {
    expect((await new GitHubPREditAction().execute({ pr: -1 })).code).toBe('GitHubPREditConfigInvalid');
  });
});

describe('mergeRefusal', () => {
  const snap = (over: Partial<PRSnapshot> = {}): PRSnapshot => ({
    number: 5, title: 'T', url: 'u', author: 'me', isDraft: false, state: 'OPEN', headSha: 'abc1234def', headRef: 'b', baseRef: 'main',
    labels: [], assignees: [], reviews: [], checks: [{ name: 'ci', state: 'pass' }], threads: [],
    changedFiles: ['a.ts'], codeOwners: [], codeOwned: false, mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN',
    reviewDecision: '', approved: false, reviewRequired: false, pendingCodeOwners: [], checksFailed: false, checksPassed: true, threadsUnresolved: 0, threadsAwaitingAuthor: 0,
    viewer: 'me', authoredByViewer: true, codeOwnerApproved: true, changesRequested: false, hashCommands: {}, latestHashCommands: {}, authorCommentedAt: '', labelsRemovedAt: {},
    ...over,
  });
  const code = (over: Partial<PRSnapshot>, sha?: string) => mergeRefusal(snap(over), sha)?.code;

  // @req FR:playbook-actions-git/github-pr-merge.gates
  // @req FR:playbook-actions-git/github-pr-merge.gates.code-owners
  it('allows a clean PR, with no code-owner approval when no owner covers a file', () => {
    expect(mergeRefusal(snap())).toBeUndefined();
    expect(mergeRefusal(snap({ checks: [{ name: 'a', state: 'skip' }, { name: 'b', state: 'pass' }] }))).toBeUndefined();
  });

  // @req FR:playbook-actions-git/github-pr-merge.gates.open
  it('never merges a PR that is closed or merged', () => {
    expect(code({ state: 'MERGED' })).toBe('PullRequestNotOpen');
    expect(code({ state: 'CLOSED' })).toBe('PullRequestNotOpen');
  });

  // @req FR:playbook-actions-git/github-pr-merge.gates.draft
  it('never merges a draft', () => {
    expect(code({ isDraft: true })).toBe('PullRequestNotPublished');
  });

  // @req FR:playbook-actions-git/github-pr-merge.gates.checks
  it('requires every check to pass', () => {
    expect(code({ checks: [{ name: 'ci', state: 'pending' }] })).toBe('PullRequestChecksNotPassing');
    expect(code({ checks: [{ name: 'ci', state: 'fail' }] })).toBe('PullRequestChecksNotPassing');
    expect(mergeRefusal(snap({ checks: [{ name: 'ci', state: 'fail' }] }))?.message).toContain('ci (failed)');
  });

  // @req FR:playbook-actions-git/github-pr-merge.gates.code-owners
  it('requires a code owner to approve when one covers a changed file', () => {
    const owned = { codeOwned: true, codeOwners: ['owner', 'other'] };
    expect(code({ ...owned, codeOwnerApproved: false })).toBe('PullRequestNotCodeOwnerApproved');
    expect(code({ ...owned, codeOwnerApproved: true })).toBeUndefined();
  });

  // @req FR:playbook-actions-git/github-pr-merge.gates.changes-requested
  it('refuses a PR with changes requested', () => {
    expect(code({ changesRequested: true })).toBe('PullRequestChangesRequested');
  });

  // @req FR:playbook-actions-git/github-pr-merge.gates.threads
  it('requires every thread resolved', () => {
    expect(code({ threadsUnresolved: 1 })).toBe('PullRequestHasUnresolvedThreads');
    expect(mergeRefusal(snap({ threadsUnresolved: 2 }))?.message).toBe('2 review threads are unresolved.');
  });

  // @req FR:playbook-actions-git/github-pr-merge.gates.merge-state
  it('requires a merge state GitHub allows to merge', () => {
    expect(code({ mergeStateStatus: 'DIRTY' })).toBe('PullRequestNotMergeable');
    expect(code({ mergeStateStatus: 'BEHIND' })).toBe('PullRequestNotMergeable');
    expect(code({ mergeStateStatus: 'UNKNOWN' })).toBe('PullRequestNotMergeable');
    expect(code({ mergeStateStatus: 'BLOCKED' })).toBe('PullRequestNotMergeable');
    expect(code({ mergeStateStatus: 'CLEAN' })).toBeUndefined();
    expect(code({ mergeStateStatus: 'HAS_HOOKS' })).toBeUndefined();
    expect(code({ mergeStateStatus: 'UNSTABLE' })).toBeUndefined();
  });

  // @req FR:playbook-actions-git/github-pr-merge.gates.merge-state
  it('refuses a PR that conflicts with its base', () => {
    expect(code({ mergeable: 'CONFLICTING' })).toBe('PullRequestNotMergeable');
  });

  // @req FR:playbook-actions-git/github-pr-merge.head-sha
  it('refuses when the head is not the one the caller expects', () => {
    expect(code({}, 'def5678')).toBe('PullRequestHeadChanged');
    expect(code({}, 'abc1234')).toBeUndefined();
  });
});

describe('mergeBody', () => {
  // @req FR:playbook-actions-git/github-pr-merge.trailers
  // @req FR:playbook-actions-git/github-pr-merge.trailers.authors
  // @req FR:playbook-actions-git/github-pr-merge.trailers.catalyst
  // @req FR:playbook-actions-git/github-pr-merge.trailers.extra
  // @req FR:playbook-actions-git/github-pr-merge.trailers.unique
  it('lists only trailers: one co-author per person, then Catalyst, then the given trailers', () => {
    const body = mergeBody(
      [
        { messageHeadline: 'feat: A', messageBody: 'why\n\nCo-authored-by: Bot <bot@x.com>', authors: [{ name: 'Me', email: 'me@x.com' }] },
        { messageHeadline: 'fix: B', authors: [{ name: 'Me', email: 'ME@x.com' }, { name: 'Pal', email: 'pal@x.com' }] },
      ],
      ['Co-authored-by: Catalyst AI <catalyst-noreply@xerilium.com>', 'Co-authored-by: Bot <bot@x.com>', 'Reviewed-by: Rev <rev@x.com>'],
    );

    expect(body).toBe(
      'Co-authored-by: Me <me@x.com>\nCo-authored-by: Bot <bot@x.com>\nCo-authored-by: Pal <pal@x.com>\nCo-authored-by: Catalyst AI <catalyst-noreply@xerilium.com>\nReviewed-by: Rev <rev@x.com>',
    );
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
    // No --delete-branch: the repository's setting decides
    // @req FR:playbook-actions-git/github-pr-merge.delete-branch
    expect(calls().filter((c) => c.startsWith('pr merge'))).toEqual([
      'pr merge 5 -R o/r --squash --match-head-commit abc1234 --body Co-authored-by: Me <me@x.com>\nCo-authored-by: Catalyst AI <catalyst-noreply@xerilium.com>',
    ]);
    expect(calls().join()).not.toContain('--admin');
  });

  // @req FR:playbook-actions-git/github-pr-merge.trailers.catalyst
  // @req FR:playbook-actions-git/github-pr-merge.trailers.extra
  it('credits Catalyst and adds the given trailers to the squash commit', async () => {
    github({ view: { ...view, statusCheckRollup: [] } });

    await new GitHubPRMergeAction().execute({ pr: 5, repository: 'o/r', trailers: ['Co-authored-by: Pal <pal@x.com>'] });

    const merge = gh.mock.calls.map((c) => c[1] as string[]).find((a) => a[1] === 'merge')!;
    expect(merge.slice(merge.indexOf('--body'), merge.indexOf('--body') + 2)).toEqual([
      '--body', 'Co-authored-by: Me <me@x.com>\nCo-authored-by: Catalyst AI <catalyst-noreply@xerilium.com>\nCo-authored-by: Pal <pal@x.com>',
    ]);
  });

  // @req FR:playbook-actions-git/github-pr-merge.input
  // @req FR:playbook-actions-git/github-pr-merge.delete-branch
  it('merges with another method and deletes the branch on request', async () => {
    github({ view: { ...view, statusCheckRollup: [] } });

    await new GitHubPRMergeAction().execute({ pr: 5, repository: 'o/r', method: 'rebase', deleteBranch: true });

    expect(calls().filter((c) => c.startsWith('pr merge'))).toEqual([
      'pr merge 5 -R o/r --rebase --match-head-commit abc1234 --delete-branch',
    ]);
  });

  // @req FR:playbook-actions-git/github-pr-merge.gates
  // @req FR:playbook-actions-git/github-pr-merge.output
  // @req FR:playbook-actions-git/$pr-merge-result
  it('refuses with a code and a message, and does not call merge, when a rule is unmet', async () => {
    github();

    const result = await new GitHubPRMergeAction().execute({ pr: 5, repository: 'o/r' });

    expect(result.code).toBe('Success');
    expect(result.value).toMatchObject({ merged: false, code: 'PullRequestChecksNotPassing', message: expect.stringContaining('lint') });
    expect(result.message).toMatch(/\(Code: PullRequestChecksNotPassing\)$/);
    expect(calls().some((c) => c.startsWith('pr merge'))).toBe(false);
  });

  // @req FR:playbook-actions-git/github-pr-merge.head-sha
  it('refuses when the PR head is not the expected sha', async () => {
    github({ view: { ...view, statusCheckRollup: [] } });

    const result = await new GitHubPRMergeAction().execute({ pr: 5, repository: 'o/r', sha: 'def5678' });

    expect(result.value).toMatchObject({ merged: false, code: 'PullRequestHeadChanged' });
  });

  // @req FR:playbook-actions-git/github-pr-merge.refused
  it('returns a merge GitHub rejects with its reason instead of throwing', async () => {
    github({
      view: { ...view, statusCheckRollup: [] },
      merge: () => { throw new Error('Command failed: gh pr merge 5\nHead branch was modified'); },
    });

    const result = await new GitHubPRMergeAction().execute({ pr: 5, repository: 'o/r' });

    expect(result.code).toBe('Success');
    expect(result.value).toMatchObject({ merged: false, code: 'PullRequestMergeFailed', message: expect.stringContaining('modified') });
    expect((result.value as any).message).not.toContain('Command failed');
  });

  // @req FR:playbook-actions-git/common.validation
  it.each([
    [{ pr: 5, sha: 'nope' }],
    [{ pr: 5, method: 'fast-forward' }],
    [{ pr: 5, trailers: 'Co-authored-by: X <x@x.com>' }],
    [{ pr: 0 }],
  ])('rejects bad config %j', async (config) => {
    expect((await new GitHubPRMergeAction().execute(config as any)).code).toBe('GitHubPRMergeConfigInvalid');
  });
});
