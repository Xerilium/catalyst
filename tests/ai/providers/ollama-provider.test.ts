/**
 * Tests for OllamaProvider
 */

import { OllamaProvider } from '@ai/providers/ollama-provider';
import { CatalystError } from '@core/errors';
import type { AIProviderRequest, AIProviderResponse } from '@ai/types';

// Mock the ollama SDK
jest.mock('ollama', () => {
  return {
    Ollama: jest.fn().mockImplementation(() => ({
      chat: jest.fn(),
      list: jest.fn()
    }))
  };
});

/**
 * @req FR:ai-provider-ollama/ollama
 */
describe('OllamaProvider', () => {
  let provider: OllamaProvider;
  let mockOllamaInstance: any;

  const createRequest = (overrides?: Partial<AIProviderRequest>): AIProviderRequest => ({
    systemPrompt: 'You are a helpful assistant.',
    prompt: 'Test prompt',
    inactivityTimeout: 60000,
    ...overrides
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Import the mocked Ollama class
    const { Ollama } = require('ollama');

    // Create provider (which will create a new Ollama instance)
    provider = new OllamaProvider();

    // Get the mock instance that was created
    mockOllamaInstance = Ollama.mock.results[Ollama.mock.results.length - 1].value;
  });

  /**
   * Provider Interface Compliance Tests
   * @req FR:ai-provider-ollama/ollama.interface
   */
  describe('Provider Interface', () => {
    it('should have name "ollama"', () => {
      // @req FR:ai-provider-ollama/ollama.interface
      expect(provider.name).toBe('ollama');
    });

    it('should have headless capability', () => {
      // @req FR:ai-provider-ollama/ollama.interface
      expect(provider.capabilities).toContain('headless');
    });

    it('should implement AIProvider interface methods', () => {
      // @req FR:ai-provider-ollama/ollama.interface
      expect(typeof provider.execute).toBe('function');
      expect(typeof provider.isAvailable).toBe('function');
      expect(typeof provider.signIn).toBe('function');
    });
  });

  /**
   * Instantiation Performance Tests
   * @req NFR:ai-provider-ollama/ollama.performance.instantiation
   */
  describe('Instantiation Performance', () => {
    it('should instantiate in less than 10ms', () => {
      // @req NFR:ai-provider-ollama/ollama.performance.instantiation
      const start = performance.now();
      const newProvider = new OllamaProvider();
      const duration = performance.now() - start;

      expect(newProvider).toBeInstanceOf(OllamaProvider);
      expect(duration).toBeLessThan(10);
    });
  });

  /**
   * Server Configuration Tests
   * @req FR:ai-provider-ollama/ollama.server.url
   */
  describe('Server Configuration', () => {
    it('should use default URL http://localhost:11434', () => {
      // @req FR:ai-provider-ollama/ollama.server.url
      const { Ollama } = require('ollama');

      // Create a new provider without OLLAMA_HOST set
      delete process.env.OLLAMA_HOST;
      new OllamaProvider();

      // Verify Ollama was called with default host
      const lastCall = Ollama.mock.calls[Ollama.mock.calls.length - 1];
      expect(lastCall[0]).toEqual({ host: 'http://localhost:11434' });
    });

    it('should use OLLAMA_HOST environment variable when set', () => {
      // @req FR:ai-provider-ollama/ollama.server.url
      const { Ollama } = require('ollama');
      const customHost = 'http://custom-host:8080';

      // Set environment variable
      process.env.OLLAMA_HOST = customHost;
      new OllamaProvider();

      // Verify Ollama was called with custom host
      const lastCall = Ollama.mock.calls[Ollama.mock.calls.length - 1];
      expect(lastCall[0]).toEqual({ host: customHost });

      // Clean up
      delete process.env.OLLAMA_HOST;
    });
  });

  /**
   * Server Availability Tests
   * @req FR:ai-provider-ollama/ollama.server.available
   */
  describe('isAvailable', () => {
    it('should return true when server is reachable', async () => {
      // @req FR:ai-provider-ollama/ollama.server.available
      mockOllamaInstance.list.mockResolvedValue({ models: [] });

      const available = await provider.isAvailable();

      expect(available).toBe(true);
      expect(mockOllamaInstance.list).toHaveBeenCalled();
    });

    it('should return false when server is not reachable', async () => {
      // @req FR:ai-provider-ollama/ollama.server.available
      mockOllamaInstance.list.mockRejectedValue(new Error('ECONNREFUSED'));

      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });

    it('should complete in less than 100ms', async () => {
      // @req NFR:ai-provider-ollama/ollama.performance.server-check
      mockOllamaInstance.list.mockResolvedValue({ models: [] });

      const start = performance.now();
      await provider.isAvailable();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  /**
   * Sign-In Tests
   * @req FR:ai-provider-ollama/ollama.server.signin
   */
  describe('signIn', () => {
    it('should verify server is running', async () => {
      // @req FR:ai-provider-ollama/ollama.server.signin
      mockOllamaInstance.list.mockResolvedValue({ models: [] });

      await expect(provider.signIn()).resolves.not.toThrow();
      expect(mockOllamaInstance.list).toHaveBeenCalled();
    });

    it('should throw AIProviderUnavailable if server not reachable', async () => {
      // @req FR:ai-provider-ollama/ollama.server.signin
      mockOllamaInstance.list.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(provider.signIn()).rejects.toThrow(CatalystError);
      await expect(provider.signIn()).rejects.toThrow('not reachable');
    });

    it('should include guidance about starting Ollama', async () => {
      // @req FR:ai-provider-ollama/ollama.errors.server
      mockOllamaInstance.list.mockRejectedValue(new Error('ECONNREFUSED'));

      try {
        await provider.signIn();
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.code).toBe('AIProviderUnavailable');
        expect(catalystErr.guidance).toContain('Ollama');
      }
    });
  });

  /**
   * Basic Execution Tests
   * @req FR:ai-provider-ollama/ollama.execute
   */
  describe('execute - Basic Execution', () => {
    it('should accept AIProviderRequest and return AIProviderResponse', async () => {
      // @req FR:ai-provider-ollama/ollama.execute
      mockOllamaInstance.chat.mockResolvedValue({
        message: { content: 'Test response' },
        model: 'llama2',
        prompt_eval_count: 10,
        eval_count: 20
      });

      const request = createRequest();
      const response = await provider.execute(request);

      expect(response).toBeDefined();
      expect(response.content).toBe('Test response');
      expect(response.model).toBe('llama2');
    });

    it('should call SDK chat method', async () => {
      // @req FR:ai-provider-ollama/ollama.execute
      mockOllamaInstance.chat.mockResolvedValue({
        message: { content: 'Response' },
        model: 'llama2'
      });

      await provider.execute(createRequest());

      expect(mockOllamaInstance.chat).toHaveBeenCalled();
    });
  });

  /**
   * Message Formatting Tests
   * @req FR:ai-provider-ollama/ollama.execute
   */
  describe('execute - Message Formatting', () => {
    it('should map systemPrompt to system message', async () => {
      // @req FR:ai-provider-ollama/ollama.execute
      mockOllamaInstance.chat.mockResolvedValue({
        message: { content: 'Response' },
        model: 'llama2'
      });

      const request = createRequest({
        systemPrompt: 'You are a test assistant.',
        prompt: 'User message'
      });

      await provider.execute(request);

      const chatCall = mockOllamaInstance.chat.mock.calls[0][0];
      expect(chatCall.messages).toEqual([
        { role: 'system', content: 'You are a test assistant.' },
        { role: 'user', content: 'User message' }
      ]);
    });

    it('should map prompt to user message', async () => {
      // @req FR:ai-provider-ollama/ollama.execute
      mockOllamaInstance.chat.mockResolvedValue({
        message: { content: 'Response' },
        model: 'llama2'
      });

      const request = createRequest({ prompt: 'Test user prompt' });
      await provider.execute(request);

      const chatCall = mockOllamaInstance.chat.mock.calls[0][0];
      const userMessage = chatCall.messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toBe('Test user prompt');
    });
  });

  /**
   * Model Selection Tests
   * @req FR:ai-provider-ollama/ollama.models
   */
  describe('execute - Model Selection', () => {
    it('should use model from request when provided', async () => {
      // @req FR:ai-provider-ollama/ollama.models
      mockOllamaInstance.chat.mockResolvedValue({
        message: { content: 'Response' },
        model: 'custom-model'
      });

      const request = createRequest({ model: 'custom-model' });
      await provider.execute(request);

      const chatCall = mockOllamaInstance.chat.mock.calls[0][0];
      expect(chatCall.model).toBe('custom-model');
    });

    it('should use default model when not specified', async () => {
      // @req FR:ai-provider-ollama/ollama.models
      mockOllamaInstance.chat.mockResolvedValue({
        message: { content: 'Response' },
        model: 'llama2'
      });

      const request = createRequest();
      delete request.model;

      await provider.execute(request);

      const chatCall = mockOllamaInstance.chat.mock.calls[0][0];
      // When model is not specified, it should be undefined/not set
      // Ollama SDK will use its default
      expect(chatCall.model).toBeUndefined();
    });

    it('should include model name in response', async () => {
      // @req FR:ai-provider-ollama/ollama.models
      mockOllamaInstance.chat.mockResolvedValue({
        message: { content: 'Response' },
        model: 'llama2'
      });

      const response = await provider.execute(createRequest());
      expect(response.model).toBe('llama2');
    });
  });

  /**
   * MaxTokens Handling Tests
   * @req FR:ai-provider-ollama/ollama.execute
   */
  describe('execute - MaxTokens Handling', () => {
    it('should pass maxTokens to SDK when provided', async () => {
      // @req FR:ai-provider-ollama/ollama.execute
      mockOllamaInstance.chat.mockResolvedValue({
        message: { content: 'Response' },
        model: 'llama2'
      });

      const request = createRequest({ maxTokens: 500 });
      await provider.execute(request);

      const chatCall = mockOllamaInstance.chat.mock.calls[0][0];
      expect(chatCall.options?.num_predict).toBe(500);
    });

    it('should work without maxTokens', async () => {
      // @req FR:ai-provider-ollama/ollama.execute
      mockOllamaInstance.chat.mockResolvedValue({
        message: { content: 'Response' },
        model: 'llama2'
      });

      const request = createRequest();
      delete request.maxTokens;

      await provider.execute(request);

      const chatCall = mockOllamaInstance.chat.mock.calls[0][0];
      expect(chatCall.options?.num_predict).toBeUndefined();
    });
  });

  /**
   * Token Usage Extraction Tests
   * @req FR:ai-provider-ollama/ollama.usage.tokens
   */
  describe('execute - Token Usage', () => {
    it('should extract inputTokens from prompt_eval_count', async () => {
      // @req FR:ai-provider-ollama/ollama.usage.tokens
      mockOllamaInstance.chat.mockResolvedValue({
        message: { content: 'Response' },
        model: 'llama2',
        prompt_eval_count: 100,
        eval_count: 50
      });

      const response = await provider.execute(createRequest());

      expect(response.usage?.inputTokens).toBe(100);
    });

    it('should extract outputTokens from eval_count', async () => {
      // @req FR:ai-provider-ollama/ollama.usage.tokens
      mockOllamaInstance.chat.mockResolvedValue({
        message: { content: 'Response' },
        model: 'llama2',
        prompt_eval_count: 100,
        eval_count: 50
      });

      const response = await provider.execute(createRequest());

      expect(response.usage?.outputTokens).toBe(50);
    });

    it('should calculate totalTokens as sum of input and output', async () => {
      // @req FR:ai-provider-ollama/ollama.usage.tokens
      mockOllamaInstance.chat.mockResolvedValue({
        message: { content: 'Response' },
        model: 'llama2',
        prompt_eval_count: 100,
        eval_count: 50
      });

      const response = await provider.execute(createRequest());

      expect(response.usage?.totalTokens).toBe(150);
    });

    it('should handle missing prompt_eval_count gracefully', async () => {
      // @req FR:ai-provider-ollama/ollama.usage.tokens
      mockOllamaInstance.chat.mockResolvedValue({
        message: { content: 'Response' },
        model: 'llama2',
        eval_count: 50
      });

      const response = await provider.execute(createRequest());

      expect(response.usage?.inputTokens).toBe(0);
      expect(response.usage?.outputTokens).toBe(50);
      expect(response.usage?.totalTokens).toBe(50);
    });

    it('should handle missing eval_count gracefully', async () => {
      // @req FR:ai-provider-ollama/ollama.usage.tokens
      mockOllamaInstance.chat.mockResolvedValue({
        message: { content: 'Response' },
        model: 'llama2',
        prompt_eval_count: 100
      });

      const response = await provider.execute(createRequest());

      expect(response.usage?.inputTokens).toBe(100);
      expect(response.usage?.outputTokens).toBe(0);
      expect(response.usage?.totalTokens).toBe(100);
    });

    it('should default to 0 when token counts unavailable', async () => {
      // @req FR:ai-provider-ollama/ollama.usage.tokens
      mockOllamaInstance.chat.mockResolvedValue({
        message: { content: 'Response' },
        model: 'llama2'
      });

      const response = await provider.execute(createRequest());

      expect(response.usage?.inputTokens).toBe(0);
      expect(response.usage?.outputTokens).toBe(0);
      expect(response.usage?.totalTokens).toBe(0);
    });
  });

  /**
   * Timeout Handling Tests
   * @req FR:ai-provider-ollama/ollama.execute
   */
  describe('execute - Timeout Handling', () => {
    it('should respect inactivityTimeout parameter', async () => {
      // @req FR:ai-provider-ollama/ollama.execute
      jest.useFakeTimers();

      mockOllamaInstance.chat.mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              message: { content: 'Delayed response' },
              model: 'llama2'
            });
          }, 70000); // 70 seconds
        })
      );

      const request = createRequest({ inactivityTimeout: 5000 });
      const executePromise = provider.execute(request);

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      await expect(executePromise).rejects.toThrow();

      jest.useRealTimers();
    }, 10000);

    it('should not timeout when response arrives within timeout', async () => {
      // @req FR:ai-provider-ollama/ollama.execute
      jest.useFakeTimers();

      mockOllamaInstance.chat.mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              message: { content: 'Quick response' },
              model: 'llama2'
            });
          }, 1000);
        })
      );

      const request = createRequest({ inactivityTimeout: 5000 });
      const executePromise = provider.execute(request);

      jest.advanceTimersByTime(1000);

      await expect(executePromise).resolves.toBeDefined();

      jest.useRealTimers();
    });
  });

  /**
   * Abort Signal Tests
   * @req FR:ai-provider-ollama/ollama.execute
   */
  describe('execute - Abort Signal', () => {
    it('should pass abortSignal to SDK', async () => {
      // @req FR:ai-provider-ollama/ollama.execute
      const abortController = new AbortController();

      mockOllamaInstance.chat.mockResolvedValue({
        message: { content: 'Response' },
        model: 'llama2'
      });

      const request = createRequest({ abortSignal: abortController.signal });
      await provider.execute(request);

      const chatCall = mockOllamaInstance.chat.mock.calls[0][0];
      expect(chatCall.signal).toBe(abortController.signal);
    });
  });

  /**
   * Server Error Handling Tests
   * @req FR:ai-provider-ollama/ollama.errors.server
   */
  describe('execute - Server Errors', () => {
    it('should throw AIProviderUnavailable on connection refused', async () => {
      // @req FR:ai-provider-ollama/ollama.errors.server
      mockOllamaInstance.chat.mockRejectedValue(
        Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
      );

      await expect(provider.execute(createRequest())).rejects.toThrow(CatalystError);
      await expect(provider.execute(createRequest())).rejects.toThrow('not reachable');
    });

    it('should include guidance about starting Ollama server', async () => {
      // @req FR:ai-provider-ollama/ollama.errors.server
      mockOllamaInstance.chat.mockRejectedValue(
        Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' })
      );

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.code).toBe('AIProviderUnavailable');
        expect(catalystErr.guidance).toContain('Start Ollama');
      }
    });

    it('should mention OLLAMA_HOST in error guidance', async () => {
      // @req FR:ai-provider-ollama/ollama.errors.server
      mockOllamaInstance.chat.mockRejectedValue(
        Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' })
      );

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.guidance).toContain('OLLAMA_HOST');
      }
    });
  });

  /**
   * Model Error Handling Tests
   * @req FR:ai-provider-ollama/ollama.errors.model
   */
  describe('execute - Model Errors', () => {
    it('should handle model not found errors', async () => {
      // @req FR:ai-provider-ollama/ollama.errors.model
      const modelError = new Error('model "nonexistent-model" not found');
      mockOllamaInstance.chat.mockRejectedValue(modelError);

      const request = createRequest({ model: 'nonexistent-model' });

      await expect(provider.execute(request)).rejects.toThrow(CatalystError);
    });

    it('should include model name in error message', async () => {
      // @req FR:ai-provider-ollama/ollama.errors.model
      const modelError = new Error('model "test-model" not found');
      mockOllamaInstance.chat.mockRejectedValue(modelError);

      const request = createRequest({ model: 'test-model' });

      try {
        await provider.execute(request);
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.message).toContain('test-model');
      }
    });

    it('should suggest ollama pull command', async () => {
      // @req FR:ai-provider-ollama/ollama.errors.model
      const modelError = new Error('model "test-model" not found');
      mockOllamaInstance.chat.mockRejectedValue(modelError);

      const request = createRequest({ model: 'test-model' });

      try {
        await provider.execute(request);
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.guidance).toContain('ollama pull');
        expect(catalystErr.guidance).toContain('test-model');
      }
    });
  });

  /**
   * General Error Handling Tests
   * @req FR:ai-provider-ollama/ollama.errors
   */
  describe('execute - General Errors', () => {
    it('should wrap SDK errors in CatalystError', async () => {
      // @req FR:ai-provider-ollama/ollama.errors
      mockOllamaInstance.chat.mockRejectedValue(new Error('Unknown SDK error'));

      await expect(provider.execute(createRequest())).rejects.toThrow(CatalystError);
    });

    it('should preserve error details', async () => {
      // @req FR:ai-provider-ollama/ollama.errors
      const originalError = new Error('Detailed error message');
      mockOllamaInstance.chat.mockRejectedValue(originalError);

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.message).toContain('Detailed error message');
      }
    });
  });
});
