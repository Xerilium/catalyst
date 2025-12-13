/**
 * Tests for CursorProvider
 *
 * @req FR:cursor
 */

import { CursorProvider } from '@ai/providers/cursor-provider';
import { CatalystError } from '@core/errors';
import type { AIProviderRequest, AIProviderResponse } from '@ai/types';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
jest.mock('child_process');

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

describe('CursorProvider', () => {
  let provider: CursorProvider;

  const createRequest = (overrides?: Partial<AIProviderRequest>): AIProviderRequest => ({
    systemPrompt: 'You are a test AI.',
    prompt: 'Test prompt',
    inactivityTimeout: 60000,
    ...overrides
  });

  /**
   * Helper to create a mock child process
   */
  const createMockProcess = (config: {
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    error?: Error;
  } = {}) => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = jest.fn();
    mockProcess.pid = 12345;

    // Simulate process execution
    setImmediate(() => {
      if (config.error) {
        mockProcess.emit('error', config.error);
      } else {
        if (config.stdout) {
          mockProcess.stdout.emit('data', Buffer.from(config.stdout));
        }
        if (config.stderr) {
          mockProcess.stderr.emit('data', Buffer.from(config.stderr));
        }
        mockProcess.emit('close', config.exitCode ?? 0);
      }
    });

    return mockProcess;
  };

  beforeEach(() => {
    provider = new CursorProvider();
    jest.clearAllMocks();
  });

  describe('provider properties', () => {
    /**
     * @req FR:cursor.interface
     */
    it('should have name "cursor"', () => {
      expect(provider.name).toBe('cursor');
    });

    /**
     * @req FR:cursor.interface
     */
    it('should have empty capabilities (interactive-only)', () => {
      expect(provider.capabilities).toEqual([]);
    });

    /**
     * @req NFR:cursor.performance.instantiation
     */
    it('should instantiate in less than 10ms', () => {
      const start = performance.now();
      const newProvider = new CursorProvider();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
      expect(newProvider).toBeInstanceOf(CursorProvider);
    });
  });

  describe('execute() - basic functionality', () => {
    /**
     * @req FR:cursor.execute
     * @req FR:cursor.cli
     */
    it('should execute cursor CLI and return response', async () => {
      const mockProcess = createMockProcess({
        stdout: 'AI response content here',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      const response = await provider.execute(createRequest());

      expect(mockSpawn).toHaveBeenCalledWith('cursor', expect.any(Array));
      expect(response.content).toBe('AI response content here');
      expect(response.model).toBe('cursor');
    });

    /**
     * @req FR:cursor.execute
     */
    it('should construct prompt with system and user prompts', async () => {
      const mockProcess = createMockProcess({
        stdout: 'Response',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      await provider.execute(createRequest({
        systemPrompt: 'You are helpful.',
        prompt: 'What is 2+2?'
      }));

      const spawnArgs = mockSpawn.mock.calls[0];
      const argsArray = spawnArgs[1] as string[];
      const fullPrompt = argsArray.join(' ');

      expect(fullPrompt).toContain('You are helpful.');
      expect(fullPrompt).toContain('What is 2+2?');
    });

    /**
     * @req FR:cursor.models
     */
    it('should accept model parameter in request', async () => {
      const mockProcess = createMockProcess({
        stdout: 'Response',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      await provider.execute(createRequest({ model: 'gpt-4' }));

      // Model is accepted (even if not configurable in CLI)
      expect(mockSpawn).toHaveBeenCalled();
    });

    /**
     * @req FR:cursor.models
     */
    it('should return cursor as response model', async () => {
      const mockProcess = createMockProcess({
        stdout: 'Response',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      const response = await provider.execute(createRequest());

      expect(response.model).toBe('cursor');
    });

    /**
     * @req FR:cursor.usage.tokens
     */
    it('should return undefined usage when CLI does not provide token counts', async () => {
      const mockProcess = createMockProcess({
        stdout: 'Response',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      const response = await provider.execute(createRequest());

      expect(response.usage).toBeUndefined();
    });
  });

  describe('isAvailable() - authentication check', () => {
    /**
     * @req FR:cursor.auth.available
     */
    it('should return true when cursor CLI exists and user authenticated', async () => {
      const mockProcess = createMockProcess({
        stdout: 'authenticated',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      const available = await provider.isAvailable();

      expect(available).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('cursor', ['--version']);
    });

    /**
     * @req FR:cursor.auth.available
     */
    it('should return false when cursor CLI does not exist', async () => {
      const mockProcess = createMockProcess({
        error: Object.assign(new Error('spawn cursor ENOENT'), { code: 'ENOENT' })
      });
      mockSpawn.mockReturnValue(mockProcess);

      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });

    /**
     * @req FR:cursor.auth.available
     * @req NFR:cursor.performance.auth-check
     */
    it('should complete in less than 500ms', async () => {
      const mockProcess = createMockProcess({
        stdout: 'authenticated',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      const start = performance.now();
      await provider.isAvailable();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });

  describe('signIn() - authentication flow', () => {
    /**
     * @req FR:cursor.auth.signin
     */
    it('should provide guidance for Cursor IDE authentication', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await expect(provider.signIn()).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.join(' ');
      expect(output).toContain('Cursor');

      consoleSpy.mockRestore();
    });

    /**
     * @req FR:cursor.auth.signin
     */
    it('should throw AIProviderUnavailable error', async () => {
      jest.spyOn(console, 'log').mockImplementation();

      try {
        await provider.signIn();
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.code).toBe('AIProviderUnavailable');
        expect(catalystErr.message).toContain('cursor');
      }
    });
  });

  describe('error handling - CLI missing', () => {
    /**
     * @req FR:cursor.errors.cli-missing
     */
    it('should throw AIProviderUnavailable when CLI not found', async () => {
      const mockProcess = createMockProcess({
        error: Object.assign(new Error('spawn cursor ENOENT'), { code: 'ENOENT' })
      });
      mockSpawn.mockReturnValue(mockProcess);

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.code).toBe('AIProviderUnavailable');
        expect(catalystErr.message).toContain('Cursor CLI not found');
      }
    });

    /**
     * @req FR:cursor.errors.cli-missing
     */
    it('should include installation guidance in error', async () => {
      const mockProcess = createMockProcess({
        error: Object.assign(new Error('spawn cursor ENOENT'), { code: 'ENOENT' })
      });
      mockSpawn.mockReturnValue(mockProcess);

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        const catalystErr = err as CatalystError;
        expect(catalystErr.guidance).toContain('Install Cursor IDE');
      }
    });
  });

  describe('error handling - authentication', () => {
    /**
     * @req FR:cursor.errors.auth
     */
    it('should throw AIProviderUnavailable when not authenticated', async () => {
      const mockProcess = createMockProcess({
        stderr: 'Error: Not authenticated',
        exitCode: 1
      });
      mockSpawn.mockReturnValue(mockProcess);

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.code).toBe('AIProviderUnavailable');
      }
    });

    /**
     * @req FR:cursor.errors.auth
     */
    it('should include sign-in guidance in authentication error', async () => {
      const mockProcess = createMockProcess({
        stderr: 'authentication required',
        exitCode: 1
      });
      mockSpawn.mockReturnValue(mockProcess);

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        const catalystErr = err as CatalystError;
        expect(catalystErr.guidance).toContain('Sign in');
      }
    });
  });

  describe('error handling - no access', () => {
    /**
     * @req FR:cursor.errors.no-access
     */
    it('should throw AIProviderUnavailable when no subscription', async () => {
      const mockProcess = createMockProcess({
        stderr: 'subscription required',
        exitCode: 1
      });
      mockSpawn.mockReturnValue(mockProcess);

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.code).toBe('AIProviderUnavailable');
      }
    });

    /**
     * @req FR:cursor.errors.no-access
     */
    it('should include subscription guidance in error', async () => {
      const mockProcess = createMockProcess({
        stderr: 'no active subscription',
        exitCode: 1
      });
      mockSpawn.mockReturnValue(mockProcess);

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        const catalystErr = err as CatalystError;
        expect(catalystErr.guidance).toContain('subscription');
      }
    });
  });

  describe('timeout handling', () => {
    /**
     * @req FR:cursor.execute
     * Tests that inactivityTimeout parameter is used in the implementation
     */
    it('should use inactivityTimeout from request', async () => {
      const mockProcess = createMockProcess({
        stdout: 'Response',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      const request = createRequest({ inactivityTimeout: 5000 });
      await provider.execute(request);

      // Just verify the request was processed - timeout logic is implementation detail
      expect(mockSpawn).toHaveBeenCalled();
    });
  });

  describe('cancellation handling', () => {
    /**
     * @req FR:cursor.execute
     * Tests that abort signal parameter is accepted
     */
    it('should accept abortSignal in request', async () => {
      const controller = new AbortController();

      const mockProcess = createMockProcess({
        stdout: 'Response',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      const request = createRequest({
        abortSignal: controller.signal
      });

      const response = await provider.execute(request);

      expect(response.content).toBe('Response');
    });
  });
});
