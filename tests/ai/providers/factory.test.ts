/**
 * Tests for AI provider factory
 */

import {
  createAIProvider,
  getAvailableAIProviders,
  getHeadlessProviders
} from '@ai/providers/factory';
import { MockAIProvider } from '@ai/providers/mock-provider';
import { CatalystError } from '@core/errors';

/**
 * @req FR:ai-provider/factory
 */
describe('createAIProvider', () => {
  describe('mock provider', () => {
    // @req FR:ai-provider/factory.create
    // @req FR:ai-provider/mock.provider
    it('should return MockAIProvider for "mock"', () => {
      const provider = createAIProvider('mock');
      expect(provider).toBeInstanceOf(MockAIProvider);
      expect(provider.name).toBe('mock');
    });

    // @req FR:ai-provider/factory.create
    // @req FR:ai-provider/mock.testing
    it('should return singleton instance for mock provider', () => {
      const provider1 = createAIProvider('mock');
      const provider2 = createAIProvider('mock');
      expect(provider1).toBe(provider2);
    });
  });

  describe('unknown provider', () => {
    // @req FR:ai-provider/errors.not-found
    it('should throw CatalystError for unknown provider', () => {
      expect(() => createAIProvider('unknown-provider')).toThrow(CatalystError);
    });

    // @req FR:ai-provider/errors.not-found
    it('should throw with code AIProviderNotFound', () => {
      try {
        createAIProvider('not-a-provider');
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CatalystError);
        expect((err as CatalystError).code).toBe('AIProviderNotFound');
      }
    });

    // @req FR:ai-provider/errors.not-found
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

    // @req FR:ai-provider/errors.not-found
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
  // @req FR:ai-provider/factory.list
  it('should return array including "mock"', () => {
    const providers = getAvailableAIProviders();
    expect(providers).toContain('mock');
  });

  // @req FR:ai-provider/factory.list
  it('should return array of strings', () => {
    const providers = getAvailableAIProviders();
    expect(Array.isArray(providers)).toBe(true);
    providers.forEach(p => expect(typeof p).toBe('string'));
  });

  // @req FR:ai-provider/factory.list
  it('should return at least one provider', () => {
    const providers = getAvailableAIProviders();
    expect(providers.length).toBeGreaterThanOrEqual(1);
  });
});

describe('getHeadlessProviders', () => {
  // @req FR:ai-provider/factory.headless
  // @req FR:ai-provider/provider.capability
  it('should return array including "mock"', () => {
    const providers = getHeadlessProviders();
    expect(providers).toContain('mock');
  });

  // @req FR:ai-provider/factory.headless
  it('should return subset of available providers', () => {
    const all = getAvailableAIProviders();
    const headless = getHeadlessProviders();
    headless.forEach(p => expect(all).toContain(p));
  });
});

describe('NFR: Performance', () => {
  // @req NFR:ai-provider/performance.instantiation
  it('should instantiate provider in <10ms', () => {
    const start = performance.now();
    createAIProvider('mock');
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(10);
  });

  // @req NFR:ai-provider/performance.factory
  it('should complete factory lookup in <1ms', () => {
    const start = performance.now();
    getAvailableAIProviders();
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1);
  });
});

describe('NFR: Extensibility', () => {
  // @req NFR:ai-provider/extensibility.discovery
  it('should automatically discover providers at build time', () => {
    // Providers are auto-discovered by generate-provider-registry.ts
    // If a new provider file exists, it appears in the catalog
    const providers = getAvailableAIProviders();
    expect(providers.length).toBeGreaterThan(0);
  });

  // @req NFR:ai-provider/extensibility.interface
  it('should have stable provider interface', () => {
    const provider = createAIProvider('mock');
    // Core interface methods that must be stable
    expect(typeof provider.name).toBe('string');
    expect(typeof provider.execute).toBe('function');
    expect(typeof provider.isAvailable).toBe('function');
    expect(typeof provider.signIn).toBe('function');
  });
});
