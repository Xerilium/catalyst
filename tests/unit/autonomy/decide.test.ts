/**
 * Tests for the Autopilot decision, with fake ports.
 */

import { decideAutopilot } from '../../../src/autonomy/decide';
import type { AutonomyPorts, LedgerEntry, PrFacts } from '../../../src/autonomy/types';

class Fakes {
  ledger: LedgerEntry[] = [];
  labels: string[] = [];
  comments: string[] = [];
  stop: string | undefined;
  viewer = 'bot';
  configText: string | undefined = JSON.stringify({ autonomy: { enabled: true } });
  facts: PrFacts = {
    number: 7,
    author: 'bot',
    state: 'OPEN',
    isDraft: false,
    labels: [],
    files: [{ path: 'src/a.ts', additions: 10, deletions: 2 }],
  };
  failRead = false;

  ports(): AutonomyPorts {
    return {
      clock: () => new Date('2026-11-19T12:00:00Z'),
      repo: { configText: () => this.configText, configCommit: () => 'abc1234' },
      store: {
        readLedger: () => [...this.ledger],
        append: (e) => {
          this.ledger.push(e);
        },
        stopFile: () => this.stop,
      },
      github: {
        viewer: async () => {
          if (this.failRead) {throw new Error('gh down');}
          return this.viewer;
        },
        pullRequest: async () => {
          if (this.failRead) {throw new Error('gh down');}
          return this.facts;
        },
        addLabel: async (_pr, label) => {
          this.labels.push(label);
        },
        comment: async (_pr, body) => {
          this.comments.push(body);
        },
      },
    };
  }
}

const clean = { pr: 7, loopResult: 'clean' as const, rounds: 2, tokens: 1000 };

describe('decideAutopilot', () => {
  let f: Fakes;
  beforeEach(() => {
    f = new Fakes();
  });

  // @req FR:autonomy/autopilot.input
  // @req FR:autonomy/autopilot.apply
  // @req FR:autonomy/autopilot.output
  // @req FR:autonomy/$decision
  it('applies Autopilot to a clean PR with no trigger', async () => {
    const d = await decideAutopilot(f.ports(), clean);
    expect(d).toEqual({ decision: 'apply', pr: 7, reasons: [], applied: true });
    expect(f.labels).toEqual(['Status: 🤖 Autopilot']);
  });

  // @req FR:autonomy/autopilot.apply.name
  it('uses the label name from the label config', async () => {
    f.configText = JSON.stringify({ labels: { style: 'simple' }, autonomy: { enabled: true } });
    await decideAutopilot(f.ports(), clean);
    f.configText = JSON.stringify({ labels: { names: { autopilot: 'go' } }, autonomy: { enabled: true } });
    await decideAutopilot(f.ports(), { ...clean });
    expect(f.labels).toEqual(['autopilot', 'go']);
  });

  // @req FR:autonomy/autopilot.off
  it('changes nothing when autonomy is off', async () => {
    f.configText = '{}';
    const d = await decideAutopilot(f.ports(), clean);
    expect(d.decision).toBe('off');
    expect([f.labels, f.comments, f.ledger]).toEqual([[], [], []]);
  });

  // @req FR:autonomy/autopilot.stop
  // @req FR:autonomy/stop.record
  it('changes nothing on GitHub when a STOP file exists, and records the halt', async () => {
    f.stop = '/repo/.xe/runs/autonomy/STOP';
    const d = await decideAutopilot(f.ports(), clean);
    expect(d.decision).toBe('stopped');
    expect([f.labels, f.comments]).toEqual([[], []]);
    expect(f.ledger.map((e) => e.action)).toEqual(['stopped']);
  });

  // @req FR:autonomy/autopilot.author
  it('escalates a PR another user authored', async () => {
    f.facts.author = 'someone';
    const d = await decideAutopilot(f.ports(), clean);
    expect(d.decision).toBe('escalate');
    expect(d.reasons.map((r) => r.trigger)).toEqual(['not-author']);
    expect(f.labels).toEqual([]);
  });

  // @req FR:autonomy/autopilot.open
  it('escalates a draft or closed PR', async () => {
    f.facts.isDraft = true;
    expect((await decideAutopilot(f.ports(), clean)).reasons.map((r) => r.trigger)).toEqual(['not-open']);
    f.facts.isDraft = false;
    f.facts.state = 'MERGED';
    expect((await decideAutopilot(f.ports(), clean)).reasons.map((r) => r.trigger)).toEqual(['not-open']);
  });

  // @req FR:autonomy/autopilot.evaluate
  // @req FR:autonomy/autopilot.escalate
  it('evaluates every trigger and budget and adds no label when any fires', async () => {
    f.facts.files = [{ path: '.github/workflows/ci.yml', additions: 700, deletions: 0 }];
    const d = await decideAutopilot(f.ports(), { pr: 7, loopResult: 'round-limit', rounds: 9, reasons: ['ambiguity'] });
    expect(d.decision).toBe('escalate');
    expect(d.reasons.map((r) => r.trigger).sort()).toEqual(
      ['ambiguity', 'budget-rounds', 'loop-result', 'max-changed-lines', 'sensitive-path'].sort()
    );
    expect(f.labels).toEqual([]);
  });

  it('defaults a missing loop result to failed', async () => {
    const d = await decideAutopilot(f.ports(), { pr: 7 });
    expect(d.reasons.map((r) => r.trigger)).toEqual(['loop-result']);
  });

  // @req FR:autonomy/escalate.comment
  // @req FR:autonomy/escalate.comment.marker
  // @req FR:autonomy/audit.prefix
  it('posts one comment listing every reason, prefixed and marked', async () => {
    f.facts.files = [{ path: '.xe/product.md', additions: 1, deletions: 0 }];
    await decideAutopilot(f.ports(), { ...clean, reasons: ['ambiguity'] });
    expect(f.comments).toHaveLength(1);
    expect(f.comments[0]).toMatch(/^🤖 \[AI\]/);
    expect(f.comments[0]).toMatch(/🧭/);
    expect(f.comments[0]).toMatch(/contract-path/);
    expect(f.comments[0]).toMatch(/ambiguity/);
  });

  // @req FR:autonomy/audit.apply
  // @req FR:autonomy/audit.apply.config
  // @req FR:autonomy/audit.apply.gates
  it('posts one audit comment naming the config commit when it applies', async () => {
    await decideAutopilot(f.ports(), clean);
    expect(f.comments).toHaveLength(1);
    expect(f.comments[0]).toMatch(/^🤖 \[AI\]/);
    expect(f.comments[0]).toMatch(/\.xe\/config\/catalyst\.json/);
    expect(f.comments[0]).toMatch(/abc1234/);
    expect(f.comments[0]).toMatch(/gates decide the merge/i);
  });

  // @req FR:autonomy/autopilot.apply.no-merge
  // @req NFR:autonomy/safety.one-write
  it('makes at most one label write and one comment, and never merges', async () => {
    const ports = f.ports();
    expect(Object.keys(ports.github).sort()).toEqual(['addLabel', 'comment', 'pullRequest', 'viewer']);
    await decideAutopilot(ports, clean);
    expect([f.labels.length, f.comments.length]).toEqual([1, 1]);
  });

  it('skips the label write when the PR already has Autopilot', async () => {
    f.facts.labels = ['Status: 🤖 Autopilot'];
    const d = await decideAutopilot(f.ports(), clean);
    expect(d).toMatchObject({ decision: 'apply', applied: false });
    expect(f.labels).toEqual([]);
  });

  // @req FR:autonomy/autopilot.dry-run
  it('makes no GitHub write and no ledger entry on a dry run', async () => {
    const d = await decideAutopilot(f.ports(), { ...clean, dryRun: true });
    expect(d).toMatchObject({ decision: 'apply', applied: false });
    expect([f.labels, f.comments, f.ledger]).toEqual([[], [], []]);
  });

  // @req FR:autonomy/ledger.append
  it('records the loop and the decision in the ledger', async () => {
    await decideAutopilot(f.ports(), clean);
    expect(f.ledger.map((e) => e.action)).toEqual(['loop', 'autopilot']);
    expect(f.ledger[0]).toMatchObject({ pr: 7, rounds: 2, tokens: 1000, result: 'clean' });
    f.facts.files = [{ path: '.xe/product.md', additions: 1, deletions: 0 }];
    await decideAutopilot(f.ports(), clean);
    expect(f.ledger.map((e) => e.action)).toEqual(['loop', 'autopilot', 'loop', 'escalate']);
  });

  // @req FR:autonomy/escalate.loop.failures
  it('counts non-clean loops across runs from the ledger', async () => {
    await decideAutopilot(f.ports(), { pr: 7, loopResult: 'failed' });
    const d = await decideAutopilot(f.ports(), clean);
    expect(d.decision).toBe('apply');
    await decideAutopilot(f.ports(), { pr: 7, loopResult: 'round-limit' });
    const after = await decideAutopilot(f.ports(), clean);
    expect(after.reasons.map((r) => r.trigger)).toContain('loop-failures');
  });

  // @req NFR:autonomy/safety.fail-closed.files
  it('escalates when GitHub lists fewer files than changed', async () => {
    f.facts.changedFiles = 150;
    const d = await decideAutopilot(f.ports(), clean);
    expect(d.reasons.map((r) => r.trigger)).toContain('unreadable');
  });

  // @req NFR:autonomy/safety.ledger-first
  it('records the apply even when the audit comment fails', async () => {
    const ports = f.ports();
    ports.github.comment = async () => {
      throw new Error('rate limited');
    };
    const d = await decideAutopilot(ports, clean);
    expect(d).toMatchObject({ decision: 'apply', applied: true });
    expect(f.ledger.map((e) => e.action)).toEqual(['loop', 'autopilot']);
  });

  // @req NFR:autonomy/safety.fail-closed
  it('escalates when it cannot read the PR or the user', async () => {
    f.failRead = true;
    const d = await decideAutopilot(f.ports(), clean);
    expect(d.decision).toBe('escalate');
    expect(d.reasons.map((r) => r.trigger)).toEqual(['unreadable']);
    expect(f.labels).toEqual([]);
  });
});
