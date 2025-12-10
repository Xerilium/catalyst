/**
 * Type definitions for AI provider interface
 *
 * Defines the contract for AI platform implementations and the data structures
 * used for request/response communication.
 */

/**
 * Token usage and cost tracking statistics
 *
 * @req FR:playbook-actions-ai/provider.usage
 */
export interface AIUsageStats {
  /** Input tokens consumed */
  inputTokens: number;

  /** Output tokens generated */
  outputTokens: number;

  /** Total tokens (input + output) */
  totalTokens: number;

  /** Estimated cost (optional) */
  cost?: number;

  /** Currency code for cost (e.g., 'USD', 'EUR'). Default: 'USD' */
  currency?: string;
}

/**
 * Request structure for AI provider execution
 *
 * Represents the normalized input to AIProvider.execute().
 * The AIPromptAction assembles role, context, and return instructions
 * into systemPrompt and prompt before calling the provider.
 *
 * @req FR:playbook-actions-ai/provider.request
 */
export interface AIProviderRequest {
  /** Model identifier (provider-specific) */
  model?: string;

  /** System prompt defining AI persona/role */
  systemPrompt: string;

  /** The user prompt text (includes context and return instructions) */
  prompt: string;

  /** Maximum tokens for response */
  maxTokens?: number;

  /** Inactivity timeout in milliseconds - time without AI activity before cancellation */
  inactivityTimeout: number;

  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
}

/**
 * Response structure from AI provider execution
 *
 * @req FR:playbook-actions-ai/provider.response
 */
export interface AIProviderResponse {
  /** The AI response content */
  content: string;

  /** Token usage statistics (optional) */
  usage?: AIUsageStats;

  /** Model that was used */
  model: string;

  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Interface for AI platform implementations
 *
 * Provides a unified contract for integrating different AI platforms
 * (Claude, Gemini, OpenAI, etc.) into Catalyst playbooks.
 *
 * @example
 * ```typescript
 * class ClaudeProvider implements AIProvider {
 *   readonly name = 'claude';
 *
 *   async execute(request: AIProviderRequest): Promise<AIProviderResponse> {
 *     // Call Claude API
 *   }
 *
 *   async isAvailable(): Promise<boolean> {
 *     // Check if credentials are configured
 *   }
 *
 *   async signIn(): Promise<void> {
 *     // Run interactive OAuth flow
 *   }
 * }
 * ```
 *
 * @req FR:playbook-actions-ai/provider.interface
 */
export interface AIProvider {
  /** Unique provider identifier (e.g., 'claude', 'gemini', 'mock') */
  readonly name: string;

  /**
   * Execute an AI prompt and return the response
   *
   * @param request - The normalized request containing system prompt, user prompt, etc.
   * @returns Promise resolving to the AI response
   * @throws CatalystError on provider-specific errors
   */
  execute(request: AIProviderRequest): Promise<AIProviderResponse>;

  /**
   * Check if provider is available (credentials configured, etc.)
   *
   * @returns Promise resolving to true if provider can execute requests
   */
  isAvailable(): Promise<boolean>;

  /**
   * Interactive sign-in flow for providers that support it
   *
   * For providers like Claude that use OAuth/subscription model,
   * this triggers the interactive authentication flow.
   *
   * @returns Promise resolving when sign-in is complete
   * @throws CatalystError if sign-in fails
   */
  signIn(): Promise<void>;
}
