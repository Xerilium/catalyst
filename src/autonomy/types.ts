/**
 * Types and ports for full autonomy. The core depends only on these ports, so it
 * runs unchanged from the CLI, a playbook, or Arc.
 * @req NFR:autonomy/portable.ports
 */

/** Per-PR and per-day caps. */
export interface Budget {
  loopRounds: number;
  minutes: number;
  tokens: number;
  prsPerDay: number;
}

/** Triggers that hand a PR back to a person. Path lists include the defaults. */
export interface EscalateSettings {
  paths: string[];
  contractPaths: string[];
  maxChangedLines: number;
  maxChangedFiles: number;
  maxLoopFailures: number;
}

/**
 * Resolved `autonomy` config.
 * @req FR:autonomy/$autonomy-config
 */
export interface AutonomyConfig {
  enabled: boolean;
  budget: Budget;
  escalate: EscalateSettings;
}

/** How the last `pr-loop` ended. */
export type LoopResult = 'clean' | 'round-limit' | 'failed';

/** Escalations only the agent can judge. */
export type AgentReason = 'ambiguity' | 'ci-unfixable' | 'destructive';

export const LOOP_RESULTS: LoopResult[] = ['clean', 'round-limit', 'failed'];
export const AGENT_REASONS: AgentReason[] = ['ambiguity', 'ci-unfixable', 'destructive'];

/** One reason to hand a PR back. */
export interface Reason {
  trigger: string;
  detail: string;
}

/**
 * One Autopilot decision.
 * @req FR:autonomy/$decision
 */
export interface Decision {
  decision: 'apply' | 'escalate' | 'off' | 'stopped';
  pr: number;
  reasons: Reason[];
  applied: boolean;
}

/**
 * One autonomous action.
 * @req FR:autonomy/$ledger-entry
 */
export interface LedgerEntry {
  at: string;
  pr?: number;
  action: string;
  detail?: string;
  rounds?: number;
  tokens?: number;
  result?: string;
}

/** A changed file in a PR. `patch` is its unified diff, when known. */
export interface PrFile {
  path: string;
  additions: number;
  deletions: number;
  patch?: string;
}

/** What the decision needs to know about a PR. */
export interface PrFacts {
  number: number;
  author: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  isDraft: boolean;
  labels: string[];
  files: PrFile[];
}

/** Ledger totals for one PR and the repository's day. */
export interface LedgerStats {
  rounds: number;
  tokens: number;
  nonClean: number;
  appliedToday: number;
  firstAt?: Date;
}

/** GitHub, as the authoring agent's account. */
export interface GitHubPort {
  viewer(): Promise<string>;
  pullRequest(pr: number): Promise<PrFacts>;
  addLabel(pr: number, label: string): Promise<void>;
  comment(pr: number, body: string): Promise<void>;
}

/** Ledger and kill switch storage. */
export interface StorePort {
  readLedger(): LedgerEntry[];
  append(entry: LedgerEntry): void;
  /** Path of the first STOP file found, if any */
  stopFile(): string | undefined;
}

/** The repository's committed config. */
export interface RepoPort {
  /** Text of `.xe/config/catalyst.json`, or undefined when missing */
  configText(): string | undefined;
  /** Short SHA of the last commit that changed the config, when known */
  configCommit(): string | undefined;
}

export interface AutonomyPorts {
  github: GitHubPort;
  store: StorePort;
  repo: RepoPort;
  clock: () => Date;
}
