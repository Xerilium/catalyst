/**
 * Tests for escalation triggers and budget caps.
 */

import { readAutonomyConfig } from '../../../src/autonomy/config';
import { budgetReasons, ledgerStats } from '../../../src/autonomy/budget';
import { removedRequirementIds, triggerReasons, versionChanged, type AgentInput } from '../../../src/autonomy/escalation';
import type { LedgerEntry, PrFacts } from '../../../src/autonomy/types';

const config = (autonomy: Record<string, unknown> = {}) =>
  readAutonomyConfig(JSON.stringify({ autonomy: { enabled: true, ...autonomy } })).config;

const pr = (files: PrFacts['files']): PrFacts => ({
  number: 7,
  author: 'bot',
  state: 'OPEN',
  isDraft: false,
  labels: [],
  files,
});

const file = (path: string, additions = 1, deletions = 0, patch?: string) => ({ path, additions, deletions, patch });
const clean: AgentInput = { loopResult: 'clean', reasons: [] };
const noStats = { rounds: 0, tokens: 0, nonClean: 0, appliedToday: 0 };
const triggers = (facts: PrFacts, cfg = config(), input = clean, stats = noStats) =>
  triggerReasons(facts, cfg, input, stats).map((r) => r.trigger);

describe('triggerReasons', () => {
  it('fires nothing on a small routine change', () => {
    expect(triggers(pr([file('src/a.ts'), file('tests/a.test.ts')]))).toEqual([]);
  });

  // @req FR:autonomy/escalate.sensitive-paths
  it('escalates a change to a sensitive path', () => {
    expect(triggers(pr([file('.github/workflows/ci.yml')]))).toEqual(['sensitive-path']);
    expect(triggers(pr([file('src/auth/login.ts')]))).toEqual(['sensitive-path']);
    expect(triggers(pr([file('.env.local')]))).toEqual(['sensitive-path']);
    expect(triggers(pr([file('infra/main.bicep')]), config({ escalate: { paths: ['infra/**'] } }))).toEqual([
      'sensitive-path',
    ]);
  });

  // @req FR:autonomy/escalate.sensitive-paths.config
  it('escalates a change to the autonomy config itself', () => {
    expect(triggers(pr([file('.xe/config/catalyst.json')]))).toContain('sensitive-path');
  });

  // @req FR:autonomy/escalate.contract-paths
  it('escalates a change to a contract path', () => {
    expect(triggers(pr([file('.xe/features/blueprint.md')]))).toEqual(['contract-path']);
    expect(triggers(pr([file('.xe/product.md')]))).toEqual(['contract-path']);
  });

  // @req FR:autonomy/escalate.spec-contract
  it('escalates a removed requirement ID but not an edited or added one', () => {
    const removed = '@@\n-- **FR:a.b** (P1): Old\n+- **FR:a.c** (P1): New\n';
    const edited = '@@\n-- **FR:a.b** (P1): Old\n+- **FR:a.b** (P1): Better\n';
    expect(removedRequirementIds(removed)).toEqual(['FR:a.b']);
    expect(removedRequirementIds(edited)).toEqual([]);
    expect(triggers(pr([file('.xe/features/x/spec.md', 1, 1, removed)]))).toEqual(['spec-contract']);
    expect(triggers(pr([file('.xe/features/x/spec.md', 1, 1, edited)]))).toEqual([]);
    expect(triggers(pr([file('docs/x.md', 1, 1, removed)]))).toEqual([]);
  });

  // @req FR:autonomy/escalate.size
  it('escalates a PR over the changed-line limit', () => {
    expect(triggers(pr([file('src/a.ts', 400, 201)]))).toEqual(['max-changed-lines']);
    expect(triggers(pr([file('src/a.ts', 400, 200)]))).toEqual([]);
  });

  // @req FR:autonomy/escalate.size.files
  it('escalates a PR over the changed-file limit', () => {
    const files = Array.from({ length: 4 }, (_, i) => file(`src/${i}.ts`));
    expect(triggers(pr(files), config({ escalate: { 'max-changed-files': 3 } }))).toEqual(['max-changed-files']);
  });

  // @req FR:autonomy/escalate.loop
  it('escalates when the last loop did not end clean', () => {
    expect(triggers(pr([]), config(), { loopResult: 'round-limit', reasons: [] })).toEqual(['loop-result']);
    expect(triggers(pr([]), config(), { loopResult: 'failed', reasons: [] })).toEqual(['loop-result']);
  });

  // @req FR:autonomy/escalate.loop.failures
  it('escalates when non-clean loops reach the limit', () => {
    expect(triggers(pr([]), config(), clean, { ...noStats, nonClean: 2 })).toEqual(['loop-failures']);
    expect(triggers(pr([]), config(), clean, { ...noStats, nonClean: 1 })).toEqual([]);
  });

  // @req FR:autonomy/escalate.agent
  it('escalates each agent-judged reason', () => {
    expect(
      triggers(pr([]), config(), { loopResult: 'clean', reasons: ['ambiguity', 'ci-unfixable', 'destructive'] })
    ).toEqual(['ambiguity', 'ci-unfixable', 'destructive']);
  });

  // @req FR:autonomy/escalate.never-auto
  it('escalates a release version change', () => {
    const bump = '@@\n-  "version": "1.0.0",\n+  "version": "1.1.0",\n';
    expect(versionChanged(bump)).toBe(true);
    expect(versionChanged('@@\n+  "x": 1,\n')).toBe(false);
    expect(triggers(pr([file('package.json', 1, 1, bump)]))).toEqual(['release-version']);
    expect(triggers(pr([file('pkg/package.json', 1, 1, bump)]))).toEqual(['release-version']);
  });
});

describe('budget', () => {
  const now = new Date('2026-11-19T12:00:00Z');
  const entry = (e: Partial<LedgerEntry>): LedgerEntry => ({ at: '2026-11-19T11:00:00Z', action: 'loop', ...e });

  // @req FR:autonomy/budget.source
  it('computes stats from ledger entries for one PR', () => {
    const stats = ledgerStats(
      [
        entry({ pr: 7, rounds: 2, tokens: 100, result: 'clean' }),
        entry({ pr: 7, rounds: 1, tokens: 50, result: 'failed' }),
        entry({ pr: 8, rounds: 9, tokens: 999, result: 'failed' }),
        entry({ pr: 8, action: 'autopilot' }),
        entry({ pr: 9, action: 'autopilot', at: '2026-11-18T23:00:00Z' }),
      ],
      7,
      now
    );
    expect(stats).toEqual({ rounds: 3, tokens: 150, nonClean: 1, appliedToday: 1, firstAt: new Date('2026-11-19T11:00:00Z') });
  });

  // @req FR:autonomy/budget.rounds
  it('escalates when recorded rounds exceed the budget', () => {
    expect(budgetReasons({ ...noStats, rounds: 6 }, config(), now).map((r) => r.trigger)).toEqual(['budget-rounds']);
    expect(budgetReasons({ ...noStats, rounds: 5 }, config(), now)).toEqual([]);
  });

  // @req FR:autonomy/budget.minutes
  it('escalates when the first entry is older than the budget', () => {
    const firstAt = new Date(now.getTime() - 121 * 60_000);
    expect(budgetReasons({ ...noStats, firstAt }, config(), now).map((r) => r.trigger)).toEqual(['budget-minutes']);
  });

  // @req FR:autonomy/budget.tokens
  it('escalates when recorded tokens exceed the budget', () => {
    expect(budgetReasons({ ...noStats, tokens: 2000001 }, config(), now).map((r) => r.trigger)).toEqual(['budget-tokens']);
  });

  // @req FR:autonomy/budget.daily
  it('escalates once the daily Autopilot count is reached', () => {
    expect(budgetReasons({ ...noStats, appliedToday: 10 }, config(), now).map((r) => r.trigger)).toEqual(['budget-daily']);
    expect(budgetReasons({ ...noStats, appliedToday: 9 }, config(), now)).toEqual([]);
  });
});
