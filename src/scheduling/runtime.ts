/**
 * Runtime: everything a host needs to supply to drive the scheduler.
 * Type-only, so a host other than Catalyst (such as Arc) can implement it.
 */

import type { Deps } from './types';
import type { Entry } from './installers';

export interface Runtime {
  deps: Deps;
  out(line: string): void;
  /** Problems the scheduler reports (stderr), kept apart from command output */
  err(line: string): void;
  interactive: boolean;
  confirm(question: string): Promise<boolean>;
  /** Repo root of the working directory, for registration */
  checkoutRoot: string;
  registry: { roots(): string[]; add(root: string): void; remove(root: string): void; clear(): void };
  os: {
    entry: Entry;
    isInstalled(): boolean;
    install(): 'installed' | 'unchanged';
    uninstall(): void;
  };
  heartbeat: { touch(): void; last(): number | undefined };
  diag(): { envFile: 'ok' | 'missing' | 'readable by others'; stateWritable: boolean };
}
