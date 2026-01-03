/**
 * Claude AI provider implementation
 *
 * Integrates with Anthropic's Claude AI using the official SDK.
 * Supports API key authentication for headless execution.
 */

import Anthropic from '@anthropic-ai/sdk';
import { CatalystError } from '@core/errors';
import { AIProviderErrors } from '../errors';
import type {
  AIProvider,
  AIProviderCapability,
  AIProviderCommandConfig,
  AIProviderRequest,
  AIProviderResponse,
  AIUsageStats
} from '../types';

/**
 * Claude AI provider
 *
 * @req FR:ai-provider-claude/claude.interface
 * @req FR:ai-provider-claude/claude.sdk
 */
export class ClaudeProvider implements AIProvider {
  /** @req FR:ai-provider-claude/claude.interface */
  readonly name = 'claude';

  /** @req FR:ai-provider/provider.interface */
  readonly displayName = 'Claude';

  /** @req FR:ai-provider-claude/claude.interface */
  readonly capabilities: AIProviderCapability[] = ['headless'];

  /**
   * @req FR:ai-provider/provider.command-config
   * @req FR:ai-provider-claude/claude.commands
   */
  readonly commands: AIProviderCommandConfig = {
    path: '.claude/commands',
    useNamespaces: true,
    separator: ':',
    useFrontMatter: true,
    extension: 'md'
  };

  private client: Anthropic | null = null;

  /**
   * Get or create the Anthropic client
   * @req FR:ai-provider-claude/claude.sdk
   */
  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw AIProviderErrors.unavailable(
          'claude',
          'Claude provider is not available. Set ANTHROPIC_API_KEY environment variable.'
        );
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  /**
   * Execute an AI prompt using Claude
   *
   * @req FR:ai-provider-claude/claude.execute
   * @req FR:ai-provider-claude/claude.models
   */
  async execute(request: AIProviderRequest): Promise<AIProviderResponse> {
    // Check availability first
    if (!(await this.isAvailable())) {
      throw AIProviderErrors.unavailable(
        'claude',
        'Claude provider is not available. Set ANTHROPIC_API_KEY environment variable.'
      );
    }

    const client = this.getClient();

    // Build request parameters
    /** @req FR:ai-provider-claude/claude.execute */
    /** @req FR:ai-provider-claude/claude.models */
    const params: Anthropic.MessageCreateParamsNonStreaming = {
      system: request.systemPrompt,
      messages: [{ role: 'user', content: request.prompt }],
      max_tokens: request.maxTokens || 4096,
      model: (request.model || 'claude-sonnet-4-20250514') as Anthropic.Model
    };

    // Build request options
    /** @req FR:ai-provider-claude/claude.execute */
    const options: Anthropic.RequestOptions = {
      timeout: request.inactivityTimeout
    };

    // Handle abort signal
    /** @req FR:ai-provider-claude/claude.execute */
    if (request.abortSignal) {
      options.signal = request.abortSignal;
    }

    try {
      /** @req FR:ai-provider-claude/claude.sdk */
      const response = await client.messages.create(params, options);

      // Extract content from text blocks
      /** @req FR:ai-provider-claude/claude.execute */
      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      // Extract usage stats
      /** @req FR:ai-provider-claude/claude.usage.tokens */
      const usage: AIUsageStats = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      };

      /** @req FR:ai-provider-claude/claude.execute */
      return {
        content,
        model: response.model,
        usage,
        metadata: {
          id: response.id,
          stopReason: response.stop_reason
        }
      };
    } catch (error) {
      /** @req FR:ai-provider-claude/claude.errors */
      this.handleError(error, request);
    }
  }

  /**
   * Check if Claude provider is available
   *
   * @req FR:ai-provider-claude/claude.auth.available
   * @req FR:ai-provider-claude/claude.auth.api-key
   */
  async isAvailable(): Promise<boolean> {
    // Check API key
    return !!process.env.ANTHROPIC_API_KEY;
  }

  /**
   * Interactive sign-in flow
   *
   * Claude provider uses API key authentication only and does not support
   * interactive sign-in for headless execution.
   *
   * @req FR:ai-provider-claude/claude.auth.signin
   */
  async signIn(): Promise<void> {
    throw AIProviderErrors.unavailable(
      'claude',
      'Claude provider does not support interactive sign-in. Set ANTHROPIC_API_KEY environment variable.'
    );
  }

  /**
   * Handle and transform errors
   *
   * @req FR:ai-provider-claude/claude.errors
   * @req FR:ai-provider-claude/claude.errors.auth
   * @req FR:ai-provider-claude/claude.errors.rate-limit
   * @req FR:ai-provider-claude/claude.errors.model
   */
  private handleError(error: unknown, request: AIProviderRequest): never {
    if (error instanceof CatalystError) {
      throw error;
    }

    // Handle Anthropic SDK errors
    if (error instanceof Anthropic.AuthenticationError) {
      /** @req FR:ai-provider-claude/claude.errors.auth */
      throw new CatalystError(
        'Claude authentication failed: Invalid API key',
        'AIProviderUnavailable',
        'Check your ANTHROPIC_API_KEY environment variable is valid.'
      );
    }

    if (error instanceof Anthropic.RateLimitError) {
      /** @req FR:ai-provider-claude/claude.errors.rate-limit */
      throw new CatalystError(
        'Claude rate limit exceeded',
        'AIProviderRateLimited',
        'Please wait and retry your request.'
      );
    }

    if (error instanceof Anthropic.NotFoundError) {
      /** @req FR:ai-provider-claude/claude.errors.model */
      throw new CatalystError(
        `Invalid Claude model: ${request.model || 'unknown'}`,
        'AIProviderInvalidModel',
        'Check that the model name is valid.'
      );
    }

    if (error instanceof Anthropic.APIConnectionTimeoutError) {
      /** @req FR:ai-provider-claude/claude.execute */
      throw new CatalystError(
        'Claude request timeout',
        'AIProviderTimeout',
        'The request took too long. Try again or increase the timeout.'
      );
    }

    if (error instanceof Anthropic.APIConnectionError) {
      /** @req FR:ai-provider-claude/claude.errors */
      throw new CatalystError(
        `Claude API connection error: ${error.message}`,
        'AIProviderConnectionError',
        'Check your network connection and try again.'
      );
    }

    if (error instanceof Anthropic.APIError) {
      /** @req FR:ai-provider-claude/claude.errors */
      throw new CatalystError(
        `Claude API error: ${error.message}`,
        'AIProviderError',
        'Check the API status and try again.'
      );
    }

    // Handle abort errors
    /** @req FR:ai-provider-claude/claude.execute */
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CatalystError(
        'Claude request was cancelled',
        'AIProviderCancelled',
        'The request was aborted.'
      );
    }

    // Generic error
    /** @req FR:ai-provider-claude/claude.errors */
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new CatalystError(
      `Claude API error: ${message}`,
      'AIProviderError',
      'Check the API status and try again.'
    );
  }
}
