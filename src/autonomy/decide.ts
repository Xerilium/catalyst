/**
 * Decide whether the authoring agent may apply Autopilot to its PR, and act on it.
 * Autopilot gates still decide the merge; this never merges.
 * @req FR:autonomy/autopilot.@cli
 * @req FR:autonomy/autopilot.apply.no-merge
 */

import { budgetReasons, ledgerStats } from './budget';
import { readAutonomyConfig } from './config';
import { triggerReasons } from './escalation';
import { autopilotLabelName } from './labels';
import type { AgentReason, AutonomyPorts, Decision, LedgerEntry, LoopResult, PrFacts, Reason } from './types';

/** @req FR:autonomy/autopilot.input */
export interface AutopilotRequest {
  pr: number;
  loopResult?: LoopResult;
  rounds?: number;
  tokens?: number;
  reasons?: AgentReason[];
  dryRun?: boolean;
}

const CONFIG_FILE = '.xe/config/catalyst.json';
const PREFIX = '🤖 [AI]';

/**
 * @req FR:autonomy/escalate.comment
 * @req FR:autonomy/escalate.comment.marker
 * @req FR:autonomy/audit.prefix
 */
export function escalationComment(reasons: Reason[]): string {
  return [
    `${PREFIX} Full autonomy did not apply Autopilot. A person needs to decide.`,
    '',
    '🧭 Reasons:',
    '',
    ...reasons.map((r) => `- \`${r.trigger}\`: ${r.detail}`),
    '',
    'Add Autopilot yourself after review, or fix the cause and run the chain again.',
  ].join('\n');
}

/**
 * @req FR:autonomy/audit.apply
 * @req FR:autonomy/audit.apply.config
 * @req FR:autonomy/audit.apply.gates
 */
export function applyComment(label: string, commit: string | undefined, rounds: number): string {
  const at = commit ? ` at ${commit}` : '';
  return [
    `${PREFIX} Full autonomy applied \`${label}\`.`,
    '',
    `- Turned on by \`${CONFIG_FILE}\`${at}`,
    `- \`pr-loop\` ended clean after ${rounds} recorded round${rounds === 1 ? '' : 's'}`,
    '- No escalation trigger fired and no budget is spent',
    '',
    'The Autopilot gates decide the merge. Add Paused to hold it.',
  ].join('\n');
}

/**
 * @req FR:autonomy/autopilot.off
 * @req FR:autonomy/autopilot.stop
 * @req FR:autonomy/autopilot.author
 * @req FR:autonomy/autopilot.open
 * @req FR:autonomy/autopilot.evaluate
 * @req FR:autonomy/autopilot.apply
 * @req FR:autonomy/autopilot.escalate
 * @req FR:autonomy/autopilot.dry-run
 * @req FR:autonomy/ledger.append
 * @req NFR:autonomy/safety.fail-closed
 * @req NFR:autonomy/safety.one-write
 */
export async function decideAutopilot(ports: AutonomyPorts, req: AutopilotRequest): Promise<Decision> {
  const { github, store, repo, clock } = ports;
  const now = clock();
  const at = now.toISOString();
  const write = (e: LedgerEntry): void => {
    if (!req.dryRun) {store.append(e);}
  };
  const configText = repo.configText();
  const { config, problems } = readAutonomyConfig(configText);

  if (!config.enabled) {
    return { decision: 'off', pr: req.pr, reasons: problems.map((p) => ({ trigger: 'config', detail: p })), applied: false };
  }

  // @req FR:autonomy/stop.record
  const stop = store.stopFile();
  if (stop) {
    write({ at, pr: req.pr, action: 'stopped', detail: `STOP file: ${stop}` });
    return { decision: 'stopped', pr: req.pr, reasons: [{ trigger: 'stop', detail: `STOP file: ${stop}` }], applied: false };
  }

  const loopResult = req.loopResult ?? 'failed';
  const loopEntry: LedgerEntry = { at, pr: req.pr, action: 'loop', result: loopResult, rounds: req.rounds ?? 0, tokens: req.tokens ?? 0 };
  write(loopEntry);
  const entries = req.dryRun ? [...store.readLedger(), loopEntry] : store.readLedger();
  const stats = ledgerStats(entries, req.pr, now);

  const reasons: Reason[] = [];
  let facts: PrFacts | undefined;
  try {
    const [viewer, pr] = await Promise.all([github.viewer(), github.pullRequest(req.pr)]);
    facts = pr;
    if (pr.author.toLowerCase() !== viewer.toLowerCase()) {
      reasons.push({ trigger: 'not-author', detail: `@${pr.author} opened this PR; only the author agent applies Autopilot` });
    }
    if (pr.state !== 'OPEN' || pr.isDraft) {
      reasons.push({ trigger: 'not-open', detail: pr.isDraft ? 'PR is a draft' : `PR is ${pr.state.toLowerCase()}` });
    }
    // @req NFR:autonomy/safety.fail-closed.files
    if (pr.changedFiles !== undefined && pr.files.length < pr.changedFiles) {
      reasons.push({ trigger: 'unreadable', detail: `Read ${pr.files.length} of ${pr.changedFiles} changed files` });
    }
    reasons.push(...triggerReasons(pr, config, { loopResult, reasons: req.reasons ?? [] }, stats));
  } catch (e) {
    reasons.push({ trigger: 'unreadable', detail: `Could not read the PR or the signed-in user: ${(e as Error).message}` });
  }
  reasons.push(...budgetReasons(stats, config, now));

  if (reasons.length > 0) {
    if (!req.dryRun) {
      try {
        await github.comment(req.pr, escalationComment(reasons));
      } catch {
        // The ledger and the report still carry the escalation
      }
    }
    write({ at, pr: req.pr, action: 'escalate', detail: reasons.map((r) => r.trigger).join(', ') });
    return { decision: 'escalate', pr: req.pr, reasons, applied: false };
  }

  const label = autopilotLabelName(configText);
  const has = (facts?.labels ?? []).includes(label);
  let applied = false;
  if (!req.dryRun && !has) {
    await github.addLabel(req.pr, label);
    applied = true;
  }
  // Record before the comment, so a failed comment never hides an apply from the daily budget
  // @req NFR:autonomy/safety.ledger-first
  write({ at, pr: req.pr, action: has ? 'autopilot-present' : 'autopilot', detail: label });
  if (applied) {
    try {
      await github.comment(req.pr, applyComment(label, repo.configCommit(), stats.rounds));
    } catch {
      // The label and the ledger carry the apply
    }
  }
  return { decision: 'apply', pr: req.pr, reasons: [], applied };
}
