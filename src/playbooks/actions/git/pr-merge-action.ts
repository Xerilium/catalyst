/**
 * GitHub pull request merge action
 * @module playbooks/actions/git/pr-merge-action
 */

import { GitHubActionBase } from './base';
import type { GitHubPRMergeConfig } from './types';
import { CatalystError } from '@core/errors';

/**
 * Action to squash-merge a PR at a given head commit
 */
// @req FR:playbook-actions-git/pr-lifecycle.merge
// @req FR:playbook-actions-git/pr-lifecycle.no-shell
// @req FR:pull-request-workflow/lifecycle.autopilot-merge.head-sha
// @req FR:pull-request-workflow/lifecycle.autopilot-merge.no-bypass
export class GitHubPRMergeAction extends GitHubActionBase<GitHubPRMergeConfig, { merged: boolean; reason?: string }> {
  static readonly actionType = 'github-pr-merge';

  static readonly primaryProperty = 'pr';

  // @req FR:playbook-actions-git/common.validation
  protected validateConfig(config: GitHubPRMergeConfig): void {
    if (!config?.pr || typeof config.pr !== 'number' || config.pr <= 0) {
      throw new CatalystError(
        'PR number is required and must be a positive integer',
        'GitHubPRMergeConfigInvalid',
        'Provide a valid pull request number',
      );
    }
    if (!/^[0-9a-f]{7,40}$/i.test(config.sha ?? '')) {
      throw new CatalystError(
        'Head commit sha is required',
        'GitHubPRMergeConfigInvalid',
        'Pass the head commit just read from the PR',
      );
    }
  }

  // @req FR:playbook-actions-git/pr-lifecycle.merge.no-bypass
  // Never `--admin`: branch protection stays in force
  protected async executeGitHubOperation(config: GitHubPRMergeConfig) {
    const repository = config.repository || (await this.getCurrentRepository());
    try {
      this.executeGh([
        'pr', 'merge', String(config.pr), '-R', repository,
        '--squash', '--match-head-commit', config.sha,
      ]);
      return { merged: true };
    } catch (error: any) {
      // @req FR:playbook-actions-git/pr-lifecycle.merge.refused
      return { merged: false, reason: String(error?.message ?? error) };
    }
  }

  protected getSuccessMessage(data: { merged: boolean; reason?: string }): string {
    return data.merged ? 'Merged PR' : `Merge refused: ${data.reason}`;
  }
}
