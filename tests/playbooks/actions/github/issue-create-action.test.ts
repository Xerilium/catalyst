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
    it('should create issue with all parameters', async () => {
      // Since repository is specified, no repo context detection needed - single execSync call
      mockExecSync.mockImplementation(() => {
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

    it('should create issue with minimal parameters (title only)', async () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('gh repo view')) {
          return JSON.stringify({ nameWithOwner: 'owner/repo' }) as any;
        }
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
  });

  describe('Validation', () => {
    it('should return error for missing title', async () => {
      const config: any = {
        body: 'Body without title',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('GitHubIssueCreateConfigInvalid');
      expect(result.error?.message).toContain('title');
    });

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
    it('should handle authentication error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('gh: Not logged in');
      });

      const result = await action.execute({ title: 'Test' });

      expect(result.code).toBe('GitHubIssueCreateAuthenticationFailed');
      expect(result.error?.message).toContain('authentication');
      expect(result.error?.guidance).toContain('gh auth login');
    });

    it('should handle not found error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('could not resolve to a Repository');
      });

      const result = await action.execute({ title: 'Test', repository: 'invalid/repo' });

      expect(result.code).toBe('GitHubIssueCreateNotFound');
      expect(result.error?.message).toContain('not found');
    });

    it('should handle permission error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Resource not accessible by personal access token');
      });

      const result = await action.execute({ title: 'Test' });

      expect(result.code).toBe('GitHubIssueCreatePermissionDenied');
      expect(result.error?.message).toContain('permission');
    });

    it('should handle rate limit error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('API rate limit exceeded');
      });

      const result = await action.execute({ title: 'Test' });

      expect(result.code).toBe('GitHubIssueCreateRateLimitExceeded');
      expect(result.error?.message).toContain('rate limit');
    });

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
    it('should have title as primary property', () => {
      expect(new GitHubIssueCreateAction().primaryProperty).toBe('title');
    });
  });
});
