/**
 * AI module exports
 *
 * Types and errors are defined at this level.
 * Provider implementations are in ./providers/
 *
 * @req FR:ai-provider
 */

// Types (defined at this level)
export type {
  AIProvider,
  AIProviderCapability,
  AIProviderRequest,
  AIProviderResponse,
  AIUsageStats
} from './types';

// Errors (defined at this level)
export { AIProviderErrors } from './errors';

// Provider implementations and factory (from providers/)
export {
  MockAIProvider,
  createAIProvider,
  getAvailableAIProviders,
  getHeadlessProviders,
  getMockProvider,
  resetMockProvider
} from './providers';
