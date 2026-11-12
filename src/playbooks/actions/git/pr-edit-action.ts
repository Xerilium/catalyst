/**
 * GitHub pull request edit action
 * @module playbooks/actions/git/pr-edit-action
 */

import { GitHubActionBase } from './base';
import type { GitHubPREditConfig, PRSnapshot } from './types';
import { readPullRequest } from './pr-get-action';
import { CatalystError } from '@core/errors';

type Edits = Omit<GitHubPREditConfig, 'pr' | 'repository' | 'assignees'>;

/** List entries with blanks and duplicates dropped, so a playbook can pass `cond ? name : ''` */
const clean = (values: unknown): string[] =>
  Array.isArray(values)
    ? [...new Set(values.filter((v): v is string => typeof v === 'string' && v.trim() !== ''))]
    : [];

const has = (list: string[], value: string) => list.some((v) => v.toLowerCase() === value.toLowerCase());

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
export class GitHubPREditAction extends GitHubActionBase<GitHubPREditConfig, PRSnapshot> {
  static readonly actionType = 'github-pr-edit';

  static readonly primaryProperty = 'pr';

  /** Properties the last run changed, for the success message */
  private changed = 0;

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
  protected async executeGitHubOperation(config: GitHubPREditConfig): Promise<PRSnapshot> {
    const repository = config.repository || (await this.getCurrentRepository());
    const edits: Edits = {};
    const args: string[] = [];

    const lists = Object.fromEntries(LISTS.map(([key]) => [key, clean(config[key])])) as Record<keyof Edits, string[]>;

    // Read the PR's labels and assignees only when they're being changed, so
    // an add already applied or a remove already gone isn't sent
    // @req FR:playbook-actions-git/github-pr-edit.assignees
    // @req FR:playbook-actions-git/github-pr-edit.idempotent
    const exact = config.assignees === undefined || config.assignees === null ? undefined : clean(config.assignees);
    const touches = ['addLabels', 'removeLabels', 'addAssignees', 'removeAssignees'] as const;
    if (exact || touches.some((k) => lists[k].length)) {
      const current = JSON.parse(
        this.executeGh(['pr', 'view', String(config.pr), '-R', repository, '--json', 'labels,assignees']),
      ) as { labels: { name: string }[]; assignees: { login: string }[] };
      const labels = current.labels.map((l) => l.name);
      const assignees = current.assignees.map((a) => a.login);
      if (exact) {
        lists.addAssignees = clean([...lists.addAssignees, ...exact]);
        lists.removeAssignees = clean([...lists.removeAssignees, ...assignees.filter((a) => !has(exact, a))]);
      }
      lists.addLabels = lists.addLabels.filter((l) => !has(labels, l));
      lists.removeLabels = lists.removeLabels.filter((l) => has(labels, l));
      lists.addAssignees = lists.addAssignees.filter((a) => !has(assignees, a));
      lists.removeAssignees = lists.removeAssignees.filter((a) => has(assignees, a));
    }

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
      const values = lists[key];
      if (values.length) {
        args.push(flag, values.join(','));
        (edits as Record<string, unknown>)[key] = values;
      }
    }

    // Nothing to change: no edit, so reruns on an unchanged PR stay quiet
    if (args.length) {
      this.executeGh(['pr', 'edit', String(config.pr), '-R', repository, ...args]);
    }
    this.changed = Object.keys(edits).length;
    return readPullRequest((a) => this.executeGh(a), repository, config.pr);
  }

  protected getSuccessMessage(): string {
    return this.changed ? `Edited PR (${this.changed} properties)` : 'PR already up to date';
  }
}
