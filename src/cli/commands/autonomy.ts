/**
 * `catalyst autonomy` — wire the autonomy core to gh, git, and the filesystem.
 *
 * @req FR:autonomy/autopilot.@cli
 * @req FR:autonomy/autopilot.output
 * @req FR:autonomy/never.@cli
 * @req FR:autonomy/stop.@cli
 * @req FR:autonomy/ledger.@cli
 * @req FR:autonomy/status.@cli
 */

import * as os from 'os';
import { CatalystError } from '../../core/errors';
import {
  AGENT_REASONS,
  LOOP_RESULTS,
  autonomyStatus,
  decideAutopilot,
  gateLine,
  guardCommand,
  recordEntry,
  statusLines,
  type AgentReason,
  type AutonomyPorts,
  type LoopResult,
} from '../../autonomy';
import { FsAutonomyStore } from '../../autonomy/adapters/fs-store';
import { GhAutonomyGitHub, GitHubRepoConfig, currentRepo, mainCheckout } from '../../autonomy/adapters/gh';

export interface AutonomyOptions {
  json?: boolean;
  quiet?: boolean;
  loopResult?: string;
  rounds?: string;
  tokens?: string;
  reason?: string[];
  dryRun?: boolean;
  all?: boolean;
  pr?: string;
  action?: string;
  detail?: string;
}

export interface AutonomyEnv {
  ports: AutonomyPorts;
  stops: { createStop(all: boolean): unknown; removeStop(all: boolean): unknown };
  print: (line: string) => void;
  /** `owner/repo`, for the guard's cross-repository check */
  repo?: string;
}

export const ACTIONS = ['autopilot', 'guard', 'status', 'gate', 'record', 'stop', 'resume'];

const invalid = (message: string, guidance: string): CatalystError => new CatalystError(message, 'InvalidInput', guidance);

function wholeNumber(value: string | undefined, name: string, fallback?: number): number | undefined {
  if (value === undefined) {return fallback;}
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {throw invalid(`${name} must be a whole number: "${value}"`, `Pass ${name} as 0 or more.`);}
  return n;
}

function prNumber(value: string | undefined): number {
  const n = wholeNumber(value, 'PR number');
  if (!n) {throw invalid('A PR number is required', 'Usage: catalyst autonomy autopilot <pr>');}
  return n;
}

/** Run one `catalyst autonomy` action. Throws CatalystError on failure. */
export async function runAutonomy(action: string, args: string[], options: AutonomyOptions, env: AutonomyEnv): Promise<void> {
  const out = (value: unknown, lines: string[]): void => {
    if (options.json) {env.print(JSON.stringify(value, null, 2));}
    else {lines.forEach((l) => env.print(l));}
  };

  switch (action) {
    case 'autopilot': {
      const pr = prNumber(args[0]);
      const loopResult = options.loopResult as LoopResult | undefined;
      if (loopResult !== undefined && !LOOP_RESULTS.includes(loopResult)) {
        throw invalid(`Unknown loop result "${loopResult}"`, `Use ${LOOP_RESULTS.join(', ')}.`);
      }
      const reasons = (options.reason ?? []) as AgentReason[];
      const unknown = reasons.filter((r) => !AGENT_REASONS.includes(r));
      if (unknown.length > 0) {throw invalid(`Unknown reason "${unknown.join(', ')}"`, `Use ${AGENT_REASONS.join(', ')}.`);}
      const d = await decideAutopilot(env.ports, {
        pr,
        loopResult,
        rounds: wholeNumber(options.rounds, '--rounds'),
        tokens: wholeNumber(options.tokens, '--tokens'),
        reasons,
        dryRun: options.dryRun,
      });
      out(d, [`${d.decision} PR ${d.pr}${d.applied ? ' (Autopilot added)' : ''}`, ...d.reasons.map((r) => `  ${r.trigger}: ${r.detail}`)]);
      return;
    }
    case 'guard': {
      // @req FR:autonomy/never.exit
      const result = guardCommand(args.join(' '), { repo: env.repo });
      if (!result.allowed) {
        throw new CatalystError(
          `Blocked (${result.category}): ${result.reason}`,
          'AutonomyCommandBlocked',
          'Full autonomy never takes this action. Escalate it to a person.'
        );
      }
      out(result, ['allowed']);
      return;
    }
    case 'status': {
      const s = autonomyStatus(env.ports);
      out(s, statusLines(s));
      // @req FR:autonomy/status.exit
      if (s.problems.length > 0) {
        throw invalid('The autonomy config is invalid, so full autonomy is off', 'Fix the problems above in .xe/config/catalyst.json.');
      }
      return;
    }
    case 'gate': {
      env.print(gateLine(autonomyStatus(env.ports)));
      return;
    }
    case 'record': {
      if (!options.action) {throw invalid('--action is required', 'Usage: catalyst autonomy record --pr <n> --action <action>');}
      const entry = recordEntry(env.ports.clock(), {
        pr: wholeNumber(options.pr, '--pr'),
        action: options.action,
        ...(options.detail ? { detail: options.detail } : {}),
        ...(options.tokens !== undefined ? { tokens: wholeNumber(options.tokens, '--tokens') } : {}),
      });
      if (entry.pr === undefined) {delete entry.pr;}
      env.ports.store.append(entry);
      out(entry, [`recorded ${entry.action}`]);
      return;
    }
    case 'stop': {
      env.stops.createStop(!!options.all);
      out({ stopped: true, all: !!options.all }, [`Full autonomy halted${options.all ? ', scheduler too' : ''}. Run catalyst autonomy resume to undo.`]);
      return;
    }
    case 'resume': {
      env.stops.removeStop(!!options.all);
      out({ stopped: false, all: !!options.all }, [`STOP file removed${options.all ? ', scheduler too' : ''}.`]);
      return;
    }
    default:
      throw invalid(`Unknown autonomy action "${action}"`, `Use one of: ${ACTIONS.join(', ')}.`);
  }
}

/** Real adapters for the current folder. */
export async function defaultEnv(cwd: string, withRepo: boolean): Promise<AutonomyEnv> {
  const store = new FsAutonomyStore(await mainCheckout(cwd), process.env, os.homedir());
  const repo = await GitHubRepoConfig.fromCwd(cwd).load();
  return {
    ports: { github: GhAutonomyGitHub.fromCwd(cwd), store, repo, clock: () => new Date() },
    stops: store,
    print: (line) => console.log(line),
    // Only the guard needs it; skip the gh call otherwise
    repo: withRepo ? await currentRepo(cwd) : undefined,
  };
}

/** CLI entry point. */
export async function autonomyCommand(action: string, args: string[], options: AutonomyOptions): Promise<void> {
  await runAutonomy(action, args, options, await defaultEnv(process.cwd(), action === 'guard'));
}
