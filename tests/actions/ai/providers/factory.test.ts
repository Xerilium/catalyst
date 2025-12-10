/**
 * Tests for AI provider factory
 */

import {
  createAIProvider,
  getAvailableAIProviders
} from '../../../../src/playbooks/scripts/playbooks/actions/ai/providers/factory';
import { MockAIProvider } from '../../../../src/playbooks/scripts/playbooks/actions/ai/providers/mock-provider';
import { CatalystError } from '../../../../src/playbooks/scripts/errors';

describe('createAIProvider', () => {
  describe('mock provider', () => {
    it('should return MockAIProvider for "mock"', () => {
      const provider = createAIProvider('mock');
      expect(provider).toBeInstanceOf(MockAIProvider);
      expect(provider.name).toBe('mock');
    });

    it('should return singleton instance for mock provider', () => {
      const provider1 = createAIProvider('mock');
      const provider2 = createAIProvider('mock');
      expect(provider1).toBe(provider2);
    });
  });

  describe('unknown provider', () => {
    it('should throw CatalystError for unknown provider', () => {
      expect(() => createAIProvider('unknown-provider')).toThrow(CatalystError);
    });

    it('should throw with code AIProviderNotFound', () => {
      try {
        createAIProvider('not-a-provider');
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        expect((err as CatalystError).code).toBe('AIProviderNotFound');
      }
    });

    it('should list available providers in error message', () => {
      try {
        createAIProvider('invalid');
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        const catalystErr = err as CatalystError;
        expect(catalystErr.guidance).toContain('mock');
      }
    });

    it('should include provider name in error message', () => {
      try {
        createAIProvider('my-fake-provider');
        fail('Should have thrown');
      } catch (err) {
        expect((err as CatalystError).message).toContain('my-fake-provider');
      }
    });
  });
});

describe('getAvailableAIProviders', () => {
  it('should return array including "mock"', () => {
    const providers = getAvailableAIProviders();
    expect(providers).toContain('mock');
  });

  it('should return array of strings', () => {
    const providers = getAvailableAIProviders();
    expect(Array.isArray(providers)).toBe(true);
    providers.forEach(p => expect(typeof p).toBe('string'));
  });

  it('should return at least one provider', () => {
    const providers = getAvailableAIProviders();
    expect(providers.length).toBeGreaterThanOrEqual(1);
  });
});
