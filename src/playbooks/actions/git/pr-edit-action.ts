/**
 * GitHub pull request edit action
 * @module playbooks/actions/git/pr-edit-action
 */

import { GitHubActionBase } from './base';
import type { GitHubPREditConfig } from './types';
import { CatalystError } from '@core/errors';

type Edits = Omit<GitHubPREditConfig, 'pr' | 'repository'>;
const FLAGS: [keyof Edits, string][] = [
  ['addLabels', '--add-label'],
  ['removeLabels', '--remove-label'],
  ['addAssignees', '--add-assignee'],
  ['removeAssignees', '--remove-assignee'],
];

/**
 * Action to add and remove a PR's labels and assignees
 */
// @req FR:playbook-actions-git/pr-lifecycle.edit
// @req FR:playbook-actions-git/pr-lifecycle.no-shell
export class GitHubPREditAction extends GitHubActionBase<GitHubPREditConfig, Edits> {
  static readonly actionType = 'github-pr-edit';

  static readonly primaryProperty = 'pr';

  // @req FR:playbook-actions-git/common.validation
  protected validateConfig(config: GitHubPREditConfig): void {
    if (!config?.pr || typeof config.pr !== 'number' || config.pr <= 0) {
      throw new CatalystError(
        'PR number is required and must be a positive integer',
        'GitHubPREditConfigInvalid',
        'Provide a valid pull request number',
      );
    }
  }

  protected async executeGitHubOperation(config: GitHubPREditConfig): Promise<Edits> {
    const repository = config.repository || (await this.getCurrentRepository());
    const args = FLAGS.flatMap(([key, flag]) => {
      const values = (config[key] as string[] | undefined) ?? [];
      return values.length ? [flag, values.join(',')] : [];
    });
    // Nothing to change: no call, so reruns on an unchanged PR stay quiet
    if (args.length) {
      this.executeGh(['pr', 'edit', String(config.pr), '-R', repository, ...args]);
    }
    return Object.fromEntries(FLAGS.map(([k]) => [k, config[k] ?? []])) as Edits;
  }

  protected getSuccessMessage(data: Edits): string {
    const n = Object.values(data).reduce((sum, v) => sum + (v?.length ?? 0), 0);
    return n ? `Edited PR (${n} changes)` : 'PR already up to date';
  }
}
