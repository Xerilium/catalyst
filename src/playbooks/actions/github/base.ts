/**
 * Base class for GitHub playbook actions
 * @module playbooks/actions/github/base
 */

// @req FR:playbook-actions-github/common.validation
// @req FR:playbook-actions-github/common.result-structure
// @req FR:playbook-actions-github/errors.graceful-failure
// @req FR:playbook-actions-github/errors.access-validation
// @req NFR:playbook-actions-github/performance.validation-speed
// @req NFR:playbook-actions-github/performance.timeouts
// @req NFR:playbook-actions-github/performance.operation-speed
// @req NFR:playbook-actions-github/security.input-validation
// @req NFR:playbook-actions-github/security.no-token-logging
// @req NFR:playbook-actions-github/security.no-sensitive-errors
// @req NFR:playbook-actions-github/reliability.resource-cleanup
// @req NFR:playbook-actions-github/reliability.no-token-leakage

import { execSync } from 'child_process';
import type { PlaybookAction, PlaybookActionResult } from '../../types/action';
import {
  GitHubError,
  GitHubAuthError,
  GitHubNotFoundError,
  GitHubPermissionError,
  GitHubRateLimitError,
  GitHubNetworkError,
} from './errors';
import { CatalystError } from '@core/errors';

/**
 * Default command execution timeout (5 seconds)
 */
const DEFAULT_TIMEOUT = 5000;

/**
 * Abstract base class for all GitHub actions
 * Provides GitHub CLI execution and error handling
 */
export abstract class GitHubActionBase<TConfig, TResult>
  implements PlaybookAction<TConfig>
{
  private repositoryCache?: string;

  /**
   * Execute the GitHub action
   * Orchestrates: validation → operation → error mapping → result formatting
   */
  async execute(config: TConfig): Promise<PlaybookActionResult> {
    try {
      // Step 1: Validate configuration
      this.validateConfig(config);

      // Step 2: Execute GitHub operation
      const data = await this.executeGitHubOperation(config);

      // Step 3: Format success response
      const successMessage = this.getSuccessMessage(data);
      const resultValue = this.formatResultValue(data);
      return {
        code: 'Success',
        message: successMessage,
        value: resultValue,
      };
    } catch (error: any) {
      // Handle validation errors
      if (error instanceof CatalystError) {
        return {
          code: error.code,
          error,
        };
      }

      // Handle GitHub errors
      if (error instanceof GitHubError) {
        return {
          code: this.mapErrorCode(error),
          error: this.mapError(error),
        };
      }

      // Unexpected error
      return {
        code: this.getActionName() + 'Failed',
        error: new CatalystError(
          `Unexpected error: ${error.message || String(error)}`,
          this.getActionName() + 'Failed',
          'Check the error details and try again',
        ),
      };
    }
  }

  /**
   * Execute a GitHub CLI command
   */
  protected executeCommand(command: string): string {
    try {
      const output = execSync(command, {
        encoding: 'utf-8',
        timeout: DEFAULT_TIMEOUT,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return output.trim();
    } catch (error: any) {
      throw this.mapExecutionError(error);
    }
  }

  /**
   * Map execution errors to GitHubError types
   */
  protected mapExecutionError(error: any): GitHubError {
    const message = error.message || String(error);

    // Authentication errors
    if (
      message.includes('Not logged in') ||
      message.includes('not logged in') ||
      message.includes('auth login')
    ) {
      return new GitHubAuthError(
        'GitHub authentication required',
        'Run: gh auth login',
        error,
      );
    }

    // Not found errors
    if (
      message.includes('not found') ||
      message.includes('could not resolve') ||
      message.includes('Not Found')
    ) {
      return new GitHubNotFoundError(
        'GitHub resource not found',
        'Check that the repository, issue, or PR exists',
        error,
      );
    }

    // Permission errors
    if (
      message.includes('permission') ||
      message.includes('not accessible') ||
      message.includes('Forbidden')
    ) {
      return new GitHubPermissionError(
        'Insufficient permissions for GitHub operation',
        'Check your access token scopes and repository permissions',
        error,
      );
    }

    // Rate limit errors
    if (message.includes('rate limit') || message.includes('API rate limit')) {
      return new GitHubRateLimitError(
        'GitHub API rate limit exceeded',
        'Wait before retrying or use a different authentication token',
        error,
      );
    }

    // Timeout errors
    if (error.code === 'ETIMEDOUT' || message.includes('timed out')) {
      return new GitHubNetworkError(
        'GitHub CLI command timed out',
        'Check your network connection and try again',
        error,
      );
    }

    // Generic network/execution errors
    return new GitHubNetworkError(
      `GitHub CLI command failed: ${message}`,
      'Check your network connection and GitHub CLI installation',
      error,
    );
  }

  /**
   * Parse JSON response from GitHub CLI
   */
  protected parseJSON<T>(output: string): T {
    try {
      return JSON.parse(output) as T;
    } catch (error: any) {
      throw new GitHubError(
        'json_parse_error',
        'Failed to parse JSON response from GitHub CLI',
        'This may indicate an issue with the GitHub CLI installation',
        error,
      );
    }
  }

  /**
   * Get the current repository context (cached)
   */
  protected async getCurrentRepository(): Promise<string> {
    if (this.repositoryCache) {
      return this.repositoryCache;
    }

    const output = this.executeCommand('gh repo view --json nameWithOwner');
    const data = this.parseJSON<{ nameWithOwner: string }>(output);
    this.repositoryCache = data.nameWithOwner;
    return this.repositoryCache;
  }

  /**
   * Escape shell arguments for safe command execution
   */
  protected escapeShellArg(arg: string): string {
    // Replace single quotes with '\'' and wrap in single quotes
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Build repository flag for commands
   */
  protected async getRepoFlag(repository?: string): Promise<string> {
    if (repository) {
      return `-R ${this.escapeShellArg(repository)}`;
    }
    // Use current repository context
    const repo = await this.getCurrentRepository();
    return `-R ${this.escapeShellArg(repo)}`;
  }

  /**
   * Validate action configuration
   * Should throw CatalystError with action-specific error code if invalid
   */
  protected abstract validateConfig(config: TConfig): void;

  /**
   * Execute the GitHub operation
   * Returns result data or throws GitHubError
   */
  protected abstract executeGitHubOperation(config: TConfig): Promise<TResult>;

  /**
   * Format success message from result data
   */
  protected abstract getSuccessMessage(data: TResult): string;

  /**
   * Get the action name for error code prefixing
   * Default implementation extracts from class name (e.g., "GitHubIssueCreateAction" → "GitHubIssueCreate")
   */
  protected getActionName(): string {
    const className = this.constructor.name;
    // Remove "Action" suffix if present
    return className.endsWith('Action') ? className.slice(0, -6) : className;
  }

  /**
   * Format result value for PlaybookActionResult
   * Default implementation returns data as-is, but subclasses can override
   */
  protected formatResultValue(data: TResult): unknown {
    return data;
  }

  /**
   * Map GitHubError to action-specific error code
   */
  protected mapErrorCode(error: GitHubError): string {
    const actionName = this.getActionName();

    if (error instanceof GitHubAuthError) {
      return actionName + 'AuthenticationFailed';
    } else if (error instanceof GitHubNotFoundError) {
      return actionName + 'NotFound';
    } else if (error instanceof GitHubPermissionError) {
      return actionName + 'PermissionDenied';
    } else if (error instanceof GitHubRateLimitError) {
      return actionName + 'RateLimitExceeded';
    } else if (error instanceof GitHubNetworkError) {
      return actionName + 'NetworkError';
    } else {
      return actionName + 'Failed';
    }
  }

  /**
   * Map GitHubError to CatalystError with preserved guidance
   */
  protected mapError(error: GitHubError): CatalystError {
    const code = this.mapErrorCode(error);

    return new CatalystError(
      error.message,
      code,
      error.guidance || 'Check the error details and try again',
      error,
    );
  }
}
