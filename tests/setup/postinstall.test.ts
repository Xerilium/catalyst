/**
 * Unit tests for postinstall script
 *
 * @req FR:ai-provider/commands.generate
 * @req FR:ai-provider/commands.migrate
 */

import * as childProcess from 'child_process';
import * as path from 'path';
import { generateProviderCommands } from '../../src/ai/commands';

// Mock dependencies
jest.mock('child_process');
jest.mock('../../src/ai/commands');

const mockExecSync = jest.mocked(childProcess.execSync);
const mockGenerateProviderCommands = jest.mocked(generateProviderCommands);

// Import after mocking
import { findGitRoot, runPostinstall, migrateTrackedCommands } from '../../src/setup/postinstall';

describe('postinstall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findGitRoot', () => {
    // @req FR:ai-provider/commands.generate
    it('should return git root when in a git repository', () => {
      mockExecSync.mockReturnValue('/home/user/project\n');

      const result = findGitRoot();

      expect(result).toBe('/home/user/project');
      expect(mockExecSync).toHaveBeenCalledWith(
        'git rev-parse --show-toplevel',
        expect.objectContaining({ encoding: 'utf8' })
      );
    });

    // @req FR:ai-provider/commands.generate
    it('should trim whitespace from git output', () => {
      mockExecSync.mockReturnValue('  /home/user/project  \n');

      const result = findGitRoot();

      expect(result).toBe('/home/user/project');
    });

    // @req FR:ai-provider/commands.generate
    it('should fall back to process.cwd() when not in a git repo', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = findGitRoot();

      expect(result).toBe(process.cwd());
      expect(consoleSpy).toHaveBeenCalledWith(
        'Not in a git repository, using current directory'
      );
      consoleSpy.mockRestore();
    });

    // @req FR:ai-provider/commands.generate
    it('should fall back to process.cwd() on any execSync error', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = findGitRoot();

      expect(result).toBe(process.cwd());
      consoleSpy.mockRestore();
    });
  });

  describe('runPostinstall', () => {
    const testPackageRoot = '/test/package/root';

    beforeEach(() => {
      // Default: findGitRoot returns a valid path
      mockExecSync.mockReturnValue('/test/project\n');
      // Prevent console output in tests
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    // @req FR:ai-provider/commands.generate
    it('should call generateProviderCommands with correct arguments', () => {
      runPostinstall(testPackageRoot);

      expect(mockGenerateProviderCommands).toHaveBeenCalledWith(
        '/test/project',
        path.join(testPackageRoot, 'ai-config/commands')
      );
    });

    // @req FR:ai-provider/commands.generate
    it('should compute templatesDir from packageRoot', () => {
      runPostinstall('/custom/package');

      expect(mockGenerateProviderCommands).toHaveBeenCalledWith(
        expect.any(String),
        '/custom/package/ai-config/commands'
      );
    });

    // @req FR:ai-provider/commands.generate
    it('should handle createInitIssue failure gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw even if createInitIssue fails
      expect(() => runPostinstall(testPackageRoot)).not.toThrow();

      consoleSpy.mockRestore();
    });

    // @req FR:ai-provider/commands.generate
    it('should use findGitRoot result as projectRoot', () => {
      mockExecSync.mockReturnValue('/specific/git/root\n');

      runPostinstall(testPackageRoot);

      expect(mockGenerateProviderCommands).toHaveBeenCalledWith(
        '/specific/git/root',
        expect.any(String)
      );
    });

    // @req FR:ai-provider/commands.generate
    it('should use cwd fallback when not in git repo', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not a git repo');
      });
      jest.spyOn(console, 'warn').mockImplementation();

      runPostinstall(testPackageRoot);

      expect(mockGenerateProviderCommands).toHaveBeenCalledWith(
        process.cwd(),
        expect.any(String)
      );
    });

    // @req FR:ai-provider/commands.migrate
    it('should call migrateTrackedCommands after generating commands', () => {
      runPostinstall(testPackageRoot);

      // migrateTrackedCommands uses execSync for git ls-files
      // Verify it was called (git ls-files calls happen after findGitRoot)
      const execSyncCalls = mockExecSync.mock.calls.map(c => String(c[0]));
      const gitRootCall = execSyncCalls.findIndex(c => c.includes('rev-parse'));
      const lsFilesCall = execSyncCalls.findIndex(c => c.includes('ls-files'));
      expect(lsFilesCall).toBeGreaterThan(gitRootCall);
    });
  });

  describe('migrateTrackedCommands', () => {
    const projectRoot = '/test/project';

    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    // @req FR:ai-provider/commands.migrate
    it('should check for tracked files using git ls-files', () => {
      mockExecSync.mockReturnValue('');

      migrateTrackedCommands(projectRoot);

      const execSyncCalls = mockExecSync.mock.calls.map(c => String(c[0]));
      expect(execSyncCalls.some(c => c.includes('git ls-files'))).toBe(true);
    });

    // @req FR:ai-provider/commands.migrate
    it('should run git rm --cached when tracked files exist', () => {
      mockExecSync.mockImplementation((cmd) => {
        const cmdStr = String(cmd);
        if (cmdStr.includes('git ls-files') && cmdStr.includes('.claude/commands/catalyst')) {
          return '.claude/commands/catalyst/rollout.md\n';
        }
        return '';
      });

      migrateTrackedCommands(projectRoot);

      const execSyncCalls = mockExecSync.mock.calls.map(c => String(c[0]));
      expect(execSyncCalls.some(c =>
        c.includes('git rm --cached') && c.includes('.claude/commands/catalyst')
      )).toBe(true);
    });

    // @req FR:ai-provider/commands.migrate
    it('should skip git rm --cached when no tracked files exist', () => {
      mockExecSync.mockReturnValue('');

      migrateTrackedCommands(projectRoot);

      const execSyncCalls = mockExecSync.mock.calls.map(c => String(c[0]));
      expect(execSyncCalls.some(c => c.includes('git rm --cached'))).toBe(false);
    });

    // @req FR:ai-provider/commands.migrate
    it('should handle errors gracefully without throwing', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });

      expect(() => migrateTrackedCommands(projectRoot)).not.toThrow();
    });

    // @req FR:ai-provider/commands.migrate
    it('should check flat provider paths with correct pattern', () => {
      mockExecSync.mockReturnValue('');

      migrateTrackedCommands(projectRoot);

      const execSyncCalls = mockExecSync.mock.calls.map(c => String(c[0]));
      expect(execSyncCalls.some(c =>
        c.includes('git ls-files') && c.includes('.github/prompts')
      )).toBe(true);
    });
  });
});
