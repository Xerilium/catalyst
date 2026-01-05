/**
 * Error factory functions for AI providers
 */

import { CatalystError } from '@core/errors';

/**
 * Error factories for AI providers
 *
 * @req FR:ai-provider/errors
 * @req FR:ai-provider/errors.not-found
 * @req FR:ai-provider/errors.unavailable
 */
export const AIProviderErrors = {
  /**
   * Provider not found error
   */
  notFound: (name: string, available: string[]): CatalystError => {
    return new CatalystError(
      `AI provider "${name}" not found`,
      'AIProviderNotFound',
      `Available providers: ${available.join(', ')}`
    );
  },

  /**
   * Provider not available (credentials, etc.)
   */
  unavailable: (name: string, reason: string): CatalystError => {
    return new CatalystError(
      `AI provider "${name}" is not available: ${reason}`,
      'AIProviderUnavailable',
      'Run provider sign-in or check credentials'
    );
  }
};
