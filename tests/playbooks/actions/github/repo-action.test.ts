import { GitHubRepoAction } from '../../../../src/playbooks/scripts/playbooks/actions/github/repo-action';
import type { GitHubRepoConfig } from '../../../../src/playbooks/scripts/playbooks/actions/github/types';
import { execSync } from 'child_process';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

describe('GitHubRepoAction', () => {
  let action: GitHubRepoAction;
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    action = new GitHubRepoAction();
    mockExecSync.mockClear();
  });

  describe('Success paths', () => {
    it('should get repository info with explicit repository parameter', async () => {
      mockExecSync.mockImplementation(() => {
        return JSON.stringify({
          name: 'repo',
          owner: { login: 'owner' },
          defaultBranchRef: { name: 'main' },
          visibility: 'PUBLIC',
          url: 'https://github.com/owner/repo',
        }) as any;
      });

      const config: GitHubRepoConfig = {
        repository: 'owner/repo',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
      expect(result.message).toBe('Retrieved info for owner/repo');
      expect(result.value).toEqual({
        name: 'repo',
        owner: 'owner',
        defaultBranch: 'main',
        visibility: 'public',
        url: 'https://github.com/owner/repo',
      });
      expect(result.error).toBeUndefined();
    });

    it('should get repository info with default repository (no config)', async () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('gh repo view')) {
          return JSON.stringify({
            nameWithOwner: 'default/repo',
            name: 'repo',
            owner: { login: 'default' },
            defaultBranchRef: { name: 'main' },
            visibility: 'PRIVATE',
            url: 'https://github.com/default/repo',
          }) as any;
        }
        return '{}' as any;
      });

      const config: GitHubRepoConfig = {};

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
      expect(result.message).toBe('Retrieved info for default/repo');
      expect((result.value as any)?.name).toBe('repo');
      expect((result.value as any)?.owner).toBe('default');
    });
  });

  describe('Error handling', () => {
    it('should handle authentication error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('gh: Not logged in');
      });

      const result = await action.execute({});

      expect(result.code).toBe('GitHubRepoAuthenticationFailed');
      expect(result.error?.message).toContain('authentication');
      expect(result.error?.guidance).toContain('gh auth login');
    });

    it('should handle not found error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('could not resolve to a Repository');
      });

      const result = await action.execute({ repository: 'invalid/repo' });

      expect(result.code).toBe('GitHubRepoNotFound');
      expect(result.error?.message).toContain('not found');
    });

    it('should handle permission error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Resource not accessible by personal access token');
      });

      const result = await action.execute({ repository: 'private/repo' });

      expect(result.code).toBe('GitHubRepoPermissionDenied');
      expect(result.error?.message).toContain('permission');
    });

    it('should handle rate limit error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('API rate limit exceeded');
      });

      const result = await action.execute({});

      expect(result.code).toBe('GitHubRepoRateLimitExceeded');
      expect(result.error?.message).toContain('rate limit');
    });

    it('should handle network error', async () => {
      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Command failed');
        error.code = 'ETIMEDOUT';
        throw error;
      });

      const result = await action.execute({});

      expect(result.code).toBe('GitHubRepoNetworkError');
      expect(result.error?.message).toContain('timed out');
    });
  });

  describe('Primary property', () => {
    it('should have repository as primary property', () => {
      expect(new GitHubRepoAction().primaryProperty).toBe('repository');
    });
  });
});
