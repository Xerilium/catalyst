/**
 * GitHub pull request lifecycle plan action
 * @module playbooks/actions/git/pr-plan-action
 */

import { GitHubActionBase } from './base';
import type { GitHubPRPlanConfig, PRPlan, PRSnapshot, LabelConfig } from './types';
import { CatalystError } from '@core/errors';

type LabelId =
  | 'autopilot' | 'blocked' | 'finalized' | 'needs-attention' | 'needs-review'
  | 'paused' | 'ready' | 'wip';

/** Standard and simple label names; keep in sync with FR:repo-labels/catalog */
const NAMES: Record<LabelId, [standard: string, simple: string]> = {
  autopilot: ['Status: 🤖 Autopilot', 'autopilot'],
  blocked: ['Status: ⛔ Blocked', 'blocked'],
  finalized: ['Status: ☑️ Finalized', 'finalized'],
  'needs-attention': ['Needs: Attention 👋', 'needs attention'],
  'needs-review': ['Needs: Review 👀', 'needs review'],
  paused: ['Status: ⏸️ Paused', 'paused'],
  ready: ['Status: ✅ Ready', 'ready'],
  wip: ['Status: 🚧 WIP', 'wip'],
};

/** Autopilot also appears under this variant */
const AUTOPILOT_VARIANT = 'Status: Autopilot 🤖';

/** Label name for `id`: config override, else the configured style's name */
// @req FR:pull-request-workflow/lifecycle.labels
export function labelName(id: LabelId, config?: LabelConfig): string {
  return config?.names?.[id] ?? NAMES[id][config?.style === 'simple' ? 1 : 0];
}

const lower = (s: string) => s.toLowerCase();
const uniq = (a: string[]) => [...new Set(a)];

/**
 * Decide a PR's labels, assignees, and merge from its snapshot. Pure: the same
 * snapshot gives the same plan.
 */
// @req FR:playbook-actions-git/pr-lifecycle.plan.pure
export function planPullRequest(
  snap: PRSnapshot,
  labels?: LabelConfig,
  present?: string[],
): PRPlan {
  const name = (id: LabelId) => labelName(id, labels);
  const isOn = (id: LabelId, set: string[]) =>
    set.includes(name(id)) || (id === 'autopilot' && set.includes(AUTOPILOT_VARIANT));
  const onPR = (id: LabelId) => isOn(id, snap.labels);

  const plan: PRPlan = {
    addLabels: [], removeLabels: [], addAssignees: [], removeAssignees: [], merge: false,
  };

  // @req FR:pull-request-workflow/lifecycle.paused
  if (onPR('paused')) {
    return { ...plan, reason: 'paused' };
  }

  const author = snap.author;
  const isAuthor = (login: string) => lower(login) === lower(author);
  const approvers = snap.reviews.filter((r) => r.state === 'APPROVED').map((r) => lower(r.author));
  const humans = snap.reviews.filter((r) => !r.bot);

  // @req FR:pull-request-workflow/lifecycle.needs-attention
  // @req FR:pull-request-workflow/lifecycle.needs-attention.no-conflict
  const open = snap.threads.filter((t) => !t.resolved);
  const needsAttention =
    !snap.isDraft &&
    (open.some((t) => {
      const last = t.comments[t.comments.length - 1];
      return !last || !isAuthor(last.author) || t.comments.every((c) => isAuthor(c.author)) || last.body.includes('🧭');
    }) ||
      snap.checks.some((c) => c.state === 'fail'));
  // @req FR:pull-request-workflow/lifecycle.ready
  const ready =
    !snap.isDraft &&
    humans.some((r) => r.state === 'APPROVED') &&
    !humans.some((r) => r.state === 'CHANGES_REQUESTED');
  // @req FR:pull-request-workflow/lifecycle.needs-review
  const needsReview = !snap.isDraft && !needsAttention && !ready;
  const signOff = snap.signOffRequired;

  // @req FR:pull-request-workflow/lifecycle.draft
  const want: Partial<Record<LabelId, boolean>> = snap.isDraft
    ? { 'needs-review': false, 'needs-attention': false, ready: false, finalized: false }
    : { 'needs-attention': needsAttention, ready, 'needs-review': needsReview };
  // @req FR:pull-request-workflow/lifecycle.finalized-stale
  // @req FR:pull-request-workflow/lifecycle.finalized-stale.no-add
  if (
    snap.isDraft || needsAttention || (signOff && !ready) ||
    (snap.certifiedSha !== undefined ? snap.headSha !== snap.certifiedSha : true)
  ) {
    want.finalized = false;
  }

  const repoHas = (n: string) => !present || present.includes(n);
  for (const [id, on] of Object.entries(want) as [LabelId, boolean][]) {
    const label = onPR(id) && id === 'autopilot' ? AUTOPILOT_VARIANT : name(id);
    if (on && !onPR(id) && repoHas(name(id))) {
      plan.addLabels.push(name(id));
    } else if (!on && onPR(id)) {
      plan.removeLabels.push(snap.labels.includes(label) ? label : name(id));
    }
  }

  // @req FR:pull-request-workflow/lifecycle.assignment
  const owners = snap.codeOwners.filter((o) => !approvers.includes(lower(o)));
  let assign: string[] | undefined;
  if (snap.isDraft || needsAttention) {
    assign = [author];
  } else if (ready) {
    assign = uniq([author, ...owners]);
  } else if (!onPR('blocked')) {
    assign = uniq(owners);
  }
  if (assign) {
    const have = snap.assignees.map(lower);
    const wantL = assign.map(lower);
    plan.addAssignees = assign.filter((a) => !have.includes(lower(a)));
    plan.removeAssignees = snap.assignees.filter((a) => !wantL.includes(lower(a)));
  }

  // @req FR:pull-request-workflow/lifecycle.autopilot-merge
  const final = (id: LabelId) =>
    (onPR(id) && !plan.removeLabels.some((l) => isOn(id, [l]))) || plan.addLabels.includes(name(id));
  const gates: [boolean, string][] = [
    [snap.state === 'OPEN' && !snap.isDraft, 'not an open, ready PR'], // @req FR:pull-request-workflow/lifecycle.autopilot-merge.label
    [final('autopilot'), 'no Autopilot label'],
    [final('finalized'), 'not Finalized'], // @req FR:pull-request-workflow/lifecycle.autopilot-merge.finalized
    [snap.certifiedSha === snap.headSha, 'head differs from the certified commit'],
    [snap.checks.every((c) => c.state === 'pass' || c.state === 'skip'), 'checks not passing'], // @req FR:pull-request-workflow/lifecycle.autopilot-merge.checks
    [!signOff || final('ready'), 'code-owner sign-off missing'], // @req FR:pull-request-workflow/lifecycle.autopilot-merge.code-owner
    [snap.threads.every((t) => t.resolved), 'unresolved threads'], // @req FR:pull-request-workflow/lifecycle.autopilot-merge.threads
    [!(final('wip') || final('blocked') || final('needs-attention')), 'WIP, Blocked, or Needs Attention'], // @req FR:pull-request-workflow/lifecycle.autopilot-merge.not-in-flight
  ];
  const failed = gates.find(([ok]) => !ok);
  plan.merge = !failed;
  if (failed) {
    plan.reason = failed[1];
  }
  return plan;
}

/**
 * Action that turns a PR snapshot into a plan; makes no network calls
 */
// @req FR:playbook-actions-git/pr-lifecycle.plan
export class GitHubPRPlanAction extends GitHubActionBase<GitHubPRPlanConfig, PRPlan> {
  static readonly actionType = 'github-pr-plan';

  static readonly primaryProperty = 'snapshot';

  protected validateConfig(config: GitHubPRPlanConfig): void {
    if (!config?.snapshot || typeof config.snapshot !== 'object') {
      throw new CatalystError(
        'PR snapshot is required',
        'GitHubPRPlanConfigInvalid',
        'Pass the result of github-pr-get',
      );
    }
  }

  protected async executeGitHubOperation(config: GitHubPRPlanConfig): Promise<PRPlan> {
    return planPullRequest(config.snapshot, config.labels, config.present);
  }

  protected getSuccessMessage(plan: PRPlan): string {
    return plan.merge ? 'PR may merge' : `PR may not merge${plan.reason ? `: ${plan.reason}` : ''}`;
  }
}
