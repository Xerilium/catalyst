/**
 * Mock AI provider for testing
 *
 * Provides a configurable mock implementation of the AIProvider interface
 * for testing playbooks without real AI credentials.
 */

import { CatalystError } from '@core/errors';
import type {
  AIProvider,
  AIProviderCapability,
  AIProviderRequest,
  AIProviderResponse
} from '../types';

/**
 * Mock AI provider for testing
 *
 * Features:
 * - Configurable response (string or full AIProviderResponse)
 * - Configurable error throwing
 * - Call history tracking
 * - Reset functionality
 *
 * @example
 * ```typescript
 * const provider = new MockAIProvider();
 *
 * // Configure response
 * provider.setResponse('Generated code: function hello() {}');
 *
 * // Execute and verify
 * const response = await provider.execute(request);
 * expect(response.content).toBe('Generated code: function hello() {}');
 *
 * // Check call history
 * const calls = provider.getCalls();
 * expect(calls).toHaveLength(1);
 * expect(calls[0].prompt).toContain('...');
 *
 * // Reset for next test
 * provider.reset();
 * ```
 *
 * @req FR:ai-provider/mock.provider
 * @req FR:ai-provider/mock.testing
 */
export class MockAIProvider implements AIProvider {
  readonly name = 'mock';
  readonly displayName = 'Mock';
  readonly capabilities: AIProviderCapability[] = ['headless'];

  private response: string | AIProviderResponse = 'Mock response';
  private error: CatalystError | null = null;
  private calls: AIProviderRequest[] = [];

  /**
   * Set the response to return from execute()
   *
   * @param response - String content or full AIProviderResponse object
   * @req FR:ai-provider/mock.testing
   */
  setResponse(response: string | AIProviderResponse): void {
    this.response = response;
    this.error = null;
  }

  /**
   * Set an error to throw from execute()
   *
   * @param error - CatalystError to throw
   * @req FR:ai-provider/mock.testing
   */
  setError(error: CatalystError): void {
    this.error = error;
  }

  /**
   * Get the history of calls made to execute()
   *
   * @returns Array of request objects (copies, not originals)
   * @req FR:ai-provider/mock.testing
   */
  getCalls(): AIProviderRequest[] {
    return this.calls.map((call) => ({ ...call }));
  }

  /**
   * Reset mock state to defaults
   *
   * Clears response, error, and call history.
   *
   * @req FR:ai-provider/mock.testing
   */
  reset(): void {
    this.response = 'Mock response';
    this.error = null;
    this.calls = [];
  }

  /**
   * Execute mock AI request
   *
   * Records the call, then either throws configured error or returns configured response.
   *
   * @param request - The AI request
   * @returns Promise resolving to configured response
   * @throws Configured CatalystError if setError() was called
   * @req FR:ai-provider/provider.interface
   * @req FR:ai-provider/mock.testing
   */
  async execute(request: AIProviderRequest): Promise<AIProviderResponse> {
    // Record call (make a copy to preserve state at call time)
    this.calls.push({ ...request });

    // Throw error if configured
    if (this.error) {
      throw this.error;
    }

    // Return configured response
    if (typeof this.response === 'string') {
      return {
        content: this.response,
        model: request.model || 'mock-model',
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30
        }
      };
    }

    return this.response;
  }

  /**
   * Check if provider is available
   *
   * Always returns true for mock provider.
   *
   * @req FR:ai-provider/provider.interface
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Interactive sign-in flow
   *
   * No-op for mock provider.
   *
   * @req FR:ai-provider/provider.interface
   */
  async signIn(): Promise<void> {
    // No-op for mock
  }
}
