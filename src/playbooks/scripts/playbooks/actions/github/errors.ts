/**
 * GitHub error hierarchy for structured error handling
 * @module playbooks/actions/github/errors
 */

/**
 * Base error class for all GitHub-related errors
 */
export class GitHubError extends Error {
  public readonly code: string;
  public readonly guidance?: string;
  public readonly cause?: Error;

  constructor(code: string, message: string, guidance?: string, cause?: Error) {
    super(message);
    this.name = 'GitHubError';
    this.code = code;
    this.guidance = guidance;
    this.cause = cause;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, GitHubError.prototype);

    // Preserve stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error for logging or transmission
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      guidance: this.guidance,
      stack: this.stack,
      cause: this.cause
        ? {
            message: this.cause.message,
            stack: this.cause.stack,
          }
        : undefined,
    };
  }
}

/**
 * Authentication error - user is not authenticated with GitHub
 */
export class GitHubAuthError extends GitHubError {
  constructor(message: string, guidance?: string, cause?: Error) {
    super('auth_required', message, guidance, cause);
    this.name = 'GitHubAuthError';
    Object.setPrototypeOf(this, GitHubAuthError.prototype);
  }
}

/**
 * Not found error - resource (repository, issue, PR) does not exist
 */
export class GitHubNotFoundError extends GitHubError {
  constructor(message: string, guidance?: string, cause?: Error) {
    super('not_found', message, guidance, cause);
    this.name = 'GitHubNotFoundError';
    Object.setPrototypeOf(this, GitHubNotFoundError.prototype);
  }
}

/**
 * Permission error - user lacks permissions for the operation
 */
export class GitHubPermissionError extends GitHubError {
  constructor(message: string, guidance?: string, cause?: Error) {
    super('permission_denied', message, guidance, cause);
    this.name = 'GitHubPermissionError';
    Object.setPrototypeOf(this, GitHubPermissionError.prototype);
  }
}

/**
 * Rate limit error - GitHub API rate limit exceeded
 */
export class GitHubRateLimitError extends GitHubError {
  constructor(message: string, guidance?: string, cause?: Error) {
    super('rate_limit_exceeded', message, guidance, cause);
    this.name = 'GitHubRateLimitError';
    Object.setPrototypeOf(this, GitHubRateLimitError.prototype);
  }
}

/**
 * Network error - command execution or network connectivity failure
 */
export class GitHubNetworkError extends GitHubError {
  constructor(message: string, guidance?: string, cause?: Error) {
    super('network_error', message, guidance, cause);
    this.name = 'GitHubNetworkError';
    Object.setPrototypeOf(this, GitHubNetworkError.prototype);
  }
}
