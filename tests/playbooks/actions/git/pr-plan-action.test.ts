// @req FR:playbook-actions-git/pr-lifecycle.plan
// @req FR:playbook-actions-git/pr-lifecycle.plan.pure

import { GitHubPRPlanAction, planPullRequest, labelName } from '@playbooks/actions/git/pr-plan-action';
import type { PRSnapshot } from '@playbooks/actions/git/types';

const AUTOPILOT = 'Status: 🤖 Autopilot';
const FINALIZED = 'Status: ☑️ Finalized';
const READY = 'Status: ✅ Ready';
const ATTENTION = 'Needs: Attention 👋';
const REVIEW = 'Needs: Review 👀';

const snap = (over: Partial<PRSnapshot> = {}): PRSnapshot => ({
  author: 'me',
  isDraft: false,
  state: 'OPEN',
  headSha: 'abc1234',
  labels: [],
  assignees: [],
  reviews: [],
  checks: [{ name: 'ci', state: 'pass' }],
  threads: [],
  changedFiles: ['a.ts'],
  codeOwners: [],
  signOffRequired: false,
  ...over,
});
const thread = (...authors: string[]) => ({
  resolved: false,
  comments: authors.map((author) => ({ author, body: 'x' })),
});
const approved = { author: 'owner', state: 'APPROVED', bot: false };

describe('planPullRequest', () => {
  describe('labels', () => {
    // @req FR:pull-request-workflow/lifecycle.labels
    it('uses config names, then the configured style', () => {
      expect(labelName('ready')).toBe(READY);
      expect(labelName('ready', { style: 'simple' })).toBe('ready');
      expect(labelName('ready', { style: 'simple', names: { ready: 'LGTM' } })).toBe('LGTM');
    });

    // @req FR:pull-request-workflow/lifecycle.labels
    it('skips adding a label missing from the repo', () => {
      expect(planPullRequest(snap(), undefined, []).addLabels).toEqual([]);
      expect(planPullRequest(snap(), undefined, [REVIEW]).addLabels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/lifecycle.paused
    it('changes nothing on a paused PR', () => {
      const plan = planPullRequest(snap({ labels: ['Status: ⏸️ Paused'], isDraft: true, assignees: ['x'] }));
      expect(plan).toMatchObject({ addLabels: [], removeLabels: [], addAssignees: [], removeAssignees: [], merge: false });
    });

    // @req FR:pull-request-workflow/lifecycle.draft
    it('clears state labels on a draft', () => {
      const plan = planPullRequest(snap({ isDraft: true, labels: [REVIEW, ATTENTION, READY, FINALIZED, 'bug'] }));
      expect(plan.removeLabels.sort()).toEqual([ATTENTION, FINALIZED, READY, REVIEW].sort());
      expect(plan.addLabels).toEqual([]);
    });

    // @req FR:pull-request-workflow/lifecycle.needs-attention
    it.each([
      ['a thread last answered by someone else', [thread('me', 'rev')]],
      ['an unanswered self-note', [thread('me')]],
    ])('applies Needs Attention for %s', (_, threads) => {
      expect(planPullRequest(snap({ threads })).addLabels).toEqual([ATTENTION]);
    });

    // @req FR:pull-request-workflow/lifecycle.needs-attention
    it('applies Needs Attention for a 🧭 last comment and a failed check', () => {
      const compass = { resolved: false, comments: [{ author: 'rev', body: 'q' }, { author: 'me', body: '🧭 your call' }] };
      expect(planPullRequest(snap({ threads: [compass] })).addLabels).toEqual([ATTENTION]);
      expect(planPullRequest(snap({ checks: [{ name: 'ci', state: 'fail' }] })).addLabels).toEqual([ATTENTION]);
    });

    // @req FR:pull-request-workflow/lifecycle.needs-attention
    it('ignores skipped and pending checks and resolved threads', () => {
      const plan = planPullRequest(snap({
        checks: [{ name: 'a', state: 'skip' }, { name: 'b', state: 'pending' }],
        threads: [{ resolved: true, comments: [{ author: 'rev', body: 'x' }] }],
      }));
      expect(plan.addLabels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/lifecycle.needs-attention.no-conflict
    it('does not apply Needs Attention for a merge conflict alone', () => {
      expect(planPullRequest(snap({ mergeable: 'CONFLICTING' })).addLabels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/lifecycle.needs-attention.threads
    it('looks at every thread given', () => {
      const many = Array.from({ length: 150 }, () => ({ resolved: true, comments: [] as any[] }));
      expect(planPullRequest(snap({ threads: [...many, thread('rev')] })).addLabels).toEqual([ATTENTION]);
    });

    // @req FR:pull-request-workflow/lifecycle.needs-review
    it('applies Needs Review when neither Attention nor Ready applies', () => {
      expect(planPullRequest(snap()).addLabels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/lifecycle.ready
    it('applies Ready on a human approval, not a bot approval or with changes requested', () => {
      expect(planPullRequest(snap({ reviews: [approved] })).addLabels).toEqual([READY]);
      expect(planPullRequest(snap({ reviews: [{ ...approved, bot: true }] })).addLabels).toEqual([REVIEW]);
      const blocked = planPullRequest(snap({ reviews: [approved, { author: 'b', state: 'CHANGES_REQUESTED', bot: false }] }));
      expect(blocked.addLabels).toEqual([REVIEW]);
    });

    // @req FR:pull-request-workflow/lifecycle.idempotent
    it('plans nothing when the PR already matches', () => {
      const s = snap({ labels: [REVIEW] });
      expect(planPullRequest(s)).toEqual({ addLabels: [], removeLabels: [], addAssignees: [], removeAssignees: [], merge: false, reason: expect.any(String) });
      expect(planPullRequest(s)).toEqual(planPullRequest(s));
    });
  });

  describe('assignees', () => {
    // @req FR:pull-request-workflow/lifecycle.assignment
    it('assigns the author alone on a draft or when attention is needed', () => {
      const plan = planPullRequest(snap({ isDraft: true, codeOwners: ['owner'], assignees: ['owner'] }));
      expect(plan.addAssignees).toEqual(['me']);
      expect(plan.removeAssignees).toEqual(['owner']);
      expect(planPullRequest(snap({ threads: [thread('rev')], codeOwners: ['owner'] })).addAssignees).toEqual(['me']);
    });

    // @req FR:pull-request-workflow/lifecycle.assignment
    it('assigns the author plus code owners who have not approved when Ready', () => {
      const plan = planPullRequest(snap({ reviews: [approved], codeOwners: ['owner', 'other'] }));
      expect(plan.addAssignees).toEqual(['me', 'other']);
    });

    // @req FR:pull-request-workflow/lifecycle.assignment
    it('assigns unapproved code owners otherwise, and leaves a Blocked PR alone', () => {
      expect(planPullRequest(snap({ codeOwners: ['owner'] })).addAssignees).toEqual(['owner']);
      const blocked = planPullRequest(snap({ labels: ['Status: ⛔ Blocked'], codeOwners: ['owner'], assignees: ['x'] }));
      expect(blocked.addAssignees).toEqual([]);
      expect(blocked.removeAssignees).toEqual([]);
    });
  });

  describe('finalized', () => {
    const clean = { labels: [AUTOPILOT, FINALIZED, REVIEW], certifiedSha: 'abc1234' };

    // @req FR:pull-request-workflow/lifecycle.finalized-stale
    it.each([
      ['a draft', { isDraft: true }],
      ['needs attention', { threads: [thread('rev')] }],
      ['lacks Ready while sign-off is required', { signOffRequired: true }],
      ['its head differs from the certified commit', { headSha: 'def5678' }],
      ['no certification comment', { certifiedSha: undefined }],
    ])('removes Finalized when %s', (_, over) => {
      expect(planPullRequest(snap({ ...clean, ...over } as Partial<PRSnapshot>)).removeLabels).toContain(FINALIZED);
    });

    // @req FR:pull-request-workflow/lifecycle.finalized-stale.no-add
    it('never adds Finalized', () => {
      const plan = planPullRequest(snap({ labels: [AUTOPILOT, REVIEW], certifiedSha: 'abc1234' }));
      expect(plan.addLabels).not.toContain(FINALIZED);
    });
  });

  describe('autopilot merge', () => {
    const base = { labels: [AUTOPILOT, FINALIZED, REVIEW], certifiedSha: 'abc1234' };
    const merges = (over: Partial<PRSnapshot> = {}) => planPullRequest(snap({ ...base, ...over }));

    // @req FR:pull-request-workflow/lifecycle.autopilot-merge
    // @req FR:pull-request-workflow/lifecycle.autopilot-merge.code-owner.optional
    it('merges when every gate holds, without sign-off when no code owner covers a file', () => {
      expect(merges().merge).toBe(true);
    });

    // @req FR:pull-request-workflow/lifecycle.autopilot-merge.label
    // @req FR:pull-request-workflow/sweep.autopilot.variants
    it('merges only an Autopilot PR, matching the label variant', () => {
      expect(merges({ labels: [FINALIZED, REVIEW] }).merge).toBe(false);
      expect(merges({ labels: ['Status: Autopilot 🤖', FINALIZED, REVIEW] }).merge).toBe(true);
    });

    // @req FR:pull-request-workflow/lifecycle.autopilot-merge.finalized
    it('requires Finalized at the certified head', () => {
      expect(merges({ labels: [AUTOPILOT, REVIEW] }).merge).toBe(false);
      expect(merges({ headSha: 'def5678' }).merge).toBe(false);
    });

    // @req FR:pull-request-workflow/lifecycle.autopilot-merge.checks
    it('requires every check to pass', () => {
      expect(merges({ checks: [{ name: 'ci', state: 'pending' }] }).merge).toBe(false);
      expect(merges({ checks: [{ name: 'ci', state: 'fail' }] }).merge).toBe(false);
      expect(merges({ checks: [{ name: 'ci', state: 'skip' }, { name: 'b', state: 'pass' }] }).merge).toBe(true);
    });

    // @req FR:pull-request-workflow/lifecycle.autopilot-merge.code-owner
    it('requires Ready when a code owner covers a changed file', () => {
      expect(merges({ signOffRequired: true }).merge).toBe(false);
      expect(merges({ signOffRequired: true, reviews: [approved] }).merge).toBe(true);
    });

    // @req FR:pull-request-workflow/lifecycle.autopilot-merge.threads
    it('requires every thread resolved', () => {
      expect(merges({ threads: [{ resolved: false, comments: [{ author: 'me', body: 'done' }, { author: 'me', body: 'x' }] }] }).merge).toBe(false);
    });

    // @req FR:pull-request-workflow/lifecycle.autopilot-merge.not-in-flight
    it.each(['Status: 🚧 WIP', 'Status: ⏸️ Paused', 'Status: ⛔ Blocked'])('never merges a PR carrying %s', (label) => {
      expect(merges({ labels: [...base.labels, label] }).merge).toBe(false);
    });

    // @req FR:pull-request-workflow/lifecycle.autopilot-merge.not-in-flight
    it('never merges a PR that needs attention', () => {
      expect(merges({ labels: [...base.labels, ATTENTION], threads: [thread('rev')] }).merge).toBe(false);
    });

    // @req FR:pull-request-workflow/lifecycle.autopilot-merge.only-script
    it('merges nothing that is closed, merged, or a draft', () => {
      expect(merges({ state: 'MERGED' }).merge).toBe(false);
      expect(merges({ isDraft: true }).merge).toBe(false);
    });
  });
});

describe('GitHubPRPlanAction', () => {
  it('returns the plan and why a PR may not merge', async () => {
    const result = await new GitHubPRPlanAction().execute({ snapshot: snap() });
    expect(result.code).toBe('Success');
    expect(result.value).toMatchObject({ merge: false, addLabels: [REVIEW] });
    expect(result.message).toContain('may not merge');
  });

  // @req FR:playbook-actions-git/common.validation
  it('requires a snapshot', async () => {
    const result = await new GitHubPRPlanAction().execute({} as any);
    expect(result.code).toBe('GitHubPRPlanConfigInvalid');
  });
});
