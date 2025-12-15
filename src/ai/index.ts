/**
 * AI module exports
 *
 * Types and errors are defined at this level.
 * Provider implementations are in ./providers/
 *
 * @req FR:ai-provider/provider
 */

// Types (defined at this level)
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
} from './types';

// Errors (defined at this level)
// @req FR:ai-provider/errors.not-found
// @req FR:ai-provider/errors.unavailable
export { AIProviderErrors } from './errors';

// Provider implementations and factory (from providers/)
// @req FR:ai-provider/factory.create
// @req FR:ai-provider/factory.list
// @req FR:ai-provider/factory.headless
// @req FR:ai-provider/mock.provider
// @req FR:ai-provider/mock.testing
export {
  MockAIProvider,
  createAIProvider,
  getAvailableAIProviders,
  getHeadlessProviders,
  getMockProvider,
  resetMockProvider
} from './providers';
