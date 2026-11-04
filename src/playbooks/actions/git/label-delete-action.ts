/**
 * GitHub label delete action
 * @module playbooks/actions/git/label-delete-action
 */

import { GitHubActionBase } from './base';
import type { GitHubLabelDeleteConfig, GitHubLabelResult } from './types';
import { requireName } from './label-utils';

const INVALID = 'GitHubLabelDeleteConfigInvalid';

/**
 * Action to delete a repository label (removes it from every issue and pull request)
 */
// @req FR:playbook-actions-git/labels.delete
// @req FR:playbook-actions-git/labels.no-shell
export class GitHubLabelDeleteAction extends GitHubActionBase<GitHubLabelDeleteConfig, GitHubLabelResult> {
  static readonly actionType = 'github-label-delete';

  static readonly primaryProperty = 'name';

  // @req FR:playbook-actions-git/common.validation
  protected validateConfig(config: GitHubLabelDeleteConfig): void {
    requireName(config?.name, INVALID);
  }

  // @req FR:playbook-actions-git/common.result-structure
  protected async executeGitHubOperation(config: GitHubLabelDeleteConfig): Promise<GitHubLabelResult> {
    const repository = config.repository || (await this.getCurrentRepository());
    this.executeGh(['label', 'delete', config.name, '-R', repository, '--yes']);
    return { name: config.name };
  }

  protected getSuccessMessage(data: GitHubLabelResult): string {
    return `Deleted label ${data.name}`;
  }
}
