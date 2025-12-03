/**
 * GitHub pull request create action
 * @module playbooks/actions/github/pr-create-action
 */

import { GitHubActionBase } from './base';
import type { GitHubPRCreateConfig, GitHubPRResult, PRData } from './types';
import { CatalystError } from '../../../errors';

/**
 * Action to create a new GitHub pull request
 */
export class GitHubPRCreateAction extends GitHubActionBase<GitHubPRCreateConfig, PRData> {
  static readonly actionType = 'github-pr-create';

  readonly primaryProperty = 'title';

  protected validateConfig(config: GitHubPRCreateConfig): void {
    if (!config.title || config.title.trim() === '') {
      throw new CatalystError(
        'PR title is required and cannot be empty',
        'GitHubPRCreateConfigInvalid',
        'Provide a non-empty title for the pull request',
      );
    }

    if (!config.head || config.head.trim() === '') {
      throw new CatalystError(
        'Head branch is required and cannot be empty',
        'GitHubPRCreateConfigInvalid',
        'Provide the source branch name (head)',
      );
    }

    if (!config.base || config.base.trim() === '') {
      throw new CatalystError(
        'Base branch is required and cannot be empty',
        'GitHubPRCreateConfigInvalid',
        'Provide the target branch name (base)',
      );
    }
  }

  protected async executeGitHubOperation(
    config: GitHubPRCreateConfig,
  ): Promise<PRData> {
    const repoFlag = await this.getRepoFlag(config.repository);
    let command = `gh pr create ${repoFlag} --title ${this.escapeShellArg(config.title)} --head ${this.escapeShellArg(config.head)} --base ${this.escapeShellArg(config.base)}`;

    if (config.body) {
      command += ` --body ${this.escapeShellArg(config.body)}`;
    }
    if (config.draft) {
      command += ' --draft';
    }

    command += ' --json number,url,title,body,state,headRefName,baseRefName,isDraft';

    const output = this.executeCommand(command);
    const rawData = this.parseJSON<any>(output);

    return {
      number: rawData.number,
      url: rawData.url || rawData.html_url,
      title: rawData.title,
      body: rawData.body,
      state: rawData.state,
      head: rawData.headRefName || rawData.head?.ref || config.head,
      base: rawData.baseRefName || rawData.base?.ref || config.base,
      draft: rawData.isDraft ?? rawData.draft,
    };
  }

  protected getSuccessMessage(data: PRData): string {
    return `Created PR #${data.number}: ${data.title}`;
  }

  protected formatResultValue(data: PRData): GitHubPRResult {
    return {
      number: data.number,
      url: data.url,
      title: data.title,
      state: data.state,
      head: data.head,
      base: data.base,
    };
  }
}
