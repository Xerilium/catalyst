/**
 * The Catalyst PR workflow template that `catalyst init` installs
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const FILE = path.join(__dirname, '../../src/resources/templates/workflows/catalyst-pr.yml');
const text = fs.readFileSync(FILE, 'utf8');
const wf = yaml.load(text) as any;
const job = Object.values(wf.jobs)[0] as any;
const steps: any[] = job.steps;
const runs = steps.map((s) => String(s.run ?? '')).join('\n');

describe('catalyst-pr workflow template', () => {
  // @req FR:pull-request-workflow/workflow.@template
  it('is named Catalyst PR', () => {
    expect(wf.name).toBe('Catalyst PR');
  });

  // @req FR:pull-request-workflow/workflow.triggers
  it('runs on PR, review, comment, and thread activity', () => {
    expect(Object.keys(wf.on)).toEqual(expect.arrayContaining([
      'pull_request_target', 'pull_request_review', 'pull_request_review_comment', 'pull_request_review_thread', 'issue_comment',
    ]));
    expect(wf.on.pull_request_target.types).toEqual(expect.arrayContaining([
      'opened', 'reopened', 'synchronize', 'edited', 'ready_for_review', 'converted_to_draft', 'labeled', 'unlabeled',
    ]));
    expect(Object.keys(wf.on)).not.toContain('pull_request');
  });

  // @req FR:pull-request-workflow/workflow.triggers.checks
  it('runs when a check suite or workflow completes', () => {
    expect(wf.on.check_suite.types).toEqual(['completed']);
    expect(wf.on.workflow_run.types).toEqual(['completed']);
    expect(wf.on.workflow_run.workflows).toBeUndefined();
  });

  // @req FR:pull-request-workflow/workflow.triggers.no-loop
  it('skips its own completions and GitHub Actions check suites', () => {
    expect(job.if).toContain('github-actions');
    expect(job.if).toContain('Catalyst PR');
    expect(job.if).toContain('pull_request_review');
  });

  // @req FR:pull-request-workflow/workflow.reconcile
  // @req FR:pull-request-workflow/workflow.reconcile.number
  it('runs catalyst pr with the number the event names, and skips when it names none', () => {
    expect(runs).toMatch(/catalyst pr "?\$\{?PR_NUMBER/);
    expect(text).toContain('pull_requests');
    expect(text).toContain('issue.pull_request');
    expect(runs).toMatch(/length/);
  });

  // @req FR:pull-request-workflow/workflow.token
  // @req FR:pull-request-workflow/workflow.token.merge
  // @req FR:pull-request-workflow/workflow.trust.review
  it('uses CATALYST_TOKEN only outside review events, else GITHUB_TOKEN', () => {
    expect(text).toContain('secrets.CATALYST_TOKEN');
    expect(text).toContain('github.token');
    expect(job.env.GH_TOKEN).toMatch(/^\$\{\{ startsWith\(github\.event_name, 'pull_request_review'\) && github\.token \|\| secrets\.CATALYST_TOKEN \|\| github\.token \}\}$/);
  });

  // @req FR:pull-request-workflow/workflow.token.labels
  it('never names the Autopilot label', () => {
    expect(text).not.toMatch(/--add-label|addLabels|gh pr edit|gh issue edit|labels:/);
    expect(runs).not.toMatch(/autopilot/i);
  });

  // @req FR:pull-request-workflow/workflow.trust.checkout
  it('checks out the default branch, never PR code', () => {
    const co = steps.find((s) => String(s.uses).startsWith('actions/checkout'));
    expect(co.with.ref).toMatch(/default_branch/);
    expect(co.with['persist-credentials']).toBe(false);
    expect(text).not.toMatch(/head\.sha|head\.ref/);
  });

  // @req FR:pull-request-workflow/workflow.permissions
  it('asks for minimal permissions', () => {
    expect(wf.permissions).toEqual({
      contents: 'read', 'pull-requests': 'write', issues: 'write', checks: 'read', statuses: 'read',
    });
  });

  // @req FR:pull-request-workflow/workflow.concurrency
  it('queues runs per PR without cancelling', () => {
    expect(wf.concurrency['cancel-in-progress']).toBe(false);
    expect(wf.concurrency.group).toMatch(/catalyst-pr/);
  });

  // @req FR:pull-request-workflow/workflow.fail-closed
  it('lets a failed step fail the job', () => {
    expect(steps.some((s) => s['continue-on-error'] || /\|\|\s*true/.test(String(s.run ?? '')))).toBe(false);
  });
});
