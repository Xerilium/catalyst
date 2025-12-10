/**
 * Tests for MockAIProvider
 */

import { MockAIProvider } from '../../../../src/playbooks/scripts/playbooks/actions/ai/providers/mock-provider';
import { CatalystError } from '../../../../src/playbooks/scripts/errors';
import type { AIProviderRequest, AIProviderResponse } from '../../../../src/playbooks/scripts/playbooks/actions/ai/providers/types';

describe('MockAIProvider', () => {
  let provider: MockAIProvider;

  const createRequest = (overrides?: Partial<AIProviderRequest>): AIProviderRequest => ({
    systemPrompt: 'You are a test AI.',
    prompt: 'Test prompt',
    inactivityTimeout: 60000,
    ...overrides
  });

  beforeEach(() => {
    provider = new MockAIProvider();
  });

  describe('name property', () => {
    it('should have name "mock"', () => {
      expect(provider.name).toBe('mock');
    });
  });

  describe('default response', () => {
    it('should return "Mock response" by default', async () => {
      const response = await provider.execute(createRequest());
      expect(response.content).toBe('Mock response');
    });

    it('should use request model or default to "mock-model"', async () => {
      const responseWithModel = await provider.execute(createRequest({ model: 'custom-model' }));
      expect(responseWithModel.model).toBe('custom-model');

      provider.reset();
      const responseWithoutModel = await provider.execute(createRequest());
      expect(responseWithoutModel.model).toBe('mock-model');
    });

    it('should include default usage stats', async () => {
      const response = await provider.execute(createRequest());
      expect(response.usage).toEqual({
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30
      });
    });
  });

  describe('setResponse with string', () => {
    it('should return configured string response', async () => {
      provider.setResponse('Custom response text');
      const response = await provider.execute(createRequest());
      expect(response.content).toBe('Custom response text');
    });

    it('should clear any previous error', async () => {
      provider.setError(new CatalystError('Test error', 'TestError', 'Test guidance'));
      provider.setResponse('Response after error');

      const response = await provider.execute(createRequest());
      expect(response.content).toBe('Response after error');
    });
  });

  describe('setResponse with AIProviderResponse', () => {
    it('should return full response object', async () => {
      const customResponse: AIProviderResponse = {
        content: 'Full response',
        model: 'gpt-4',
        usage: {
          inputTokens: 100,
          outputTokens: 200,
          totalTokens: 300,
          cost: 0.05,
          currency: 'USD'
        },
        metadata: { custom: 'data' }
      };

      provider.setResponse(customResponse);
      const response = await provider.execute(createRequest());

      expect(response).toEqual(customResponse);
    });
  });

  describe('setError', () => {
    it('should throw configured error', async () => {
      const error = new CatalystError('Custom error', 'CustomError', 'Custom guidance');
      provider.setError(error);

      await expect(provider.execute(createRequest())).rejects.toThrow(error);
    });

    it('should throw CatalystError with correct properties', async () => {
      provider.setError(new CatalystError('Test message', 'TestCode', 'Test guidance'));

      try {
        await provider.execute(createRequest());
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.message).toBe('Test message');
        expect(catalystErr.code).toBe('TestCode');
        expect(catalystErr.guidance).toBe('Test guidance');
      }
    });
  });

  describe('getCalls', () => {
    it('should return empty array initially', () => {
      expect(provider.getCalls()).toEqual([]);
    });

    it('should record each call', async () => {
      await provider.execute(createRequest({ prompt: 'First prompt' }));
      await provider.execute(createRequest({ prompt: 'Second prompt' }));

      const calls = provider.getCalls();
      expect(calls).toHaveLength(2);
      expect(calls[0].prompt).toBe('First prompt');
      expect(calls[1].prompt).toBe('Second prompt');
    });

    it('should return copies of requests', async () => {
      await provider.execute(createRequest({ prompt: 'Original' }));

      const calls = provider.getCalls();
      calls[0].prompt = 'Modified';

      const callsAgain = provider.getCalls();
      expect(callsAgain[0].prompt).toBe('Original');
    });

    it('should record calls even when error is thrown', async () => {
      provider.setError(new CatalystError('Error', 'Code', 'Guidance'));

      try {
        await provider.execute(createRequest({ prompt: 'Before error' }));
      } catch {
        // Expected
      }

      const calls = provider.getCalls();
      expect(calls).toHaveLength(1);
      expect(calls[0].prompt).toBe('Before error');
    });
  });

  describe('reset', () => {
    it('should clear response to default', async () => {
      provider.setResponse('Custom');
      provider.reset();

      const response = await provider.execute(createRequest());
      expect(response.content).toBe('Mock response');
    });

    it('should clear error', async () => {
      provider.setError(new CatalystError('Error', 'Code', 'Guidance'));
      provider.reset();

      const response = await provider.execute(createRequest());
      expect(response.content).toBe('Mock response');
    });

    it('should clear call history', async () => {
      await provider.execute(createRequest());
      await provider.execute(createRequest());
      expect(provider.getCalls()).toHaveLength(2);

      provider.reset();
      expect(provider.getCalls()).toHaveLength(0);
    });
  });

  describe('isAvailable', () => {
    it('should return true', async () => {
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe('signIn', () => {
    it('should complete without error', async () => {
      await expect(provider.signIn()).resolves.not.toThrow();
    });
  });
});
