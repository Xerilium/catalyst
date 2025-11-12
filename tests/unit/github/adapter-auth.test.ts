/**
 * Unit tests for GitHubAdapter authentication operations
 * Tests T033-T034: Authentication methods
 */

import { GitHubAdapter } from '../../../src/playbooks/scripts/github/adapter';
import { execSync } from 'child_process';

jest.mock('child_process');
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('GitHubAdapter - Authentication Operations', () => {
  let adapter: GitHubAdapter;

  beforeEach(() => {
    adapter = new GitHubAdapter();
    jest.clearAllMocks();
  });

  describe('checkAuth()', () => {
    it('should return success when authenticated', async () => {
      mockExecSync.mockReturnValue(Buffer.from('testuser\n'));

      const result = await adapter.checkAuth();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return false when not authenticated', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not logged in');
      });

      const result = await adapter.checkAuth();

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('authenticate()', () => {
    it('should authenticate user', async () => {
      mockExecSync.mockReturnValue(Buffer.from(''));

      const result = await adapter.authenticate();

      expect(result.success).toBe(true);
    });

    it('should install CLI with --install flag', async () => {
      mockExecSync.mockReturnValue(Buffer.from(''));

      const result = await adapter.authenticate({ install: true });

      expect(result.success).toBe(true);
    });

    it('should force re-auth with --force flag', async () => {
      mockExecSync.mockReturnValue(Buffer.from(''));

      const result = await adapter.authenticate({ force: true });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--force'),
        expect.any(Object)
      );
    });
  });
});
