// @req FR:playbook-actions-git/labels.edit
// @req FR:playbook-actions-git/labels.no-shell
// @req FR:playbook-actions-git/common.validation
// @req FR:playbook-actions-git/errors.graceful-failure

import { GitHubLabelEditAction } from '@playbooks/actions/git/label-edit-action';
import { execFileSync } from 'child_process';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
  execFileSync: jest.fn(),
}));

describe('GitHubLabelEditAction', () => {
  const mockExecFile = execFileSync as jest.MockedFunction<typeof execFileSync>;
  let action: GitHubLabelEditAction;

  beforeEach(() => {
    action = new GitHubLabelEditAction();
    mockExecFile.mockReset().mockReturnValue('' as any);
  });

  it('renames a label in place and sets color and description', async () => {
    const result = await action.execute({
      name: 'help wanted',
      newName: 'Help wanted ✨',
      color: '5319E7',
      description: 'Outside contributions welcome',
      repository: 'acme/widgets',
    });

    expect(result.code).toBe('Success');
    expect(result.message).toBe('Renamed label help wanted → Help wanted ✨');
    expect(result.value).toEqual({
      name: 'Help wanted ✨',
      color: '5319E7',
      description: 'Outside contributions welcome',
    });
    expect(mockExecFile).toHaveBeenCalledWith(
      'gh',
      [
        'label', 'edit', 'help wanted',
        '-R', 'acme/widgets',
        '--name', 'Help wanted ✨',
        '--color', '5319E7',
        '--description', 'Outside contributions welcome',
      ],
      expect.any(Object),
    );
  });

  it('updates a label without renaming it', async () => {
    const result = await action.execute({ name: 'wip', color: '#000000', repository: 'acme/widgets' });
    expect(result.message).toBe('Updated label wip');
    expect(result.value).toEqual({ name: 'wip', color: '000000', description: undefined });
    expect(mockExecFile.mock.calls[0][1]).toEqual(['label', 'edit', 'wip', '-R', 'acme/widgets', '--color', '000000']);
  });

  it('requires something to change', async () => {
    const result = await action.execute({ name: 'wip', repository: 'acme/widgets' });
    expect(result.code).toBe('GitHubLabelEditConfigInvalid');
    expect(mockExecFile).not.toHaveBeenCalled();
  });

  it('maps a missing label to NotFound', async () => {
    mockExecFile.mockImplementation(() => {
      throw new Error('HTTP 404: Not Found');
    });
    const result = await action.execute({ name: 'nope', newName: 'x', repository: 'acme/widgets' });
    expect(result.code).toBe('GitHubLabelEditNotFound');
  });

  it('has name as primary property', () => {
    expect(GitHubLabelEditAction.actionType).toBe('github-label-edit');
    expect(GitHubLabelEditAction.primaryProperty).toBe('name');
  });
});
