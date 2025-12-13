/**
 * AI Action exports
 *
 * Public API for the playbook-actions-ai feature.
 */

// Main action
export { AIPromptAction } from './ai-prompt-action';

// Action types
export type { AIPromptConfig } from './types';

// Provider types and classes (re-exported from ai-provider)
export type {
  AIProvider,
  AIProviderCapability,
  AIProviderRequest,
  AIProviderResponse,
  AIUsageStats
} from '@ai/providers';
export { MockAIProvider } from '@ai/providers';

// Factory functions (re-exported from ai-provider)
export {
  createAIProvider,
  getAvailableAIProviders,
  getHeadlessProviders,
  getMockProvider,
  resetMockProvider
} from '@ai/providers';

// Provider errors (re-exported from ai-provider)
export { AIProviderErrors } from '@ai/providers';

// Utility functions
export { resolveSystemPrompt, getKnownRoles } from './roles';
export {
  assembleContext,
  assembleReturnInstruction,
  cleanupTempFiles,
  readOutputFile
} from './context';
export type { ContextAssemblyResult, ReturnInstructionResult } from './context';

// Action errors (ai-prompt specific)
export { AIPromptErrors } from './errors';
