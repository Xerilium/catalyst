// @req FR:playbook-actions-git/labels.merge
// @req FR:playbook-actions-git/labels.no-shell
// @req FR:playbook-actions-git/common.validation

import { GitHubLabelMergeAction } from '@playbooks/actions/git/label-merge-action';
import { execFileSync, execSync } from 'child_process';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
  execFileSync: jest.fn(),
}));

describe('GitHubLabelMergeAction', () => {
  const mockExecFile = execFileSync as jest.MockedFunction<typeof execFileSync>;
  const mockExec = execSync as jest.MockedFunction<typeof execSync>;
  let action: GitHubLabelMergeAction;

  beforeEach(() => {
    action = new GitHubLabelMergeAction();
    mockExecFile.mockReset();
    mockExec.mockReset();
  });

  it('adds the standard label to every issue and PR, then deletes the duplicate', async () => {
    mockExecFile.mockImplementation(((_cmd: string, args: string[]) =>
      args[1] === '--paginate' ? '12\n34\n' : '') as any);

    const result = await action.execute({
      name: 'Status: ▶️ Ready',
      into: 'Status: ✅ Ready',
      repository: 'acme/widgets',
    });

    expect(result.code).toBe('Success');
    expect(result.value).toEqual({ name: 'Status: ▶️ Ready', into: 'Status: ✅ Ready', moved: 2 });
    const calls = mockExecFile.mock.calls.map((c) => c[1] as string[]);
    expect(calls[0]).toEqual([
      'api', `repos/acme/widgets/labels/${encodeURIComponent('Status: ✅ Ready')}`, '--jq', '.name',
    ]);
    expect(calls[1]).toEqual([
      'api', '--paginate', '-X', 'GET', 'repos/acme/widgets/issues',
      '-f', 'labels=Status: ▶️ Ready', '-f', 'state=all', '-f', 'per_page=100',
      '--jq', '.[] | select(any(.labels[]; .name == "Status: ✅ Ready") | not) | .number',
    ]);
    expect(calls[2]).toEqual([
      'api', '-X', 'POST', 'repos/acme/widgets/issues/12/labels', '-f', 'labels[]=Status: ✅ Ready',
    ]);
    expect(calls[3]).toEqual([
      'api', '-X', 'POST', 'repos/acme/widgets/issues/34/labels', '-f', 'labels[]=Status: ✅ Ready',
    ]);
    expect(calls[4]).toEqual(['label', 'delete', 'Status: ▶️ Ready', '-R', 'acme/widgets', '--yes']);
    expect(mockExec).not.toHaveBeenCalled();
  });

  it('deletes a duplicate nothing carries', async () => {
    mockExecFile.mockReturnValue('' as any);
    const result = await action.execute({ name: 'a', into: 'b', repository: 'acme/widgets' });
    expect(result.value).toEqual({ name: 'a', into: 'b', moved: 0 });
    expect(mockExecFile).toHaveBeenCalledTimes(3);
  });

  // @req FR:playbook-actions-git/labels.merge.target
  it('changes nothing when the target label does not exist', async () => {
    mockExecFile.mockImplementation((() => {
      throw new Error('HTTP 404: Not Found');
    }) as any);
    const result = await action.execute({ name: 'a', into: 'b', repository: 'acme/widgets' });
    expect(result.code).toBe('GitHubLabelMergeTargetMissing');
    expect(mockExecFile).toHaveBeenCalledTimes(1);
  });

  // @req FR:playbook-actions-git/labels.merge.resume
  it('skips items that already carry the target, so a rerun resumes', async () => {
    mockExecFile.mockImplementation(((_cmd: string, args: string[]) =>
      args[1] === '--paginate' ? '34\n' : '') as any);
    const result = await action.execute({ name: 'a', into: 'b', repository: 'acme/widgets' });
    expect(result.value).toEqual({ name: 'a', into: 'b', moved: 1 });
    const calls = mockExecFile.mock.calls.map((c) => c[1] as string[]);
    expect(calls[1][calls[1].length - 1]).toBe('.[] | select(any(.labels[]; .name == "b") | not) | .number');
  });

  it('requires a name and a different target', async () => {
    expect((await action.execute({ name: ' ', into: 'b' } as any)).code).toBe('GitHubLabelMergeConfigInvalid');
    expect((await action.execute({ name: 'a' } as any)).code).toBe('GitHubLabelMergeConfigInvalid');
    expect((await action.execute({ name: 'a', into: 'a' })).code).toBe('GitHubLabelMergeConfigInvalid');
    expect(mockExecFile).not.toHaveBeenCalled();
  });

  it('keeps the duplicate when relabeling fails', async () => {
    mockExecFile.mockImplementation(((_cmd: string, args: string[]) => {
      if (args[1] === '--paginate') return '12\n';
      if (args[1] === 'repos/acme/widgets/labels/b') return 'b';
      throw new Error('Command failed: forbidden');
    }) as any);
    const result = await action.execute({ name: 'a', into: 'b', repository: 'acme/widgets' });
    expect(result.code).not.toBe('Success');
    expect(result.code).not.toBe('GitHubLabelMergeTargetMissing');
    const calls = mockExecFile.mock.calls.map((c) => c[1] as string[]);
    expect(calls.some((c) => c[0] === 'label' && c[1] === 'delete')).toBe(false);
  });

  it('has name as primary property', () => {
    expect(GitHubLabelMergeAction.actionType).toBe('github-label-merge');
    expect(GitHubLabelMergeAction.primaryProperty).toBe('name');
  });
});
