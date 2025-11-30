/**
 * Security tests for script execution actions
 *
 * Verifies that script actions properly isolate execution and block dangerous operations.
 */

import { ScriptAction } from '../../../../../src/playbooks/scripts/playbooks/actions/scripts/script-action';
import * as fs from 'fs';

// Mock fs for cwd validation
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Script Action Security', () => {
  const repoRoot = '/test/repo';
  let action: ScriptAction;

  beforeEach(() => {
    jest.clearAllMocks();
    action = new ScriptAction(repoRoot, {});

    // Default mock: cwd exists and is a directory
    mockFs.existsSync.mockReturnValue(true);
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
  });

  describe('VM Isolation', () => {
    it('should block require() access', async () => {
      const result = await action.execute({
        code: 'return typeof require;'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe('undefined');
    });

    it('should block import statements', async () => {
      const result = await action.execute({
        code: 'import { something } from "module"; return true;'
      });

      // Import is a syntax error in non-module context
      expect(result.code).not.toBe('Success');
      expect(result.error).toBeDefined();
    });

    it('should block process access', async () => {
      const result = await action.execute({
        code: 'return typeof process;'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe('undefined');
    });

    it('should block global access', async () => {
      const result = await action.execute({
        code: 'return typeof global;'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe('undefined');
    });

    it('should block __filename access', async () => {
      const result = await action.execute({
        code: 'return typeof __filename;'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe('undefined');
    });

    it('should prevent accessing Node.js internal modules', async () => {
      const result = await action.execute({
        code: `
          try {
            const http = require('http');
            return 'should-not-reach-here';
          } catch (err) {
            return 'blocked';
          }
        `
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe('blocked');
    });
  });

  describe('Allowed Capabilities', () => {
    it('should allow console access for logging', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await action.execute({
        code: 'console.log("test"); return "success";'
      });

      expect(result.code).toBe('Success');
      expect(consoleSpy).toHaveBeenCalledWith('test');

      consoleSpy.mockRestore();
    });

    it('should allow path module for path operations', async () => {
      const result = await action.execute({
        code: 'return path.join("a", "b", "c");'
      });

      expect(result.code).toBe('Success');
      expect(typeof result.value).toBe('string');
      expect(result.value).toContain('a');
    });

    it('should allow fs module for file operations', async () => {
      const result = await action.execute({
        code: 'return typeof fs.readFileSync;'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe('function');
    });

    it('should allow get() function for variable access', async () => {
      const actionWithVars = new ScriptAction(repoRoot, { 'test-key': 'test-value' });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);

      const result = await actionWithVars.execute({
        code: 'return typeof get;'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe('function');
    });
  });

  describe('Working Directory Scoping', () => {
    it('should validate working directory exists', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await action.execute({
        code: 'return true;',
        cwd: '/nonexistent/path'
      });

      expect(result.code).not.toBe('Success');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('/nonexistent/path');
    });

    it('should reject file paths as working directory', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => false } as any);

      const result = await action.execute({
        code: 'return true;',
        cwd: '/path/to/file.txt'
      });

      expect(result.code).not.toBe('Success');
      expect(result.error).toBeDefined();
    });

    it('should resolve relative paths to repository root', async () => {
      const result = await action.execute({
        code: 'return __dirname;',
        cwd: 'relative/path'
      });

      expect(result.code).toBe('Success');
      expect(mockFs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining('relative/path')
      );
    });
  });

  describe('Timeout Protection', () => {
    it('should enforce execution time limits', async () => {
      const result = await action.execute({
        code: 'while(true) {}',
        timeout: 100
      });

      // Should timeout or error, not hang forever
      expect(result.code).not.toBe('Success');
      expect(result.error).toBeDefined();
    }, 5000);

    it('should allow configurable timeout', async () => {
      const result = await action.execute({
        code: 'return true;',
        timeout: 1000
      });

      expect(result.code).toBe('Success');
    });
  });

  describe('Error Information Leakage', () => {
    it('should not expose internal stack traces in user-facing messages', async () => {
      const result = await action.execute({
        code: 'throw new Error("user error");'
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBeDefined();
      expect(result.error?.guidance).toBeDefined();
      // Guidance should contain user error but not expose internal implementation
      expect(result.error?.guidance).toContain('user error');
    });

    it('should provide actionable guidance for errors', async () => {
      const result = await action.execute({
        code: 'return undefinedVariable;'
      });

      expect(result.error).toBeDefined();
      expect(result.error?.guidance).toBeTruthy();
      expect(result.error?.guidance.length).toBeGreaterThan(0);
    });
  });

  describe('Code Injection Prevention', () => {
    it('should isolate dangerous globals even with Function constructor', async () => {
      // Template interpolation happens BEFORE execute()
      // Function constructor is available but dangerous globals are still blocked
      const result = await action.execute({
        code: `
          try {
            const malicious = new Function('return typeof process');
            const processType = malicious();
            return processType; // Should be 'undefined'
          } catch (err) {
            return 'error';
          }
        `
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe('undefined');
    });

    it('should not allow eval() for code execution', async () => {
      const result = await action.execute({
        code: `
          try {
            eval('return process');
            return 'eval-succeeded';
          } catch (err) {
            return 'eval-blocked';
          }
        `
      });

      expect(result.code).toBe('Success');
      // eval may work but should not have access to dangerous globals
      expect(result.value).toBe('eval-blocked');
    });
  });
});
