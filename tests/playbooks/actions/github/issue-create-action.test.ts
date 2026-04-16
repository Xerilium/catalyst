import { GitHubIssueCreateAction } from '@playbooks/actions/github/issue-create-action';
import type { GitHubIssueCreateConfig } from '@playbooks/actions/github/types';
import { execSync } from 'child_process';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

describe('GitHubIssueCreateAction', () => {
  let action: GitHubIssueCreateAction;
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    action = new GitHubIssueCreateAction();
    mockExecSync.mockClear();
  });

  describe('Success paths', () => {
    // @req FR:playbook-actions-github/issues.create
    // @req FR:playbook-actions-github/common.result-structure
    it('should create issue with all parameters', async () => {
      // gh issue create returns URL, then gh issue view returns JSON
      mockExecSync.mockImplementation((command: string) => {
        if ((command as string).includes('gh issue create')) {
          return 'https://github.com/owner/repo/issues/123\n' as any;
        }
        // gh issue view --json
        return JSON.stringify({
          number: 123,
          url: 'https://github.com/owner/repo/issues/123',
          title: 'Test Issue',
          body: 'Issue description',
          state: 'open',
          labels: [{ name: 'bug' }, { name: 'priority:high' }],
          assignees: [{ login: 'user1' }, { login: 'user2' }],
        }) as any;
      });

      const config: GitHubIssueCreateConfig = {
        title: 'Test Issue',
        body: 'Issue description',
        labels: ['bug', 'priority:high'],
        assignees: ['user1', 'user2'],
        repository: 'owner/repo',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
      expect(result.message).toBe('Created issue #123: Test Issue');
      expect(result.value).toEqual({
        number: 123,
        url: 'https://github.com/owner/repo/issues/123',
        title: 'Test Issue',
        state: 'open',
      });
      expect(result.error).toBeUndefined();
    });

    // @req FR:playbook-actions-github/issues.create
    it('should create issue with minimal parameters (title only)', async () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('gh repo view')) {
          return JSON.stringify({ nameWithOwner: 'owner/repo' }) as any;
        }
        if (command.includes('gh issue create')) {
          return 'https://github.com/owner/repo/issues/456\n' as any;
        }
        // gh issue view --json
        return JSON.stringify({
          number: 456,
          url: 'https://github.com/owner/repo/issues/456',
          title: 'Minimal Issue',
          state: 'open',
        }) as any;
      });

      const config: GitHubIssueCreateConfig = {
        title: 'Minimal Issue',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
      expect(result.message).toBe('Created issue #456: Minimal Issue');
      expect((result.value as any)?.title).toBe('Minimal Issue');
    });

    // @req FR:playbook-actions-github/issues.create
    it('should normalize uppercase state from GitHub API to lowercase', async () => {
      mockExecSync.mockImplementation((command: string) => {
        if ((command as string).includes('gh issue create')) {
          return 'https://github.com/owner/repo/issues/789\n' as any;
        }
        return JSON.stringify({
          number: 789,
          url: 'https://github.com/owner/repo/issues/789',
          title: 'State Test',
          body: '',
          state: 'OPEN',
          labels: [],
          assignees: [],
        }) as any;
      });

      const result = await action.execute({ title: 'State Test', repository: 'owner/repo' });

      expect(result.code).toBe('Success');
      expect((result.value as any).state).toBe('open');
    });
  });

  describe('Validation', () => {
    // @req FR:playbook-actions-github/common.validation
    it('should return error for missing title', async () => {
      const config: any = {
        body: 'Body without title',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('GitHubIssueCreateConfigInvalid');
      expect(result.error?.message).toContain('title');
    });

    // @req FR:playbook-actions-github/common.validation
    it('should return error for empty title', async () => {
      const config: GitHubIssueCreateConfig = {
        title: '   ',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('GitHubIssueCreateConfigInvalid');
      expect(result.error?.message).toContain('title');
    });
  });

  describe('Error handling', () => {
    // @req FR:playbook-actions-github/errors.graceful-failure
    it('should handle authentication error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('gh: Not logged in');
      });

      const result = await action.execute({ title: 'Test' });

      expect(result.code).toBe('GitHubIssueCreateAuthenticationFailed');
      expect(result.error?.message).toContain('authentication');
      expect(result.error?.guidance).toContain('gh auth login');
    });

    // @req FR:playbook-actions-github/errors.graceful-failure
    it('should handle not found error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('could not resolve to a Repository');
      });

      const result = await action.execute({ title: 'Test', repository: 'invalid/repo' });

      expect(result.code).toBe('GitHubIssueCreateNotFound');
      expect(result.error?.message).toContain('not found');
    });

    // @req FR:playbook-actions-github/errors.graceful-failure
    it('should handle permission error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Resource not accessible by personal access token');
      });

      const result = await action.execute({ title: 'Test' });

      expect(result.code).toBe('GitHubIssueCreatePermissionDenied');
      expect(result.error?.message).toContain('permission');
    });

    // @req FR:playbook-actions-github/errors.graceful-failure
    it('should handle rate limit error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('API rate limit exceeded');
      });

      const result = await action.execute({ title: 'Test' });

      expect(result.code).toBe('GitHubIssueCreateRateLimitExceeded');
      expect(result.error?.message).toContain('rate limit');
    });

    // @req FR:playbook-actions-github/errors.graceful-failure
    it('should handle network error', async () => {
      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Command failed');
        error.code = 'ETIMEDOUT';
        throw error;
      });

      const result = await action.execute({ title: 'Test' });

      expect(result.code).toBe('GitHubIssueCreateNetworkError');
      expect(result.error?.message).toContain('timed out');
    });
  });

  describe('Primary property', () => {
    // @req FR:playbook-actions-github/issues.create
    it('should have title as primary property', () => {
      expect(GitHubIssueCreateAction.primaryProperty).toBe('title');
    });
  });
});
