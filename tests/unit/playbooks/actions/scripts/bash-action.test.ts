/**
 * Unit tests for BashAction
 *
 * Tests Bash script execution via child_process with proper environment
 * and working directory management.
 */

import { BashAction } from '@playbooks/actions/scripts/bash-action';
import { BashErrorCodes } from '@playbooks/actions/scripts/errors';
import { exec } from 'child_process';
import * as fs from 'fs';

// Mock child_process and fs
jest.mock('child_process');
jest.mock('fs');

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockFs = fs as jest.Mocked<typeof fs>;

/**
 * @req FR:playbook-actions-scripts/shell.bash
 * @req FR:playbook-actions-scripts/shell.execution
 * @req FR:playbook-actions-scripts/common.template-interpolation
 * @req FR:playbook-actions-scripts/common.validation
 * @req FR:playbook-actions-scripts/common.working-directory
 * @req FR:playbook-actions-scripts/common.timeout
 * @req NFR:playbook-actions-scripts/testability.isolation
 * @req NFR:playbook-actions-scripts/testability.success-coverage
 */
describe('BashAction', () => {
  const repoRoot = '/test/repo';
  let action: BashAction;

  beforeEach(() => {
    jest.clearAllMocks();
    action = new BashAction(repoRoot);

    // Default mock: cwd exists and is a directory
    mockFs.existsSync.mockReturnValue(true);
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
  });

  describe('Configuration Validation', () => {
    it('should reject missing code property', async () => {
      const result = await action.execute({ code: '' });

      expect(result.code).toBe(BashErrorCodes.ConfigInvalid);
      expect(result.error).toBeDefined();
      expect(result.error?.guidance).toContain('code property is required');
    });

    it('should reject non-string code', async () => {
      const result = await action.execute({ code: 123 as any });

      expect(result.code).toBe(BashErrorCodes.ConfigInvalid);
      expect(result.error).toBeDefined();
    });

    it('should reject negative timeout', async () => {
      const result = await action.execute({
        code: 'echo test',
        timeout: -1
      });

      expect(result.code).toBe(BashErrorCodes.ConfigInvalid);
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
      await action.execute({ code: 'echo test' });

      expect(mockExec).toHaveBeenCalled();
      const callOpts = mockExec.mock.calls[0][1] as any;
      expect(callOpts.cwd).toBe(repoRoot);
    });

    it('should resolve relative cwd', async () => {
      await action.execute({
        code: 'echo test',
        cwd: 'subdir'
      });

      expect(mockExec).toHaveBeenCalled();
      const callOpts = mockExec.mock.calls[0][1] as any;
      expect(callOpts.cwd).toContain('subdir');
    });

    it('should reject non-existent cwd', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await action.execute({
        code: 'echo test',
        cwd: '/nonexistent'
      });

      expect(result.code).toBe(BashErrorCodes.InvalidCwd);
      expect(result.error).toBeDefined();
    });
  });

  describe('Bash Execution', () => {
    it('should execute simple bash command', async () => {
      mockExec.mockImplementation((cmd, opts, cb) => {
        cb?.(null, 'hello world', '');
        return null as any;
      });

      const result = await action.execute({
        code: 'echo "hello world"'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toEqual({
        stdout: 'hello world',
        stderr: '',
        exitCode: 0
      });
    });

    it('should use bash shell', async () => {
      mockExec.mockImplementation((cmd, opts, cb) => {
        cb?.(null, 'output', '');
        return null as any;
      });

      await action.execute({ code: 'echo test' });

      expect(mockExec).toHaveBeenCalled();
      const callOpts = mockExec.mock.calls[0][1] as any;
      expect(callOpts.shell).toBe('bash');
    });

    it('should capture stderr', async () => {
      mockExec.mockImplementation((cmd, opts, cb) => {
        cb?.(null, 'stdout', 'stderr content');
        return null as any;
      });

      const result = await action.execute({
        code: 'echo test >&2'
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
        code: 'echo $TEST_VAR',
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
        code: 'echo test',
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
        cb?.(error, '', 'bash: command not found');
        return null as any;
      });

      const result = await action.execute({
        code: 'nonexistent-command'
      });

      expect(result.code).toBe(BashErrorCodes.CommandNotFound);
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
        code: './script.sh'
      });

      expect(result.code).toBe(BashErrorCodes.PermissionDenied);
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

      expect(result.code).toBe(BashErrorCodes.CommandFailed);
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
        code: 'sleep 100',
        timeout: 100
      });

      expect(result.code).toBe(BashErrorCodes.Timeout);
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
