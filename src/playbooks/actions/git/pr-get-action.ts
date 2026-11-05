/**
 * GitHub pull request snapshot action
 * @module playbooks/actions/git/pr-get-action
 */

import { GitHubActionBase } from './base';
import type { GitHubPRGetConfig, PRSnapshot } from './types';
import { CatalystError } from '@core/errors';

const THREADS = `query($owner: String!, $name: String!, $pr: Int!, $endCursor: String) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100, after: $endCursor) {
        pageInfo { hasNextPage endCursor }
        nodes { isResolved comments(last: 100) { nodes { author { login } body } } }
      }
    }
  }
}`;

const FAIL = ['FAILURE', 'ERROR', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE'];
const SKIP = ['SKIPPED', 'CANCELLED'];
const BOT = /\[bot\]$|^copilot/i;

/** Turn a CODEOWNERS pattern into a regex over repo-relative paths */
function ownerPattern(pattern: string): RegExp {
  const anchored = pattern.startsWith('/') || pattern.slice(0, -1).includes('/');
  const body = pattern
    .replace(/^\//, '')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\u0000/g, '.*');
  const tail = pattern.endsWith('/') ? '.*' : '(/.*)?';
  return new RegExp(`^${anchored ? '' : '(.*/)?'}${body}${tail}$`);
}

/** Users that own `files` per CODEOWNERS (last matching rule wins); teams can't be assigned */
// @req FR:pull-request-workflow/lifecycle.autopilot-merge.code-owner
export function codeOwnersFor(codeowners: string, files: string[]): { owners: string[]; covered: boolean } {
  const rules = codeowners
    .split('\n')
    .map((l) => l.replace(/#.*/, '').trim().split(/\s+/))
    .filter((p) => p.length > 1)
    .map(([pattern, ...owners]) => ({ re: ownerPattern(pattern), owners }));
  const owners = new Set<string>();
  let covered = false;
  for (const file of files) {
    const rule = [...rules].reverse().find((r) => r.re.test(file));
    if (rule) {
      covered = true;
      rule.owners.filter((o) => !o.includes('/')).forEach((o) => owners.add(o.replace(/^@/, '')));
    }
  }
  return { owners: [...owners], covered };
}

/**
 * Action to read a PR's labels, reviews, checks, threads, and code owners
 */
// @req FR:playbook-actions-git/pr-lifecycle.get
// @req FR:playbook-actions-git/pr-lifecycle.no-shell
export class GitHubPRGetAction extends GitHubActionBase<GitHubPRGetConfig, PRSnapshot> {
  static readonly actionType = 'github-pr-get';

  static readonly primaryProperty = 'pr';

  // @req FR:playbook-actions-git/common.validation
  protected validateConfig(config: GitHubPRGetConfig): void {
    if (!config?.pr || typeof config.pr !== 'number' || config.pr <= 0) {
      throw new CatalystError(
        'PR number is required and must be a positive integer',
        'GitHubPRGetConfigInvalid',
        'Provide a valid pull request number',
      );
    }
  }

  /** Every page of a REST list (--slurp wraps each page in an outer array) */
  private list<T>(path: string): T[] {
    return this.parseJSON<T[][]>(this.executeGh(['api', path, '--paginate', '--slurp'])).flat();
  }

  protected async executeGitHubOperation(config: GitHubPRGetConfig): Promise<PRSnapshot> {
    const repository = config.repository || (await this.getCurrentRepository());
    const [owner, name] = repository.split('/');
    const pr = String(config.pr);

    const view = this.parseJSON<any>(
      this.executeGh([
        'pr', 'view', pr, '-R', repository, '--json',
        'author,isDraft,state,labels,assignees,headRefOid,baseRefName,latestReviews,statusCheckRollup,mergeable',
      ]),
    );

    // @req FR:playbook-actions-git/pr-lifecycle.get.paginate
    // @req FR:pull-request-workflow/lifecycle.needs-attention.threads
    const threads: PRSnapshot['threads'] = [];
    let cursor: string | null = null;
    do {
      const args = ['api', 'graphql', '-f', `owner=${owner}`, '-f', `name=${name}`, '-F', `pr=${pr}`, '-f', `query=${THREADS}`];
      if (cursor) {
        args.push('-f', `endCursor=${cursor}`);
      }
      const page: any = this.parseJSON<any>(this.executeGh(args)).data.repository.pullRequest.reviewThreads;
      for (const t of page.nodes) {
        threads.push({
          resolved: t.isResolved,
          comments: t.comments.nodes.map((c: any) => ({ author: c.author?.login ?? '', body: c.body ?? '' })),
        });
      }
      cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    } while (cursor);

    const changedFiles = this.list<{ filename: string }>(`repos/${repository}/pulls/${pr}/files`).map((f) => f.filename);

    let codeowners = '';
    for (const path of ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS']) {
      try {
        codeowners = this.executeGh([
          'api', `repos/${repository}/contents/${path}?ref=${view.baseRefName}`,
          '-H', 'Accept: application/vnd.github.raw',
        ]);
        break;
      } catch {
        // Not at this path; no CODEOWNERS leaves code-owner assignment empty
      }
    }
    const { owners, covered } = codeOwnersFor(codeowners, changedFiles);

    const certified = this.list<{ body: string }>(`repos/${repository}/issues/${pr}/comments`)
      .map((c) => /☑️ Finalized at ([0-9a-f]{7,40})/i.exec(c.body)?.[1])
      .filter(Boolean)
      .pop();

    // Latest run per check
    const checks = new Map<string, PRSnapshot['checks'][number]['state']>();
    for (const c of view.statusCheckRollup ?? []) {
      const result = String(c.conclusion || c.state || '').toUpperCase();
      const done = c.status ? c.status === 'COMPLETED' : !['PENDING', 'EXPECTED'].includes(result);
      checks.set(
        c.name || c.context,
        !done ? 'pending' : FAIL.includes(result) ? 'fail' : SKIP.includes(result) ? 'skip' : 'pass',
      );
    }

    return {
      author: view.author.login,
      isDraft: view.isDraft,
      state: view.state,
      headSha: view.headRefOid,
      baseRef: view.baseRefName,
      labels: view.labels.map((l: any) => l.name),
      assignees: view.assignees.map((a: any) => a.login),
      reviews: (view.latestReviews ?? []).map((r: any) => ({
        author: r.author?.login ?? '',
        state: r.state,
        bot: BOT.test(r.author?.login ?? ''),
      })),
      checks: [...checks].map(([n, state]) => ({ name: n, state })),
      threads,
      changedFiles,
      codeOwners: owners,
      signOffRequired: covered,
      certifiedSha: certified,
      mergeable: view.mergeable,
    };
  }

  protected getSuccessMessage(data: PRSnapshot): string {
    return `Read PR (${data.threads.length} threads, ${data.checks.length} checks)`;
  }
}
