/**
 * Unit tests for ScriptAction
 *
 * Tests JavaScript execution in isolated VM context with file system access
 * and playbook variable access via get() function.
 */

import { ScriptAction } from '@playbooks/actions/scripts/script-action';
import { ScriptErrorCodes } from '@playbooks/actions/scripts/errors';
import type { StepExecutor } from '@playbooks/types/action';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs for cwd validation tests
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

/**
 * Create a mock StepExecutor with optional variable values
 */
function createMockStepExecutor(variables: Record<string, unknown> = {}): StepExecutor {
  return {
    executeSteps: jest.fn().mockResolvedValue([]),
    getCallStack: jest.fn().mockReturnValue([]),
    getVariable: jest.fn((name: string) => variables[name])
  };
}

describe('ScriptAction', () => {
  const repoRoot = '/test/repo';
  let action: ScriptAction;
  let mockStepExecutor: StepExecutor;
  let cwdSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock process.cwd() to return test repo root
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(repoRoot);

    mockStepExecutor = createMockStepExecutor();
    action = new ScriptAction(mockStepExecutor);

    // Default mock: cwd exists and is a directory
    mockFs.existsSync.mockReturnValue(true);
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  describe('Configuration Validation', () => {
    it('should reject missing code property', async () => {
      const result = await action.execute({ code: '' });

      expect(result.code).toBe(ScriptErrorCodes.ConfigInvalid);
      expect(result.error).toBeDefined();
      expect(result.error?.guidance).toContain('code property is required');
    });

    it('should reject non-string code', async () => {
      const result = await action.execute({ code: 123 as any });

      expect(result.code).toBe(ScriptErrorCodes.ConfigInvalid);
      expect(result.error).toBeDefined();
      expect(result.error?.guidance).toContain('code must be a string');
    });

    it('should reject negative timeout', async () => {
      const result = await action.execute({
        code: 'return 1;',
        timeout: -1
      });

      expect(result.code).toBe(ScriptErrorCodes.ConfigInvalid);
      expect(result.error).toBeDefined();
      expect(result.error?.guidance).toContain('timeout must be >= 0');
    });
  });

  describe('Working Directory Resolution', () => {
    it('should use repository root as default cwd', async () => {
      const result = await action.execute({
        code: 'return __dirname;'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe(repoRoot);
      expect(mockFs.existsSync).toHaveBeenCalledWith(repoRoot);
    });

    it('should resolve relative cwd to repository root', async () => {
      const result = await action.execute({
        code: 'return __dirname;',
        cwd: 'subdir'
      });

      expect(result.code).toBe('Success');
      expect(mockFs.existsSync).toHaveBeenCalledWith(path.join(repoRoot, 'subdir'));
    });

    it('should use absolute cwd as-is', async () => {
      const absolutePath = '/absolute/path';
      const result = await action.execute({
        code: 'return __dirname;',
        cwd: absolutePath
      });

      expect(result.code).toBe('Success');
      expect(mockFs.existsSync).toHaveBeenCalledWith(absolutePath);
    });

    it('should reject non-existent cwd', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await action.execute({
        code: 'return 1;',
        cwd: '/nonexistent'
      });

      expect(result.code).toBe(ScriptErrorCodes.InvalidCwd);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('/nonexistent');
    });

    it('should reject cwd that is not a directory', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => false } as any);

      const result = await action.execute({
        code: 'return 1;',
        cwd: '/file.txt'
      });

      expect(result.code).toBe(ScriptErrorCodes.InvalidCwd);
      expect(result.error).toBeDefined();
    });
  });

  describe('JavaScript Execution', () => {
    it('should execute simple return statement', async () => {
      const result = await action.execute({
        code: 'return 42;'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe(42);
      expect(result.error).toBeUndefined();
    });

    it('should execute multi-line code', async () => {
      const result = await action.execute({
        code: `
          const a = 10;
          const b = 20;
          return a + b;
        `
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe(30);
    });

    it('should support async/await', async () => {
      const result = await action.execute({
        code: `
          const promise = Promise.resolve(100);
          const value = await promise;
          return value;
        `
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe(100);
    });

    it('should return last expression value with return', async () => {
      const result = await action.execute({
        code: `
          const x = 5;
          return x * 2;
        `
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe(10);
    });

    it('should return undefined for code without return', async () => {
      const result = await action.execute({
        code: 'const x = 5;'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBeUndefined();
    });
  });

  describe('Variable Access via get()', () => {
    it('should return undefined for non-existent variables', async () => {
      const result = await action.execute({
        code: 'return get("non-existent");'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBeUndefined();
      expect(mockStepExecutor.getVariable).toHaveBeenCalledWith('non-existent');
    });

    it('should provide get() function in context', async () => {
      const result = await action.execute({
        code: 'return typeof get;'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe('function');
    });

    it('should access variables via stepExecutor.getVariable', async () => {
      const testVariables = {
        'my-var': { foo: 'bar' },
        'step-result': 42
      };
      // Create action with variables - fs mocks already set up in beforeEach
      mockStepExecutor = createMockStepExecutor(testVariables);
      action = new ScriptAction(mockStepExecutor);

      const result = await action.execute({
        code: 'return get("my-var");'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toEqual({ foo: 'bar' });
    });

    it('should access multiple variables', async () => {
      const testVariables = {
        'a': 10,
        'b': 20
      };
      // Create action with variables - fs mocks already set up in beforeEach
      mockStepExecutor = createMockStepExecutor(testVariables);
      action = new ScriptAction(mockStepExecutor);

      const result = await action.execute({
        code: 'return get("a") + get("b");'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe(30);
    });
  });

  describe('Injected Modules', () => {
    it('should provide console for logging', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await action.execute({
        code: 'console.log("test"); return true;'
      });

      expect(result.code).toBe('Success');
      expect(consoleSpy).toHaveBeenCalledWith('test');

      consoleSpy.mockRestore();
    });

    it('should provide path module', async () => {
      const result = await action.execute({
        code: 'return path.join("a", "b", "c");'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe(path.join('a', 'b', 'c'));
    });

    it('should block require()', async () => {
      const result = await action.execute({
        code: 'return typeof require;'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe('undefined');
    });

    it('should block process', async () => {
      const result = await action.execute({
        code: 'return typeof process;'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe('undefined');
    });

    it('should block global', async () => {
      const result = await action.execute({
        code: 'return typeof global;'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe('undefined');
    });
  });

  describe('Error Handling', () => {
    it('should handle syntax errors', async () => {
      const result = await action.execute({
        code: 'return {{{;'
      });

      expect(result.code).toBe(ScriptErrorCodes.SyntaxError);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('syntax error');
    });

    it('should handle runtime errors', async () => {
      const result = await action.execute({
        code: 'throw new Error("test error");'
      });

      expect(result.code).toBe(ScriptErrorCodes.RuntimeError);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Runtime error');
      expect(result.error?.guidance).toContain('test error');
    });

    it('should handle undefined variable access errors', async () => {
      const result = await action.execute({
        code: 'return undefinedVariable;'
      });

      expect(result.code).toBe(ScriptErrorCodes.RuntimeError);
      expect(result.error).toBeDefined();
    });

    it('should include original error details', async () => {
      const result = await action.execute({
        code: 'throw new Error("original error message");'
      });

      expect(result.error?.guidance).toContain('original error message');
      expect(result.error?.cause).toBeDefined();
    });
  });

  describe('Timeout Enforcement', () => {
    it('should enforce timeout limits', async () => {
      const result = await action.execute({
        code: 'while(true) {}',
        timeout: 100
      });

      // VM timeout may result in either Timeout or RuntimeError depending on Node version
      expect([ScriptErrorCodes.Timeout, ScriptErrorCodes.RuntimeError]).toContain(result.code);
      expect(result.error).toBeDefined();
    }, 10000);

    it('should use default timeout when not specified', async () => {
      // This test verifies default timeout exists but doesn't trigger it
      const result = await action.execute({
        code: 'return true;'
      });

      expect(result.code).toBe('Success');
    });

    it('should allow custom timeout', async () => {
      const result = await action.execute({
        code: 'return true;',
        timeout: 60000
      });

      expect(result.code).toBe('Success');
    });
  });

  describe('Complex Scenarios', () => {
    it('should combine path module with other operations', async () => {
      const result = await action.execute({
        code: `
          const testValue = 'test-value';
          const joined = path.join('/', testValue);
          return { testValue, joined };
        `
      });

      expect(result.code).toBe('Success');
      expect(result.value).toEqual({
        testValue: 'test-value',
        joined: path.join('/', 'test-value')
      });
    });

    it('should handle complex return values', async () => {
      const result = await action.execute({
        code: `
          return {
            number: 123,
            string: 'test',
            array: [1, 2, 3],
            object: { nested: true }
          };
        `
      });

      expect(result.code).toBe('Success');
      expect(result.value).toEqual({
        number: 123,
        string: 'test',
        array: [1, 2, 3],
        object: { nested: true }
      });
    });
  });
});
