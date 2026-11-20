/**
 * The Catalyst PR Retarget workflow template that `catalyst init` installs
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const FILE = path.join(__dirname, '../../src/resources/templates/workflows/catalyst-pr-retarget.yml');
const text = fs.readFileSync(FILE, 'utf8');
const wf = yaml.load(text) as any;
const job = Object.values(wf.jobs)[0] as any;
const steps: any[] = job.steps;

describe('catalyst-pr-retarget workflow template', () => {
  // @req FR:pull-request-workflow/retarget.@gh-action
  it('is named Catalyst PR Retarget and runs when a PR closes', () => {
    expect(wf.name).toBe('Catalyst PR Retarget');
    expect(wf.on).toEqual({ pull_request_target: { types: ['closed'] } });
  });

  // @req FR:pull-request-workflow/retarget.unmerged
  it('skips a merged PR, since GitHub retargets those itself', () => {
    expect(job.if).toContain('github.event.pull_request.merged == false');
  });

  // @req FR:pull-request-workflow/retarget.move
  it('skips a fork PR, whose head branch name is the fork\'s own', () => {
    expect(job.if).toContain('github.event.pull_request.head.repo.full_name == github.repository');
  });

  // @req FR:pull-request-workflow/retarget.@gh-action
  it('runs `catalyst pr-retarget` with the closed PR number', () => {
    const run = steps.map((s) => String(s.run ?? '')).join('\n');
    expect(run).toContain('npx catalyst pr-retarget "${PR_NUMBER}"');
    expect(steps.find((s) => s.name === 'Retarget').env.PR_NUMBER).toBe('${{ github.event.pull_request.number }}');
  });

  // @req FR:pull-request-workflow/retarget.@gh-action
  it('checks out the default branch, never PR code, and asks only for what it edits', () => {
    const co = steps.find((s) => String(s.uses).startsWith('actions/checkout'));
    expect(co.with.ref).toMatch(/default_branch/);
    expect(co.with['persist-credentials']).toBe(false);
    expect(text).not.toMatch(/head\.sha|head\.ref/);
    expect(wf.permissions).toEqual({ contents: 'read', 'pull-requests': 'write', issues: 'write' });
  });
});
