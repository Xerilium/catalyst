/**
 * Unit tests for PowerShellAction
 *
 * Tests PowerShell script execution via child_process with proper environment
 * and working directory management.
 */

import { PowerShellAction } from '../../../../../src/playbooks/scripts/playbooks/actions/scripts/powershell-action';
import { PowerShellErrorCodes } from '../../../../../src/playbooks/scripts/playbooks/actions/scripts/errors';
import { exec } from 'child_process';
import * as fs from 'fs';

// Mock child_process and fs
jest.mock('child_process');
jest.mock('fs');

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('PowerShellAction', () => {
  const repoRoot = '/test/repo';
  let action: PowerShellAction;

  beforeEach(() => {
    jest.clearAllMocks();
    action = new PowerShellAction(repoRoot);

    // Default mock: cwd exists and is a directory
    mockFs.existsSync.mockReturnValue(true);
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
  });

  describe('Configuration Validation', () => {
    it('should reject missing code property', async () => {
      const result = await action.execute({ code: '' });

      expect(result.code).toBe(PowerShellErrorCodes.ConfigInvalid);
      expect(result.error).toBeDefined();
      expect(result.error?.guidance).toContain('code property is required');
    });

    it('should reject non-string code', async () => {
      const result = await action.execute({ code: 123 as any });

      expect(result.code).toBe(PowerShellErrorCodes.ConfigInvalid);
      expect(result.error).toBeDefined();
    });

    it('should reject negative timeout', async () => {
      const result = await action.execute({
        code: 'Write-Host test',
        timeout: -1
      });

      expect(result.code).toBe(PowerShellErrorCodes.ConfigInvalid);
      expect(result.error).toBeDefined();
    });
  });

  describe('Working Directory Resolution', () => {
    beforeEach(() => {
      mockExec.mockImplementation((cmd, opts, cb) => {
        cb?.(null, 'output', '');
        return null as any;
      });
    });

    it('should use repository root as default cwd', async () => {
      await action.execute({ code: 'Write-Host test' });

      expect(mockExec).toHaveBeenCalled();
      const callOpts = mockExec.mock.calls[0][1] as any;
      expect(callOpts.cwd).toBe(repoRoot);
    });

    it('should resolve relative cwd', async () => {
      await action.execute({
        code: 'Write-Host test',
        cwd: 'subdir'
      });

      expect(mockExec).toHaveBeenCalled();
      const callOpts = mockExec.mock.calls[0][1] as any;
      expect(callOpts.cwd).toContain('subdir');
    });

    it('should reject non-existent cwd', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await action.execute({
        code: 'Write-Host test',
        cwd: '/nonexistent'
      });

      expect(result.code).toBe(PowerShellErrorCodes.InvalidCwd);
      expect(result.error).toBeDefined();
    });
  });

  describe('PowerShell Execution', () => {
    it('should execute simple PowerShell command', async () => {
      mockExec.mockImplementation((cmd, opts, cb) => {
        cb?.(null, 'hello world', '');
        return null as any;
      });

      const result = await action.execute({
        code: 'Write-Host "hello world"'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toEqual({
        stdout: 'hello world',
        stderr: '',
        exitCode: 0
      });
    });

    it('should use pwsh shell', async () => {
      mockExec.mockImplementation((cmd, opts, cb) => {
        cb?.(null, 'output', '');
        return null as any;
      });

      await action.execute({ code: 'Write-Host test' });

      expect(mockExec).toHaveBeenCalled();
      const callOpts = mockExec.mock.calls[0][1] as any;
      expect(callOpts.shell).toBe('pwsh');
    });

    it('should capture stderr', async () => {
      mockExec.mockImplementation((cmd, opts, cb) => {
        cb?.(null, 'stdout', 'stderr content');
        return null as any;
      });

      const result = await action.execute({
        code: 'Write-Error "test"'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toEqual({
        stdout: 'stdout',
        stderr: 'stderr content',
        exitCode: 0
      });
    });

    it('should merge environment variables', async () => {
      mockExec.mockImplementation((cmd, opts, cb) => {
        cb?.(null, 'output', '');
        return null as any;
      });

      await action.execute({
        code: 'Write-Host $env:TEST_VAR',
        env: { TEST_VAR: 'test-value' }
      });

      expect(mockExec).toHaveBeenCalled();
      const callOpts = mockExec.mock.calls[0][1] as any;
      expect(callOpts.env.TEST_VAR).toBe('test-value');
    });

    it('should respect timeout', async () => {
      mockExec.mockImplementation((cmd, opts, cb) => {
        cb?.(null, 'output', '');
        return null as any;
      });

      await action.execute({
        code: 'Write-Host test',
        timeout: 5000
      });

      expect(mockExec).toHaveBeenCalled();
      const callOpts = mockExec.mock.calls[0][1] as any;
      expect(callOpts.timeout).toBe(5000);
    });
  });

  describe('Error Handling', () => {
    it('should handle command not found (ENOENT)', async () => {
      const error = new Error('Command not found') as any;
      error.code = 'ENOENT';

      mockExec.mockImplementation((cmd, opts, cb) => {
        cb?.(error, '', 'pwsh: command not found');
        return null as any;
      });

      const result = await action.execute({
        code: 'NonExistent-Cmdlet'
      });

      expect(result.code).toBe(PowerShellErrorCodes.CommandNotFound);
      expect(result.error).toBeDefined();
    });

    it('should handle permission denied (EACCES)', async () => {
      const error = new Error('Permission denied') as any;
      error.code = 'EACCES';

      mockExec.mockImplementation((cmd, opts, cb) => {
        cb?.(error, '', 'Permission denied');
        return null as any;
      });

      const result = await action.execute({
        code: '.\\script.ps1'
      });

      expect(result.code).toBe(PowerShellErrorCodes.PermissionDenied);
      expect(result.error).toBeDefined();
    });

    it('should handle non-zero exit code', async () => {
      const error = new Error('Command failed') as any;
      error.code = 1;

      mockExec.mockImplementation((cmd, opts, cb) => {
        cb?.(error, 'partial output', 'error message');
        return null as any;
      });

      const result = await action.execute({
        code: 'exit 1'
      });

      expect(result.code).toBe(PowerShellErrorCodes.CommandFailed);
      expect(result.error).toBeDefined();
      expect(result.error?.guidance).toContain('Exit code: 1');
    });

    it('should handle timeout', async () => {
      const error = new Error('Timeout') as any;
      error.killed = true;
      error.signal = 'SIGTERM';

      mockExec.mockImplementation((cmd, opts, cb) => {
        cb?.(error, '', '');
        return null as any;
      });

      const result = await action.execute({
        code: 'Start-Sleep -Seconds 100',
        timeout: 100
      });

      expect(result.code).toBe(PowerShellErrorCodes.Timeout);
      expect(result.error).toBeDefined();
    });

    it('should include stdout and stderr in error guidance', async () => {
      const error = new Error('Command failed') as any;
      error.code = 1;

      mockExec.mockImplementation((cmd, opts, cb) => {
        cb?.(error, 'some output', 'error details');
        return null as any;
      });

      const result = await action.execute({
        code: 'failing-command'
      });

      expect(result.error?.guidance).toContain('some output');
      expect(result.error?.guidance).toContain('error details');
    });
  });
});
