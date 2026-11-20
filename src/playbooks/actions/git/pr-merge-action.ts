/**
 * GitHub pull request merge action
 * @module playbooks/actions/git/pr-merge-action
 */

import { GitHubActionBase } from './base';
import { checkNames, readPullRequest } from './pr-get-action';
import type { GitHubPRMergeConfig, PRMergeResult, PRSnapshot } from './types';
import { CatalystError } from '@core/errors';

const METHODS = ['squash', 'merge', 'rebase'];
/** Merge states GitHub treats as safe to merge (UNSTABLE: only non-required checks fail) */
const CLEAN_STATES = ['CLEAN', 'HAS_HOOKS', 'UNSTABLE'];

const lower = (s: string) => s.toLowerCase();

/**
 * Check a PR against the standard GitHub merge rules. Returns why it can't
 * merge, or nothing when it can. Pure: no network access.
 */
// @req FR:playbook-actions-git/github-pr-merge.gates
export function mergeRefusal(snap: PRSnapshot, sha?: string, codeOwnerWaived = false): { code: string; message: string } | undefined {
  // @req FR:playbook-actions-git/github-pr-merge.gates.open
  if (snap.state !== 'OPEN') {
    return { code: 'PullRequestNotOpen', message: `The PR is already ${lower(snap.state)}.` };
  }
  // @req FR:playbook-actions-git/github-pr-merge.gates.draft
  if (snap.isDraft) {
    return { code: 'PullRequestNotPublished', message: 'The PR is still a draft.' };
  }
  // @req FR:playbook-actions-git/github-pr-merge.head-sha
  if (sha && !snap.headSha.toLowerCase().startsWith(sha.toLowerCase())) {
    return {
      code: 'PullRequestHeadChanged',
      message: `The PR got new commits after it was checked (now at ${snap.headSha.slice(0, 7)}). Run the check again.`,
    };
  }

  const notPassing = snap.checks.filter((c) => c.state === 'fail' || c.state === 'pending');
  // @req FR:playbook-actions-git/github-pr-merge.gates.checks
  if (notPassing.length) {
    return {
      code: 'PullRequestChecksNotPassing',
      message: `Some checks haven't passed: ${notPassing.map((c) => `${c.name} (${c.state === 'fail' ? 'failed' : 'running'})`).join(', ')}.`,
    };
  }

  // @req FR:playbook-actions-git/github-pr-merge.gates.code-owners
  if (!snap.codeOwnerApproved && !codeOwnerWaived) {
    return {
      code: 'PullRequestNotCodeOwnerApproved',
      message: `A code owner needs to approve the PR (${snap.pendingCodeOwners.join(', ')}).`,
    };
  }

  // @req FR:playbook-actions-git/github-pr-merge.gates.changes-requested
  if (snap.changesRequested) {
    return { code: 'PullRequestChangesRequested', message: 'A reviewer requested changes.' };
  }

  // @req FR:playbook-actions-git/github-pr-merge.gates.threads
  const open = snap.threadsUnresolved;
  if (open) {
    return { code: 'PullRequestHasUnresolvedThreads', message: `${open} review thread${open === 1 ? ' is' : 's are'} unresolved.` };
  }

  // @req FR:playbook-actions-git/github-pr-merge.gates.merge-state
  if (snap.mergeable === 'CONFLICTING' || !CLEAN_STATES.includes(snap.mergeStateStatus)) {
    return {
      code: 'PullRequestNotMergeable',
      message: `GitHub can't merge the PR yet (merge state: ${lower(snap.mergeStateStatus || 'unknown')}).`,
    };
  }
  return undefined;
}

/** The PR's commits, as `gh pr view --json commits` reports them */
interface PRCommits {
  commits: { messageHeadline: string; messageBody?: string; authors?: { name?: string; email?: string }[] }[];
}

const TRAILER = /^co-authored-by:\s*(.+?)\s*<([^>]+)>\s*$/i;

/** Catalyst's trailer on every commit it writes */
const CATALYST = 'Co-authored-by: Catalyst AI <catalyst-noreply@xerilium.com>';

/**
 * Merge commit body: trailers only. One co-author trailer per person (commit
 * authors and the commits' own co-authors), then Catalyst's, then `trailers`
 */
// @req FR:playbook-actions-git/github-pr-merge.trailers
// @req FR:playbook-actions-git/github-pr-merge.trailers.authors
// @req FR:playbook-actions-git/github-pr-merge.trailers.unique
export function mergeBody(commits: PRCommits['commits'], trailers: string[] = []): string {
  const people = new Map<string, string>();
  const add = (name: string | undefined, email: string | undefined) => {
    if (email && !people.has(lower(email))) {
      people.set(lower(email), `Co-authored-by: ${name || email} <${email}>`);
    }
  };
  for (const c of commits) {
    (c.authors ?? []).forEach((a) => add(a.name, a.email));
    for (const line of (c.messageBody ?? '').split('\n')) {
      const m = TRAILER.exec(line.trim());
      if (m) {
        add(m[1], m[2]);
      }
    }
  }
  // @req FR:playbook-actions-git/github-pr-merge.trailers.catalyst
  // @req FR:playbook-actions-git/github-pr-merge.trailers.extra
  const lines = [...people.values()];
  for (const t of [CATALYST, ...trailers]) {
    const m = TRAILER.exec(t.trim());
    if (!m) {
      lines.push(t);
    } else if (!people.has(lower(m[2]))) {
      people.set(lower(m[2]), t);
      lines.push(t);
    }
  }
  return lines.join('\n');
}

/** What GitHub said, without the command line Node echoes first */
function reasonFrom(error: unknown, echoed = ''): string {
  const e = error as { cause?: { message?: string; stderr?: unknown }; message?: string } | undefined;
  // What `gh` printed is GitHub's answer; the message also echoes the command, merge body included
  const stderr = String(e?.cause?.stderr ?? '').trim();
  if (stderr) {return stderr;}
  const text = String(e?.cause?.message ?? e?.message ?? error).split(echoed || '\u0000').join('');
  return text.replace(/^Command failed:.*\n?/, '').trim() || 'no reason given';
}

/**
 * Why a merge failed and whether another attempt can help: a 5xx or a moved
 * base branch clears on its own; a 409 means the head changed, so never retry it
 */
// @req FR:playbook-actions-git/github-pr-merge.retry.server
// @req FR:playbook-actions-git/github-pr-merge.retry.base-race
// @req FR:playbook-actions-git/github-pr-merge.retry.conflict
export function mergeFailure(text: string): { reason: string; retry: boolean } {
  const reason = text.replace(/^Command failed:.*\n?/, '').trim() || 'no reason given';
  // The status `gh` prints, never a stray number such as a PR number in the text
  const retry = !/\bHTTP 409\b/.test(reason) && (/\bHTTP 5\d\d\b/.test(reason) || /base branch was modified/i.test(reason));
  return { reason, retry };
}

const sleep = (seconds: number) => new Promise<void>((resolve) => setTimeout(resolve, seconds * 1000));

const hasLabel = (labels: string[], wanted: (string | null | undefined)[] = []) =>
  wanted.some((w) => typeof w === 'string' && w.trim() !== '' && labels.some((l) => l.toLowerCase() === w.toLowerCase()));

/**
 * Action to merge a PR under the standard GitHub merge rules
 */
// @req FR:playbook-actions-git/github-pr-merge.@action
// @req FR:playbook-actions-git/github-pr-merge.no-shell
// @req FR:playbook-actions-git/github-pr-merge.output
export class GitHubPRMergeAction extends GitHubActionBase<GitHubPRMergeConfig, PRMergeResult> {
  static readonly actionType = 'github-pr-merge';

  static readonly primaryProperty = 'pr';

  // @req FR:playbook-actions-git/github-pr-merge.input
  // @req FR:playbook-actions-git/common.validation
  protected validateConfig(config: GitHubPRMergeConfig): void {
    const invalid = (message: string, guidance: string) =>
      new CatalystError(message, 'GitHubPRMergeConfigInvalid', guidance);

    if (!config?.pr || typeof config.pr !== 'number' || config.pr <= 0) {
      throw invalid('PR number is required and must be a positive integer', 'Provide a valid pull request number');
    }
    if (config.method !== undefined && !METHODS.includes(config.method)) {
      throw invalid(`Unknown merge method: ${config.method}`, `Use one of: ${METHODS.join(', ')}`);
    }
    if (config.sha !== undefined && !/^[0-9a-f]{7,40}$/i.test(config.sha)) {
      throw invalid('Head commit sha is not valid', 'Pass the head commit read from the PR, or omit it');
    }
    if (config.codeOwnerWaived !== undefined && typeof config.codeOwnerWaived !== 'boolean') {
      throw invalid('Code-Owner-Waived must be true or false', 'Pass a boolean, or omit it');
    }
    if (config.retries !== undefined && config.retries !== null && !(Number.isInteger(config.retries) && config.retries >= 1)) {
      throw invalid('Retries must be a whole number of at least 1', 'Pass the most attempts to make, or omit it');
    }
    if (config.retryDelaySeconds !== undefined && config.retryDelaySeconds !== null && !(typeof config.retryDelaySeconds === 'number' && config.retryDelaySeconds >= 0)) {
      throw invalid('Retry-Delay-Seconds must be 0 or more', 'Pass the seconds to wait between attempts, or omit it');
    }
    if (config.holdLabels !== undefined && config.holdLabels !== null && !Array.isArray(config.holdLabels)) {
      throw invalid('Hold-Labels must be a list of label names', 'Pass the labels that stop the merge, or omit it');
    }
    if (config.trailers !== undefined && !(Array.isArray(config.trailers) && config.trailers.every((t) => typeof t === 'string'))) {
      throw invalid('Trailers must be a list of strings', 'Pass git trailer lines, e.g. "Co-authored-by: Name <email>"');
    }
  }

  // @req FR:playbook-actions-git/github-pr-merge.no-bypass
  // @req FR:playbook-actions-git/github-pr-merge.refused
  // @req FR:playbook-actions-git/github-pr-merge.retry
  // @req FR:playbook-actions-git/github-pr-merge.retry.recheck
  // Never `--admin`: branch protection stays in force
  protected async executeGitHubOperation(config: GitHubPRMergeConfig): Promise<PRMergeResult> {
    const repository = config.repository || (await this.getCurrentRepository());
    const attempts = config.retries ?? 3;
    const delay = config.retryDelaySeconds ?? 5;
    // The checks a caller skipped stay skipped on every read
    // @req FR:playbook-actions-git/github-pr-merge.skip-checks
    const skipChecks = checkNames(config.skipChecks);
    const read = () => readPullRequest((args) => this.executeGh(args), repository, config.pr, skipChecks);
    const method = config.method ?? 'squash';

    for (let attempt = 1; ; attempt++) {
      const last = attempt >= attempts;
      // A read can hit the same transient errors as the merge, so it gets the same retries
      // @req FR:playbook-actions-git/github-pr-merge.retry.read
      let snap: PRSnapshot;
      try {
        snap = read();
      } catch (error: unknown) {
        if (!last && mergeFailure(reasonFrom(error)).retry) {
          if (delay) {await sleep(delay);}
          continue;
        }
        throw error;
      }

      // @req FR:playbook-actions-git/github-pr-merge.already-merged
      if (snap.state === 'MERGED') {
        return { merged: true };
      }

      // @req FR:playbook-actions-git/github-pr-merge.hold-labels
      if (hasLabel(snap.labels, config.holdLabels)) {
        return { merged: false, code: 'PullRequestHeld', message: 'The PR has a label that holds the merge.' };
      }

      const refusal = mergeRefusal(snap, config.sha, config.codeOwnerWaived);
      if (refusal) {
        // @req FR:playbook-actions-git/github-pr-merge.retry.unknown
        if (snap.mergeStateStatus === 'UNKNOWN' && refusal.code === 'PullRequestNotMergeable' && !last) {
          if (delay) {await sleep(delay);}
          continue;
        }
        return { merged: false, ...refusal };
      }

      // @req FR:playbook-actions-git/github-pr-merge.dry-run
      if (config.dryRun) {
        return { merged: false, code: 'PullRequestWouldMerge', message: `Would ${method}-merge PR ${config.pr} at ${snap.headSha.slice(0, 7)}.` };
      }

      let message = '';
      try {
        // A rebase writes no merge commit, so it has no message to carry trailers
        const body: string[] = [];
        if (method !== 'rebase') {
          const { commits } = JSON.parse(
            this.executeGh(['pr', 'view', String(config.pr), '-R', repository, '--json', 'commits']),
          ) as PRCommits;
          message = mergeBody(commits, config.trailers);
          body.push('--body', message);
        }
        // Without --delete-branch, the repository's own setting decides
        // @req FR:playbook-actions-git/github-pr-merge.delete-branch
        this.executeGh([
          'pr', 'merge', String(config.pr), '-R', repository,
          `--${method}`, '--match-head-commit', snap.headSha,
          ...body,
          ...(config.deleteBranch ? ['--delete-branch'] : []),
        ]);
        return { merged: true };
      } catch (error: unknown) {
        const failure = mergeFailure(reasonFrom(error, message));
        if (failure.retry && !last) {
          if (delay) {await sleep(delay);}
          continue;
        }
        // Someone may have merged it while this attempt failed
        // @req FR:playbook-actions-git/github-pr-merge.already-merged
        try {
          if (read().state === 'MERGED') {
            return { merged: true };
          }
        } catch {
          // The failure below is the news
        }
        return {
          merged: false,
          code: 'PullRequestMergeFailed',
          message: `GitHub wouldn't merge the PR: ${failure.reason}`,
        };
      }
    }
  }

  protected getSuccessMessage(data: PRMergeResult): string {
    return data.merged ? 'Merged PR' : `${data.message} (Code: ${data.code})`;
  }
}
