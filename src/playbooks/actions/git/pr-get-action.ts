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
  /** The base branch's commit; GitHub keeps it after the branch is deleted */
  baseRefOid?: string;
  /** Null when the head's fork is gone */
  headRepository?: { name: string } | null;
  headRepositoryOwner?: { login: string } | null;
  latestReviews?: { author?: { login: string }; state: string }[];
  statusCheckRollup?: { name?: string; context?: string; workflowName?: string; status?: string; conclusion?: string; state?: string; detailsUrl?: string }[];
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
// @req FR:github-provider/codeowners.match
// @req FR:github-provider/codeowners.match.globstar
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
  // @req FR:github-provider/codeowners.match.single-star
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

/** The workflow `catalyst init` installs to run `catalyst pr` */
const OWN_WORKFLOW = 'Catalyst PR';
const OWN_WORKFLOW_PATH = '.github/workflows/catalyst-pr.yml';

/** Check runs the reconcile playbook writes; they never count as the PR's own checks */
// @req FR:pull-request-workflow/reconcile.own-checks.check-runs
export const OWN_CHECK_RUNS = ['Threads resolved', 'Codeowner approved'];

/** Settings under `pull-requests` in the Catalyst config that reading a PR needs */
interface ReconcileSettings {
  longLived: string[];
  skipChecks: string[];
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '') : [];

/** Check names from a list or a comma-separated string */
export const checkNames = (value: (string | null)[] | string | undefined): string[] =>
  strings(typeof value === 'string' ? value.split(',').map((n) => n.trim()) : value);

/** The reconcile settings in a config file's text; a missing or unreadable file sets none */
// @req FR:playbook-actions-git/github-pr-get.@json
export function reconcileSettings(text: string | undefined): ReconcileSettings {
  try {
    const pr = (JSON.parse(text || '{}') as { 'pull-requests'?: Record<string, unknown> })['pull-requests'] ?? {};
    const reconcile = (pr.reconcile ?? {}) as Record<string, unknown>;
    return { longLived: strings(pr['long-lived-branches']), skipChecks: strings(reconcile['skip-checks']) };
  } catch {
    return { longLived: [], skipChecks: [] };
  }
}

/** Whether a failed check's job ran no steps, so it never started; an unreadable job counts as started */
// @req FR:playbook-actions-git/github-pr-get.skip-checks.no-steps
function neverStarted(gh: GhRunner, repository: string, detailsUrl: string | undefined): boolean {
  // Only a GitHub Actions job URL; another CI's `/job/N` is not an Actions job
  const job = /\/actions\/runs\/\d+\/job\/(\d+)/.exec(detailsUrl ?? '')?.[1];
  if (!job) {return false;}
  try {
    return gh(['api', `repos/${repository}/actions/jobs/${job}`, '--jq', '.steps | length']).trim() === '0';
  } catch {
    return false;
  }
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

/** Each CODEOWNERS rule in file order, without comments or blank lines */
export function ownerRules(codeowners: string): { pattern: string; owners: string[] }[] {
  return codeowners
    .split('\n')
    .map((l) => l.replace(/#.*/, '').trim())
    .filter(Boolean)
    .map((l) => {
      const [pattern, ...owners] = l.split(/\s+/);
      return { pattern, owners };
    });
}

/** Every owner (users, teams, emails) of each of `files` per CODEOWNERS; last matching rule wins, and unowned files get none */
export function fileOwners(codeowners: string, files: string[]): string[][] {
  // A pattern with no owners makes its files unowned, so it stays in to win over earlier rules
  // @req FR:github-provider/codeowners.match.unowned
  const rules = ownerRules(codeowners).map((r) => ({ re: ownerPattern(r.pattern), owners: r.owners }));
  return files.map((file) => [...rules].reverse().find((r) => r.re.test(file))?.owners ?? []);
}

/** Whether a changed file has an owner other than `author`; teams and emails are never the author */
// @req FR:playbook-actions-git/github-pr-get.owned-by-others
export function ownedByOthers(owners: string[][], author: string): boolean {
  const self = `@${author.toLowerCase()}`;
  return owners.some((o) => o.some((x) => x.toLowerCase() !== self));
}

/** Users other than `author` that own the files, from `fileOwners`; teams can't be assigned */
// @req FR:playbook-actions-git/github-pr-get.output
export function codeOwnersFor(
  ownersPerFile: string[][],
  author: string,
): { owners: string[]; covered: boolean; perFile: string[][] } {
  const owners = new Set<string>();
  let covered = false;
  const perFile: string[][] = [];
  for (const ruleOwners of ownersPerFile) {
    if (ruleOwners.length) {
      covered = true;
      // Teams (org/team) and emails (a@b.com) can't be matched to a reviewer
      // @req FR:github-provider/codeowners.email
      // @req FR:github-provider/codeowners.teams
      const users = ruleOwners.filter((o) => o.startsWith('@') && !o.includes('/')).map((o) => o.slice(1));
      users.filter((o) => o.toLowerCase() !== author.toLowerCase()).forEach((o) => owners.add(o));
      if (users.length) {perFile.push(users);}
    }
  }
  return { owners: [...owners], covered, perFile };
}

/** A line that holds only hashtags */
const HASHTAG_LINE = /^ {0,3}#[\w-]+(?:[ \t]+#[\w-]+)*[ \t]*$/gm;
const AI_PREFIX = /^\s*(🤖 \[AI\]|⚛️ \[Catalyst\])/u;

/** Hash commands that count only in a top-level comment or review body, never inline */
const TOP_LEVEL_ONLY = new Set(['autopilot']);

/**
 * The hash commands in a comment body, lowercase and without `#`: each hashtag
 * on a line of only hashtags, outside code, in a comment that isn't an agent's
 * and quotes nothing
 */
// @req FR:pull-request-workflow/reconcile.hash-commands.line
// @req FR:pull-request-workflow/reconcile.hash-commands.agent
// @req FR:pull-request-workflow/reconcile.hash-commands.quote
// @req FR:pull-request-workflow/reconcile.hash-commands.code
export function hashCommands(body: string): string[] {
  if (AI_PREFIX.test(body) || /^\s*>/m.test(body)) {
    return [];
  }
  const prose = body
    .replace(/^[ \t]*(```|~~~)[\s\S]*?^[ \t]*\1.*$/gm, '')
    .replace(/^[ \t]*(```|~~~)[\s\S]*$/m, '')
    .replace(/`[^`\n]*`/g, '');
  const tags = (prose.match(HASHTAG_LINE) ?? []).flatMap((line) => line.trim().split(/[ \t]+/));
  // @req FR:pull-request-workflow/reconcile.hash-commands
  return [...new Set(tags.map((t) => t.slice(1).toLowerCase()))];
}

/** Whether a CODEOWNERS file has at least one owner rule */
export function hasOwnerRules(codeowners: string): boolean {
  return ownerRules(codeowners).some((r) => r.owners.length > 0);
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
export function readPullRequest(gh: GhRunner, repository: string, number: number, skipChecks: string[] = []): PRSnapshot {
  const [owner, name] = repository.split('/');
  const pr = String(number);

  const view: PRView = JSON.parse(
    gh([
      'pr', 'view', pr, '-R', repository, '--json',
      'number,title,url,author,isDraft,state,labels,assignees,headRefOid,headRefName,baseRefName,baseRefOid,headRepository,headRepositoryOwner,latestReviews,reviewDecision,statusCheckRollup,mergeable,mergeStateStatus',
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

  // Whether the base branch is gone; any failure but a 404 can't tell, so it counts as there
  let baseMissing = false;
  try {
    gh(['api', `repos/${repository}/branches/${encodeURIComponent(view.baseRefName)}`, '--jq', '.name']);
  } catch (error) {
    baseMissing = /404|not found/i.test(error instanceof Error ? error.message : String(error));
  }

  // Settings come from the base branch, never the PR's head. A deleted base branch is read at
  // its last commit, so a long-lived setting still holds after the branch is gone
  // @req FR:playbook-actions-git/github-pr-get.skip-checks.config
  // @req FR:playbook-actions-git/github-pr-get.base-gone.config
  const configRef = baseMissing && view.baseRefOid ? view.baseRefOid : view.baseRefName;
  let configText: string | undefined;
  try {
    configText = gh([
      'api', `repos/${repository}/contents/.xe/config/catalyst.json?ref=${encodeURIComponent(configRef)}`,
      '-H', 'Accept: application/vnd.github.raw',
    ]);
  } catch (error) {
    if (!/404|not found/i.test(error instanceof Error ? error.message : String(error))) {throw error;}
  }
  const settings = reconcileSettings(configText);

  // @req FR:playbook-actions-git/github-pr-get.base-gone
  // @req FR:playbook-actions-git/github-pr-get.base-gone.unread
  // The default branch is read at most once; unread, a branch counts as long-lived for the head and not gone for the base
  let defaultBranch: string | undefined;
  const longLived = (branch: string): boolean | undefined => {
    if (settings.longLived.includes(branch)) {return true;}
    try {
      defaultBranch ??= gh(['api', `repos/${repository}`, '--jq', '.default_branch']).trim();
    } catch {
      return undefined;
    }
    return branch === defaultBranch;
  };
  const baseGone = baseMissing && longLived(view.baseRefName) === false;
  // @req FR:playbook-actions-git/github-pr-get.head-long-lived
  const headLongLived = longLived(view.headRefName) !== false;

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
  // @req FR:playbook-actions-git/github-pr-get.code-owners
  const ownersPerFile = fileOwners(codeowners, changedFiles);
  const { owners, covered, perFile } = codeOwnersFor(ownersPerFile, view.author.login);

  // Latest run per check; a job name alone can repeat across workflows, so the workflow is part of the key
  // @req FR:playbook-actions-git/github-pr-get.checks-passed.workflow
  const checks = new Map<string, { name: string; workflow: string; state: PRSnapshot['checks'][number]['state'] }>();
  // The Catalyst PR workflow runs this check, so its own run mustn't hold the PR. The rollup names
  // only the workflow, so the head's runs say whether another workflow file took that name; if one
  // did, or the runs can't be read, no check is skipped
  // @req FR:pull-request-workflow/reconcile.own-checks
  let nameTaken = false;
  try {
    const paths = gh(['api', `repos/${repository}/actions/runs?head_sha=${view.headRefOid}`, '--paginate', '--jq', `.workflow_runs[] | select(.name == "${OWN_WORKFLOW}") | .path`]);
    nameTaken = paths.split('\n').map((p) => p.trim().split('@')[0]).some((p) => p && p !== OWN_WORKFLOW_PATH);
  } catch {
    nameTaken = true;
  }
  // @req FR:playbook-actions-git/github-pr-get.skip-checks
  const skipped = new Set([...skipChecks, ...settings.skipChecks].map((n) => n.toLowerCase()));
  // @req FR:playbook-actions-git/github-pr-get.skip-checks.report
  const skippedChecks: string[] = [];
  for (const c of (view.statusCheckRollup ?? []).filter((x) => nameTaken || x.workflowName !== OWN_WORKFLOW)) {
    const result = String(c.conclusion || c.state || '').toUpperCase();
    const done = c.status ? c.status === 'COMPLETED' : !['PENDING', 'EXPECTED'].includes(result);
    const checkName = (c.name || c.context) as string;
    if (!c.workflowName && OWN_CHECK_RUNS.includes(checkName)) {continue;}
    const state = !done ? 'pending' : FAIL.includes(result) ? 'fail' : SKIP.includes(result) ? 'skip' : 'pass';
    if (skipped.has(checkName.toLowerCase()) || (state === 'fail' && neverStarted(gh, repository, c.detailsUrl))) {
      skippedChecks.push(checkName);
      continue;
    }
    checks.set(`${c.workflowName ?? ''}\u0000${checkName}`, {
      name: checkName,
      workflow: c.workflowName ?? '',
      state,
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

  // Top-level comments, submitted review bodies, and inline review comments (file-level comments and thread replies included)
  // @req FR:playbook-actions-git/github-pr-get.hash-commands
  // @req FR:pull-request-workflow/reconcile.hash-commands
  type Said = { id?: number; in_reply_to_id?: number; user?: { login: string; type: string }; body?: string; html_url: string };
  const said = [
    ...list<Said & { created_at: string }>(gh, `repos/${repository}/issues/${pr}/comments`).map(
      // When it was posted; an edit doesn't make an old command new
      (c) => ({ ...c, at: c.created_at, topLevel: true }),
    ),
    ...list<Said & { state: string; submitted_at?: string }>(gh, `repos/${repository}/pulls/${pr}/reviews`)
      .filter((r) => r.state !== 'PENDING' && r.submitted_at)
      .map((r) => ({ ...r, at: r.submitted_at as string, topLevel: true })),
    ...list<Said & { created_at: string }>(gh, `repos/${repository}/pulls/${pr}/comments`).map((c) => ({
      ...c,
      at: c.created_at,
      topLevel: false,
    })),
  ];
  const commands: PRSnapshot['hashCommands'] = {};
  const latestCommands: PRSnapshot['latestHashCommands'] = {};
  // @req FR:playbook-actions-git/github-pr-get.author-commented
  let authorCommentedAt = '';
  // Inline thread (root comment id) that carried the latest #needs-info; the author replying there answers it
  let needsInfoThread: number | undefined;
  for (const c of said.filter((x) => x.user?.type === 'User').sort((x, y) => x.at.localeCompare(y.at))) {
    const login = c.user?.login ?? '';
    if (isAuthor(login) && c.topLevel) {
      authorCommentedAt = c.at;
    } else if (isAuthor(login) && needsInfoThread !== undefined && (c.in_reply_to_id ?? c.id) === needsInfoThread) {
      authorCommentedAt = c.at;
    }
    for (const tag of hashCommands(c.body ?? '')) {
      // @req FR:playbook-actions-git/github-pr-get.hash-commands.top-level
      if (!c.topLevel && TOP_LEVEL_ONLY.has(tag)) {
        continue;
      }
      (commands[tag] ??= {})[login] = { url: c.html_url, at: c.at };
      // @req FR:playbook-actions-git/github-pr-get.hash-commands.latest
      latestCommands[tag] = { user: login, url: c.html_url, at: c.at };
      if (tag === 'needs-info') {
        needsInfoThread = c.topLevel ? undefined : (c.in_reply_to_id ?? c.id);
      }
    }
  }

  // @req FR:playbook-actions-git/github-pr-get.labels-removed
  const labelsRemovedAt: Record<string, string> = {};
  let readyAt = '';
  for (const e of list<{ event: string; label?: { name: string }; created_at: string }>(
    gh,
    `repos/${repository}/issues/${pr}/events`,
  )) {
    if (e.event === 'unlabeled' && e.label && !(labelsRemovedAt[e.label.name] > e.created_at)) {
      labelsRemovedAt[e.label.name] = e.created_at;
    }
    // @req FR:playbook-actions-git/github-pr-get.ready-at
    if (e.event === 'ready_for_review' && e.created_at > readyAt) {readyAt = e.created_at;}
  }
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
  // A workflow file at a ref, or null on a real HTTP 404. The runner maps network failures to
  // "not found" too, so the error's cause chain says which it was; anything else is rethrown
  const readWorkflow = (path: string, ref: string): string | null => {
    try {
      return gh(['api', `repos/${repository}/contents/${path}?ref=${ref}`, '-H', 'Accept: application/vnd.github.raw']);
    } catch (err) {
      const trail: string[] = [];
      for (let e = err as (Error & { cause?: Error }) | undefined; e && trail.length < 5; e = e.cause) {trail.push(String(e.message ?? e));}
      if (/HTTP 404/.test(trail.join(' '))) {return null;}
      throw err;
    }
  };
  const awaitedWorkflows = (!states.length && !skippedChecks.length ? workflows() : []).filter((path) => {
    try {
      // @req FR:pull-request-workflow/reconcile.own-checks
      if (path === OWN_WORKFLOW_PATH) {return false;}
      // No file on the base branch is an orphan unless the PR adds the workflow, so look at its head
      // @req FR:playbook-actions-git/github-pr-get.checks-passed.none.orphan
      const file = readWorkflow(path, view.baseRefName) ?? readWorkflow(path, view.headRefOid);
      if (file === null) {return false;}
      const parsed = yaml.load(file) as Record<string, unknown> | null;
      return workflowRunsOnPR(parsed?.on, { headRef: view.headRefName, baseRef: view.baseRefName, files: changedFiles });
    } catch {
      // Unreadable or unparsable: assume it runs, so a merge never outruns its checks
      // @req FR:playbook-actions-git/github-pr-get.checks-passed.none.unreadable
      return true;
    }
  });
  const awaitingChecks = awaitedWorkflows.length > 0;
  // @req FR:playbook-actions-git/github-pr-get.checks-blocking
  const checksBlocking = [
    ...[...checks.values()].filter((c) => c.state === 'fail' || c.state === 'pending').map((c) => `${c.workflow ? `${c.workflow} / ` : ''}${c.name} (${c.state === 'fail' ? 'failed' : 'running'})`),
    ...awaitedWorkflows.map((p) => `${p.split('/').pop()} (no check reported yet)`),
  ];
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
    codeOwnersConfigured: hasOwnerRules(codeowners),
    codeOwnedByOthers: ownedByOthers(ownersPerFile, author),
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
    pendingCodeOwners: owners.filter((o) => !approvers.includes(o.toLowerCase())),
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
    checksBlocking,
    // @req FR:playbook-actions-git/github-pr-get.checks-passed
    checksPassed: !awaitingChecks && states.every((s) => s === 'pass' || s === 'skip'),
    threadsUnresolved: unresolved.length,
    // @req FR:playbook-actions-git/github-pr-get.awaiting-author
    // @req FR:playbook-actions-git/github-pr-get.awaiting-author.self
    // @req FR:playbook-actions-git/github-pr-get.awaiting-author.marker
    // @req FR:playbook-actions-git/github-pr-get.awaiting-author.partial
    threadsAwaitingAuthor: unresolved.filter((t) => {
      const last = t.comments[t.comments.length - 1];
      const selfOnly = !partial.has(t) && t.comments.every((c) => isAuthor(c.author));
      return !last || !isAuthor(last.author) || selfOnly || last.body.includes('🧭');
    }).length,
    viewer,
    authoredByViewer: isAuthor(viewer),
    hashCommands: commands,
    latestHashCommands: latestCommands,
    authorCommentedAt,
    labelsRemovedAt,
    readyAt,
    baseGone,
    headLongLived,
    // @req FR:playbook-actions-git/github-pr-get.same-repository
    sameRepository:
      !!view.headRepository?.name &&
      !!view.headRepositoryOwner?.login &&
      `${view.headRepositoryOwner.login}/${view.headRepository.name}`.toLowerCase() === repository.toLowerCase(),
    skippedChecks,
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
    return readPullRequest((args) => this.executeGh(args), repository, config.pr, checkNames(config.skipChecks));
  }

  protected getSuccessMessage(data: PRSnapshot): string {
    return `Read PR ${data.number} (${data.threads.length} threads, ${data.checks.length} checks)`;
  }
}
