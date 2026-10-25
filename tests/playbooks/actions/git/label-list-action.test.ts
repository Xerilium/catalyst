// @req FR:playbook-actions-git/labels.list
// @req FR:playbook-actions-git/labels.no-shell
// @req FR:playbook-actions-git/common.result-structure
// @req FR:playbook-actions-git/errors.graceful-failure

import { GitHubLabelListAction } from '@playbooks/actions/git/label-list-action';
import { execFileSync, execSync } from 'child_process';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
  execFileSync: jest.fn(),
}));

const page = (nodes: object[], endCursor: string | null, hasNextPage: boolean) =>
  JSON.stringify({
    data: { repository: { labels: { pageInfo: { hasNextPage, endCursor }, nodes } } },
  });

const node = (name: string, issues: number, prs: number, color = 'ededed', description: string | null = null) => ({
  name,
  color,
  description,
  issues: { totalCount: issues },
  pullRequests: { totalCount: prs },
});

describe('GitHubLabelListAction', () => {
  const mockExecFile = execFileSync as jest.MockedFunction<typeof execFileSync>;
  const mockExec = execSync as jest.MockedFunction<typeof execSync>;
  let action: GitHubLabelListAction;

  beforeEach(() => {
    action = new GitHubLabelListAction();
    mockExecFile.mockReset();
    mockExec.mockReset();
  });

  it('returns every label with color, description, and issue + PR usage across pages', async () => {
    mockExecFile
      .mockReturnValueOnce(page([node('bug', 3, 2, 'd73a4a', 'Something is broken')], 'c1', true) as any)
      .mockReturnValueOnce(page([node('Status: 🚧 WIP', 0, 4)], 'c2', false) as any);

    const result = await action.execute({ repository: 'acme/widgets' });

    expect(result.code).toBe('Success');
    expect(result.value).toEqual([
      { name: 'bug', color: 'd73a4a', description: 'Something is broken', usage: 5 },
      { name: 'Status: 🚧 WIP', color: 'ededed', description: '', usage: 4 },
    ]);
    expect(result.message).toBe('Listed 2 labels in acme/widgets');

    // gh runs without a shell, values passed as raw strings, cursor only after page 1
    expect(mockExecFile).toHaveBeenCalledTimes(2);
    const [cmd, first] = mockExecFile.mock.calls[0] as [string, string[]];
    const second = mockExecFile.mock.calls[1][1] as string[];
    expect(cmd).toBe('gh');
    expect(first).toEqual(expect.arrayContaining(['api', 'graphql', '-f', 'owner=acme', '-f', 'name=widgets']));
    expect(first.join(' ')).not.toContain('endCursor=');
    expect(second).toEqual(expect.arrayContaining(['-f', 'endCursor=c1']));
    expect(mockExec).not.toHaveBeenCalled();
  });

  it('defaults to the current repository', async () => {
    mockExec.mockReturnValue(JSON.stringify({ nameWithOwner: 'acme/widgets' }) as any);
    mockExecFile.mockReturnValueOnce(page([], null, false) as any);

    const result = await action.execute({});

    expect(result.code).toBe('Success');
    expect(result.value).toEqual([]);
    expect(mockExecFile.mock.calls[0][1]).toEqual(expect.arrayContaining(['owner=acme', 'name=widgets']));
  });

  it('rejects a repository that is not owner/repo', async () => {
    const result = await action.execute({ repository: 'widgets' });
    expect(result.code).toBe('GitHubLabelListConfigInvalid');
    expect(mockExecFile).not.toHaveBeenCalled();
  });

  it('maps authentication failures', async () => {
    mockExecFile.mockImplementation(() => {
      throw new Error('gh: Not logged in');
    });
    const result = await action.execute({ repository: 'acme/widgets' });
    expect(result.code).toBe('GitHubLabelListAuthenticationFailed');
    expect(result.error?.guidance).toContain('gh auth login');
  });

  it('tells the user to install gh when it is missing', async () => {
    mockExecFile.mockImplementation(() => {
      const error: any = new Error('spawnSync gh ENOENT');
      error.code = 'ENOENT';
      throw error;
    });
    const result = await action.execute({ repository: 'acme/widgets' });
    expect(result.code).toBe('GitHubLabelListNetworkError');
    expect(result.error?.guidance).toContain('Install the GitHub CLI');
  });

  it('has repository as primary property', () => {
    expect(GitHubLabelListAction.actionType).toBe('github-label-list');
    expect(GitHubLabelListAction.primaryProperty).toBe('repository');
  });
});
