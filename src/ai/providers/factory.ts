/**
 * AI provider factory
 *
 * Creates AI provider instances by name from a build-time generated catalog.
 *
 * @req FR:ai-provider/factory
 */

import { AIProviderErrors } from '../errors';
import { MockAIProvider } from './mock-provider';
import { PROVIDER_CATALOG } from './provider-catalog';
import type { AIProvider } from '../types';

/**
 * Singleton mock provider instance for testing
 *
 * Using a singleton allows tests to configure the mock before
 * the action creates the provider, and then verify calls afterward.
 *
 * @req FR:ai-provider/mock.testing
 */
let mockProviderInstance: MockAIProvider | null = null;

/**
 * Get or create the singleton mock provider instance
 *
 * @returns The shared MockAIProvider instance
 * @req FR:ai-provider/mock.testing
 */
export function getMockProvider(): MockAIProvider {
  if (!mockProviderInstance) {
    mockProviderInstance = new MockAIProvider();
  }
  return mockProviderInstance;
}

/**
 * Reset the mock provider singleton
 *
 * Call this in test afterEach to ensure clean state between tests.
 *
 * @req FR:ai-provider/mock.testing
 */
export function resetMockProvider(): void {
  if (mockProviderInstance) {
    mockProviderInstance.reset();
  }
}

/**
 * Create an AI provider instance by name
 *
 * @param name - Provider identifier (e.g., 'claude', 'mock')
 * @returns Instantiated AIProvider ready for use
 * @throws CatalystError with code 'AIProviderNotFound' if provider is not in catalog
 *
 * @example
 * ```typescript
 * // Get mock provider for testing
 * const provider = createAIProvider('mock');
 *
 * // Use provider
 * const response = await provider.execute(request);
 * ```
 *
 * @req FR:ai-provider/factory.create
 */
export function createAIProvider(name: string): AIProvider {
  // Return singleton for mock provider
  if (name === 'mock') {
    return getMockProvider();
  }

  const ProviderClass = PROVIDER_CATALOG[name];
  if (!ProviderClass) {
    throw AIProviderErrors.notFound(name, Object.keys(PROVIDER_CATALOG));
  }
  return new ProviderClass();
}

/**
 * Get list of available provider names
 *
 * @returns Array of provider identifiers that can be passed to createAIProvider()
 *
 * @example
 * ```typescript
 * const available = getAvailableAIProviders();
 * // ['mock'] - additional providers added by their features
 * ```
 *
 * @req FR:ai-provider/factory.list
 */
export function getAvailableAIProviders(): string[] {
  return Object.keys(PROVIDER_CATALOG);
}

/**
 * Get list of providers that support headless execution
 *
 * @returns Array of provider names with 'headless' capability
 *
 * @example
 * ```typescript
 * const headless = getHeadlessProviders();
 * // ['mock', 'claude', 'gemini', 'openai', 'ollama']
 * ```
 *
 * @req FR:ai-provider/factory.headless
 */
export function getHeadlessProviders(): string[] {
  return Object.entries(PROVIDER_CATALOG)
    .filter(([, ProviderClass]) => {
      const instance = new ProviderClass();
      return instance.capabilities.includes('headless');
    })
    .map(([name]) => name);
}
