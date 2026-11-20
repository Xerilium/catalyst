/**
 * Escalation triggers: pure checks over PR facts, config, agent input, and ledger stats.
 */

import { firstMatch } from './glob';
import type { AgentReason, AutonomyConfig, LedgerStats, LoopResult, PrFacts, Reason } from './types';

const REQ_ID = /\*\*((?:FR|NFR):[A-Za-z0-9$@._/-]+)\*\*/g;
const SPEC_FILE = /^\.xe\/features\/.+\/spec\.md$/;
const PACKAGE_FILE = /(^|\/)package\.json$/;
const VERSION_LINE = /^[-+]\s*"version"\s*:/;

const lines = (patch: string, sign: '-' | '+'): string[] =>
  patch.split(/\r?\n/).filter((l) => l.startsWith(sign) && !l.startsWith(`${sign}${sign}${sign} `));

const ids = (ls: string[]): Set<string> => new Set(ls.flatMap((l) => [...l.matchAll(REQ_ID)].map((m) => m[1])));

/**
 * Requirement IDs declared on a deleted line that no added line declares.
 * @req FR:autonomy/escalate.spec-contract
 */
export function removedRequirementIds(patch: string): string[] {
  const added = ids(lines(patch, '+'));
  return [...ids(lines(patch, '-'))].filter((id) => !added.has(id));
}

/**
 * True when a patch changes a `"version"` line.
 * @req FR:autonomy/escalate.never-auto
 */
export function versionChanged(patch: string): boolean {
  return patch.split(/\r?\n/).some((l) => VERSION_LINE.test(l) && !l.startsWith('---') && !l.startsWith('+++'));
}

export interface AgentInput {
  loopResult: LoopResult;
  reasons: AgentReason[];
}

const AGENT_DETAIL: Record<AgentReason, string> = {
  ambiguity: 'A requirement has more than one valid reading',
  'ci-unfixable': 'A failing check cannot be fixed in this PR',
  destructive: 'The work needs an action on the never-auto list',
};

/**
 * Every escalation trigger that fires for a PR.
 * @req FR:autonomy/autopilot.evaluate
 */
export function triggerReasons(
  facts: PrFacts,
  config: AutonomyConfig,
  input: AgentInput,
  stats: Pick<LedgerStats, 'nonClean'>
): Reason[] {
  const reasons: Reason[] = [];
  const { escalate } = config;

  // @req FR:autonomy/escalate.sensitive-paths
  const sensitive = facts.files.filter((f) => firstMatch(f.path, escalate.paths));
  if (sensitive.length > 0) {
    reasons.push({ trigger: 'sensitive-path', detail: `Changes ${sensitive.map((f) => `\`${f.path}\``).join(', ')}` });
  }

  // @req FR:autonomy/escalate.contract-paths
  const contract = facts.files.filter((f) => firstMatch(f.path, escalate.contractPaths));
  if (contract.length > 0) {
    reasons.push({ trigger: 'contract-path', detail: `Changes ${contract.map((f) => `\`${f.path}\``).join(', ')}` });
  }

  // @req FR:autonomy/escalate.spec-contract
  const removed = facts.files
    .filter((f) => SPEC_FILE.test(f.path) && f.patch)
    .flatMap((f) => removedRequirementIds(f.patch as string));
  if (removed.length > 0) {
    reasons.push({ trigger: 'spec-contract', detail: `Removes ${removed.map((id) => `\`${id}\``).join(', ')}` });
  }

  // @req FR:autonomy/escalate.never-auto
  const bumped = facts.files.filter((f) => PACKAGE_FILE.test(f.path) && f.patch && versionChanged(f.patch));
  if (bumped.length > 0) {
    reasons.push({ trigger: 'release-version', detail: `Changes the release version in ${bumped.map((f) => `\`${f.path}\``).join(', ')}` });
  }

  // @req FR:autonomy/escalate.size
  const changed = facts.files.reduce((n, f) => n + f.additions + f.deletions, 0);
  if (changed > escalate.maxChangedLines) {
    reasons.push({ trigger: 'max-changed-lines', detail: `${changed} changed lines (limit ${escalate.maxChangedLines})` });
  }
  // @req FR:autonomy/escalate.size.files
  if (facts.files.length > escalate.maxChangedFiles) {
    reasons.push({ trigger: 'max-changed-files', detail: `${facts.files.length} changed files (limit ${escalate.maxChangedFiles})` });
  }

  // @req FR:autonomy/escalate.loop
  if (input.loopResult !== 'clean') {
    reasons.push({ trigger: 'loop-result', detail: `pr-loop ended \`${input.loopResult}\`, not \`clean\`` });
  }
  // @req FR:autonomy/escalate.loop.failures
  if (stats.nonClean >= escalate.maxLoopFailures) {
    reasons.push({ trigger: 'loop-failures', detail: `${stats.nonClean} pr-loop runs did not end clean (limit ${escalate.maxLoopFailures})` });
  }

  // @req FR:autonomy/escalate.agent
  for (const r of input.reasons) {
    reasons.push({ trigger: r, detail: AGENT_DETAIL[r] });
  }
  return reasons;
}
