/**
 * OpenAI AI provider implementation
 *
 * Integrates with OpenAI's GPT models using the official SDK.
 * Supports API key authentication for headless execution.
 *
 * @req FR:ai-provider-openai/openai.interface
 */

import OpenAI from 'openai';
import { CatalystError } from '@core/errors';
import { AIProviderErrors } from '../errors';
import type {
  AIProvider,
  AIProviderCapability,
  AIProviderRequest,
  AIProviderResponse,
  AIUsageStats
} from '../types';

/**
 * OpenAI AI provider
 *
 * @req FR:ai-provider-openai/openai.interface
 * @req FR:ai-provider-openai/openai.sdk
 */
export class OpenAIProvider implements AIProvider {
  /** @req FR:ai-provider-openai/openai.interface */
  readonly name = 'openai';

  /** @req FR:ai-provider-openai/openai.interface */
  readonly capabilities: AIProviderCapability[] = ['headless'];

  private client: OpenAI | null = null;

  /**
   * Get or create the OpenAI client
   */
  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw AIProviderErrors.unavailable(
          'openai',
          'OpenAI provider is not available. Set OPENAI_API_KEY environment variable.'
        );
      }
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  /**
   * Execute an AI prompt using OpenAI
   *
   * @req FR:ai-provider-openai/openai.execute
   * @req FR:ai-provider-openai/openai.models
   */
  async execute(request: AIProviderRequest): Promise<AIProviderResponse> {
    // Check availability first
    if (!(await this.isAvailable())) {
      throw AIProviderErrors.unavailable(
        'openai',
        'OpenAI provider is not available. Set OPENAI_API_KEY environment variable.'
      );
    }

    const client = this.getClient();

    // Build messages array
    /** @req FR:ai-provider-openai/openai.execute */
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.prompt }
    ];

    // Build request parameters
    const params: OpenAI.ChatCompletionCreateParamsNonStreaming = {
      messages,
      model: request.model || 'gpt-4o'
    };

    // Add max_tokens if specified
    if (request.maxTokens) {
      params.max_tokens = request.maxTokens;
    }

    try {
      const response = await client.chat.completions.create(params, {
        signal: request.abortSignal
      });

      // Extract content from response
      const content = response.choices[0]?.message?.content || '';

      // Extract usage stats
      /** @req FR:ai-provider-openai/openai.usage.tokens */
      let usage: AIUsageStats | undefined;
      if (response.usage) {
        usage = {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        };
      }

      return {
        content,
        model: response.model,
        usage
      };
    } catch (error) {
      this.handleError(error, request);
    }
  }

  /**
   * Check if OpenAI provider is available
   *
   * @req FR:ai-provider-openai/openai.auth.available
   */
  async isAvailable(): Promise<boolean> {
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * Interactive sign-in flow
   *
   * OpenAI provider uses API key authentication only and does not support
   * interactive sign-in.
   *
   * @req FR:ai-provider-openai/openai.auth.signin
   */
  async signIn(): Promise<void> {
    throw new CatalystError(
      'OpenAI provider requires an API key',
      'AIProviderUnavailable',
      'Set OPENAI_API_KEY environment variable. Get an API key at https://platform.openai.com/api-keys'
    );
  }

  /**
   * Handle and transform errors
   *
   * @req FR:ai-provider-openai/openai.errors
   */
  private handleError(error: unknown, request: AIProviderRequest): never {
    if (error instanceof CatalystError) {
      throw error;
    }

    const err = error as { status?: number; message?: string; headers?: Record<string, string>; name?: string };

    // Handle abort errors
    if (err.name === 'AbortError') {
      throw new CatalystError(
        'OpenAI request was cancelled',
        'AIProviderCancelled',
        'The request was aborted.'
      );
    }

    // Handle authentication errors
    /** @req FR:ai-provider-openai/openai.errors.auth */
    if (err.status === 401) {
      throw new CatalystError(
        'OpenAI authentication failed: Invalid API key',
        'AIProviderUnavailable',
        'Check your OPENAI_API_KEY environment variable is valid.'
      );
    }

    // Handle rate limit errors
    /** @req FR:ai-provider-openai/openai.errors.rate-limit */
    if (err.status === 429) {
      const retryAfter = err.headers?.['retry-after'];
      const guidance = retryAfter
        ? `Rate limit exceeded. Retry after ${retryAfter} seconds.`
        : 'Rate limit exceeded. Please wait and retry your request.';
      throw new CatalystError(
        'OpenAI rate limit exceeded',
        'AIProviderRateLimited',
        guidance
      );
    }

    // Handle model not found errors
    /** @req FR:ai-provider-openai/openai.errors.model */
    if (err.status === 404) {
      throw new CatalystError(
        `Invalid OpenAI model: ${request.model || 'unknown'}`,
        'AIProviderInvalidModel',
        'Check that the model name is valid (e.g., gpt-4, gpt-4-turbo, gpt-3.5-turbo).'
      );
    }

    // Generic error
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new CatalystError(
      `OpenAI API error: ${message}`,
      'AIProviderError',
      'Check the API status and try again.'
    );
  }
}
