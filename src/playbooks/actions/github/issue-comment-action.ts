/**
 * GitHub issue comment action
 * @module playbooks/actions/github/issue-comment-action
 */

import { GitHubActionBase } from './base';
import type { GitHubIssueCommentConfig, CommentData } from './types';
import { CatalystError } from '@core/errors';

/**
 * Result type for issue comment action (simplified to id and url)
 */
interface IssueCommentResult {
  id: number;
  url: string;
}

/**
 * Action to add a comment to an existing GitHub issue
 */
export class GitHubIssueCommentAction extends GitHubActionBase<
  GitHubIssueCommentConfig,
  CommentData
> {
  static readonly actionType = 'github-issue-comment';

  readonly primaryProperty = 'issue';

  protected validateConfig(config: GitHubIssueCommentConfig): void {
    if (!config.issue || typeof config.issue !== 'number' || config.issue <= 0) {
      throw new CatalystError(
        'Issue number is required and must be a positive integer',
        'GitHubIssueCommentConfigInvalid',
        'Provide a valid issue number',
      );
    }

    if (!config.body || config.body.trim() === '') {
      throw new CatalystError(
        'Comment body is required and cannot be empty',
        'GitHubIssueCommentConfigInvalid',
        'Provide a non-empty comment body',
      );
    }
  }

  protected async executeGitHubOperation(
    config: GitHubIssueCommentConfig,
  ): Promise<CommentData> {
    const repoFlag = await this.getRepoFlag(config.repository);
    const command = `gh issue comment ${config.issue} ${repoFlag} --body ${this.escapeShellArg(config.body)} --json id,url,body,createdAt`;

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
    return `Added comment to issue`;
  }

  protected formatResultValue(data: CommentData): IssueCommentResult {
    return {
      id: data.id,
      url: data.url,
    };
  }

  // Override execute to provide better success message with issue number
  async execute(config: GitHubIssueCommentConfig) {
    const result = await super.execute(config);
    if (result.code === 'Success') {
      result.message = `Added comment to issue #${config.issue}`;
    }
    return result;
  }
}
