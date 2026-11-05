/**
 * GitHub pull request edit action
 * @module playbooks/actions/git/pr-edit-action
 */

import { GitHubActionBase } from './base';
import type { GitHubPREditConfig } from './types';
import { CatalystError } from '@core/errors';

type Edits = Omit<GitHubPREditConfig, 'pr' | 'repository'>;

/** Single-value properties and the `gh pr edit` flag that sets each */
const VALUES: [keyof Edits, string][] = [
  ['title', '--title'],
  ['body', '--body'],
  ['base', '--base'],
  ['milestone', '--milestone'],
];

/** List properties and the `gh pr edit` flag that applies each */
const LISTS: [keyof Edits, string][] = [
  ['addLabels', '--add-label'],
  ['removeLabels', '--remove-label'],
  ['addAssignees', '--add-assignee'],
  ['removeAssignees', '--remove-assignee'],
  ['addReviewers', '--add-reviewer'],
  ['removeReviewers', '--remove-reviewer'],
  ['addProjects', '--add-project'],
  ['removeProjects', '--remove-project'],
];

/**
 * Action to change any editable property of a PR
 */
// @req FR:playbook-actions-git/github-pr-edit.@action
// @req FR:playbook-actions-git/github-pr-edit.input
// @req FR:playbook-actions-git/github-pr-edit.no-shell
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

  // @req FR:playbook-actions-git/github-pr-edit.output
  // @req FR:playbook-actions-git/github-pr-edit.idempotent
  protected async executeGitHubOperation(config: GitHubPREditConfig): Promise<Edits> {
    const repository = config.repository || (await this.getCurrentRepository());
    const edits: Edits = {};
    const args: string[] = [];

    for (const [key, flag] of VALUES) {
      const value = config[key] as string | undefined;
      if (value !== undefined && value !== null) {
        args.push(flag, value);
        (edits as Record<string, unknown>)[key] = value;
      }
    }
    if (config.removeMilestone) {
      args.push('--remove-milestone');
      edits.removeMilestone = true;
    }
    for (const [key, flag] of LISTS) {
      const values = (config[key] as string[] | undefined) ?? [];
      if (values.length) {
        args.push(flag, values.join(','));
        (edits as Record<string, unknown>)[key] = values;
      }
    }

    // Nothing to change: no call, so reruns on an unchanged PR stay quiet
    if (args.length) {
      this.executeGh(['pr', 'edit', String(config.pr), '-R', repository, ...args]);
    }
    return edits;
  }

  protected getSuccessMessage(data: Edits): string {
    const n = Object.keys(data).length;
    return n ? `Edited PR (${n} properties)` : 'PR already up to date';
  }
}
