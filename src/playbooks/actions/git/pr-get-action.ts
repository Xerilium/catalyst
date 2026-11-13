/**
 * GitHub pull request snapshot action
 * @module playbooks/actions/git/pr-get-action
 */

import { GitHubActionBase } from './base';
import type { GitHubPRGetConfig, PRSnapshot } from './types';
import { CatalystError } from '@core/errors';
import * as yaml from 'js-yaml';

/** Runs `gh` with an argument list and returns its output */
export type GhRunner = (args: string[]) => string;

const THREADS = `query($owner: String!, $name: String!, $pr: Int!, $endCursor: String) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100, after: $endCursor) {
        pageInfo { hasNextPage endCursor }
        nodes { isResolved comments(last: 100) { totalCount nodes { author { login } body } } }
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
  statusCheckRollup?: { name?: string; context?: string; workflowName?: string; status?: string; conclusion?: string; state?: string }[];
  mergeable: string;
  mergeStateStatus: string;
  reviewDecision?: string;
}

interface ThreadPage {
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  nodes: { isResolved: boolean; comments: { totalCount: number; nodes: { author?: { login: string }; body?: string }[] } }[];
}

// @req FR:playbook-actions-git/github-pr-get.checks-passed.cancelled
// GitHub fails a required check that was cancelled
const FAIL = ['FAILURE', 'ERROR', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE', 'CANCELLED'];
const SKIP = ['SKIPPED'];
const BOT = /\[bot\]$|^copilot/i;

/** Turn a CODEOWNERS pattern into a regex over repo-relative paths */
// @req FR:playbook-actions-git/github-pr-get.code-owners
// @req FR:playbook-actions-git/github-pr-get.code-owners.globstar
function ownerPattern(pattern: string): RegExp {
  const anchored = pattern.startsWith('/') || pattern.slice(0, -1).includes('/');
  const body = pattern
    .replace(/^\//, '')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    // `**/` matches zero or more folders, so `**/foo` matches a root `foo`
    .replace(/\*\*\//g, '\u0001')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\u0001/g, '(.*/)?')
    .replace(/\u0000/g, '.*');
  // `docs/*` matches only files directly in `docs`, not nested ones
  // @req FR:playbook-actions-git/github-pr-get.code-owners.single-star
  const tail = pattern.endsWith('/') ? '.*' : pattern.endsWith('/*') ? '' : '(/.*)?';
  return new RegExp(`^${anchored ? '' : '(.*/)?'}${body}${tail}$`);
}

/** Turn an Actions branch or path filter into a regex: `*` stays within a segment, `**` spans them */
function filterPattern(pattern: string): RegExp {
  const body = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.')
    .replace(/\u0000/g, '.*');
  return new RegExp(`^${body}$`);
}

/** Whether a filter's include/ignore lists let `value` through */
function passes(filter: Record<string, unknown>, key: string, value: string): boolean {
  const list = (k: string) => (Array.isArray(filter[k]) ? (filter[k] as unknown[]).map(String) : typeof filter[k] === 'string' ? [filter[k] as string] : undefined);
  const include = list(key);
  const ignore = list(`${key}-ignore`);
  // Patterns apply in order and the last match wins, so `!` can exclude what an earlier one matched
  if (include) {
    let match = false;
    for (const p of include) {
      if (p.startsWith('!') ? filterPattern(p.slice(1)).test(value) : filterPattern(p).test(value)) {match = !p.startsWith('!');}
    }
    return match;
  }
  if (ignore) {return !ignore.some((p) => filterPattern(p).test(value));}
  return true;
}

/**
 * Whether a workflow's `on:` triggers would run checks on this PR's head:
 * a matching `pull_request`/`pull_request_target`, or a `push` to the head branch
 */
export function workflowRunsOnPR(on: unknown, pr: { headRef: string; baseRef: string; files: string[] }): boolean {
  const events: Record<string, unknown> =
    typeof on === 'string' ? { [on]: null }
    : Array.isArray(on) ? Object.fromEntries(on.map((e) => [String(e), null]))
    : on && typeof on === 'object' ? (on as Record<string, unknown>) : {};
  const anyFile = (f: Record<string, unknown>) => !pr.files.length || pr.files.some((file) => passes(f, 'paths', file));
  for (const event of ['pull_request', 'pull_request_target']) {
    if (!(event in events)) {continue;}
    const f = (events[event] ?? {}) as Record<string, unknown>;
    // Only these activity types fire on a new head; e.g. `types: [closed]` never does
    // @req FR:playbook-actions-git/github-pr-get.checks-passed.none.types
    const types = Array.isArray(f.types) ? f.types.map(String) : typeof f.types === 'string' ? [f.types] : undefined;
    if (types && !types.some((t) => ['opened', 'synchronize', 'reopened'].includes(t))) {continue;}
    if (passes(f, 'branches', pr.baseRef) && anyFile(f)) {return true;}
  }
  if ('push' in events) {
    const f = (events.push ?? {}) as Record<string, unknown>;
    const tagsOnly = (f.tags || f['tags-ignore']) && !f.branches && !f['branches-ignore'];
    if (!tagsOnly && passes(f, 'branches', pr.headRef) && anyFile(f)) {return true;}
  }
  return false;
}

/** Users that own `files` per CODEOWNERS (last matching rule wins); teams can't be assigned */
// @req FR:playbook-actions-git/github-pr-get.output
export function codeOwnersFor(
  codeowners: string,
  files: string[],
): { owners: string[]; covered: boolean; perFile: string[][] } {
  const rules = codeowners
    .split('\n')
    .map((l) => l.replace(/#.*/, '').trim().split(/\s+/))
    // A pattern with no owners makes its files unowned, so it stays in to win over earlier rules
    // @req FR:playbook-actions-git/github-pr-get.code-owners.unowned
    .filter((p) => p[0] !== '')
    .map(([pattern, ...owners]) => ({ re: ownerPattern(pattern), owners }));
  const owners = new Set<string>();
  let covered = false;
  const perFile: string[][] = [];
  for (const file of files) {
    const rule = [...rules].reverse().find((r) => r.re.test(file));
    if (rule?.owners.length) {
      covered = true;
      // Teams (org/team) and emails (a@b.com) can't be matched to a reviewer
      // @req FR:playbook-actions-git/github-pr-get.code-owners.email
      const users = rule.owners.filter((o) => o.startsWith('@') && !o.includes('/')).map((o) => o.slice(1));
      users.forEach((o) => owners.add(o));
      if (users.length) {perFile.push(users);}
    }
  }
  return { owners: [...owners], covered, perFile };
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
      'number,title,url,author,isDraft,state,labels,assignees,headRefOid,headRefName,baseRefName,latestReviews,reviewDecision,statusCheckRollup,mergeable,mergeStateStatus',
    ]),
  );

  const threads: PRSnapshot['threads'] = [];
  // Threads with comments older than the 100 read; their earlier comments are unknown
  const partial = new Set<PRSnapshot['threads'][number]>();
  let cursor: string | null = null;
  do {
    const args = ['api', 'graphql', '-f', `owner=${owner}`, '-f', `name=${name}`, '-F', `pr=${pr}`, '-f', `query=${THREADS}`];
    if (cursor) {
      args.push('-f', `endCursor=${cursor}`);
    }
    const page: ThreadPage = JSON.parse(gh(args)).data.repository.pullRequest.reviewThreads;
    for (const t of page.nodes) {
      const thread = {
        resolved: t.isResolved,
        comments: t.comments.nodes.map((c) => ({ author: c.author?.login ?? '', body: c.body ?? '' })),
      };
      if (t.comments.totalCount > thread.comments.length) {
        partial.add(thread);
      }
      threads.push(thread);
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
    } catch (error) {
      // Not at this path; any other failure must not read as "no CODEOWNERS", which would pass the gate
      // @req FR:playbook-actions-git/github-pr-get.code-owners.read-error
      if (!/404|not found/i.test(error instanceof Error ? error.message : String(error))) {throw error;}
    }
  }
  const { owners, covered, perFile } = codeOwnersFor(codeowners, changedFiles);

  // Latest run per check; a job name alone can repeat across workflows, so the workflow is part of the key
  // @req FR:playbook-actions-git/github-pr-get.checks-passed.workflow
  const checks = new Map<string, { name: string; state: PRSnapshot['checks'][number]['state'] }>();
  for (const c of view.statusCheckRollup ?? []) {
    const result = String(c.conclusion || c.state || '').toUpperCase();
    const done = c.status ? c.status === 'COMPLETED' : !['PENDING', 'EXPECTED'].includes(result);
    const checkName = (c.name || c.context) as string;
    checks.set(`${c.workflowName ?? ''}\u0000${checkName}`, {
      name: checkName,
      state: !done ? 'pending' : FAIL.includes(result) ? 'fail' : SKIP.includes(result) ? 'skip' : 'pass',
    });
  }

  const author = view.author.login;
  const isAuthor = (login: string) => login.toLowerCase() === author.toLowerCase();
  // An app installation or GITHUB_TOKEN token can't read the user; no viewer holds the merge
  // @req FR:playbook-actions-git/github-pr-get.viewer
  let viewer = '';
  try {
    viewer = gh(['api', 'user', '--jq', '.login']).trim();
  } catch {
    viewer = '';
  }
  const reviews = (view.latestReviews ?? []).map((r) => ({
    author: r.author?.login ?? '',
    state: r.state,
    bot: BOT.test(r.author?.login ?? ''),
  }));
  const approvers = reviews.filter((r) => r.state === 'APPROVED').map((r) => r.author.toLowerCase());
  const unresolved = threads.filter((t) => !t.resolved);
  const states = [...checks.values()].map((c) => c.state);
  // @req FR:playbook-actions-git/github-pr-get.checks-passed.none
  // Right after a push, no check has registered yet; wait only when an active workflow would run on this PR
  // Dynamic workflows (Dependabot, Copilot) have no file and don't run on PR pushes
  // @req FR:playbook-actions-git/github-pr-get.checks-passed.none.dynamic
  const workflows = () =>
    gh(['api', `repos/${repository}/actions/workflows`, '--paginate', '--jq', '.workflows[] | select(.state == "active") | .path'])
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.startsWith('.github/workflows/'));
  const awaitingChecks =
    !states.length &&
    workflows().some((path) => {
      try {
        const file = gh(['api', `repos/${repository}/contents/${path}?ref=${view.baseRefName}`, '-H', 'Accept: application/vnd.github.raw']);
        const on = (yaml.load(file) as Record<string, unknown> | null)?.on;
        return workflowRunsOnPR(on, { headRef: view.headRefName, baseRef: view.baseRefName, files: changedFiles });
      } catch {
        // Unreadable or unparsable: assume it runs, so a merge never outruns its checks
        // @req FR:playbook-actions-git/github-pr-get.checks-passed.none.unreadable
        return true;
      }
    });
  // @req FR:playbook-actions-git/github-pr-get.review-required
  const reviewDecision = view.reviewDecision ?? '';

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
    checks: [...checks.values()],
    threads,
    changedFiles,
    codeOwners: owners,
    codeOwned: covered,
    mergeable: view.mergeable,
    mergeStateStatus: view.mergeStateStatus,
    reviewDecision,
    // GitHub's decision counts the required approvals and code-owner approvals
    // @req FR:playbook-actions-git/github-pr-get.approved
    // @req FR:playbook-actions-git/github-pr-get.approved.default
    // @req FR:playbook-actions-git/github-pr-get.approved.any-commit
    // No head-commit match: GitHub dismisses stale approvals when the repository asks it to
    approved: reviewDecision
      ? reviewDecision === 'APPROVED'
      : reviews.some((r) => !r.bot && r.state === 'APPROVED') && !reviews.some((r) => r.state === 'CHANGES_REQUESTED'),
    reviewRequired: reviewDecision !== '',
    // @req FR:playbook-actions-git/github-pr-get.pending-code-owners
    pendingCodeOwners: owners.filter((o) => !isAuthor(o) && !approvers.includes(o.toLowerCase())),
    // Team-only owners can't be matched to reviewers; GitHub's branch protection enforces them
    // @req FR:playbook-actions-git/github-pr-get.code-owner-approved
    // The author can't approve their own PR, so files only the author owns aren't gated
    codeOwnerApproved: perFile.every((users) => {
      const others = users.filter((o) => !isAuthor(o));
      return !others.length || others.some((o) => approvers.includes(o.toLowerCase()));
    }),
    // @req FR:playbook-actions-git/github-pr-get.changes-requested
    changesRequested: reviews.some((r) => r.state === 'CHANGES_REQUESTED'),
    checksFailed: states.includes('fail'),
    // @req FR:playbook-actions-git/github-pr-get.checks-passed
    checksPassed: !awaitingChecks && states.every((s) => s === 'pass' || s === 'skip'),
    threadsUnresolved: unresolved.length,
    // @req FR:playbook-actions-git/github-pr-get.awaiting-author
    // @req FR:playbook-actions-git/github-pr-get.awaiting-author.self
    // @req FR:playbook-actions-git/github-pr-get.awaiting-author.compass
    // @req FR:playbook-actions-git/github-pr-get.awaiting-author.partial
    threadsAwaitingAuthor: unresolved.filter((t) => {
      const last = t.comments[t.comments.length - 1];
      const selfOnly = !partial.has(t) && t.comments.every((c) => isAuthor(c.author));
      return !last || !isAuthor(last.author) || selfOnly || last.body.includes('🧭');
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
