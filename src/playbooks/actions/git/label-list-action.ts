/**
 * GitHub label list action
 * @module playbooks/actions/git/label-list-action
 */

// @req FR:playbook-actions-git/labels.list
// @req FR:playbook-actions-git/labels.no-shell
// @req FR:playbook-actions-git/common.validation
// @req FR:playbook-actions-git/common.result-structure

import { GitHubActionBase } from './base';
import type { GitHubLabelListConfig, LabelData } from './types';
import { CatalystError } from '@core/errors';

const QUERY = `query($owner: String!, $name: String!, $endCursor: String) {
  repository(owner: $owner, name: $name) {
    labels(first: 100, after: $endCursor) {
      pageInfo { hasNextPage endCursor }
      nodes { name color description issues { totalCount } pullRequests { totalCount } }
    }
  }
}`;

interface LabelPage {
  data: {
    repository: {
      labels: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: {
          name: string;
          color: string;
          description: string | null;
          issues: { totalCount: number };
          pullRequests: { totalCount: number };
        }[];
      };
    };
  };
}

/**
 * Action to list every repository label with its issue + PR usage
 */
export class GitHubLabelListAction extends GitHubActionBase<
  GitHubLabelListConfig,
  { repository: string; labels: LabelData[] }
> {
  static readonly actionType = 'github-label-list';

  static readonly primaryProperty = 'repository';

  protected validateConfig(config: GitHubLabelListConfig): void {
    if (config?.repository && !/^[^/\s]+\/[^/\s]+$/.test(config.repository)) {
      throw new CatalystError(
        `Repository must be in owner/repo format: ${config.repository}`,
        'GitHubLabelListConfigInvalid',
        'Use owner/repo, or omit repository to use the current one',
      );
    }
  }

  protected async executeGitHubOperation(config: GitHubLabelListConfig) {
    const repository = config?.repository || (await this.getCurrentRepository());
    const [owner, name] = repository.split('/');
    const labels: LabelData[] = [];
    let cursor: string | null = null;

    do {
      const args = ['api', 'graphql', '-f', `owner=${owner}`, '-f', `name=${name}`, '-f', `query=${QUERY}`];
      if (cursor) {
        args.push('-f', `endCursor=${cursor}`);
      }
      const page: LabelPage['data']['repository']['labels'] =
        this.parseJSON<LabelPage>(this.executeGh(args)).data.repository.labels;
      for (const l of page.nodes) {
        labels.push({
          name: l.name,
          color: l.color,
          description: l.description || '',
          usage: l.issues.totalCount + l.pullRequests.totalCount,
        });
      }
      cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    } while (cursor);

    return { repository, labels };
  }

  protected getSuccessMessage(data: { repository: string; labels: LabelData[] }): string {
    return `Listed ${data.labels.length} labels in ${data.repository}`;
  }

  protected formatResultValue(data: { repository: string; labels: LabelData[] }): LabelData[] {
    return data.labels;
  }
}
