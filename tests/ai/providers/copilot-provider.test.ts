/**
 * Tests for CopilotProvider
 *
 * @req FR:copilot
 */

import { CopilotProvider } from '../../../src/playbooks/scripts/ai/providers/copilot-provider';
import { CatalystError } from '../../../src/playbooks/scripts/errors';
import type { AIProviderRequest, AIProviderResponse } from '../../../src/playbooks/scripts/ai/providers/types';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
jest.mock('child_process');

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

describe('CopilotProvider', () => {
  let provider: CopilotProvider;

  const createRequest = (overrides?: Partial<AIProviderRequest>): AIProviderRequest => ({
    systemPrompt: 'You are a test AI.',
    prompt: 'Test prompt',
    inactivityTimeout: 60000,
    ...overrides
  });

  // Helper to create a mock child process
  const createMockProcess = (options: {
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    error?: Error;
  } = {}) => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.stdin = {
      write: jest.fn(),
      end: jest.fn()
    };
    mockProcess.kill = jest.fn();

    // Simulate process execution - use setImmediate to ensure listeners are attached
    setImmediate(() => {
      if (options.error) {
        // For ENOENT errors, emit 'error' event
        const error = options.error as NodeJS.ErrnoException;
        if (error.message.includes('ENOENT')) {
          error.code = 'ENOENT';
        }
        mockProcess.emit('error', error);
      } else {
        if (options.stdout) {
          mockProcess.stdout.emit('data', Buffer.from(options.stdout));
        }
        if (options.stderr) {
          mockProcess.stderr.emit('data', Buffer.from(options.stderr));
        }
        mockProcess.emit('close', options.exitCode ?? 0);
      }
    });

    return mockProcess;
  };

  beforeEach(() => {
    provider = new CopilotProvider();
    jest.clearAllMocks();
  });

  describe('provider properties', () => {
    /**
     * @req FR:copilot.interface
     */
    it('should have name "copilot"', () => {
      expect(provider.name).toBe('copilot');
    });

    /**
     * @req FR:copilot.interface
     */
    it('should have empty capabilities (interactive-only)', () => {
      expect(provider.capabilities).toEqual([]);
    });
  });

  describe('isAvailable()', () => {
    /**
     * @req FR:copilot.auth.available
     */
    it('should return true when all checks pass', async () => {
      // Mock gh command exists
      mockSpawn.mockReturnValueOnce(createMockProcess({ exitCode: 0 }));
      // Mock gh auth status
      mockSpawn.mockReturnValueOnce(createMockProcess({ stdout: 'Logged in', exitCode: 0 }));
      // Mock gh extension list
      mockSpawn.mockReturnValueOnce(createMockProcess({ stdout: 'gh-copilot', exitCode: 0 }));
      // Mock gh copilot test
      mockSpawn.mockReturnValueOnce(createMockProcess({ exitCode: 0 }));

      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });

    /**
     * @req FR:copilot.auth.available
     * @req FR:copilot.errors.cli-missing
     */
    it('should return false when GitHub CLI not found', async () => {
      mockSpawn.mockReturnValueOnce(createMockProcess({
        error: new Error('ENOENT')
      }));

      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });

    /**
     * @req FR:copilot.auth.available
     * @req FR:copilot.errors.auth
     */
    it('should return false when not authenticated', async () => {
      // Mock gh command exists
      mockSpawn.mockReturnValueOnce(createMockProcess({ exitCode: 0 }));
      // Mock gh auth status fails
      mockSpawn.mockReturnValueOnce(createMockProcess({
        stderr: 'Not logged in',
        exitCode: 1
      }));

      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });

    /**
     * @req FR:copilot.auth.available
     * @req FR:copilot.errors.extension-missing
     */
    it('should return false when Copilot extension missing', async () => {
      // Mock gh command exists
      mockSpawn.mockReturnValueOnce(createMockProcess({ exitCode: 0 }));
      // Mock gh auth status
      mockSpawn.mockReturnValueOnce(createMockProcess({ stdout: 'Logged in', exitCode: 0 }));
      // Mock gh extension list without copilot
      mockSpawn.mockReturnValueOnce(createMockProcess({
        stdout: 'gh-other-extension',
        exitCode: 0
      }));

      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });

    /**
     * @req FR:copilot.auth.available
     * @req FR:copilot.errors.no-access
     */
    it('should return false when no Copilot subscription', async () => {
      // Mock gh command exists
      mockSpawn.mockReturnValueOnce(createMockProcess({ exitCode: 0 }));
      // Mock gh auth status
      mockSpawn.mockReturnValueOnce(createMockProcess({ stdout: 'Logged in', exitCode: 0 }));
      // Mock gh extension list
      mockSpawn.mockReturnValueOnce(createMockProcess({ stdout: 'gh-copilot', exitCode: 0 }));
      // Mock gh copilot test fails (no subscription)
      mockSpawn.mockReturnValueOnce(createMockProcess({
        stderr: 'No Copilot access',
        exitCode: 1
      }));

      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('signIn()', () => {
    /**
     * @req FR:copilot.auth.signin
     * @req FR:copilot.errors.cli-missing
     */
    it('should throw AIProviderUnavailable when CLI not found', async () => {
      mockSpawn.mockReturnValueOnce(createMockProcess({
        error: new Error('ENOENT')
      }));

      try {
        await provider.signIn();
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        expect((err as CatalystError).message).toContain('GitHub CLI not found');
      }
    });

    /**
     * @req FR:copilot.auth.signin
     * @req FR:copilot.errors.auth
     */
    it('should prompt authentication when not authenticated', async () => {
      // Mock gh command exists
      mockSpawn.mockReturnValueOnce(createMockProcess({ exitCode: 0 }));
      // Mock gh auth status fails
      mockSpawn.mockReturnValueOnce(createMockProcess({
        stderr: 'Not logged in',
        exitCode: 1
      }));

      try {
        await provider.signIn();
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        expect((err as CatalystError).message).toContain('Not authenticated');
      }
    });

    /**
     * @req FR:copilot.auth.signin
     * @req FR:copilot.errors.extension-missing
     */
    it('should prompt extension installation when missing', async () => {
      // Mock gh command exists
      mockSpawn.mockReturnValueOnce(createMockProcess({ exitCode: 0 }));
      // Mock gh auth status
      mockSpawn.mockReturnValueOnce(createMockProcess({ stdout: 'Logged in', exitCode: 0 }));
      // Mock gh extension list without copilot
      mockSpawn.mockReturnValueOnce(createMockProcess({
        stdout: 'gh-other',
        exitCode: 0
      }));

      try {
        await provider.signIn();
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        expect((err as CatalystError).message).toContain('Copilot extension not installed');
      }
    });

    /**
     * @req FR:copilot.auth.signin
     * @req FR:copilot.errors.no-access
     */
    it('should throw when no Copilot subscription', async () => {
      // Mock gh command exists
      mockSpawn.mockReturnValueOnce(createMockProcess({ exitCode: 0 }));
      // Mock gh auth status
      mockSpawn.mockReturnValueOnce(createMockProcess({ stdout: 'Logged in', exitCode: 0 }));
      // Mock gh extension list
      mockSpawn.mockReturnValueOnce(createMockProcess({ stdout: 'gh-copilot', exitCode: 0 }));
      // Mock gh copilot test fails
      mockSpawn.mockReturnValueOnce(createMockProcess({
        stderr: 'No access',
        exitCode: 1
      }));

      try {
        await provider.signIn();
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        expect((err as CatalystError).message).toContain('No Copilot subscription');
      }
    });

    /**
     * @req FR:copilot.auth.signin
     */
    it('should complete successfully when all prerequisites met', async () => {
      // Mock gh command exists
      mockSpawn.mockReturnValueOnce(createMockProcess({ exitCode: 0 }));
      // Mock gh auth status
      mockSpawn.mockReturnValueOnce(createMockProcess({ stdout: 'Logged in', exitCode: 0 }));
      // Mock gh extension list
      mockSpawn.mockReturnValueOnce(createMockProcess({ stdout: 'gh-copilot', exitCode: 0 }));
      // Mock gh copilot test
      mockSpawn.mockReturnValueOnce(createMockProcess({ exitCode: 0 }));

      await expect(provider.signIn()).resolves.not.toThrow();
    });
  });

  describe('execute()', () => {
    /**
     * @req FR:copilot.execute
     */
    it('should return AIProviderResponse on success', async () => {
      const mockOutput = 'This is the Copilot response';
      mockSpawn.mockReturnValueOnce(createMockProcess({
        stdout: mockOutput,
        exitCode: 0
      }));

      const request = createRequest();
      const response = await provider.execute(request);

      expect(response).toMatchObject({
        content: mockOutput,
        model: 'copilot'
      });
    });

    /**
     * @req FR:copilot.execute
     * @req FR:copilot.cli
     */
    it('should combine systemPrompt and prompt correctly', async () => {
      mockSpawn.mockReturnValueOnce(createMockProcess({
        stdout: 'Response',
        exitCode: 0
      }));

      const request = createRequest({
        systemPrompt: 'System context',
        prompt: 'User query'
      });
      await provider.execute(request);

      // Verify stdin was written with combined prompt
      const mockProcess = mockSpawn.mock.results[0].value;
      expect(mockProcess.stdin.write).toHaveBeenCalled();
      const writtenData = mockProcess.stdin.write.mock.calls[0][0];
      expect(writtenData).toContain('System context');
      expect(writtenData).toContain('User query');
    });

    /**
     * @req FR:copilot.cli
     */
    it('should invoke gh copilot command', async () => {
      mockSpawn.mockReturnValueOnce(createMockProcess({
        stdout: 'Response',
        exitCode: 0
      }));

      await provider.execute(createRequest());

      expect(mockSpawn).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['copilot']),
        expect.any(Object)
      );
    });

    /**
     * @req FR:copilot.models
     */
    it('should always return model as "copilot"', async () => {
      mockSpawn.mockReturnValueOnce(createMockProcess({
        stdout: 'Response',
        exitCode: 0
      }));

      const response = await provider.execute(createRequest({ model: 'gpt-4' }));
      expect(response.model).toBe('copilot');
    });

    /**
     * @req FR:copilot.usage.tokens
     */
    it('should set usage to undefined (CLI limitation)', async () => {
      mockSpawn.mockReturnValueOnce(createMockProcess({
        stdout: 'Response',
        exitCode: 0
      }));

      const response = await provider.execute(createRequest());
      expect(response.usage).toBeUndefined();
    });

    /**
     * @req FR:copilot.execute
     * Tests that inactivityTimeout parameter is accepted
     */
    it('should handle inactivity timeout', async () => {
      mockSpawn.mockReturnValueOnce(createMockProcess({
        stdout: 'Response',
        exitCode: 0
      }));

      const request = createRequest({ inactivityTimeout: 5000 });
      const response = await provider.execute(request);

      // Verify request completed (timeout didn't trigger because response came quickly)
      expect(response.content).toBe('Response');
    });

    /**
     * @req FR:copilot.execute
     * Tests that abortSignal parameter is accepted
     */
    it('should handle abort signal', async () => {
      mockSpawn.mockReturnValueOnce(createMockProcess({
        stdout: 'Response',
        exitCode: 0
      }));

      const abortController = new AbortController();
      const request = createRequest({ abortSignal: abortController.signal });

      // Don't abort, verify normal completion
      const response = await provider.execute(request);
      expect(response.content).toBe('Response');
    });

    /**
     * @req FR:copilot.execute
     */
    it('should throw CatalystError on CLI execution error', async () => {
      mockSpawn.mockReturnValueOnce(createMockProcess({
        stderr: 'CLI error occurred',
        exitCode: 1
      }));

      await expect(provider.execute(createRequest())).rejects.toThrow(CatalystError);
    });

    /**
     * @req FR:copilot.errors.cli-missing
     */
    it('should throw AIProviderUnavailable when CLI not found during execution', async () => {
      mockSpawn.mockReturnValueOnce(createMockProcess({
        error: new Error('ENOENT')
      }));

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        expect((err as CatalystError).message).toContain('GitHub CLI not found');
      }
    });
  });

  describe('error handling', () => {
    /**
     * @req FR:copilot.errors.cli-missing
     */
    it('should provide CLI installation guidance in error', async () => {
      mockSpawn.mockReturnValueOnce(createMockProcess({
        error: new Error('ENOENT')
      }));

      try {
        await provider.signIn();
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.guidance).toContain('Install GitHub CLI');
      }
    });

    /**
     * @req FR:copilot.errors.extension-missing
     */
    it('should provide extension installation guidance in error', async () => {
      // Mock gh command exists
      mockSpawn.mockReturnValueOnce(createMockProcess({ exitCode: 0 }));
      // Mock gh auth status
      mockSpawn.mockReturnValueOnce(createMockProcess({ stdout: 'Logged in', exitCode: 0 }));
      // Mock gh extension list without copilot
      mockSpawn.mockReturnValueOnce(createMockProcess({
        stdout: '',
        exitCode: 0
      }));

      try {
        await provider.signIn();
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.guidance).toContain('gh extension install');
      }
    });

    /**
     * @req FR:copilot.errors.auth
     */
    it('should provide authentication guidance in error', async () => {
      // Mock gh command exists
      mockSpawn.mockReturnValueOnce(createMockProcess({ exitCode: 0 }));
      // Mock gh auth status fails
      mockSpawn.mockReturnValueOnce(createMockProcess({
        stderr: 'Not logged in',
        exitCode: 1
      }));

      try {
        await provider.signIn();
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.guidance).toContain('gh auth login');
      }
    });

    /**
     * @req FR:copilot.errors.no-access
     */
    it('should explain subscription requirement in error', async () => {
      // Mock gh command exists
      mockSpawn.mockReturnValueOnce(createMockProcess({ exitCode: 0 }));
      // Mock gh auth status
      mockSpawn.mockReturnValueOnce(createMockProcess({ stdout: 'Logged in', exitCode: 0 }));
      // Mock gh extension list
      mockSpawn.mockReturnValueOnce(createMockProcess({ stdout: 'gh-copilot', exitCode: 0 }));
      // Mock gh copilot test fails
      mockSpawn.mockReturnValueOnce(createMockProcess({
        stderr: 'No access',
        exitCode: 1
      }));

      try {
        await provider.signIn();
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.guidance).toContain('subscription');
      }
    });
  });
});
