/**
 * GitHub pull request comment action
 * @module playbooks/actions/github/pr-comment-action
 */

import { GitHubActionBase } from './base';
import type { GitHubPRCommentConfig, CommentData } from './types';
import { CatalystError } from '@core/errors';

/**
 * Result type for PR comment action (simplified to id and url)
 */
interface PRCommentResult {
  id: number;
  url: string;
}

/**
 * Action to add a comment to an existing GitHub pull request
 */
export class GitHubPRCommentAction extends GitHubActionBase<GitHubPRCommentConfig, CommentData> {
  static readonly actionType = 'github-pr-comment';

  readonly primaryProperty = 'pr';

  protected validateConfig(config: GitHubPRCommentConfig): void {
    if (!config.pr || typeof config.pr !== 'number' || config.pr <= 0) {
      throw new CatalystError(
        'PR number is required and must be a positive integer',
        'GitHubPRCommentConfigInvalid',
        'Provide a valid pull request number',
      );
    }

    if (!config.body || config.body.trim() === '') {
      throw new CatalystError(
        'Comment body is required and cannot be empty',
        'GitHubPRCommentConfigInvalid',
        'Provide a non-empty comment body',
      );
    }
  }

  protected async executeGitHubOperation(
    config: GitHubPRCommentConfig,
  ): Promise<CommentData> {
    const repoFlag = await this.getRepoFlag(config.repository);
    const command = `gh pr comment ${config.pr} ${repoFlag} --body ${this.escapeShellArg(config.body)} --json id,url,body,createdAt`;

    const output = this.executeCommand(command);
    const rawData = this.parseJSON<any>(output);

    return {
      id: rawData.id,
      url: rawData.url || rawData.html_url,
      body: rawData.body,
      createdAt: rawData.createdAt || rawData.created_at,
    };
  }

  protected getSuccessMessage(_data: CommentData): string {
    return `Added comment to PR`;
  }

  protected formatResultValue(data: CommentData): PRCommentResult {
    return {
      id: data.id,
      url: data.url,
    };
  }

  // Override execute to provide better success message with PR number
  async execute(config: GitHubPRCommentConfig) {
    const result = await super.execute(config);
    if (result.code === 'Success') {
      result.message = `Added comment to PR #${config.pr}`;
    }
    return result;
  }
}
