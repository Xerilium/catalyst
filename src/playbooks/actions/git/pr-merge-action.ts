/**
 * GitHub pull request merge action
 * @module playbooks/actions/git/pr-merge-action
 */

import { GitHubActionBase } from './base';
import { readPullRequest } from './pr-get-action';
import type { GitHubPRMergeConfig, PRMergeOverride, PRMergeResult, PRSnapshot } from './types';
import { CatalystError } from '@core/errors';

const METHODS = ['squash', 'merge', 'rebase'];
const OVERRIDES: PRMergeOverride[] = ['checks', 'code-owners', 'threads', 'merge-state'];
/** Merge states GitHub treats as safe to merge (UNSTABLE: only non-required checks fail) */
const CLEAN_STATES = ['CLEAN', 'HAS_HOOKS', 'UNSTABLE'];

const lower = (s: string) => s.toLowerCase();

/**
 * Check a PR against the standard GitHub merge rules. Returns why it can't
 * merge, or nothing when it can. Pure: no network access.
 */
// @req FR:playbook-actions-git/github-pr-merge.gates
export function mergeRefusal(
  snap: PRSnapshot,
  override: PRMergeOverride[] = [],
  sha?: string,
): { code: string; message: string } | undefined {
  const skip = (rule: PRMergeOverride) => override.includes(rule);

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
  if (!skip('checks') && notPassing.length) {
    return {
      code: 'ChecksNotPassing',
      message: `Checks aren't passing yet: ${notPassing.map((c) => `${c.name} (${c.state === 'fail' ? 'failed' : 'running'})`).join(', ')}.`,
    };
  }

  // Team-only owners can't be matched to reviewers; GitHub's branch protection decides then
  const approvers = snap.reviews.filter((r) => r.state === 'APPROVED').map((r) => lower(r.author));
  if (
    !skip('code-owners') &&
    snap.codeOwned &&
    snap.codeOwners.length &&
    !snap.codeOwners.some((o) => approvers.includes(lower(o)))
  ) {
    return {
      code: 'CodeOwnerApprovalMissing',
      message: `A code owner hasn't approved yet (${snap.codeOwners.join(', ')}).`,
    };
  }

  const open = snap.threads.filter((t) => !t.resolved).length;
  if (!skip('threads') && open) {
    return { code: 'ThreadsUnresolved', message: `${open} review thread${open === 1 ? ' is' : 's are'} still unresolved.` };
  }

  if (!skip('merge-state') && (snap.mergeable === 'CONFLICTING' || !CLEAN_STATES.includes(snap.mergeStateStatus))) {
    return {
      code: 'MergeStateNotClean',
      message: `PR ${snap.number} can't merge cleanly yet (merge state: ${lower(snap.mergeStateStatus || 'unknown')}).`,
    };
  }
  return undefined;
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
    const unknown = (config.override ?? []).filter((o) => !OVERRIDES.includes(o));
    if (unknown.length) {
      throw invalid(`Unknown override: ${unknown.join(', ')}`, `Use any of: ${OVERRIDES.join(', ')}`);
    }
  }

  // @req FR:playbook-actions-git/github-pr-merge.no-bypass
  // @req FR:playbook-actions-git/github-pr-merge.refused
  // Never `--admin`: branch protection stays in force
  protected async executeGitHubOperation(config: GitHubPRMergeConfig): Promise<PRMergeResult> {
    const repository = config.repository || (await this.getCurrentRepository());
    const snap = readPullRequest((args) => this.executeGh(args), repository, config.pr);

    const refusal = mergeRefusal(snap, config.override, config.sha);
    if (refusal) {
      return { merged: false, ...refusal };
    }

    try {
      this.executeGh([
        'pr', 'merge', String(config.pr), '-R', repository,
        `--${config.method ?? 'squash'}`, '--match-head-commit', snap.headSha,
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
