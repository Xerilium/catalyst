/**
 * GitHub issue create action
 * @module playbooks/actions/github/issue-create-action
 */

import { GitHubActionBase } from './base';
import type {
  GitHubIssueCreateConfig,
  GitHubIssueResult,
  IssueData,
} from './types';
import { CatalystError } from '../../../errors';

/**
 * Action to create a new GitHub issue
 */
export class GitHubIssueCreateAction extends GitHubActionBase<
  GitHubIssueCreateConfig,
  IssueData
> {
  static readonly primaryProperty = 'title';

  protected validateConfig(config: GitHubIssueCreateConfig): void {
    if (!config.title || config.title.trim() === '') {
      throw new CatalystError(
        'Issue title is required and cannot be empty',
        'GitHubIssueCreateConfigInvalid',
        'Provide a non-empty title for the GitHub issue',
      );
    }
  }

  protected async executeGitHubOperation(
    config: GitHubIssueCreateConfig,
  ): Promise<IssueData> {
    const repoFlag = await this.getRepoFlag(config.repository);
    let command = `gh issue create ${repoFlag} --title ${this.escapeShellArg(config.title)}`;

    if (config.body) {
      command += ` --body ${this.escapeShellArg(config.body)}`;
    }
    if (config.labels && config.labels.length > 0) {
      command += ` --label ${config.labels.map((l) => this.escapeShellArg(l)).join(',')}`;
    }
    if (config.assignees && config.assignees.length > 0) {
      command += ` --assignee ${config.assignees.join(',')}`;
    }

    command += ' --json number,url,title,body,state,labels,assignees';

    const output = this.executeCommand(command);
    const rawData = this.parseJSON<any>(output);

    return {
      number: rawData.number,
      url: rawData.url || rawData.html_url,
      title: rawData.title,
      body: rawData.body,
      state: rawData.state,
      labels: rawData.labels?.map((l: any) => l.name) || [],
      assignees: rawData.assignees?.map((a: any) => a.login) || [],
    };
  }

  protected getSuccessMessage(data: IssueData): string {
    return `Created issue #${data.number}: ${data.title}`;
  }

  protected formatResultValue(data: IssueData): GitHubIssueResult {
    return {
      number: data.number,
      url: data.url,
      title: data.title,
      state: data.state,
    };
  }
}
