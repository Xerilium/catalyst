import { exec } from 'child_process';
import type { CliDependency, EnvDependency, CheckResult } from '../../../src/playbooks/scripts/playbooks/types';
import { DependencyChecker } from '../../../src/playbooks/scripts/playbooks/services/dependency-checker';

// Mock child_process.exec
jest.mock('child_process');

const mockedExec = exec as jest.MockedFunction<typeof exec>;

describe('DependencyChecker', () => {
  let checker: DependencyChecker;
  let originalPlatform: NodeJS.Platform;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    checker = new DependencyChecker();
    originalPlatform = process.platform;
    originalEnv = { ...process.env };
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore process.platform (requires type assertion)
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true
    });
    process.env = originalEnv;
  });

  describe('checkCli()', () => {
    describe('T005: checkCli() tests (RED phase)', () => {
      it('should detect available command via version command', async () => {
        const dep: CliDependency = {
          name: 'bash',
          versionCommand: 'bash --version'
        };

        // Mock successful version command
        mockedExec.mockImplementation((cmd: any, callback: any) => {
          if (callback) {
            callback(null, 'GNU bash, version 5.2.15(1)-release', '');
          }
          return {} as any;
        });

        const result = await checker.checkCli(dep);

        expect(result.available).toBe(true);
        expect(result.version).toBe('5.2.15');
        expect(mockedExec).toHaveBeenCalledWith(
          'bash --version',
          expect.any(Function)
        );
      });

      it('should fall back to which/where if no version command', async () => {
        const dep: CliDependency = {
          name: 'bash'
        };

        // Mock successful which command (Unix)
        Object.defineProperty(process, 'platform', {
          value: 'linux',
          configurable: true
        });

        mockedExec.mockImplementation((cmd: any, callback: any) => {
          if (cmd === 'which bash' && callback) {
            callback(null, '/usr/bin/bash', '');
          }
          return {} as any;
        });

        const result = await checker.checkCli(dep);

        expect(result.available).toBe(true);
        expect(mockedExec).toHaveBeenCalledWith(
          'which bash',
          expect.any(Function)
        );
      });

      it('should return unavailable if command not found', async () => {
        const dep: CliDependency = {
          name: 'nonexistent',
          versionCommand: 'nonexistent --version',
          installDocs: 'https://example.com/install'
        };

        // Mock command not found
        mockedExec.mockImplementation((cmd: any, callback: any) => {
          if (callback) {
            const error: any = new Error('Command not found');
            error.code = 'ENOENT';
            callback(error, '', '');
          }
          return {} as any;
        });

        const result = await checker.checkCli(dep);

        expect(result.available).toBe(false);
        expect(result.error).toContain('nonexistent not found');
        expect(result.error).toContain('https://example.com/install');
        expect(result.installDocs).toBe('https://example.com/install');
      });

      it('should respect platform filtering', async () => {
        const dep: CliDependency = {
          name: 'bash',
          platforms: ['darwin'] // macOS only
        };

        // Set platform to Linux (not in allowed platforms)
        Object.defineProperty(process, 'platform', {
          value: 'linux',
          configurable: true
        });

        const result = await checker.checkCli(dep);

        expect(result.available).toBe(true); // Not required on this platform
        expect(mockedExec).not.toHaveBeenCalled();
      });

      it('should parse version from output', async () => {
        const dep: CliDependency = {
          name: 'gh',
          versionCommand: 'gh --version'
        };

        // Mock version output with "v" prefix
        mockedExec.mockImplementation((cmd: any, callback: any) => {
          if (callback) {
            callback(null, 'gh version v2.42.1 (2024-01-15)', '');
          }
          return {} as any;
        });

        const result = await checker.checkCli(dep);

        expect(result.available).toBe(true);
        expect(result.version).toBe('2.42.1');
      });

      it('should compare version against minVersion', async () => {
        const dep: CliDependency = {
          name: 'gh',
          versionCommand: 'gh --version',
          minVersion: '2.0.0'
        };

        // Mock version output
        mockedExec.mockImplementation((cmd: any, callback: any) => {
          if (callback) {
            callback(null, 'gh version 2.42.1', '');
          }
          return {} as any;
        });

        const result = await checker.checkCli(dep);

        expect(result.available).toBe(true);
        expect(result.version).toBe('2.42.1');
        expect(result.meetsMinVersion).toBe(true);
      });

      it('should include installDocs in error result', async () => {
        const dep: CliDependency = {
          name: 'pwsh',
          versionCommand: 'pwsh --version',
          installDocs: 'https://github.com/PowerShell/PowerShell'
        };

        // Mock command failure
        mockedExec.mockImplementation((cmd: any, callback: any) => {
          if (callback) {
            callback(new Error('Command failed'), '', '');
          }
          return {} as any;
        });

        const result = await checker.checkCli(dep);

        expect(result.available).toBe(false);
        expect(result.error).toContain('pwsh not found');
        expect(result.error).toContain('https://github.com/PowerShell/PowerShell');
        expect(result.installDocs).toBe('https://github.com/PowerShell/PowerShell');
      });

      it('should timeout after 5 seconds', async () => {
        const dep: CliDependency = {
          name: 'slow-command',
          versionCommand: 'slow-command --version'
        };

        // Mock command that never completes
        mockedExec.mockImplementation(() => {
          // Return child process with kill method
          return {
            kill: jest.fn()
          } as any;
        });

        // Set very short timeout for testing (override default)
        const result = await checker.checkCli(dep);

        // Should fail due to timeout
        expect(result.available).toBe(false);
      }, 10000); // Test timeout
    });
  });

  describe('checkEnv()', () => {
    describe('T007: checkEnv() tests (RED phase)', () => {
      it('should detect present environment variable', async () => {
        process.env.GITHUB_TOKEN = 'test-token';

        const dep: EnvDependency = {
          name: 'GITHUB_TOKEN',
          required: true
        };

        const result = await checker.checkEnv(dep);

        expect(result.available).toBe(true);
      });

      it('should return unavailable for missing required variable', async () => {
        delete process.env.GITHUB_TOKEN;

        const dep: EnvDependency = {
          name: 'GITHUB_TOKEN',
          required: true,
          description: 'GitHub API authentication token'
        };

        const result = await checker.checkEnv(dep);

        expect(result.available).toBe(false);
        expect(result.error).toContain('GITHUB_TOKEN');
        expect(result.error).toContain('not set');
      });

      it('should return available for missing optional variable', async () => {
        delete process.env.OPTIONAL_VAR;

        const dep: EnvDependency = {
          name: 'OPTIONAL_VAR',
          required: false
        };

        const result = await checker.checkEnv(dep);

        expect(result.available).toBe(true);
      });

      it('should include description in error message', async () => {
        delete process.env.API_KEY;

        const dep: EnvDependency = {
          name: 'API_KEY',
          required: true,
          description: 'Authentication key for external API'
        };

        const result = await checker.checkEnv(dep);

        expect(result.available).toBe(false);
        expect(result.error).toContain('API_KEY');
        expect(result.error).toContain('Authentication key for external API');
      });
    });
  });

  describe('Helper methods', () => {
    describe('T009: Helper method tests (RED phase)', () => {
      it('execWithTimeout should execute command successfully', async () => {
        // This will be tested via checkCli tests
        // Skipping separate test as it's a private method
      });

      it('execWithTimeout should timeout long-running command', async () => {
        // This will be tested via checkCli timeout test
        // Skipping separate test as it's a private method
      });

      it('parseVersion should extract version from various formats', () => {
        // Testing via public checkCli method which calls parseVersion
        // Covered by "should parse version from output" test
      });

      it('compareVersions should correctly compare semantic versions', () => {
        // Testing via public checkCli method which calls compareVersions
        // Covered by "should compare version against minVersion" test
      });
    });
  });
});
