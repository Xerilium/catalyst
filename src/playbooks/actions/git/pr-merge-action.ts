/**
 * GitHub pull request merge action
 * @module playbooks/actions/git/pr-merge-action
 */

import { GitHubActionBase } from './base';
import { readPullRequest } from './pr-get-action';
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
export function mergeRefusal(snap: PRSnapshot, sha?: string): { code: string; message: string } | undefined {
  // @req FR:playbook-actions-git/github-pr-merge.gates.open
  if (snap.state !== 'OPEN') {
    return { code: 'PullRequestNotOpen', message: `PR ${snap.number} is already ${lower(snap.state)}.` };
  }
  if (snap.isDraft) {
    return { code: 'PullRequestDraft', message: `PR ${snap.number} is still a draft.` };
  }
  // @req FR:playbook-actions-git/github-pr-merge.head-sha
  if (sha && !snap.headSha.toLowerCase().startsWith(sha.toLowerCase())) {
    return {
      code: 'HeadCommitChanged',
      message: `PR ${snap.number} changed since it was read; its head is now ${snap.headSha.slice(0, 7)}.`,
    };
  }

  const notPassing = snap.checks.filter((c) => c.state === 'fail' || c.state === 'pending');
  // @req FR:playbook-actions-git/github-pr-merge.gates.checks
  if (notPassing.length) {
    return {
      code: 'ChecksNotPassing',
      message: `Checks aren't passing yet: ${notPassing.map((c) => `${c.name} (${c.state === 'fail' ? 'failed' : 'running'})`).join(', ')}.`,
    };
  }

  // @req FR:playbook-actions-git/github-pr-merge.gates.code-owners
  if (!snap.codeOwnerApproved) {
    return {
      code: 'CodeOwnerApprovalMissing',
      message: `A code owner hasn't approved yet (${snap.codeOwners.join(', ')}).`,
    };
  }

  // @req FR:playbook-actions-git/github-pr-merge.gates.threads
  const open = snap.threadsUnresolved;
  if (open) {
    return { code: 'ThreadsUnresolved', message: `${open} review thread${open === 1 ? ' is' : 's are'} still unresolved.` };
  }

  // @req FR:playbook-actions-git/github-pr-merge.gates.merge-state
  if (snap.mergeable === 'CONFLICTING' || !CLEAN_STATES.includes(snap.mergeStateStatus)) {
    return {
      code: 'MergeStateNotClean',
      message: `PR ${snap.number} can't merge cleanly yet (merge state: ${lower(snap.mergeStateStatus || 'unknown')}).`,
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

/** What GitHub said, without the command line `gh` echoes first */
function reasonFrom(error: unknown): string {
  const e = error as { cause?: { message?: string }; message?: string } | undefined;
  const text = String(e?.cause?.message ?? e?.message ?? error);
  return text.replace(/^Command failed:.*\n?/, '').trim() || 'no reason given';
}

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
    if (config.trailers !== undefined && !(Array.isArray(config.trailers) && config.trailers.every((t) => typeof t === 'string'))) {
      throw invalid('Trailers must be a list of strings', 'Pass git trailer lines, e.g. "Co-authored-by: Name <email>"');
    }
  }

  // @req FR:playbook-actions-git/github-pr-merge.no-bypass
  // @req FR:playbook-actions-git/github-pr-merge.refused
  // Never `--admin`: branch protection stays in force
  protected async executeGitHubOperation(config: GitHubPRMergeConfig): Promise<PRMergeResult> {
    const repository = config.repository || (await this.getCurrentRepository());
    const snap = readPullRequest((args) => this.executeGh(args), repository, config.pr);

    const refusal = mergeRefusal(snap, config.sha);
    if (refusal) {
      return { merged: false, ...refusal };
    }

    const method = config.method ?? 'squash';
    try {
      // A rebase writes no merge commit, so it has no message to carry trailers
      const body: string[] = [];
      if (method !== 'rebase') {
        const { commits } = JSON.parse(
          this.executeGh(['pr', 'view', String(config.pr), '-R', repository, '--json', 'commits']),
        ) as PRCommits;
        body.push('--body', mergeBody(commits, config.trailers));
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
      return {
        merged: false,
        code: 'MergeFailed',
        message: `GitHub wouldn't merge PR ${config.pr}: ${reasonFrom(error)}`,
      };
    }
  }

  protected getSuccessMessage(data: PRMergeResult): string {
    return data.merged ? 'Merged PR' : `${data.message} (Code: ${data.code})`;
  }
}
