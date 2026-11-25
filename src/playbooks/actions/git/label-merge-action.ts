/**
 * GitHub label merge action
 * @module playbooks/actions/git/label-merge-action
 */

import { GitHubActionBase } from './base';
import type { GitHubLabelMergeConfig, GitHubLabelMergeResult } from './types';
import { requireName } from './label-utils';
import { CatalystError } from '@core/errors';

const INVALID = 'GitHubLabelMergeConfigInvalid';

/**
 * Action to merge a duplicate label into another: every issue and PR that
 * carries `name` gets `into`, then `name` is deleted
 */
// @req FR:playbook-actions-git/labels.merge
// @req FR:playbook-actions-git/labels.no-shell
export class GitHubLabelMergeAction extends GitHubActionBase<GitHubLabelMergeConfig, GitHubLabelMergeResult> {
  static readonly actionType = 'github-label-merge';

  static readonly primaryProperty = 'name';

  // @req FR:playbook-actions-git/common.validation
  protected validateConfig(config: GitHubLabelMergeConfig): void {
    requireName(config?.name, INVALID);
    requireName(config.into, INVALID);
    // @req FR:playbook-actions-git/labels.merge.comma
    // The issues `labels` filter splits on commas, so it would match the wrong items
    if (config.name.includes(',')) {
      throw new CatalystError(
        `Cannot merge label ${config.name}: names with a comma are not supported`,
        INVALID,
        'Rename the label without a comma, then merge it',
      );
    }
    if (config.name === config.into) {
      throw new CatalystError(
        `Cannot merge label ${config.name} into itself`,
        INVALID,
        'Set into to a different label',
      );
    }
  }

  // @req FR:playbook-actions-git/common.result-structure
  protected async executeGitHubOperation(config: GitHubLabelMergeConfig): Promise<GitHubLabelMergeResult> {
    const repository = config.repository || (await this.getCurrentRepository());
    // @req FR:playbook-actions-git/labels.merge.target
    // Adding a missing label would create it grey, splitting the label
    try {
      this.executeGh(['api', `repos/${repository}/labels/${encodeURIComponent(config.into)}`, '--jq', '.name']);
    } catch (e) {
      throw new CatalystError(
        `Cannot merge label ${config.name}: target label ${config.into} not found (${(e as Error).message})`,
        'GitHubLabelMergeTargetMissing',
        `Create or rename ${config.into} first`,
      );
    }
    // @req FR:playbook-actions-git/labels.merge.resume
    // The issues endpoint returns pull requests too; skip items that already have the target
    const numbers = this.executeGh([
      'api', '--paginate', '-X', 'GET', `repos/${repository}/issues`,
      '-f', `labels=${config.name}`, '-f', 'state=all', '-f', 'per_page=100',
      '--jq', `.[] | select(any(.labels[]; .name == ${JSON.stringify(config.into)}) | not) | .number`,
    ])
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean);
    // Add before delete: a failure here leaves the duplicate, so nothing loses its label
    for (const n of numbers) {
      this.executeGh(['api', '-X', 'POST', `repos/${repository}/issues/${n}/labels`, '-f', `labels[]=${config.into}`]);
    }
    this.executeGh(['label', 'delete', config.name, '-R', repository, '--yes']);
    return { name: config.name, into: config.into, moved: numbers.length };
  }

  protected getSuccessMessage(data: GitHubLabelMergeResult): string {
    return `Merged label ${data.name} into ${data.into} (${data.moved} moved)`;
  }
}
