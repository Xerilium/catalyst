/**
 * Type definitions for AI provider interface
 *
 * Defines the contract for AI platform implementations and the data structures
 * used for request/response communication.
 *
 * @req FR:ai-provider/provider
 */

/**
 * Token usage and cost tracking statistics
 *
 * @req FR:ai-provider/provider.usage
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
 * @req FR:ai-provider/provider.request
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
 * @req FR:ai-provider/provider.response
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
 * Provider capability indicator
 *
 * - 'headless': Provider can run without user interaction (CI/CD compatible)
 *
 * Providers without 'headless' capability are interactive-only.
 *
 * @req FR:ai-provider/provider.capability
 */
export type AIProviderCapability = 'headless';

/**
 * Configuration for slash command file generation
 *
 * Defines how command templates are transformed and where they are placed
 * for a specific AI platform. This enables Catalyst commands to be available
 * in the AI tool's native command/prompt interface.
 *
 * @example
 * ```typescript
 * // Claude Code uses namespaced commands in .claude/commands/
 * const claudeConfig: AIProviderCommandConfig = {
 *   path: '.claude/commands',
 *   useNamespaces: true,
 *   separator: ':',
 *   useFrontMatter: true,
 *   extension: 'md'
 * };
 *
 * // GitHub Copilot uses flat commands in .github/prompts/
 * const copilotConfig: AIProviderCommandConfig = {
 *   path: '.github/prompts',
 *   useNamespaces: false,
 *   separator: '.',
 *   useFrontMatter: false,
 *   extension: 'prompt.md'
 * };
 * ```
 *
 * @req FR:ai-provider/provider.command-config
 */
export interface AIProviderCommandConfig {
  /**
   * Directory path (relative to project root) where commands are placed
   * @example '.claude/commands', '.github/prompts', '.cursor/commands'
   */
  path: string;

  /**
   * Whether to use namespace prefixes in command paths
   * - true: commands/catalyst/rollout.md → /catalyst:rollout
   * - false: commands/catalyst-rollout.prompt.md → /catalyst-rollout
   */
  useNamespaces: boolean;

  /**
   * Namespace separator character
   * @example ':' for Claude, '/' for Cursor, '.' for Copilot
   */
  separator: string;

  /**
   * Whether to preserve YAML front matter in generated commands
   * Some tools parse front matter for metadata; others require clean markdown
   */
  useFrontMatter: boolean;

  /**
   * File extension for generated command files
   * @example 'md', 'prompt.md'
   */
  extension: string;
}

/**
 * Interface for AI platform implementations
 *
 * Provides a unified contract for integrating different AI platforms
 * (Claude, Gemini, OpenAI, etc.) into Catalyst.
 *
 * @example
 * ```typescript
 * class ClaudeProvider implements AIProvider {
 *   readonly name = 'claude';
 *   readonly displayName = 'Claude Code';
 *   readonly capabilities: AIProviderCapability[] = ['headless'];
 *   readonly commands: AIProviderCommandConfig = {
 *     path: '.claude/commands',
 *     useNamespaces: true,
 *     separator: ':',
 *     useFrontMatter: true,
 *     extension: 'md'
 *   };
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
 * @req FR:ai-provider/provider.interface
 */
export interface AIProvider {
  /** Unique provider identifier (e.g., 'claude', 'gemini', 'mock') */
  readonly name: string;

  /** Display name for the AI platform (used in generated files and logs) */
  readonly displayName: string;

  /** Provider capabilities (empty = interactive-only) */
  readonly capabilities: AIProviderCapability[];

  /** Slash command generation configuration (optional - omit if no IDE integration) */
  readonly commands?: AIProviderCommandConfig;

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
