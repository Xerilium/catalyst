/**
 * Gemini AI provider implementation
 *
 * Integrates with Google's Gemini AI using the @google/generative-ai SDK.
 * Supports API key authentication for headless execution.
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
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
 * Gemini AI provider
 *
 * @req FR:ai-provider-gemini/gemini
 * @req FR:ai-provider-gemini/gemini.interface
 * @req FR:ai-provider-gemini/gemini.sdk
 */
export class GeminiProvider implements AIProvider {
  /** @req FR:ai-provider-gemini/gemini.interface */
  readonly name = 'gemini';

  /** @req FR:ai-provider/provider.interface */
  readonly displayName = 'Gemini';

  /** @req FR:ai-provider-gemini/gemini.interface */
  readonly capabilities: AIProviderCapability[] = ['headless'];

  /**
   * Get the API key from environment variables
   *
   * @req FR:ai-provider-gemini/gemini.auth
   * @req FR:ai-provider-gemini/gemini.auth.api-key
   */
  private getApiKey(): string | undefined {
    return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  }

  /**
   * Execute an AI prompt using Gemini
   *
   * @req FR:ai-provider-gemini/gemini
   * @req FR:ai-provider-gemini/gemini.execute
   * @req FR:ai-provider-gemini/gemini.models
   * @req FR:ai-provider-gemini/gemini.auth
   * @req FR:ai-provider-gemini/gemini.usage
   * @req FR:ai-provider-gemini/gemini.errors
   */
  async execute(request: AIProviderRequest): Promise<AIProviderResponse> {
    // Check availability first
    // @req FR:ai-provider-gemini/gemini.auth.available
    // @req FR:ai-provider-gemini/gemini.errors.auth
    if (!(await this.isAvailable())) {
      throw AIProviderErrors.unavailable(
        'gemini',
        'Gemini provider is not available. Set GOOGLE_API_KEY or GEMINI_API_KEY environment variable.'
      );
    }

    // @req FR:ai-provider-gemini/gemini.auth.api-key
    const apiKey = this.getApiKey()!;
    // @req FR:ai-provider-gemini/gemini.sdk
    const genAI = new GoogleGenerativeAI(apiKey);

    // Build model configuration
    // @req FR:ai-provider-gemini/gemini.execute
    // @req FR:ai-provider-gemini/gemini.models
    const modelConfig: {
      model: string;
      systemInstruction?: string;
      generationConfig?: { maxOutputTokens?: number };
    } = {
      model: request.model || 'gemini-1.5-flash',
      systemInstruction: request.systemPrompt || undefined,
    };

    // Add maxTokens if specified
    // @req FR:ai-provider-gemini/gemini.execute
    if (request.maxTokens) {
      modelConfig.generationConfig = {
        maxOutputTokens: request.maxTokens
      };
    }

    const model = genAI.getGenerativeModel(modelConfig);

    // Create timeout promise for inactivity timeout
    // @req FR:ai-provider-gemini/gemini.execute
    let timeoutId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new CatalystError(
          'Gemini request timed out due to inactivity',
          'AIProviderTimeout',
          'The request took too long. Try again or increase the timeout.'
        ));
      }, request.inactivityTimeout);
      // Prevent timeout from keeping process alive
      timeoutId.unref();
    });

    // Handle abort signal
    // @req FR:ai-provider-gemini/gemini.execute
    if (request.abortSignal) {
      request.abortSignal.addEventListener('abort', () => {
        if (timeoutId) clearTimeout(timeoutId);
      });

      if (request.abortSignal.aborted) {
        throw new CatalystError(
          'Gemini request was cancelled',
          'AIProviderCancelled',
          'The request was aborted.'
        );
      }
    }

    try {
      // Race the API call against the timeout
      // @req FR:ai-provider-gemini/gemini.execute
      const result = await Promise.race([
        model.generateContent(request.prompt),
        timeoutPromise
      ]);

      if (timeoutId) clearTimeout(timeoutId);

      const response = result.response;
      const content = response.text();

      // Extract usage stats
      // @req FR:ai-provider-gemini/gemini.usage
      // @req FR:ai-provider-gemini/gemini.usage.tokens
      let usage: AIUsageStats | undefined;
      const usageMetadata = response.usageMetadata;
      if (usageMetadata) {
        usage = {
          inputTokens: usageMetadata.promptTokenCount || 0,
          outputTokens: usageMetadata.candidatesTokenCount || 0,
          totalTokens: usageMetadata.totalTokenCount || 0
        };
      }

      // @req FR:ai-provider-gemini/gemini.execute
      return {
        content,
        model: request.model || 'gemini-1.5-flash',
        usage
      };
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      this.handleError(error, request);
    }
  }

  /**
   * Check if Gemini provider is available
   *
   * @req FR:ai-provider-gemini/gemini.auth
   * @req FR:ai-provider-gemini/gemini.auth.available
   * @req NFR:ai-provider-gemini/gemini.performance.auth-check
   */
  async isAvailable(): Promise<boolean> {
    return !!this.getApiKey();
  }

  /**
   * Interactive sign-in flow
   *
   * Gemini provider uses API key authentication only and does not support
   * interactive sign-in.
   *
   * @req FR:ai-provider-gemini/gemini.auth
   * @req FR:ai-provider-gemini/gemini.auth.signin
   * @req FR:ai-provider-gemini/gemini.errors.auth
   */
  async signIn(): Promise<void> {
    throw new CatalystError(
      'Gemini provider does not support interactive sign-in',
      'AIProviderUnavailable',
      'Set GOOGLE_API_KEY or GEMINI_API_KEY environment variable. Get an API key at https://makersuite.google.com/app/apikey'
    );
  }

  /**
   * Handle and transform errors
   *
   * @req FR:ai-provider-gemini/gemini.errors
   * @req FR:ai-provider-gemini/gemini.errors.auth
   * @req FR:ai-provider-gemini/gemini.errors.rate-limit
   * @req FR:ai-provider-gemini/gemini.errors.model
   */
  private handleError(error: unknown, request: AIProviderRequest): never {
    if (error instanceof CatalystError) {
      throw error;
    }

    const err = error as { status?: number; message?: string };

    // Handle rate limit errors
    // @req FR:ai-provider-gemini/gemini.errors.rate-limit
    if (err.status === 429) {
      throw new CatalystError(
        'Gemini rate limit exceeded',
        'AIProviderRateLimited',
        'You have exceeded your quota. Please wait and retry your request.'
      );
    }

    // Handle model not found errors
    // @req FR:ai-provider-gemini/gemini.errors.model
    if (err.status === 404) {
      throw new CatalystError(
        `Invalid Gemini model: ${request.model || 'unknown'}`,
        'AIProviderInvalidModel',
        'Check that the model name is valid (e.g., gemini-1.5-flash, gemini-pro).'
      );
    }

    // Handle authentication errors
    // @req FR:ai-provider-gemini/gemini.errors.auth
    if (err.status === 401 || err.status === 403) {
      throw new CatalystError(
        'Gemini authentication failed: Invalid API key',
        'AIProviderUnavailable',
        'Check your GOOGLE_API_KEY or GEMINI_API_KEY environment variable is valid.'
      );
    }

    // Generic error
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new CatalystError(
      `Gemini API error: ${message}`,
      'AIProviderError',
      'Check the API status and try again.'
    );
  }
}
