/**
 * GitHub pull request list action
 * @module playbooks/actions/git/pr-list-action
 */

import { GitHubActionBase } from './base';
import type { GitHubPRListConfig, PRListItem } from './types';
import { CatalystError } from '@core/errors';

const STATES = ['open', 'closed', 'all'];

/** A PR as `gh api repos/{repo}/pulls` lists it */
interface ApiPull {
  number: number;
  title: string;
  state: string;
  merged_at?: string | null;
  head: { ref: string };
  base: { ref: string };
}

/**
 * Action to list a repository's pull requests, or the one for the checked-out branch
 */
// @req FR:playbook-actions-git/github-pr-list.@action
// @req FR:playbook-actions-git/github-pr-list.no-shell
export class GitHubPRListAction extends GitHubActionBase<GitHubPRListConfig, PRListItem[]> {
  static readonly actionType = 'github-pr-list';

  static readonly primaryProperty = 'state';

  // @req FR:playbook-actions-git/github-pr-list.input
  // @req FR:playbook-actions-git/common.validation
  protected validateConfig(config: GitHubPRListConfig): void {
    if (config?.state !== undefined && !STATES.includes(config.state)) {
      throw new CatalystError(
        `Unknown state: ${config.state}`,
        'GitHubPRListConfigInvalid',
        `Use one of: ${STATES.join(', ')}`,
      );
    }
  }

  // @req FR:playbook-actions-git/github-pr-list.paginate
  // @req FR:playbook-actions-git/github-pr-list.current-branch
  // @req FR:playbook-actions-git/github-pr-list.output
  protected async executeGitHubOperation(config: GitHubPRListConfig): Promise<PRListItem[]> {
    const repository = config.repository || (await this.getCurrentRepository());

    if (config.currentBranch) {
      try {
        const pr = JSON.parse(
          this.executeGh(['pr', 'view', '-R', repository, '--json', 'number,title,headRefName,baseRefName,state']),
        ) as { number: number; title: string; headRefName: string; baseRefName: string; state: string };
        return [{ number: pr.number, title: pr.title, headRef: pr.headRefName, baseRef: pr.baseRefName, state: pr.state }];
      } catch (error) {
        // A branch with no PR is an answer, not a failure
        if (/no pull requests? found/i.test(error instanceof Error ? error.message : String(error))) {
          return [];
        }
        throw error;
      }
    }

    const query = [`state=${config.state ?? 'open'}`, 'per_page=100', ...(config.base ? [`base=${encodeURIComponent(config.base)}`] : [])];
    const pages = JSON.parse(
      this.executeGh(['api', `repos/${repository}/pulls?${query.join('&')}`, '--paginate', '--slurp']),
    ) as ApiPull[][];
    return pages
      .flat()
      .filter((p) => (!config.base || p.base.ref === config.base) && (!config.head || p.head.ref === config.head))
      .sort((a, b) => a.number - b.number)
      .map((p) => ({
        number: p.number,
        title: p.title,
        headRef: p.head.ref,
        baseRef: p.base.ref,
        state: p.merged_at ? 'MERGED' : p.state.toUpperCase(),
      }));
  }

  protected getSuccessMessage(data: PRListItem[]): string {
    return `Found ${data.length} PR${data.length === 1 ? '' : 's'}`;
  }
}
