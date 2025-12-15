/**
 * Tests for OpenAIProvider
 *
 * @req FR:ai-provider-openai/openai
 */

import { OpenAIProvider } from '@ai/providers/openai-provider';
import { CatalystError } from '@core/errors';
import type { AIProviderRequest } from '@ai/types';
import OpenAI from 'openai';

// Mock OpenAI SDK
jest.mock('openai');

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockCreate: jest.Mock;
  let originalEnv: NodeJS.ProcessEnv;

  const createRequest = (overrides?: Partial<AIProviderRequest>): AIProviderRequest => ({
    systemPrompt: 'You are a helpful assistant.',
    prompt: 'Test prompt',
    inactivityTimeout: 60000,
    ...overrides
  });

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Create mock create function
    mockCreate = jest.fn();

    // Create mock OpenAI instance
    const mockOpenAIInstance = {
      chat: {
        completions: {
          create: mockCreate
        }
      }
    };

    // Mock OpenAI constructor
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAIInstance as any);

    // Set API key by default
    process.env.OPENAI_API_KEY = 'test-api-key';

    provider = new OpenAIProvider();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('name property', () => {
    /**
     * @req FR:ai-provider-openai/openai.interface
     */
    it('should have name "openai"', () => {
      expect(provider.name).toBe('openai');
    });
  });

  describe('capabilities property', () => {
    /**
     * @req FR:ai-provider-openai/openai.interface
     */
    it('should have headless capability', () => {
      expect(provider.capabilities).toContain('headless');
    });
  });

  describe('provider instantiation', () => {
    /**
     * @req NFR:ai-provider-openai/openai.performance.instantiation
     */
    it('should complete instantiation quickly (<10ms)', () => {
      const start = performance.now();
      new OpenAIProvider();
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
    });
  });

  describe('isAvailable()', () => {
    /**
     * @req FR:ai-provider-openai/openai.auth.available
     */
    it('should return true when OPENAI_API_KEY is set', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });

    /**
     * @req FR:ai-provider-openai/openai.auth.available
     */
    it('should return false when OPENAI_API_KEY is not set', async () => {
      delete process.env.OPENAI_API_KEY;
      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });

    /**
     * @req NFR:ai-provider-openai/openai.performance.auth-check
     */
    it('should complete quickly (<5ms)', async () => {
      const start = performance.now();
      await provider.isAvailable();
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5);
    });
  });

  describe('signIn()', () => {
    /**
     * @req FR:ai-provider-openai/openai.auth.signin
     * @req FR:ai-provider-openai/openai.errors.auth
     */
    it('should throw AIProviderUnavailable', async () => {
      try {
        await provider.signIn();
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        expect((err as CatalystError).code).toBe('AIProviderUnavailable');
      }
    });

    /**
     * @req FR:ai-provider-openai/openai.auth.signin
     */
    it('should include guidance for obtaining API key', async () => {
      try {
        await provider.signIn();
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.guidance).toContain('OPENAI_API_KEY');
      }
    });

    /**
     * @req FR:ai-provider-openai/openai.auth.signin
     */
    it('should mention API key in error message', async () => {
      try {
        await provider.signIn();
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.message.toLowerCase()).toContain('api key');
      }
    });
  });

  describe('execute() - message mapping', () => {
    /**
     * @req FR:ai-provider-openai/openai.execute
     */
    it('should map systemPrompt to system message role', async () => {
      mockCreate.mockResolvedValue({
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      } as any);

      await provider.execute(createRequest({
        systemPrompt: 'You are a code generator.'
      }));

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: 'You are a code generator.'
            })
          ])
        }),
        expect.anything()
      );
    });

    /**
     * @req FR:ai-provider-openai/openai.execute
     */
    it('should map prompt to user message role', async () => {
      mockCreate.mockResolvedValue({
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      } as any);

      await provider.execute(createRequest({
        prompt: 'Generate a hello world function'
      }));

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Generate a hello world function'
            })
          ])
        }),
        expect.anything()
      );
    });

    /**
     * @req FR:ai-provider-openai/openai.execute
     */
    it('should have messages in correct order (system, then user)', async () => {
      mockCreate.mockResolvedValue({
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      } as any);

      await provider.execute(createRequest());

      const call = mockCreate.mock.calls[0][0];
      expect(call.messages[0].role).toBe('system');
      expect(call.messages[1].role).toBe('user');
    });
  });

  describe('execute() - model selection', () => {
    /**
     * @req FR:ai-provider-openai/openai.models
     */
    it('should use request.model when provided', async () => {
      mockCreate.mockResolvedValue({
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4-turbo',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      } as any);

      await provider.execute(createRequest({ model: 'gpt-4-turbo' }));

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo'
        }),
        expect.anything()
      );
    });

    /**
     * @req FR:ai-provider-openai/openai.models
     */
    it('should use fallback model when undefined', async () => {
      mockCreate.mockResolvedValue({
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      } as any);

      await provider.execute(createRequest({ model: undefined }));

      const call = mockCreate.mock.calls[0][0];
      expect(call.model).toBe('gpt-4o');
    });
  });

  describe('execute() - parameter mapping', () => {
    /**
     * @req FR:ai-provider-openai/openai.execute
     */
    it('should map maxTokens to max_tokens', async () => {
      mockCreate.mockResolvedValue({
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      } as any);

      await provider.execute(createRequest({ maxTokens: 500 }));

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 500
        }),
        expect.anything()
      );
    });

    /**
     * @req FR:ai-provider-openai/openai.execute
     */
    it('should respect abortSignal for cancellation', async () => {
      const controller = new AbortController();

      mockCreate.mockResolvedValue({
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      } as any);

      await provider.execute(createRequest({ abortSignal: controller.signal }));

      expect(mockCreate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          signal: controller.signal
        })
      );
    });
  });

  describe('execute() - token usage', () => {
    /**
     * @req FR:ai-provider-openai/openai.usage.tokens
     */
    it('should extract inputTokens from prompt_tokens', async () => {
      mockCreate.mockResolvedValue({
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 250,
          total_tokens: 400
        }
      } as any);

      const response = await provider.execute(createRequest());

      expect(response.usage?.inputTokens).toBe(150);
    });

    /**
     * @req FR:ai-provider-openai/openai.usage.tokens
     */
    it('should extract outputTokens from completion_tokens', async () => {
      mockCreate.mockResolvedValue({
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 250,
          total_tokens: 400
        }
      } as any);

      const response = await provider.execute(createRequest());

      expect(response.usage?.outputTokens).toBe(250);
    });

    /**
     * @req FR:ai-provider-openai/openai.usage.tokens
     */
    it('should extract totalTokens from total_tokens', async () => {
      mockCreate.mockResolvedValue({
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 250,
          total_tokens: 400
        }
      } as any);

      const response = await provider.execute(createRequest());

      expect(response.usage?.totalTokens).toBe(400);
    });

    /**
     * @req FR:ai-provider-openai/openai.usage.tokens
     */
    it('should include all three token metrics', async () => {
      mockCreate.mockResolvedValue({
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300
        }
      } as any);

      const response = await provider.execute(createRequest());

      expect(response.usage).toEqual({
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300
      });
    });
  });

  describe('execute() - response mapping', () => {
    /**
     * @req FR:ai-provider-openai/openai.execute
     */
    it('should extract content from SDK response', async () => {
      mockCreate.mockResolvedValue({
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Generated content here' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      } as any);

      const response = await provider.execute(createRequest());

      expect(response.content).toBe('Generated content here');
    });

    /**
     * @req FR:ai-provider-openai/openai.execute
     */
    it('should include model name in response', async () => {
      mockCreate.mockResolvedValue({
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4-turbo',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      } as any);

      const response = await provider.execute(createRequest());

      expect(response.model).toBe('gpt-4-turbo');
    });

    /**
     * @req FR:ai-provider-openai/openai.execute
     */
    it('should include usage stats in response', async () => {
      mockCreate.mockResolvedValue({
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 100,
          total_tokens: 150
        }
      } as any);

      const response = await provider.execute(createRequest());

      expect(response.usage).toBeDefined();
      expect(response.usage?.inputTokens).toBe(50);
      expect(response.usage?.outputTokens).toBe(100);
      expect(response.usage?.totalTokens).toBe(150);
    });
  });

  describe('execute() - error handling', () => {
    /**
     * @req FR:ai-provider-openai/openai.errors.auth
     */
    it('should throw AIProviderUnavailable for authentication errors', async () => {
      const authError = new Error('Invalid API key');
      (authError as any).status = 401;
      mockCreate.mockRejectedValue(authError);

      await expect(provider.execute(createRequest())).rejects.toThrow(CatalystError);
    });

    /**
     * @req FR:ai-provider-openai/openai.errors.auth
     */
    it('should include API key guidance in authentication errors', async () => {
      const authError = new Error('Invalid API key');
      (authError as any).status = 401;
      mockCreate.mockRejectedValue(authError);

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.guidance?.toLowerCase()).toContain('openai_api_key');
      }
    });

    /**
     * @req FR:ai-provider-openai/openai.errors.rate-limit
     */
    it('should include retry guidance for rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      (rateLimitError as any).headers = { 'retry-after': '60' };
      mockCreate.mockRejectedValue(rateLimitError);

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.message.toLowerCase()).toMatch(/rate limit|retry/);
      }
    });

    /**
     * @req FR:ai-provider-openai/openai.errors.rate-limit
     */
    it('should extract retry-after header if available', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      (rateLimitError as any).headers = { 'retry-after': '120' };
      mockCreate.mockRejectedValue(rateLimitError);

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.guidance).toContain('120');
      }
    });

    /**
     * @req FR:ai-provider-openai/openai.errors.model
     */
    it('should be descriptive for invalid model errors', async () => {
      const modelError = new Error('Invalid model: unknown-model');
      (modelError as any).status = 404;
      mockCreate.mockRejectedValue(modelError);

      try {
        await provider.execute(createRequest({ model: 'unknown-model' }));
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.message.toLowerCase()).toContain('model');
      }
    });

    /**
     * General error handling
     *
     * @req FR:ai-provider-openai/openai.errors
     */
    it('should wrap unexpected errors in CatalystError', async () => {
      const unexpectedError = new Error('Network timeout');
      mockCreate.mockRejectedValue(unexpectedError);

      await expect(provider.execute(createRequest())).rejects.toThrow(CatalystError);
    });

    /**
     * General error handling
     *
     * @req FR:ai-provider-openai/openai.errors
     */
    it('should preserve original error message', async () => {
      const unexpectedError = new Error('Connection refused');
      mockCreate.mockRejectedValue(unexpectedError);

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.message).toContain('Connection refused');
      }
    });

    /**
     * General error handling
     *
     * @req FR:ai-provider-openai/openai.execute
     */
    it('should handle cancellation via abortSignal', async () => {
      const controller = new AbortController();
      const abortError = new Error('Request aborted');
      (abortError as any).name = 'AbortError';

      mockCreate.mockRejectedValue(abortError);

      controller.abort();

      try {
        await provider.execute(createRequest({ abortSignal: controller.signal }));
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.message.toLowerCase()).toMatch(/abort|cancel/);
      }
    });
  });
});
