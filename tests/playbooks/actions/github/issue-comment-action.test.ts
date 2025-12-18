// @req FR:playbook-actions-github/issues.comment
// @req FR:playbook-actions-github/common.validation
// @req FR:playbook-actions-github/common.result-structure
// @req FR:playbook-actions-github/errors.graceful-failure

import { GitHubIssueCommentAction } from '@playbooks/actions/github/issue-comment-action';
import type { GitHubIssueCommentConfig } from '@playbooks/actions/github/types';
import { execSync } from 'child_process';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

describe('GitHubIssueCommentAction', () => {
  let action: GitHubIssueCommentAction;
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    action = new GitHubIssueCommentAction();
    mockExecSync.mockClear();
  });

  describe('Success paths', () => {
    it('should add comment with all parameters', async () => {
      mockExecSync.mockImplementation(() => {
        return JSON.stringify({
          id: 789,
          url: 'https://github.com/owner/repo/issues/123#issuecomment-789',
          body: 'This is a comment on the issue',
          createdAt: '2024-01-01T00:00:00Z',
        }) as any;
      });

      const config: GitHubIssueCommentConfig = {
        issue: 123,
        body: 'This is a comment on the issue',
        repository: 'owner/repo',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
      expect(result.message).toBe('Added comment to issue #123');
      expect(result.value).toEqual({
        id: 789,
        url: 'https://github.com/owner/repo/issues/123#issuecomment-789',
      });
      expect(result.error).toBeUndefined();
    });

    it('should add comment with minimal parameters (issue, body)', async () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('gh repo view')) {
          return JSON.stringify({ nameWithOwner: 'owner/repo' }) as any;
        }
        return JSON.stringify({
          id: 456,
          url: 'https://github.com/owner/repo/issues/456#issuecomment-456',
          body: 'Minimal comment',
          createdAt: '2024-01-01T00:00:00Z',
        }) as any;
      });

      const config: GitHubIssueCommentConfig = {
        issue: 456,
        body: 'Minimal comment',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
      expect(result.message).toBe('Added comment to issue #456');
      expect((result.value as any)?.id).toBe(456);
    });
  });

  describe('Validation', () => {
    it('should return error for missing issue', async () => {
      const config: any = {
        body: 'Comment without issue number',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('GitHubIssueCommentConfigInvalid');
      expect(result.error?.message).toContain('Issue');
    });

    it('should return error for invalid issue (zero)', async () => {
      const config: GitHubIssueCommentConfig = {
        issue: 0,
        body: 'Test',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('GitHubIssueCommentConfigInvalid');
      expect(result.error?.message).toContain('Issue');
    });

    it('should return error for missing body', async () => {
      const config: any = {
        issue: 123,
      };

      const result = await action.execute(config);

      expect(result.code).toBe('GitHubIssueCommentConfigInvalid');
      expect(result.error?.message).toContain('body');
    });

    it('should return error for empty body', async () => {
      const config: GitHubIssueCommentConfig = {
        issue: 123,
        body: '   ',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('GitHubIssueCommentConfigInvalid');
      expect(result.error?.message).toContain('body');
    });
  });

  describe('Error handling', () => {
    it('should handle authentication error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('gh: Not logged in');
      });

      const result = await action.execute({ issue: 123, body: 'Test' });

      expect(result.code).toBe('GitHubIssueCommentAuthenticationFailed');
      expect(result.error?.message).toContain('authentication');
      expect(result.error?.guidance).toContain('gh auth login');
    });

    it('should handle not found error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('could not resolve to a Issue');
      });

      const result = await action.execute({ issue: 999, body: 'Test', repository: 'invalid/repo' });

      expect(result.code).toBe('GitHubIssueCommentNotFound');
      expect(result.error?.message).toContain('not found');
    });

    it('should handle permission error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Resource not accessible by personal access token');
      });

      const result = await action.execute({ issue: 123, body: 'Test' });

      expect(result.code).toBe('GitHubIssueCommentPermissionDenied');
      expect(result.error?.message).toContain('permission');
    });

    it('should handle rate limit error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('API rate limit exceeded');
      });

      const result = await action.execute({ issue: 123, body: 'Test' });

      expect(result.code).toBe('GitHubIssueCommentRateLimitExceeded');
      expect(result.error?.message).toContain('rate limit');
    });

    it('should handle network error', async () => {
      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Command failed');
        error.code = 'ETIMEDOUT';
        throw error;
      });

      const result = await action.execute({ issue: 123, body: 'Test' });

      expect(result.code).toBe('GitHubIssueCommentNetworkError');
      expect(result.error?.message).toContain('timed out');
    });
  });

  describe('Primary property', () => {
    it('should have issue as primary property', () => {
      expect(new GitHubIssueCommentAction().primaryProperty).toBe('issue');
    });
  });
});
