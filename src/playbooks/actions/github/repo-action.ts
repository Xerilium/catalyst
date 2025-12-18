/**
 * GitHub repository info action
 * @module playbooks/actions/github/repo-action
 */

// @req FR:playbook-actions-github/repository.info
// @req FR:playbook-actions-github/common.result-structure

import { GitHubActionBase } from './base';
import type { GitHubRepoConfig, GitHubRepoResult, RepoData } from './types';

/**
 * Action to get GitHub repository information
 */
export class GitHubRepoAction extends GitHubActionBase<GitHubRepoConfig, RepoData> {
  static readonly actionType = 'github-repo';

  readonly primaryProperty = 'repository';

  protected validateConfig(_config: GitHubRepoConfig): void {
    // No required fields - repository is optional (defaults to current repository)
    // Validation passes automatically
  }

  protected async executeGitHubOperation(
    config: GitHubRepoConfig,
  ): Promise<RepoData> {
    const repoFlag = await this.getRepoFlag(config.repository);
    const command = `gh repo view ${repoFlag} --json name,owner,defaultBranchRef,visibility,url`;

    const output = this.executeCommand(command);
    const rawData = this.parseJSON<any>(output);

    return {
      name: rawData.name,
      owner: rawData.owner?.login || rawData.owner,
      defaultBranch: rawData.defaultBranchRef?.name || rawData.defaultBranch || 'main',
      visibility: (rawData.visibility || 'public').toLowerCase(),
      url: rawData.url,
    };
  }

  protected getSuccessMessage(data: RepoData): string {
    return `Retrieved info for ${data.owner}/${data.name}`;
  }

  protected formatResultValue(data: RepoData): GitHubRepoResult {
    return {
      name: data.name,
      owner: data.owner,
      defaultBranch: data.defaultBranch,
      visibility: data.visibility,
      url: data.url,
    };
  }
}
