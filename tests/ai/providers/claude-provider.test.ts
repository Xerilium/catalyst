/**
 * Tests for ClaudeProvider
 *
 * @req FR:claude
 */

import { ClaudeProvider } from '../../../src/playbooks/scripts/ai/providers/claude-provider';
import { CatalystError } from '../../../src/playbooks/scripts/errors';
import type { AIProviderRequest, AIProviderResponse } from '../../../src/playbooks/scripts/ai/providers/types';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk');

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;
  let mockCreate: jest.Mock;

  const createRequest = (overrides?: Partial<AIProviderRequest>): AIProviderRequest => ({
    systemPrompt: 'You are a helpful AI assistant.',
    prompt: 'Test prompt',
    inactivityTimeout: 60000,
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock create function
    mockCreate = jest.fn();

    // Create mock client
    const mockAnthropicClient = {
      messages: {
        create: mockCreate
      }
    };

    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => mockAnthropicClient as any);

    provider = new ClaudeProvider();
  });

  describe('name property', () => {
    /**
     * @req FR:claude.interface
     */
    it('should have name "claude"', () => {
      expect(provider.name).toBe('claude');
    });
  });

  describe('capabilities property', () => {
    /**
     * @req FR:claude.interface
     */
    it('should have headless capability', () => {
      expect(provider.capabilities).toContain('headless');
    });
  });

  describe('instantiation performance', () => {
    /**
     * @req NFR:claude.performance.instantiation
     */
    it('should complete instantiation in <10ms', () => {
      const start = performance.now();
      new ClaudeProvider();
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
    });
  });

  describe('isAvailable', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    /**
     * @req FR:claude.auth.api-key
     * @req FR:claude.auth.available
     */
    it('should return true when ANTHROPIC_API_KEY is set', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });

    /**
     * @req FR:claude.auth.available
     */
    it('should return false when no authentication available', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });

    /**
     * @req NFR:claude.performance.auth-check
     */
    it('should complete in <5ms', async () => {
      const start = performance.now();
      await provider.isAvailable();
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5);
    });
  });

  describe('signIn', () => {
    /**
     * @req FR:claude.auth.signin
     */
    it('should throw AIProviderUnavailable as interactive auth not supported in headless', async () => {
      await expect(provider.signIn()).rejects.toThrow(CatalystError);
      await expect(provider.signIn()).rejects.toMatchObject({
        code: 'AIProviderUnavailable',
        message: expect.stringContaining('Claude provider does not support interactive sign-in')
      });
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
    });

    /**
     * @req FR:claude.execute
     * @req FR:claude.sdk
     */
    it('should call Anthropic SDK with correct parameters', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Test response', citations: null }],
        model: 'claude-sonnet-4-5-20250929',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          cache_creation_input_tokens: null,
          cache_read_input_tokens: null,
          cache_creation: null,
          server_tool_use: null,
          service_tier: null
        }
      });

      const request = createRequest({
        systemPrompt: 'You are a test AI.',
        prompt: 'Hello, world!',
        maxTokens: 1024,
        model: 'claude-sonnet-4-5-20250929'
      });

      await provider.execute(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-5-20250929',
          system: 'You are a test AI.',
          messages: [{ role: 'user', content: 'Hello, world!' }],
          max_tokens: 1024
        }),
        expect.anything()
      );
    });

    /**
     * @req FR:claude.models
     */
    it('should use default model when not specified', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Test response', citations: null }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          cache_creation_input_tokens: null,
          cache_read_input_tokens: null,
          cache_creation: null,
          server_tool_use: null,
          service_tier: null
        }
      });

      const request = createRequest();
      delete request.model;

      await provider.execute(request);

      const call = mockCreate.mock.calls[0][0];
      // Uses fallback model when not specified
      expect(call.model).toBe('claude-sonnet-4-20250514');
    });

    /**
     * @req FR:claude.execute
     */
    it('should return correct AIProviderResponse', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Test response', citations: null }],
        model: 'claude-sonnet-4-5-20250929',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          cache_creation_input_tokens: null,
          cache_read_input_tokens: null,
          cache_creation: null,
          server_tool_use: null,
          service_tier: null
        }
      });

      const response = await provider.execute(createRequest());

      expect(response).toEqual({
        content: 'Test response',
        model: 'claude-sonnet-4-5-20250929',
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30
        },
        metadata: {
          id: 'msg_123',
          stopReason: 'end_turn'
        }
      });
    });

    /**
     * @req FR:claude.usage.tokens
     */
    it('should extract token usage correctly', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response', citations: null }],
        model: 'claude-sonnet-4-5-20250929',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 100,
          output_tokens: 250,
          cache_creation_input_tokens: null,
          cache_read_input_tokens: null,
          cache_creation: null,
          server_tool_use: null,
          service_tier: null
        }
      });

      const response = await provider.execute(createRequest());

      expect(response.usage).toEqual({
        inputTokens: 100,
        outputTokens: 250,
        totalTokens: 350
      });
    });

    /**
     * @req FR:claude.execute
     */
    it('should handle multiple content blocks', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: 'First block. ', citations: null },
          { type: 'text', text: 'Second block.', citations: null }
        ],
        model: 'claude-sonnet-4-5-20250929',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          cache_creation_input_tokens: null,
          cache_read_input_tokens: null,
          cache_creation: null,
          server_tool_use: null,
          service_tier: null
        }
      });

      const response = await provider.execute(createRequest());

      expect(response.content).toBe('First block. Second block.');
    });

    /**
     * @req FR:claude.execute
     */
    it('should support abort signal', async () => {
      const abortController = new AbortController();
      const request = createRequest({ abortSignal: abortController.signal });

      mockCreate.mockResolvedValue({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response', citations: null }],
        model: 'claude-sonnet-4-5-20250929',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          cache_creation_input_tokens: null,
          cache_read_input_tokens: null,
          cache_creation: null,
          server_tool_use: null,
          service_tier: null
        }
      });

      await provider.execute(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          signal: abortController.signal
        })
      );
    });

    /**
     * @req FR:claude.execute
     */
    it('should handle inactivity timeout', async () => {
      const request = createRequest({ inactivityTimeout: 5000 });

      mockCreate.mockResolvedValue({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response', citations: null }],
        model: 'claude-sonnet-4-5-20250929',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          cache_creation_input_tokens: null,
          cache_read_input_tokens: null,
          cache_creation: null,
          server_tool_use: null,
          service_tier: null
        }
      });

      await provider.execute(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          timeout: 5000
        })
      );
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
    });

    /**
     * @req FR:claude.errors.auth
     */
    it('should throw AIProviderUnavailable on authentication error', async () => {
      // Create auth error with required parameters
      const authError = Object.assign(new Error('Invalid API key'), {
        status: 401,
        name: 'AuthenticationError'
      });
      Object.setPrototypeOf(authError, Anthropic.AuthenticationError.prototype);
      mockCreate.mockRejectedValue(authError);

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.code).toBe('AIProviderUnavailable');
        expect(catalystErr.message).toContain('authentication failed');
        expect(catalystErr.guidance).toContain('ANTHROPIC_API_KEY');
      }
    });

    /**
     * @req FR:claude.errors.rate-limit
     */
    it('should include retry guidance on rate limit error', async () => {
      // Create rate limit error with required parameters
      const rateLimitError = Object.assign(new Error('Rate limit exceeded'), {
        status: 429,
        name: 'RateLimitError'
      });
      Object.setPrototypeOf(rateLimitError, Anthropic.RateLimitError.prototype);
      mockCreate.mockRejectedValue(rateLimitError);

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.code).toBe('AIProviderRateLimited');
        expect(catalystErr.message.toLowerCase()).toContain('rate limit');
        expect(catalystErr.guidance?.toLowerCase()).toContain('retry');
      }
    });

    /**
     * @req FR:claude.errors.model
     */
    it('should provide descriptive error for invalid model', async () => {
      // Create not found error with required parameters
      const notFoundError = Object.assign(new Error('Model not found'), {
        status: 404,
        name: 'NotFoundError'
      });
      Object.setPrototypeOf(notFoundError, Anthropic.NotFoundError.prototype);
      mockCreate.mockRejectedValue(notFoundError);

      const request = createRequest({ model: 'invalid-model' });

      try {
        await provider.execute(request);
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.code).toBe('AIProviderInvalidModel');
        expect(catalystErr.message).toContain('invalid-model');
      }
    });

    /**
     * @req FR:claude.errors
     */
    it('should handle network errors', async () => {
      // Create connection error
      const networkError = Object.assign(new Error('Network error'), {
        name: 'APIConnectionError'
      });
      Object.setPrototypeOf(networkError, Anthropic.APIConnectionError.prototype);
      mockCreate.mockRejectedValue(networkError);

      await expect(provider.execute(createRequest())).rejects.toThrow(CatalystError);
    });

    /**
     * @req FR:claude.errors
     */
    it('should handle timeout errors', async () => {
      // Create timeout error
      const timeoutError = Object.assign(new Error('Request timed out'), {
        name: 'APIConnectionTimeoutError'
      });
      Object.setPrototypeOf(timeoutError, Anthropic.APIConnectionTimeoutError.prototype);
      mockCreate.mockRejectedValue(timeoutError);

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.code).toBe('AIProviderTimeout');
        expect(catalystErr.message.toLowerCase()).toContain('timeout');
      }
    });

    /**
     * @req FR:claude.errors.auth
     */
    it('should throw when API key not available', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.code).toBe('AIProviderUnavailable');
        expect(catalystErr.message).toContain('not available');
        // Guidance may be generic or specific
        expect(catalystErr.guidance).toBeDefined();
      }
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
    });

    it('should handle empty content blocks gracefully', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [],
        model: 'claude-sonnet-4-5-20250929',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 0,
          cache_creation_input_tokens: null,
          cache_read_input_tokens: null,
          cache_creation: null,
          server_tool_use: null,
          service_tier: null
        }
      });

      const response = await provider.execute(createRequest());

      expect(response.content).toBe('');
    });

    it('should filter non-text content blocks', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: 'Text content', citations: null },
          { type: 'tool_use', id: 'tool_1', name: 'test', input: {} }
        ],
        model: 'claude-sonnet-4-5-20250929',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          cache_creation_input_tokens: null,
          cache_read_input_tokens: null,
          cache_creation: null,
          server_tool_use: null,
          service_tier: null
        }
      });

      const response = await provider.execute(createRequest());

      expect(response.content).toBe('Text content');
    });
  });
});
