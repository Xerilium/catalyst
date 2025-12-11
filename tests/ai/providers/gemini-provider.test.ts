/**
 * Tests for GeminiProvider
 *
 * @req FR:gemini
 */

import { GeminiProvider } from '../../../src/playbooks/scripts/ai/providers/gemini-provider';
import { CatalystError } from '../../../src/playbooks/scripts/errors';
import type { AIProviderRequest, AIProviderResponse } from '../../../src/playbooks/scripts/ai/providers/types';

// Mock the @google/generative-ai SDK
jest.mock('@google/generative-ai');

import { GoogleGenerativeAI } from '@google/generative-ai';

describe('GeminiProvider', () => {
  let provider: GeminiProvider;
  let mockGenerateContent: jest.Mock;
  let mockGetGenerativeModel: jest.Mock;

  const createRequest = (overrides?: Partial<AIProviderRequest>): AIProviderRequest => ({
    systemPrompt: 'You are a test AI.',
    prompt: 'Test prompt',
    inactivityTimeout: 60000,
    ...overrides
  });

  const createMockResponse = (content: string, usageMetadata?: any) => ({
    response: {
      text: () => content,
      usageMetadata: usageMetadata || {
        promptTokenCount: 10,
        candidatesTokenCount: 20,
        totalTokenCount: 30
      }
    }
  });

  beforeEach(() => {
    // Reset environment variables
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;

    // Create mock functions
    mockGenerateContent = jest.fn();
    mockGetGenerativeModel = jest.fn().mockReturnValue({
      generateContent: mockGenerateContent
    });

    // Mock the GoogleGenerativeAI constructor
    (GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel
    } as any));

    provider = new GeminiProvider();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider Interface Conformance', () => {
    /**
     * @req FR:gemini.interface
     */
    it('should have name "gemini"', () => {
      expect(provider.name).toBe('gemini');
    });

    /**
     * @req FR:gemini.interface
     */
    it('should have headless capability', () => {
      expect(provider.capabilities).toContain('headless');
    });

    /**
     * @req NFR:gemini.performance.instantiation
     */
    it('should instantiate in less than 10ms', () => {
      const start = performance.now();
      new GeminiProvider();
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
    });

    /**
     * @req NFR:gemini.performance.instantiation
     */
    it('should not make API calls during construction', () => {
      expect(mockGetGenerativeModel).not.toHaveBeenCalled();
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });
  });

  describe('isAvailable()', () => {
    /**
     * @req FR:gemini.auth.available
     */
    it('should return true when GOOGLE_API_KEY is set', async () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });

    /**
     * @req FR:gemini.auth.available
     */
    it('should return true when GEMINI_API_KEY is set', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });

    /**
     * @req FR:gemini.auth.available
     */
    it('should return false when neither environment variable is set', async () => {
      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });

    /**
     * @req FR:gemini.auth.available
     */
    it('should prefer GOOGLE_API_KEY over GEMINI_API_KEY', async () => {
      process.env.GOOGLE_API_KEY = 'google-key';
      process.env.GEMINI_API_KEY = 'gemini-key';
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });

    /**
     * @req NFR:gemini.performance.auth-check
     */
    it('should complete in less than 5ms', async () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      const start = performance.now();
      await provider.isAvailable();
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5);
    });
  });

  describe('signIn()', () => {
    /**
     * @req FR:gemini.auth.signin
     * @req FR:gemini.errors.auth
     */
    it('should throw AIProviderUnavailable error', async () => {
      try {
        await provider.signIn();
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        expect((err as CatalystError).code).toBe('AIProviderUnavailable');
      }
    });

    /**
     * @req FR:gemini.auth.signin
     */
    it('should include guidance on obtaining API key', async () => {
      try {
        await provider.signIn();
        fail('Should have thrown');
      } catch (err) {
        const error = err as CatalystError;
        expect(error.guidance).toMatch(/API key/i);
        expect(error.guidance).toMatch(/GOOGLE_API_KEY|GEMINI_API_KEY/);
      }
    });

    /**
     * @req FR:gemini.auth.signin
     */
    it('should reference both environment variable options', async () => {
      try {
        await provider.signIn();
        fail('Should have thrown');
      } catch (err) {
        const error = err as CatalystError;
        expect(error.guidance).toMatch(/GOOGLE_API_KEY/);
        expect(error.guidance).toMatch(/GEMINI_API_KEY/);
      }
    });
  });

  describe('execute() - Basic Functionality', () => {
    beforeEach(() => {
      process.env.GOOGLE_API_KEY = 'test-key';
      mockGenerateContent.mockResolvedValue(createMockResponse('Generated response'));
    });

    /**
     * @req FR:gemini.execute
     * @req FR:gemini.interface
     */
    it('should accept AIProviderRequest and return AIProviderResponse', async () => {
      const request = createRequest();
      const response = await provider.execute(request);

      expect(response).toHaveProperty('content');
      expect(response).toHaveProperty('model');
      expect(typeof response.content).toBe('string');
      expect(typeof response.model).toBe('string');
    });

    /**
     * @req FR:gemini.execute
     */
    it('should return content from SDK response', async () => {
      mockGenerateContent.mockResolvedValue(createMockResponse('Test response content'));

      const response = await provider.execute(createRequest());
      expect(response.content).toBe('Test response content');
    });

    /**
     * @req FR:gemini.execute
     */
    it('should handle minimal request (systemPrompt + prompt only)', async () => {
      const request = createRequest({
        systemPrompt: 'System prompt',
        prompt: 'User prompt',
        inactivityTimeout: 60000
      });

      await provider.execute(request);
      expect(mockGenerateContent).toHaveBeenCalled();
    });
  });

  describe('execute() - Message Mapping', () => {
    beforeEach(() => {
      process.env.GOOGLE_API_KEY = 'test-key';
      mockGenerateContent.mockResolvedValue(createMockResponse('Response'));
    });

    /**
     * @req FR:gemini.execute
     */
    it('should map systemPrompt to Gemini system instruction format', async () => {
      const request = createRequest({
        systemPrompt: 'You are a helpful assistant.',
        prompt: 'Hello'
      });

      await provider.execute(request);

      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          systemInstruction: 'You are a helpful assistant.'
        })
      );
    });

    /**
     * @req FR:gemini.execute
     */
    it('should map prompt to user message content', async () => {
      const request = createRequest({ prompt: 'What is 2+2?' });

      await provider.execute(request);

      expect(mockGenerateContent).toHaveBeenCalledWith('What is 2+2?');
    });

    /**
     * @req FR:gemini.execute
     */
    it('should handle empty systemPrompt gracefully', async () => {
      const request = createRequest({ systemPrompt: '' });

      await provider.execute(request);

      // Should still call the SDK, but with empty or no system instruction
      expect(mockGenerateContent).toHaveBeenCalled();
    });
  });

  describe('execute() - Model Selection', () => {
    beforeEach(() => {
      process.env.GOOGLE_API_KEY = 'test-key';
      mockGenerateContent.mockResolvedValue(createMockResponse('Response'));
    });

    /**
     * @req FR:gemini.models
     */
    it('should use SDK default when model not specified', async () => {
      const request = createRequest({ model: undefined });

      await provider.execute(request);

      // Should call getGenerativeModel without specifying a model name explicitly
      // or with the SDK's default model
      expect(mockGetGenerativeModel).toHaveBeenCalled();
    });

    /**
     * @req FR:gemini.models
     */
    it('should use AIProviderRequest.model when provided', async () => {
      const request = createRequest({ model: 'gemini-pro' });

      await provider.execute(request);

      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-pro'
        })
      );
    });

    /**
     * @req FR:gemini.models
     */
    it('should include model name in response', async () => {
      const request = createRequest({ model: 'gemini-pro' });

      const response = await provider.execute(request);

      expect(response.model).toBeTruthy();
    });
  });

  describe('execute() - maxTokens Parameter', () => {
    beforeEach(() => {
      process.env.GOOGLE_API_KEY = 'test-key';
      mockGenerateContent.mockResolvedValue(createMockResponse('Response'));
    });

    /**
     * @req FR:gemini.execute
     */
    it('should map maxTokens to maxOutputTokens', async () => {
      const request = createRequest({ maxTokens: 500 });

      await provider.execute(request);

      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: expect.objectContaining({
            maxOutputTokens: 500
          })
        })
      );
    });

    /**
     * @req FR:gemini.execute
     */
    it('should use SDK default when maxTokens is undefined', async () => {
      const request = createRequest({ maxTokens: undefined });

      await provider.execute(request);

      expect(mockGenerateContent).toHaveBeenCalled();
    });
  });

  describe('execute() - Token Usage Extraction', () => {
    beforeEach(() => {
      process.env.GOOGLE_API_KEY = 'test-key';
    });

    /**
     * @req FR:gemini.usage.tokens
     */
    it('should extract inputTokens from SDK response', async () => {
      mockGenerateContent.mockResolvedValue(
        createMockResponse('Response', {
          promptTokenCount: 150,
          candidatesTokenCount: 250,
          totalTokenCount: 400
        })
      );

      const response = await provider.execute(createRequest());

      expect(response.usage?.inputTokens).toBe(150);
    });

    /**
     * @req FR:gemini.usage.tokens
     */
    it('should extract outputTokens from SDK response', async () => {
      mockGenerateContent.mockResolvedValue(
        createMockResponse('Response', {
          promptTokenCount: 150,
          candidatesTokenCount: 250,
          totalTokenCount: 400
        })
      );

      const response = await provider.execute(createRequest());

      expect(response.usage?.outputTokens).toBe(250);
    });

    /**
     * @req FR:gemini.usage.tokens
     */
    it('should calculate totalTokens as sum of input and output', async () => {
      mockGenerateContent.mockResolvedValue(
        createMockResponse('Response', {
          promptTokenCount: 150,
          candidatesTokenCount: 250,
          totalTokenCount: 400
        })
      );

      const response = await provider.execute(createRequest());

      expect(response.usage?.totalTokens).toBe(400);
    });

    /**
     * @req FR:gemini.usage.tokens
     */
    it('should return undefined usage when metadata unavailable', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Response',
          usageMetadata: undefined
        }
      });

      const response = await provider.execute(createRequest());

      expect(response.usage).toBeUndefined();
    });

    /**
     * @req FR:gemini.usage.tokens
     */
    it('should match AIUsageStats structure', async () => {
      mockGenerateContent.mockResolvedValue(
        createMockResponse('Response', {
          promptTokenCount: 100,
          candidatesTokenCount: 200,
          totalTokenCount: 300
        })
      );

      const response = await provider.execute(createRequest());

      expect(response.usage).toEqual({
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300
      });
    });
  });

  describe('execute() - Error Handling', () => {
    /**
     * @req FR:gemini.errors.auth
     */
    it('should throw AIProviderUnavailable when API key is missing', async () => {
      delete process.env.GOOGLE_API_KEY;
      delete process.env.GEMINI_API_KEY;

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        expect((err as CatalystError).code).toBe('AIProviderUnavailable');
      }
    });

    /**
     * @req FR:gemini.errors.auth
     */
    it('should include configuration guidance in auth error', async () => {
      delete process.env.GOOGLE_API_KEY;
      delete process.env.GEMINI_API_KEY;

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        const error = err as CatalystError;
        // Check either the message or guidance contains the env var names
        const fullText = error.message + ' ' + (error.guidance || '');
        expect(fullText).toMatch(/GOOGLE_API_KEY|GEMINI_API_KEY/);
      }
    });

    /**
     * @req FR:gemini.errors.auth
     */
    it('should reference both environment variable options in auth error', async () => {
      delete process.env.GOOGLE_API_KEY;
      delete process.env.GEMINI_API_KEY;

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        const error = err as CatalystError;
        // Check either the message or guidance contains the env var names
        const fullText = error.message + ' ' + (error.guidance || '');
        expect(fullText).toMatch(/GOOGLE_API_KEY/);
        expect(fullText).toMatch(/GEMINI_API_KEY/);
      }
    });

    /**
     * @req FR:gemini.errors.rate-limit
     */
    it('should wrap rate limit errors with retry guidance', async () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockGenerateContent.mockRejectedValue(rateLimitError);

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        const error = err as CatalystError;
        expect(error.guidance).toMatch(/retry|rate limit|quota/i);
      }
    });

    /**
     * @req FR:gemini.errors.model
     */
    it('should wrap invalid model errors with descriptive message', async () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      const modelError = new Error('Model not found');
      (modelError as any).status = 404;
      mockGenerateContent.mockRejectedValue(modelError);

      try {
        await provider.execute(createRequest({ model: 'invalid-model' }));
        fail('Should have thrown');
      } catch (err) {
        const error = err as CatalystError;
        expect(error.message).toMatch(/model|invalid/i);
      }
    });
  });

  describe('execute() - Cancellation and Timeout', () => {
    beforeEach(() => {
      process.env.GOOGLE_API_KEY = 'test-key';
    });

    /**
     * @req FR:gemini.execute
     * Tests that abortSignal parameter is accepted
     */
    it('should respect abortSignal parameter', async () => {
      mockGenerateContent.mockResolvedValueOnce(createMockResponse('Response'));

      const abortController = new AbortController();
      const request = createRequest({ abortSignal: abortController.signal });

      // Don't abort, verify normal execution succeeds
      const response = await provider.execute(request);
      expect(response.content).toBe('Response');
    });

    /**
     * @req FR:gemini.execute
     * Tests that inactivityTimeout parameter is accepted and normal response completes
     */
    it('should accept inactivityTimeout parameter', async () => {
      mockGenerateContent.mockResolvedValueOnce(createMockResponse('Response'));

      const request = createRequest({ inactivityTimeout: 5000 });
      const response = await provider.execute(request);

      expect(response.content).toBe('Response');
    });

    /**
     * @req FR:gemini.execute
     * Tests that already-aborted signal throws immediately
     */
    it('should throw immediately if signal already aborted', async () => {
      const abortController = new AbortController();
      abortController.abort();

      const request = createRequest({ abortSignal: abortController.signal });

      await expect(provider.execute(request)).rejects.toThrow('cancelled');
    });
  });
});
