/**
 * Unit tests for GitHubAdapter repository operations
 * Tests T026-T032: All repository-related adapter methods
 */

import { GitHubAdapter } from '../../../src/playbooks/scripts/github/adapter';
import { execSync } from 'child_process';

jest.mock('child_process');
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('GitHubAdapter - Repository Operations', () => {
  let adapter: GitHubAdapter;

  beforeEach(() => {
    adapter = new GitHubAdapter();
    jest.clearAllMocks();
  });

  describe('getRepositoryInfo()', () => {
    it('should get repository metadata', async () => {
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify({
        owner: { login: 'testowner' },
        name: 'testrepo',
        defaultBranchRef: { name: 'main' },
        description: 'Test repository',
      })));

      const result = await adapter.getRepositoryInfo();

      expect(result.success).toBe(true);
      expect(result.data!.owner).toBe('testowner');
      expect(result.data!.defaultBranch).toBe('main');
    });
  });

  describe('setBranchProtection()', () => {
    it('should set branch protection rules', async () => {
      mockExecSync.mockReturnValue(Buffer.from('{}'));

      const result = await adapter.setBranchProtection('main', {
        requirePR: true,
        requiredReviews: 2,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('createLabel()', () => {
    it('should create repository label', async () => {
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify({
        name: 'bug',
        color: 'ff0000',
        description: 'Bug report',
      })));

      const result = await adapter.createLabel('bug', 'ff0000', 'Bug report');

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('bug');
    });
  });

  describe('updateLabel()', () => {
    it('should update existing label', async () => {
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify({
        name: 'bug',
        color: '00ff00',
      })));

      const result = await adapter.updateLabel('bug', { color: '00ff00' });

      expect(result.success).toBe(true);
    });
  });

  describe('deleteLabel()', () => {
    it('should delete label', async () => {
      mockExecSync.mockReturnValue(Buffer.from(''));

      const result = await adapter.deleteLabel('obsolete');

      expect(result.success).toBe(true);
    });
  });

  describe('setRepositoryProperties()', () => {
    it('should set repository properties', async () => {
      mockExecSync.mockReturnValue(Buffer.from('{}'));

      const result = await adapter.setRepositoryProperties({
        description: 'New description',
        homepage: 'https://example.com',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('setMergeSettings()', () => {
    it('should configure merge settings', async () => {
      mockExecSync.mockReturnValue(Buffer.from('{}'));

      const result = await adapter.setMergeSettings({
        allowSquash: true,
        allowMerge: false,
        deleteBranchOnMerge: true,
      });

      expect(result.success).toBe(true);
    });
  });
});
