/**
 * Error factory functions for AI actions
 */

import { CatalystError } from '../../../errors';

/**
 * Error factories for AIPromptAction
 */
export const AIPromptErrors = {
  /**
   * Missing prompt property error
   *
   * @req FR:playbook-actions-ai/ai-prompt.validation.prompt-missing
   */
  promptMissing: (): CatalystError => {
    return new CatalystError(
      'AI prompt action requires prompt property',
      'AIPromptMissing',
      'Provide a prompt string in the ai-prompt action configuration'
    );
  },

  /**
   * Empty prompt string error
   *
   * @req FR:playbook-actions-ai/ai-prompt.validation.prompt-empty
   */
  promptEmpty: (): CatalystError => {
    return new CatalystError(
      'AI prompt cannot be empty',
      'AIPromptEmpty',
      'Provide a non-empty prompt string'
    );
  },

  /**
   * Invalid timeout value error
   *
   * @req FR:playbook-actions-ai/ai-prompt.validation.timeout-invalid
   */
  timeoutInvalid: (value: number): CatalystError => {
    return new CatalystError(
      `Invalid inactivity timeout: ${value}`,
      'InvalidAITimeout',
      'Timeout must be a non-negative number in milliseconds'
    );
  },

  /**
   * Inactivity timeout exceeded error
   *
   * @req FR:playbook-actions-ai/ai-prompt.timeout.error
   */
  timeout: (timeoutMs: number): CatalystError => {
    return new CatalystError(
      `AI request timed out after ${timeoutMs}ms of inactivity`,
      'AIPromptTimeout',
      'Increase inactivityTimeout or check if AI is responding'
    );
  },

  /**
   * Output file not created error
   */
  outputFileMissing: (filePath: string): CatalystError => {
    return new CatalystError(
      `AI did not write output to expected file: ${filePath}`,
      'AIOutputFileMissing',
      'AI was instructed to write output to a file but the file was not created'
    );
  }
};

/**
 * Error factories for AI providers
 */
export const AIProviderErrors = {
  /**
   * Provider not found error
   *
   * @req FR:playbook-actions-ai/provider.factory
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
