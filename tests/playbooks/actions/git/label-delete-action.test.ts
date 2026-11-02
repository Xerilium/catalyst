// @req FR:playbook-actions-git/labels.delete
// @req FR:playbook-actions-git/labels.no-shell
// @req FR:playbook-actions-git/common.validation
// @req FR:playbook-actions-git/errors.graceful-failure

import { GitHubLabelDeleteAction } from '@playbooks/actions/git/label-delete-action';
import { execFileSync, execSync } from 'child_process';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
  execFileSync: jest.fn(),
}));

describe('GitHubLabelDeleteAction', () => {
  const mockExecFile = execFileSync as jest.MockedFunction<typeof execFileSync>;
  const mockExec = execSync as jest.MockedFunction<typeof execSync>;
  let action: GitHubLabelDeleteAction;

  beforeEach(() => {
    action = new GitHubLabelDeleteAction();
    mockExecFile.mockReset().mockReturnValue('' as any);
    mockExec.mockReset();
  });

  it('deletes a label without a prompt or a shell', async () => {
    const result = await action.execute({ name: 'bug', repository: 'acme/widgets' });

    expect(result.code).toBe('Success');
    expect(result.message).toBe('Deleted label bug');
    expect(result.value).toEqual({ name: 'bug' });
    expect(mockExecFile).toHaveBeenCalledWith(
      'gh',
      ['label', 'delete', 'bug', '-R', 'acme/widgets', '--yes'],
      expect.any(Object),
    );
    expect(mockExec).not.toHaveBeenCalled();
  });

  it('requires a name', async () => {
    const result = await action.execute({ name: ' ' } as any);
    expect(result.code).toBe('GitHubLabelDeleteConfigInvalid');
    expect(mockExecFile).not.toHaveBeenCalled();
  });

  it('reports a failed delete', async () => {
    mockExecFile.mockImplementation(() => {
      throw new Error('Command failed: label not found');
    });
    const result = await action.execute({ name: 'bug', repository: 'acme/widgets' });
    expect(result.code).toBe('GitHubLabelDeleteFailed');
  });

  it('has name as primary property', () => {
    expect(GitHubLabelDeleteAction.actionType).toBe('github-label-delete');
    expect(GitHubLabelDeleteAction.primaryProperty).toBe('name');
  });
});
