/**
 * AI Action exports
 *
 * Public API for the playbook-actions-ai feature.
 */

// Main action
export { AIPromptAction } from './ai-prompt-action';

// Action types
export type { AIPromptConfig } from './types';

// Provider types and classes
export type {
  AIProvider,
  AIProviderRequest,
  AIProviderResponse,
  AIUsageStats
} from './providers';
export { MockAIProvider } from './providers';

// Factory functions
export { createAIProvider, getAvailableAIProviders } from './providers';

// Utility functions
export { resolveSystemPrompt, getKnownRoles } from './roles';
export {
  assembleContext,
  assembleReturnInstruction,
  cleanupTempFiles,
  readOutputFile
} from './context';
export type { ContextAssemblyResult, ReturnInstructionResult } from './context';

// Error factories
export { AIPromptErrors, AIProviderErrors } from './errors';
