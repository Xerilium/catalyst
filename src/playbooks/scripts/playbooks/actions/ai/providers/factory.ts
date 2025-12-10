/**
 * AI provider factory
 *
 * Creates AI provider instances by name from a build-time generated catalog.
 */

import { AIProviderErrors } from '../errors';
import { MockAIProvider } from './mock-provider';
import { PROVIDER_CATALOG } from './provider-catalog';
import type { AIProvider } from './types';

/**
 * Singleton mock provider instance for testing
 *
 * Using a singleton allows tests to configure the mock before
 * the action creates the provider, and then verify calls afterward.
 */
let mockProviderInstance: MockAIProvider | null = null;

/**
 * Get or create the singleton mock provider instance
 *
 * @returns The shared MockAIProvider instance
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
 * @req FR:playbook-actions-ai/provider.factory
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
 * @req FR:playbook-actions-ai/provider.list
 */
export function getAvailableAIProviders(): string[] {
  return Object.keys(PROVIDER_CATALOG);
}

