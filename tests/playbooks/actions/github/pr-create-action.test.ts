import { GitHubPRCreateAction } from '../../../../src/playbooks/scripts/playbooks/actions/github/pr-create-action';
import type { GitHubPRCreateConfig } from '../../../../src/playbooks/scripts/playbooks/actions/github/types';
import { execSync } from 'child_process';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

describe('GitHubPRCreateAction', () => {
  let action: GitHubPRCreateAction;
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    action = new GitHubPRCreateAction();
    mockExecSync.mockClear();
  });

  describe('Success paths', () => {
    it('should create PR with all parameters', async () => {
      mockExecSync.mockImplementation(() => {
        return JSON.stringify({
          number: 456,
          url: 'https://github.com/owner/repo/pull/456',
          title: 'Feature: Add new functionality',
          body: 'PR description with details',
          state: 'open',
          head: { ref: 'feature-branch' },
          base: { ref: 'main' },
          draft: false,
        }) as any;
      });

      const config: GitHubPRCreateConfig = {
        title: 'Feature: Add new functionality',
        head: 'feature-branch',
        base: 'main',
        body: 'PR description with details',
        draft: false,
        repository: 'owner/repo',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
      expect(result.message).toBe('Created PR #456: Feature: Add new functionality');
      expect(result.value).toEqual({
        number: 456,
        url: 'https://github.com/owner/repo/pull/456',
        title: 'Feature: Add new functionality',
        state: 'open',
        head: 'feature-branch',
        base: 'main',
      });
      expect(result.error).toBeUndefined();
    });

    it('should create PR with minimal parameters (title, head, base)', async () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('gh repo view')) {
          return JSON.stringify({ nameWithOwner: 'owner/repo' }) as any;
        }
        return JSON.stringify({
          number: 789,
          url: 'https://github.com/owner/repo/pull/789',
          title: 'Minimal PR',
          state: 'open',
          head: { ref: 'feature' },
          base: { ref: 'main' },
          draft: false,
        }) as any;
      });

      const config: GitHubPRCreateConfig = {
        title: 'Minimal PR',
        head: 'feature',
        base: 'main',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
      expect(result.message).toBe('Created PR #789: Minimal PR');
      expect((result.value as any)?.title).toBe('Minimal PR');
    });

    it('should create PR with draft=true', async () => {
      mockExecSync.mockImplementation(() => {
        return JSON.stringify({
          number: 111,
          url: 'https://github.com/owner/repo/pull/111',
          title: 'Draft PR',
          state: 'open',
          head: { ref: 'feature' },
          base: { ref: 'main' },
          draft: true,
        }) as any;
      });

      const config: GitHubPRCreateConfig = {
        title: 'Draft PR',
        head: 'feature',
        base: 'main',
        draft: true,
        repository: 'owner/repo',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('Success');
      expect(result.message).toBe('Created PR #111: Draft PR');
    });
  });

  describe('Validation', () => {
    it('should return error for missing title', async () => {
      const config: any = {
        head: 'feature',
        base: 'main',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('GitHubPRCreateConfigInvalid');
      expect(result.error?.message).toContain('title');
    });

    it('should return error for empty title', async () => {
      const config: GitHubPRCreateConfig = {
        title: '   ',
        head: 'feature',
        base: 'main',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('GitHubPRCreateConfigInvalid');
      expect(result.error?.message).toContain('title');
    });

    it('should return error for missing head', async () => {
      const config: any = {
        title: 'Test PR',
        base: 'main',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('GitHubPRCreateConfigInvalid');
      expect(result.error?.message).toContain('Head');
    });

    it('should return error for missing base', async () => {
      const config: any = {
        title: 'Test PR',
        head: 'feature',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('GitHubPRCreateConfigInvalid');
      expect(result.error?.message).toContain('Base');
    });

    it('should return error for empty head', async () => {
      const config: GitHubPRCreateConfig = {
        title: 'Test PR',
        head: '   ',
        base: 'main',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('GitHubPRCreateConfigInvalid');
      expect(result.error?.message).toContain('Head');
    });

    it('should return error for empty base', async () => {
      const config: GitHubPRCreateConfig = {
        title: 'Test PR',
        head: 'feature',
        base: '   ',
      };

      const result = await action.execute(config);

      expect(result.code).toBe('GitHubPRCreateConfigInvalid');
      expect(result.error?.message).toContain('Base');
    });
  });

  describe('Error handling', () => {
    it('should handle authentication error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('gh: Not logged in');
      });

      const result = await action.execute({
        title: 'Test',
        head: 'feature',
        base: 'main',
      });

      expect(result.code).toBe('GitHubPRCreateAuthenticationFailed');
      expect(result.error?.message).toContain('authentication');
      expect(result.error?.guidance).toContain('gh auth login');
    });

    it('should handle not found error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('could not resolve to a Repository');
      });

      const result = await action.execute({
        title: 'Test',
        head: 'feature',
        base: 'main',
        repository: 'invalid/repo',
      });

      expect(result.code).toBe('GitHubPRCreateNotFound');
      expect(result.error?.message).toContain('not found');
    });

    it('should handle permission error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Resource not accessible by personal access token');
      });

      const result = await action.execute({
        title: 'Test',
        head: 'feature',
        base: 'main',
      });

      expect(result.code).toBe('GitHubPRCreatePermissionDenied');
      expect(result.error?.message).toContain('permission');
    });

    it('should handle rate limit error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('API rate limit exceeded');
      });

      const result = await action.execute({
        title: 'Test',
        head: 'feature',
        base: 'main',
      });

      expect(result.code).toBe('GitHubPRCreateRateLimitExceeded');
      expect(result.error?.message).toContain('rate limit');
    });

    it('should handle network error', async () => {
      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Command failed');
        error.code = 'ETIMEDOUT';
        throw error;
      });

      const result = await action.execute({
        title: 'Test',
        head: 'feature',
        base: 'main',
      });

      expect(result.code).toBe('GitHubPRCreateNetworkError');
      expect(result.error?.message).toContain('timed out');
    });
  });

  describe('Primary property', () => {
    it('should have title as primary property', () => {
      expect(GitHubPRCreateAction.primaryProperty).toBe('title');
    });
  });
});
