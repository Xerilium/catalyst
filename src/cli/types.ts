/**
 * CLI type definitions
 * @req FR:cli.entry
 */

/**
 * Global CLI options available to all commands
 */
export interface CLIOptions {
  /** Suppress all output except errors */
  quiet?: boolean;
  /** Output in compact JSON format (for piping) */
  json?: boolean;
}

/**
 * Options specific to the run command
 */
export interface RunOptions extends CLIOptions {
  /** Key-value inputs for the playbook */
  input?: string[];
  /** Preview playbook steps without executing */
  whatIf?: boolean;
}

/**
 * Options specific to the traceability command
 * @req FR:catalyst-cli/traceability.execute
 */
export interface TraceabilityOptions extends CLIOptions {
  /** Minimum priority level (P1-P5) */
  minPriority?: string;
  /** Expand truncated lists in detail view */
  verbose?: boolean;
}
