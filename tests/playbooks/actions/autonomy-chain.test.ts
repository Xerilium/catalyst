/**
 * Validation tests for the full autonomy chain and the places that run it.
 *
 * @req FR:workflow-context/closure.autonomy
 */

import * as fs from 'fs';
import * as path from 'path';

const RES = path.join(__dirname, '../../../src/resources');
const read = (rel: string): string => fs.readFileSync(path.join(RES, rel), 'utf-8');

describe('autonomy-chain action', () => {
  const rel = 'playbooks/actions/autonomy-chain.md';
  let chain: string;
  beforeAll(() => {
    chain = read(rel);
  });

  // @req FR:workflow-context/closure.autonomy.action
  it('exists with Plain Language before Instructions', () => {
    expect(chain.search(/Plain Language/)).toBeGreaterThan(-1);
    expect(chain.search(/Plain Language/)).toBeLessThan(chain.search(/## Instructions/));
  });

  // @req FR:workflow-context/closure.autonomy.off
  it('skips the chain when status reports autonomy off', () => {
    expect(chain).toMatch(/npx catalyst autonomy status --json/);
    expect(chain).toMatch(/`enabled` is `false`[^\n]*(skip|stop)/i);
  });

  // @req FR:workflow-context/closure.autonomy.order
  it('runs pr-loop, then the Autopilot command, then pr-sweep', () => {
    const loop = chain.indexOf('loop-pull-request.md');
    const autopilot = chain.indexOf('npx catalyst autonomy autopilot');
    const sweep = chain.indexOf('sweep-pull-requests.md');
    expect(loop).toBeGreaterThan(-1);
    expect(autopilot).toBeGreaterThan(loop);
    expect(sweep).toBeGreaterThan(autopilot);
  });

  // @req FR:workflow-context/closure.autonomy.loop-budget
  it('caps pr-loop rounds at the loop-rounds budget', () => {
    expect(chain).toMatch(/max-rounds[^\n]*loop-rounds/);
  });

  // @req FR:workflow-context/closure.autonomy.clean
  it('passes clean only after a resolved loop exit', () => {
    expect(chain).toMatch(/--loop-result clean[^\n]*only/i);
    expect(chain).toMatch(/resolved/);
  });

  // @req FR:workflow-context/closure.autonomy.separate-review
  it('keeps review steps in a separate context', () => {
    expect(chain).toMatch(/subagent/i);
    expect(chain).toMatch(/never review[^\n]*own context|separate context/i);
  });

  // @req FR:workflow-context/closure.autonomy.stop
  it('checks for a STOP file before each step', () => {
    expect(chain).toMatch(/before each step/i);
    expect(chain).toMatch(/STOP/);
  });

  // @req FR:workflow-context/closure.autonomy.never
  it('guards commands against the never-auto list', () => {
    expect(chain).toMatch(/npx catalyst autonomy guard --/);
  });

  // @req FR:workflow-context/closure.autonomy.escalate
  // @req FR:workflow-context/closure.autonomy.escalate.ask
  // @req FR:workflow-context/closure.autonomy.escalate.report
  it('skips pr-sweep on escalation and asks, or reports when no one can answer', () => {
    expect(chain).toMatch(/`escalate`[^\n]*skip[^\n]*pr-sweep|skip `?pr-sweep`?[^\n]*`escalate`/i);
    expect(chain).toMatch(/auq\.md/);
    expect(chain).toMatch(/no one can answer/i);
  });

  // @req FR:workflow-context/closure.autonomy.ledger
  it('records each step in the ledger', () => {
    expect(chain).toMatch(/npx catalyst autonomy record/);
  });

  // @req FR:workflow-context/closure.autonomy.no-merge
  it('never merges', () => {
    expect(chain).toMatch(/Never merge/i);
    expect(chain).toMatch(/catalyst pr/);
  });
});

describe('chain call sites', () => {
  // @req FR:workflow-context/closure.autonomy
  it('closure runs the chain after it opens the pull request', () => {
    const closure = read('playbooks/actions/workflow-closure.md');
    const pr = closure.indexOf('### 5. Create pull request');
    const chainStep = closure.indexOf('autonomy-chain.md');
    expect(pr).toBeGreaterThan(-1);
    expect(chainStep).toBeGreaterThan(pr);
  });

  // @req FR:feature-workflow/workflow.review.autonomy
  it('feature completion relies on closure for the chain', () => {
    expect(read('playbooks/actions/feature-complete.md')).toMatch(/autonomy chain/i);
  });

  // @req FR:pull-request-workflow/loop.exit.stop
  it('pr-loop stops before the next round on STOP', () => {
    expect(read('playbooks/loop-pull-request.md')).toMatch(/STOP file[^\n]*next round|next round[^\n]*STOP/i);
    expect(read('ai-plugin/skills/pr-loop.md')).toMatch(/Bash\(npx catalyst autonomy:\*\)/);
  });

  // @req FR:pull-request-workflow/sweep.converge.kill-switch
  it('pr-sweep stops before the next PR on STOP', () => {
    expect(read('playbooks/sweep-pull-requests.md')).toMatch(/STOP file[^\n]*next PR|next PR[^\n]*STOP/i);
    expect(read('ai-plugin/skills/pr-sweep.md')).toMatch(/Bash\(npx catalyst autonomy:\*\)/);
  });
});
