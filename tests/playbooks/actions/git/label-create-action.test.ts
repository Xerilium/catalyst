// @req FR:playbook-actions-git/labels.create
// @req FR:playbook-actions-git/labels.no-shell
// @req FR:playbook-actions-git/common.validation
// @req FR:playbook-actions-git/errors.graceful-failure

import { GitHubLabelCreateAction } from '@playbooks/actions/git/label-create-action';
import { execFileSync, execSync } from 'child_process';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
  execFileSync: jest.fn(),
}));

describe('GitHubLabelCreateAction', () => {
  const mockExecFile = execFileSync as jest.MockedFunction<typeof execFileSync>;
  const mockExec = execSync as jest.MockedFunction<typeof execSync>;
  let action: GitHubLabelCreateAction;

  beforeEach(() => {
    action = new GitHubLabelCreateAction();
    mockExecFile.mockReset().mockReturnValue('' as any);
    mockExec.mockReset();
  });

  it('creates a label with color and description, passing values without a shell', async () => {
    const result = await action.execute({
      name: "Resolution: Won't fix",
      color: '#000000',
      description: 'Will not be worked on; "final"',
      repository: 'acme/widgets',
    });

    expect(result.code).toBe('Success');
    expect(result.message).toBe("Created label Resolution: Won't fix");
    expect(result.value).toEqual({
      name: "Resolution: Won't fix",
      color: '000000',
      description: 'Will not be worked on; "final"',
    });
    expect(mockExecFile).toHaveBeenCalledWith(
      'gh',
      [
        'label', 'create', "Resolution: Won't fix",
        '-R', 'acme/widgets',
        '--color', '000000',
        '--description', 'Will not be worked on; "final"',
      ],
      expect.any(Object),
    );
    expect(mockExec).not.toHaveBeenCalled();
  });

  it('omits color and description when not given', async () => {
    await action.execute({ name: 'wip', repository: 'acme/widgets' });
    expect(mockExecFile.mock.calls[0][1]).toEqual(['label', 'create', 'wip', '-R', 'acme/widgets']);
  });

  it('requires a name', async () => {
    const result = await action.execute({ name: ' ' } as any);
    expect(result.code).toBe('GitHubLabelCreateConfigInvalid');
  });

  it('rejects a color that is not 6-digit hex', async () => {
    const result = await action.execute({ name: 'wip', color: 'red' });
    expect(result.code).toBe('GitHubLabelCreateConfigInvalid');
    expect(mockExecFile).not.toHaveBeenCalled();
  });

  it('reports a label that already exists', async () => {
    mockExecFile.mockImplementation(() => {
      throw new Error('Command failed: label with name "wip" already exists; use `--force` to update');
    });
    const result = await action.execute({ name: 'wip', repository: 'acme/widgets' });
    expect(result.code).toBe('GitHubLabelCreateFailed');
    expect(result.error?.message).toContain('already exists');
  });

  it('has name as primary property', () => {
    expect(GitHubLabelCreateAction.actionType).toBe('github-label-create');
    expect(GitHubLabelCreateAction.primaryProperty).toBe('name');
  });
});
