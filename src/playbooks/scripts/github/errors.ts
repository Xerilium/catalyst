/**
 * Error detection and mapping utilities for GitHub CLI errors
 * Maps CLI error messages to typed error classes
 */

import {
  GitHubError,
  GitHubAuthError,
  GitHubNotFoundError,
  GitHubNetworkError,
  GitHubRateLimitError,
  GitHubPermissionError,
} from './types';

/**
 * Detect error type from error message patterns
 */
export function detectErrorType(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('auth') || message.includes('not logged in')) return 'auth';
  if (message.includes('not found') || message.includes('could not resolve')) return 'not_found';
  if (message.includes('network') || message.includes('connection') || message.includes('timeout') || message.includes('lookup')) return 'network';
  if (message.includes('rate limit')) return 'rate_limit';
  if (message.includes('permission') || message.includes('access')) return 'permission';

  return 'unknown';
}

/**
 * Map CLI error to appropriate GitHubError type
 */
export function mapCLIError(error: Error): GitHubError {
  const type = detectErrorType(error);

  switch (type) {
    case 'auth':
      return new GitHubAuthError(
        'GitHub CLI not authenticated',
        'Run: gh auth login or catalyst-github auth',
        error
      );
    case 'not_found':
      return new GitHubNotFoundError(
        'Resource not found',
        'Check the ID or number and try again',
        error
      );
    case 'network':
      return new GitHubNetworkError(
        'Network error occurred',
        'Check your internet connection and retry',
        error
      );
    case 'rate_limit':
      return new GitHubRateLimitError(
        'API rate limit exceeded',
        'Wait a few minutes and try again',
        error
      );
    case 'permission':
      return new GitHubPermissionError(
        'Insufficient permissions',
        'Request appropriate access from repository owner',
        error
      );
    default:
      return new GitHubError(
        error.message,
        'UNKNOWN_ERROR',
        'Check error message for details',
        error
      );
  }
}
