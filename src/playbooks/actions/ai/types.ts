/**
 * Type definitions for ai-prompt action
 *
 * @req FR:playbook-actions-ai/ai-prompt.config
 * @req NFR:playbook-actions-ai/maintain.types
 */

/**
 * Configuration for ai-prompt action
 *
 * Defines the structure for configuring AI prompt execution within playbooks.
 * All properties except `prompt` are optional.
 *
 * @example
 * ```typescript
 * const config: AIPromptConfig = {
 *   prompt: 'Analyze this code for security issues.',
 *   role: 'Architect',
 *   context: { 'source-code': fileContent },
 *   return: 'A list of security vulnerabilities found.'
 * };
 * ```
 *
 * @req FR:playbook-actions-ai/ai-prompt.config
 */
export interface AIPromptConfig {
  /**
   * The prompt text to send to the AI (supports template interpolation)
   *
   * This is the primary property and can be used as shorthand syntax.
   *
   * @example "Analyze this code and identify potential issues."
   */
  prompt: string;

  /**
   * Role for AI persona - role name, custom system prompt, or empty for default
   *
   * - Known role names (case-insensitive): "Product Manager", "Engineer", "Architect"
   * - Custom strings are used directly as system prompt
   * - If empty/undefined, defaults to playbook `owner` property
   *
   * @example "Architect"
   * @example "You are a TypeScript expert specializing in functional programming."
   */
  role?: string;

  /**
   * Context to make available to the AI as name-value pairs
   *
   * Context values are written to temporary files and referenced in the prompt.
   * This avoids formatting conflicts when context contains Markdown, XML, JSON, or code.
   *
   * @example { 'source-code': fileContent, 'requirements': specText }
   */
  context?: Record<string, unknown>;

  /**
   * Description of expected return value
   *
   * When specified, the AI is instructed to write output to a temporary file,
   * which is then read and returned as the step's output value.
   *
   * If empty or not specified, no value is returned to the step output variable.
   *
   * @example "A JSON array of security concerns, each with 'issue', 'severity', and 'recommendation' fields."
   */
  return?: string;

  /**
   * Provider identifier (e.g., 'claude', 'gemini', 'mock')
   *
   * @default 'claude'
   */
  provider?: string;

  /**
   * Model to use (provider-specific, optional)
   *
   * If not specified, provider uses its default model.
   *
   * @example "claude-3-opus" (for Claude)
   * @example "gemini-2.0-flash" (for Gemini)
   */
  model?: string;

  /**
   * Maximum tokens for AI response (optional, provider-specific default)
   */
  maxTokens?: number;

  /**
   * Inactivity timeout in milliseconds
   *
   * The timer resets on any AI activity (token generation, tool use, thinking).
   * Request is cancelled only if no activity occurs within the timeout period.
   *
   * @default 300000 (5 minutes)
   */
  inactivityTimeout?: number;
}
