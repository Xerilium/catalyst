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
}

/**
 * Options specific to the run command
 */
export interface RunOptions extends CLIOptions {
  /** Key-value inputs for the playbook */
  input?: string[];
}
