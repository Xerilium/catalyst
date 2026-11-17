/**
 * The Catalyst PR workflow template that `catalyst init` installs
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { execFileSync, spawnSync } from 'child_process';

const FILE = path.join(__dirname, '../../src/resources/templates/workflows/catalyst-pr.yml');
const text = fs.readFileSync(FILE, 'utf8');
const wf = yaml.load(text) as any;
const job = Object.values(wf.jobs)[0] as any;
const steps: any[] = job.steps;
const runs = steps.map((s) => String(s.run ?? '')).join('\n');

describe('catalyst-pr workflow template', () => {
  // @req FR:pull-request-workflow/reconcile.@gh-action
  it('is named Catalyst PR', () => {
    expect(wf.name).toBe('Catalyst PR');
  });

  // @req FR:pull-request-workflow/reconcile.@gh-action
  it('runs on PR, review, comment, and thread activity', () => {
    expect(Object.keys(wf.on)).toEqual(expect.arrayContaining([
      'pull_request_target', 'pull_request_review', 'pull_request_review_comment', 'pull_request_review_thread', 'issue_comment',
    ]));
    expect(wf.on.pull_request_target.types).toEqual(expect.arrayContaining([
      'opened', 'reopened', 'synchronize', 'edited', 'ready_for_review', 'converted_to_draft', 'labeled', 'unlabeled',
    ]));
    expect(Object.keys(wf.on)).not.toContain('pull_request');
  });

  // @req FR:pull-request-workflow/reconcile.rerun
  it('runs when a check suite or workflow completes', () => {
    expect(wf.on.check_suite.types).toEqual(['completed']);
    expect(wf.on.workflow_run.types).toEqual(['completed']);
    expect(wf.on.workflow_run.workflows).toBeUndefined();
  });

  // @req FR:pull-request-workflow/reconcile.rerun.no-loop
  it('skips its own completions and GitHub Actions check suites', () => {
    expect(job.if).toContain('github-actions');
    expect(job.if).toContain('Catalyst PR');
    expect(job.if).toContain('pull_request_review');
  });

  // @req FR:pull-request-workflow/reconcile.rerun.no-loop.comment
  it('skips non-PR comments and its own comments', () => {
    expect(job.if).toContain('issue.pull_request');
    expect(job.if).toContain('🤖 [AI]');
    expect(job.if).toContain('⚛️ [Catalyst]');
  });

  // @req FR:pull-request-workflow/reconcile.@gh-action
  it('runs catalyst pr with the number the event names', () => {
    expect(runs).toMatch(/catalyst pr "?\$\{?PR_NUMBER/);
  });

  describe('Find the PR step', () => {
    const find = steps.find((s) => s.id === 'pr');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalyst-pr-wf-'));
    afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

    /** Runs the step's own script against an event payload; returns the `number` it outputs */
    function numberFor(event: object): { number: string; stdout: string } {
      const eventPath = path.join(dir, 'event.json');
      const outPath = path.join(dir, 'out');
      fs.writeFileSync(eventPath, JSON.stringify(event));
      fs.writeFileSync(outPath, '');
      const stdout = execFileSync('bash', ['-c', find.run], {
        env: { ...process.env, EVENT_PATH: eventPath, GITHUB_OUTPUT: outPath },
        encoding: 'utf8',
      });
      return { number: /number=(.*)/.exec(fs.readFileSync(outPath, 'utf8'))?.[1] ?? '', stdout };
    }

    // @req FR:pull-request-workflow/reconcile.@gh-action
    it.each([
      ['pull_request_target', { pull_request: { number: 7 } }, '7'],
      ['pull_request_review', { pull_request: { number: 8 }, review: {} }, '8'],
      ['pull_request_review_thread', { pull_request: { number: 9 }, thread: {} }, '9'],
      ['issue_comment on a PR', { issue: { number: 10, pull_request: { url: 'u' } } }, '10'],
    ])('finds the PR number of a %s event', (_name, event, expected) => {
      expect(numberFor(event).number).toBe(expected);
    });

    // @req FR:pull-request-workflow/reconcile.@gh-action
    it('skips an issue comment on a plain issue', () => {
      const result = numberFor({ issue: { number: 11 } });
      expect(result.number).toBe('');
      expect(result.stdout).toContain('nothing to do');
    });
  });

  // @req FR:pull-request-workflow/reconcile.@gh-action
  it('runs on the runner CATALYST_RUNS_ON names, else ubuntu-latest', () => {
    expect(job['runs-on']).toBe('${{ fromJSON(vars.CATALYST_RUNS_ON || \'"ubuntu-latest"\') }}');
  });

  describe('Install dependencies step', () => {
    const install = steps.find((s) => s.name === 'Install dependencies');

    /** Runs the step in a project holding `files`, with stub package managers that print their command line */
    function commandFor(files: string[]): string {
      const project = fs.mkdtempSync(path.join(os.tmpdir(), 'catalyst-pr-install-'));
      const bin = path.join(project, '.bin');
      fs.mkdirSync(bin);
      for (const tool of ['npm', 'pnpm', 'yarn', 'bun', 'corepack']) {
        fs.writeFileSync(path.join(bin, tool), `#!/bin/sh\necho "${tool} $*"\n`, { mode: 0o755 });
      }
      for (const f of files) { fs.writeFileSync(path.join(project, f), ''); }
      try {
        return execFileSync('bash', ['-c', install.run], {
          cwd: project, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, encoding: 'utf8',
        }).trim().split('\n').pop() as string;
      } finally {
        fs.rmSync(project, { recursive: true, force: true });
      }
    }

    // @req FR:pull-request-workflow/reconcile.@gh-action
    it.each([
      ['package-lock.json', ['package-lock.json'], 'npm ci'],
      ['pnpm-lock.yaml', ['pnpm-lock.yaml'], 'pnpm install --frozen-lockfile'],
      ['yarn.lock (classic)', ['yarn.lock'], 'yarn install --frozen-lockfile'],
      ['yarn.lock with .yarnrc.yml', ['yarn.lock', '.yarnrc.yml'], 'yarn install --immutable'],
      ['bun.lock', ['bun.lock'], 'bun install --frozen-lockfile'],
      ['bun.lockb', ['bun.lockb'], 'bun install --frozen-lockfile'],
    ])('installs a project with %s using its own package manager', (_name, files, expected) => {
      expect(commandFor(files)).toBe(expected);
    });
  });

  // @req FR:pull-request-workflow/reconcile.rerun.number
  const hasJq = spawnSync('jq', ['--version']).status === 0;
  (hasJq ? it : it.skip)('finds one PR number per event, or none', () => {
    const find = steps.find((s) => s.id === 'pr');
    const filter = /jq -r '([\s\S]*?)' "\$EVENT_PATH"/.exec(find.run)![1];
    const number = (event: object) => execFileSync('jq', ['-r', filter], { input: JSON.stringify(event) }).toString().trim();
    expect(number({ pull_request: { number: 7 } })).toBe('7');
    expect(number({ issue: { number: 8, pull_request: {} } })).toBe('8');
    expect(number({ issue: { number: 9 } })).toBe('');
    expect(number({ check_suite: { pull_requests: [{ number: 3 }] } })).toBe('3');
    expect(number({ workflow_run: { pull_requests: [{ number: 4 }] } })).toBe('4');
    expect(number({ check_suite: { pull_requests: [] } })).toBe('');
    expect(number({ workflow_run: { pull_requests: [{ number: 1 }, { number: 2 }] } })).toBe('');
  });

  // @req FR:pull-request-workflow/reconcile.rerun.review
  it('uses CATALYST_TOKEN only outside review events, else GITHUB_TOKEN', () => {
    expect(text).toContain('secrets.CATALYST_TOKEN');
    expect(text).toContain('github.token');
    expect(job.env.GH_TOKEN).toBeUndefined();
    const step = steps.find((s) => /npx catalyst pr/.test(String(s.run)));
    expect(step.env.GH_TOKEN).toMatch(/^\$\{\{ startsWith\(github\.event_name, 'pull_request_review'\) && github\.token \|\| secrets\.CATALYST_TOKEN \|\| github\.token \}\}$/);
  });

  // @req FR:pull-request-workflow/reconcile.@gh-action
  it('never names the Autopilot label', () => {
    expect(text).not.toMatch(/--add-label|addLabels|gh pr edit|gh issue edit|labels:/);
    expect(runs).not.toMatch(/autopilot/i);
  });

  // @req FR:pull-request-workflow/reconcile.@gh-action
  it('checks out the default branch and fetches the PR head only as a ref', () => {
    const co = steps.find((s) => String(s.uses).startsWith('actions/checkout'));
    expect(co.with.ref).toMatch(/default_branch/);
    expect(co.with['persist-credentials']).toBe(false);
    expect(text).not.toMatch(/head\.sha|head\.ref/);
  });

  // @req FR:pull-request-workflow/reconcile.@gh-action
  it('asks for minimal permissions', () => {
    expect(wf.permissions).toEqual({
      contents: 'read', 'pull-requests': 'write', issues: 'write', checks: 'read', statuses: 'read', actions: 'read',
    });
  });

  // @req FR:pull-request-workflow/reconcile.@gh-action
  it('queues runs per PR without cancelling, and groups a skipped bot comment by run', () => {
    expect(wf.concurrency['cancel-in-progress']).toBe(false);
    expect(wf.concurrency.group).toMatch(/catalyst-pr/);
    expect(wf.concurrency.group).toMatch(/🤖 \[AI\].*&& github\.run_id \|\| github\.event\.pull_request\.number/s);
  });

  // @req FR:pull-request-workflow/reconcile.@gh-action
  it('lets a failed step fail the job', () => {
    expect(steps.some((s) => s['continue-on-error'] || /\|\|\s*true/.test(String(s.run ?? '')))).toBe(false);
  });
});
