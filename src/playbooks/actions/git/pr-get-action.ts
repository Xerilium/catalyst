/**
 * GitHub pull request snapshot action
 * @module playbooks/actions/git/pr-get-action
 */

import { GitHubActionBase } from './base';
import type { GitHubPRGetConfig, PRSnapshot } from './types';
import { CatalystError } from '@core/errors';

/** Runs `gh` with an argument list and returns its output */
export type GhRunner = (args: string[]) => string;

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

/** The parts of `gh pr view --json` this action reads */
interface PRView {
  number: number;
  title: string;
  url: string;
  author: { login: string };
  isDraft: boolean;
  state: PRSnapshot['state'];
  labels: { name: string }[];
  assignees: { login: string }[];
  headRefOid: string;
  headRefName: string;
  baseRefName: string;
  latestReviews?: { author?: { login: string }; state: string }[];
  statusCheckRollup?: { name?: string; context?: string; status?: string; conclusion?: string; state?: string }[];
  mergeable: string;
  mergeStateStatus: string;
}

interface ThreadPage {
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  nodes: { isResolved: boolean; comments: { nodes: { author?: { login: string }; body?: string }[] } }[];
}

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
// @req FR:playbook-actions-git/github-pr-get.output
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

/** Every page of a REST list (--slurp wraps each page in an outer array) */
function list<T>(gh: GhRunner, path: string): T[] {
  return (JSON.parse(gh(['api', path, '--paginate', '--slurp'])) as T[][]).flat();
}

/**
 * Read a PR's live state from GitHub, with the facts a playbook decides on
 * already worked out, since playbook expressions can't call functions on it
 */
// @req FR:playbook-actions-git/github-pr-get.paginate
// @req FR:playbook-actions-git/github-pr-get.derived
export function readPullRequest(gh: GhRunner, repository: string, number: number): PRSnapshot {
  const [owner, name] = repository.split('/');
  const pr = String(number);

  const view: PRView = JSON.parse(
    gh([
      'pr', 'view', pr, '-R', repository, '--json',
      'number,title,url,author,isDraft,state,labels,assignees,headRefOid,headRefName,baseRefName,latestReviews,statusCheckRollup,mergeable,mergeStateStatus',
    ]),
  );

  const threads: PRSnapshot['threads'] = [];
  let cursor: string | null = null;
  do {
    const args = ['api', 'graphql', '-f', `owner=${owner}`, '-f', `name=${name}`, '-F', `pr=${pr}`, '-f', `query=${THREADS}`];
    if (cursor) {
      args.push('-f', `endCursor=${cursor}`);
    }
    const page: ThreadPage = JSON.parse(gh(args)).data.repository.pullRequest.reviewThreads;
    for (const t of page.nodes) {
      threads.push({
        resolved: t.isResolved,
        comments: t.comments.nodes.map((c) => ({ author: c.author?.login ?? '', body: c.body ?? '' })),
      });
    }
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);

  const changedFiles = list<{ filename: string }>(gh, `repos/${repository}/pulls/${pr}/files`).map((f) => f.filename);

  let codeowners = '';
  for (const path of ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS']) {
    try {
      codeowners = gh([
        'api', `repos/${repository}/contents/${path}?ref=${view.baseRefName}`,
        '-H', 'Accept: application/vnd.github.raw',
      ]);
      break;
    } catch {
      // Not at this path; no CODEOWNERS leaves code owners empty
    }
  }
  const { owners, covered } = codeOwnersFor(codeowners, changedFiles);

  // Latest run per check
  const checks = new Map<string, PRSnapshot['checks'][number]['state']>();
  for (const c of view.statusCheckRollup ?? []) {
    const result = String(c.conclusion || c.state || '').toUpperCase();
    const done = c.status ? c.status === 'COMPLETED' : !['PENDING', 'EXPECTED'].includes(result);
    checks.set(
      (c.name || c.context) as string,
      !done ? 'pending' : FAIL.includes(result) ? 'fail' : SKIP.includes(result) ? 'skip' : 'pass',
    );
  }

  const author = view.author.login;
  const isAuthor = (login: string) => login.toLowerCase() === author.toLowerCase();
  const viewer = gh(['api', 'user', '--jq', '.login']).trim();
  const reviews = (view.latestReviews ?? []).map((r) => ({
    author: r.author?.login ?? '',
    state: r.state,
    bot: BOT.test(r.author?.login ?? ''),
  }));
  const approvers = reviews.filter((r) => r.state === 'APPROVED').map((r) => r.author.toLowerCase());
  const unresolved = threads.filter((t) => !t.resolved);

  return {
    number: view.number,
    title: view.title,
    url: view.url,
    author,
    isDraft: view.isDraft,
    state: view.state,
    headSha: view.headRefOid,
    headRef: view.headRefName,
    baseRef: view.baseRefName,
    labels: view.labels.map((l) => l.name),
    assignees: view.assignees.map((a) => a.login),
    reviews,
    checks: [...checks].map(([n, state]) => ({ name: n, state })),
    threads,
    changedFiles,
    codeOwners: owners,
    codeOwned: covered,
    mergeable: view.mergeable,
    mergeStateStatus: view.mergeStateStatus,
    // @req FR:playbook-actions-git/github-pr-get.approved
    // @req FR:playbook-actions-git/github-pr-get.approved.any-commit
    // No head-commit match: GitHub dismisses stale approvals when the repository asks it to
    approved:
      reviews.some((r) => !r.bot && r.state === 'APPROVED') && !reviews.some((r) => r.state === 'CHANGES_REQUESTED'),
    pendingCodeOwners: owners.filter((o) => !approvers.includes(o.toLowerCase())),
    // Team-only owners can't be matched to reviewers; GitHub's branch protection enforces them
    // @req FR:playbook-actions-git/github-pr-get.code-owner-approved
    codeOwnerApproved: !owners.length || owners.some((o) => approvers.includes(o.toLowerCase())),
    checksFailed: [...checks.values()].includes('fail'),
    // @req FR:playbook-actions-git/github-pr-get.checks-passed
    checksPassed: [...checks.values()].every((s) => s === 'pass' || s === 'skip'),
    threadsUnresolved: unresolved.length,
    // @req FR:playbook-actions-git/github-pr-get.awaiting-author
    threadsAwaitingAuthor: unresolved.filter((t) => {
      const last = t.comments[t.comments.length - 1];
      return !last || !isAuthor(last.author) || t.comments.every((c) => isAuthor(c.author)) || last.body.includes('🧭');
    }).length,
    viewer,
    authoredByViewer: isAuthor(viewer),
  };
}

/**
 * Action to read a PR's labels, reviews, checks, threads, and code owners
 */
// @req FR:playbook-actions-git/github-pr-get.@action
// @req FR:playbook-actions-git/github-pr-get.input
// @req FR:playbook-actions-git/github-pr-get.no-shell
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

  protected async executeGitHubOperation(config: GitHubPRGetConfig): Promise<PRSnapshot> {
    const repository = config.repository || (await this.getCurrentRepository());
    return readPullRequest((args) => this.executeGh(args), repository, config.pr);
  }

  protected getSuccessMessage(data: PRSnapshot): string {
    return `Read PR ${data.number} (${data.threads.length} threads, ${data.checks.length} checks)`;
  }
}
