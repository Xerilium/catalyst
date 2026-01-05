// @req FR:playbook-actions-github/pull-requests.comment
// @req FR:playbook-actions-github/common.validation
// @req FR:playbook-actions-github/common.result-structure
// @req FR:playbook-actions-github/errors.graceful-failure

import { GitHubPRCommentAction } from '@playbooks/actions/github/pr-comment-action';
import type { GitHubPRCommentConfig } from '@playbooks/actions/github/types';
import { execSync } from 'child_process';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

describe('GitHubPRCommentAction', () => {
  let action: GitHubPRCommentAction;
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    action = new GitHubPRCommentAction();
    mockExecSync.mockClear();
  });

  describe('Success paths', () => {
    it('should add comment with all parameters', async () => {
      mockExecSync.mockImplementation(() => {
        return JSON.stringify({
          id: 999,
          url: 'https://github.com/owner/repo/pull/123#issuecomment-999',
          body: 'This is a comment on the PR',
          createdAt: '2024-01-01T00:00:00Z',
        }) as any;
      });

      const config: GitHubPRCommentConfig = {
        pr: 123,
        body: 'This is a comment on the PR',
        repository: 'owner/repo',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
      expect(result.message).toBe('Added comment to PR #123');
      expect(result.value).toEqual({
        id: 999,
        url: 'https://github.com/owner/repo/pull/123#issuecomment-999',
      });
      expect(result.error).toBeUndefined();
    });

    it('should add comment with minimal parameters (pr, body)', async () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('gh repo view')) {
          return JSON.stringify({ nameWithOwner: 'owner/repo' }) as any;
        }
        return JSON.stringify({
          id: 777,
          url: 'https://github.com/owner/repo/pull/456#issuecomment-777',
          body: 'Minimal comment',
          createdAt: '2024-01-01T00:00:00Z',
        }) as any;
      });

      const config: GitHubPRCommentConfig = {
        pr: 456,
        body: 'Minimal comment',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
      expect(result.message).toBe('Added comment to PR #456');
      expect((result.value as any)?.id).toBe(777);
    });
  });

  describe('Validation', () => {
    it('should return error for missing PR', async () => {
      const config: any = {
        body: 'Comment without PR number',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('GitHubPRCommentConfigInvalid');
      expect(result.error?.message).toContain('PR');
    });

    it('should return error for invalid PR (zero)', async () => {
      const config: GitHubPRCommentConfig = {
        pr: 0,
        body: 'Test',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('GitHubPRCommentConfigInvalid');
      expect(result.error?.message).toContain('PR');
    });

    it('should return error for missing body', async () => {
      const config: any = {
        pr: 123,
      };

      const result = await action.execute(config);

      expect(result.code).toBe('GitHubPRCommentConfigInvalid');
      expect(result.error?.message).toContain('body');
    });

    it('should return error for empty body', async () => {
      const config: GitHubPRCommentConfig = {
        pr: 123,
        body: '   ',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('GitHubPRCommentConfigInvalid');
      expect(result.error?.message).toContain('body');
    });
  });

  describe('Error handling', () => {
    it('should handle authentication error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('gh: Not logged in');
      });

      const result = await action.execute({ pr: 123, body: 'Test' });

      expect(result.code).toBe('GitHubPRCommentAuthenticationFailed');
      expect(result.error?.message).toContain('authentication');
      expect(result.error?.guidance).toContain('gh auth login');
    });

    it('should handle not found error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('could not resolve to a PullRequest');
      });

      const result = await action.execute({ pr: 999, body: 'Test', repository: 'invalid/repo' });

      expect(result.code).toBe('GitHubPRCommentNotFound');
      expect(result.error?.message).toContain('not found');
    });

    it('should handle permission error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Resource not accessible by personal access token');
      });

      const result = await action.execute({ pr: 123, body: 'Test' });

      expect(result.code).toBe('GitHubPRCommentPermissionDenied');
      expect(result.error?.message).toContain('permission');
    });

    it('should handle rate limit error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('API rate limit exceeded');
      });

      const result = await action.execute({ pr: 123, body: 'Test' });

      expect(result.code).toBe('GitHubPRCommentRateLimitExceeded');
      expect(result.error?.message).toContain('rate limit');
    });

    it('should handle network error', async () => {
      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Command failed');
        error.code = 'ETIMEDOUT';
        throw error;
      });

      const result = await action.execute({ pr: 123, body: 'Test' });

      expect(result.code).toBe('GitHubPRCommentNetworkError');
      expect(result.error?.message).toContain('timed out');
    });
  });

  describe('Primary property', () => {
    it('should have pr as primary property', () => {
      expect(new GitHubPRCommentAction().primaryProperty).toBe('pr');
    });
  });
});
