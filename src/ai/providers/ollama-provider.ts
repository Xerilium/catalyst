/**
 * Ollama AI provider implementation
 *
 * Integrates with local Ollama server for offline AI execution.
 * No authentication required (headless by nature).
 *
 * @req FR:ai-provider-ollama/ollama.interface
 */

import { Ollama } from 'ollama';
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
 * Ollama AI provider
 *
 * @req FR:ai-provider-ollama/ollama.interface
 * @req FR:ai-provider-ollama/ollama.sdk
 */
export class OllamaProvider implements AIProvider {
  /** @req FR:ai-provider-ollama/ollama.interface */
  readonly name = 'ollama';

  /** @req FR:ai-provider/provider.interface */
  readonly displayName = 'Ollama';

  /** @req FR:ai-provider-ollama/ollama.interface */
  readonly capabilities: AIProviderCapability[] = ['headless'];

  private client: Ollama;

  constructor() {
    // Get server URL from environment or use default
    /** @req FR:ai-provider-ollama/ollama.server.url */
    const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.client = new Ollama({ host });
  }

  /**
   * Execute an AI prompt using Ollama
   *
   * @req FR:ai-provider-ollama/ollama.execute
   * @req FR:ai-provider-ollama/ollama.models
   */
  async execute(request: AIProviderRequest): Promise<AIProviderResponse> {
    // Build messages array
    /** @req FR:ai-provider-ollama/ollama.execute */
    const messages = [
      { role: 'system' as const, content: request.systemPrompt },
      { role: 'user' as const, content: request.prompt }
    ];

    // Build chat options
    const chatParams: {
      messages: typeof messages;
      model?: string;
      options?: { num_predict?: number };
      signal?: AbortSignal;
    } = {
      messages
    };

    // Set model if provided
    if (request.model) {
      chatParams.model = request.model;
    }

    // Set maxTokens if provided
    if (request.maxTokens) {
      chatParams.options = { num_predict: request.maxTokens };
    }

    // Pass abort signal
    if (request.abortSignal) {
      chatParams.signal = request.abortSignal;
    }

    // Create timeout promise for inactivity timeout
    let timeoutId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new CatalystError(
          'Ollama request timed out due to inactivity',
          'AIProviderTimeout',
          'The request took too long. Try again or increase the timeout.'
        ));
      }, request.inactivityTimeout);
    });

    try {
      // Race the API call against the timeout
      const response = await Promise.race([
        this.client.chat(chatParams as Parameters<typeof this.client.chat>[0]),
        timeoutPromise
      ]);

      if (timeoutId) clearTimeout(timeoutId);

      // Extract content from response
      const content = response.message?.content || '';

      // Extract usage stats
      /** @req FR:ai-provider-ollama/ollama.usage.tokens */
      const inputTokens = response.prompt_eval_count || 0;
      const outputTokens = response.eval_count || 0;
      const usage: AIUsageStats = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens
      };

      return {
        content,
        model: response.model,
        usage
      };
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      this.handleError(error, request);
    }
  }

  /**
   * Check if Ollama server is available
   *
   * @req FR:ai-provider-ollama/ollama.server.available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify Ollama server is running
   *
   * @req FR:ai-provider-ollama/ollama.server.signin
   */
  async signIn(): Promise<void> {
    try {
      await this.client.list();
    } catch (error) {
      throw new CatalystError(
        'Ollama server is not reachable',
        'AIProviderUnavailable',
        'Start Ollama with `ollama serve` or check OLLAMA_HOST environment variable.'
      );
    }
  }

  /**
   * Handle and transform errors
   *
   * @req FR:ai-provider-ollama/ollama.errors
   */
  private handleError(error: unknown, request: AIProviderRequest): never {
    if (error instanceof CatalystError) {
      throw error;
    }

    const err = error as { code?: string; message?: string };

    // Handle connection errors
    /** @req FR:ai-provider-ollama/ollama.errors.server */
    if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
      throw new CatalystError(
        'Ollama server is not reachable',
        'AIProviderUnavailable',
        'Start Ollama with `ollama serve` or check OLLAMA_HOST environment variable.'
      );
    }

    // Handle model not found errors
    /** @req FR:ai-provider-ollama/ollama.errors.model */
    if (err.message?.includes('not found')) {
      const modelName = request.model || 'unknown';
      throw new CatalystError(
        `Ollama model "${modelName}" not found`,
        'AIProviderInvalidModel',
        `Run \`ollama pull ${modelName}\` to download the model.`
      );
    }

    // Generic error
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new CatalystError(
      `Ollama error: ${message}`,
      'AIProviderError',
      'Check that Ollama is running and try again.'
    );
  }
}
