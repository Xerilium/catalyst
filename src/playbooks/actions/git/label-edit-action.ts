/**
 * GitHub label edit action
 * @module playbooks/actions/git/label-edit-action
 */

// @req FR:playbook-actions-git/labels.edit
// @req FR:playbook-actions-git/labels.no-shell
// @req FR:playbook-actions-git/common.validation
// @req FR:playbook-actions-git/common.result-structure

import { GitHubActionBase } from './base';
import type { GitHubLabelEditConfig, GitHubLabelResult } from './types';
import { normalizeColor, requireName, styleArgs } from './label-utils';
import { CatalystError } from '@core/errors';

const INVALID = 'GitHubLabelEditConfigInvalid';

/**
 * Action to rename or restyle a label in place, so issues and PRs keep it
 */
export class GitHubLabelEditAction extends GitHubActionBase<
  GitHubLabelEditConfig,
  GitHubLabelResult & { from: string }
> {
  static readonly actionType = 'github-label-edit';

  static readonly primaryProperty = 'name';

  protected validateConfig(config: GitHubLabelEditConfig): void {
    requireName(config?.name, INVALID);
    normalizeColor(config.color, INVALID);
    if (!config.newName && !config.color && config.description === undefined) {
      throw new CatalystError(
        `Nothing to change for label ${config.name}`,
        INVALID,
        'Set newName, color, or description',
      );
    }
  }

  protected async executeGitHubOperation(config: GitHubLabelEditConfig) {
    const repository = config.repository || (await this.getCurrentRepository());
    const color = normalizeColor(config.color, INVALID);
    this.executeGh([
      'label', 'edit', config.name,
      '-R', repository,
      ...(config.newName ? ['--name', config.newName] : []),
      ...styleArgs(color, config.description),
    ]);
    return { from: config.name, name: config.newName || config.name, color, description: config.description };
  }

  protected getSuccessMessage(data: GitHubLabelResult & { from: string }): string {
    return data.name === data.from ? `Updated label ${data.name}` : `Renamed label ${data.from} → ${data.name}`;
  }

  protected formatResultValue(data: GitHubLabelResult & { from: string }): GitHubLabelResult {
    return { name: data.name, color: data.color, description: data.description };
  }
}
