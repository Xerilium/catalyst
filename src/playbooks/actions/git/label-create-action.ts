/**
 * GitHub label create action
 * @module playbooks/actions/git/label-create-action
 */

import { GitHubActionBase } from './base';
import type { GitHubLabelCreateConfig, GitHubLabelResult } from './types';
import { normalizeColor, requireName, styleArgs } from './label-utils';

const INVALID = 'GitHubLabelCreateConfigInvalid';

/**
 * Action to create a repository label
 */
// @req FR:playbook-actions-git/labels.create
// @req FR:playbook-actions-git/labels.no-shell
export class GitHubLabelCreateAction extends GitHubActionBase<GitHubLabelCreateConfig, GitHubLabelResult> {
  static readonly actionType = 'github-label-create';

  static readonly primaryProperty = 'name';

  // @req FR:playbook-actions-git/common.validation
  protected validateConfig(config: GitHubLabelCreateConfig): void {
    requireName(config?.name, INVALID);
    normalizeColor(config.color, INVALID);
  }

  // @req FR:playbook-actions-git/common.result-structure
  protected async executeGitHubOperation(config: GitHubLabelCreateConfig): Promise<GitHubLabelResult> {
    const repository = config.repository || (await this.getCurrentRepository());
    const color = normalizeColor(config.color, INVALID);
    this.executeGh(['label', 'create', config.name, '-R', repository, ...styleArgs(color, config.description)]);
    return { name: config.name, color, description: config.description };
  }

  protected getSuccessMessage(data: GitHubLabelResult): string {
    return `Created label ${data.name}`;
  }
}
