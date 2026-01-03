/**
 * AI Provider exports
 *
 * Re-exports provider implementations and factory functions.
 * Types and errors are now at the src/ai/ level.
 */

// Types (re-exported from parent)
// @req FR:ai-provider/provider.interface
// @req FR:ai-provider/provider.capability
// @req FR:ai-provider/provider.request
// @req FR:ai-provider/provider.response
// @req FR:ai-provider/provider.usage
export type {
  AIProvider,
  AIProviderCapability,
  AIProviderRequest,
  AIProviderResponse,
  AIUsageStats
} from '../types';

// Mock provider
// @req FR:ai-provider/mock.provider
// @req FR:ai-provider/mock.testing
export { MockAIProvider } from './mock-provider';

// Factory functions
// @req FR:ai-provider/factory.create
// @req FR:ai-provider/factory.list
// @req FR:ai-provider/factory.headless
export {
  createAIProvider,
  getAvailableAIProviders,
  getHeadlessProviders,
  getMockProvider,
  resetMockProvider
} from './factory';

// Errors (re-exported from parent)
// @req FR:ai-provider/errors.not-found
// @req FR:ai-provider/errors.unavailable
export { AIProviderErrors } from '../errors';
