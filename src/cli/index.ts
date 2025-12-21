/**
 * Catalyst CLI entry point
 * @req FR:cli.entry
 * @req FR:cli.help
 * @req FR:cli.version
 * @req FR:cli.verbosity
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import type { RunOptions } from './types';
import { runCommand } from './commands/run';
import { registerDynamicCommands } from './commands/dynamic';
import { formatError, getExitCode } from './utils/errors';
import { generateBanner, formatErrorMessage } from './utils/output';
import { CatalystError } from '../core/errors';
import { LogLevel, LoggerSingleton, ConsoleLogger } from '../core/logging';

/**
 * Get package version from package.json
 */
function getVersion(): string {
  try {
    // Try multiple locations for package.json
    const locations = [
      path.join(__dirname, '..', '..', 'package.json'),      // From dist/cli/
      path.join(__dirname, '..', '..', '..', 'package.json') // From src/cli/
    ];

    for (const loc of locations) {
      if (fs.existsSync(loc)) {
        const pkg = JSON.parse(fs.readFileSync(loc, 'utf-8'));
        return pkg.version || '0.0.0';
      }
    }
    return '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Create and configure the CLI program
 * @req FR:cli.entry
 * @req FR:cli.help
 * @req FR:cli.version
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name('catalyst')
    .description('Catalyst AI execution framework')
    .version(getVersion(), '--version', 'Display version number')
    .option('-q, --quiet', 'Suppress all output except errors')
    .option('-v, --verbose', 'Enable verbose output (-v info, -vv verbose, -vvv debug, -vvvv trace)')
    .option('--debug', 'Enable debug output (same as -vvv)')
    .addHelpText('beforeAll', generateBanner());

  // Run command
  // @req FR:run.execute
  program
    .command('run <playbook-id>')
    .description('Execute a playbook by ID')
    .option('-i, --input <key=value>', 'Playbook input (repeatable)', collect, [])
    .option('-q, --quiet', 'Suppress all output except errors')
    .action(async (playbookId: string, options: RunOptions) => {
      // Inherit quiet from parent if set
      const parentOpts = program.opts();
      if (parentOpts.quiet) {
        options.quiet = true;
      }

      await runCommand(playbookId, options);
    });

  // Register dynamic commands from cli-commands directory
  // @req FR:cli.dynamic
  registerDynamicCommands(program);

  // Show help if no command provided
  program.action(() => {
    program.help();
  });

  return program;
}

/**
 * Collect multiple values for repeatable options
 */
function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

/**
 * Determine log level from CLI arguments
 * @req FR:cli.verbosity
 *
 * -v    = info (level 1) - info, warnings, errors
 * -vv   = verbose (level 2) - step flow
 * -vvv  = debug (level 3) - interpolation details
 * -vvvv = trace (level 4) - everything
 */
function getLogLevelFromArgs(args: string[]): LogLevel {
  // Check for --quiet first (takes precedence)
  if (args.includes('-q') || args.includes('--quiet')) {
    return LogLevel.error;
  }

  // Check for --debug flag
  if (args.includes('--debug')) {
    return LogLevel.debug;
  }

  // Count -v flags
  let verboseCount = 0;
  for (const arg of args) {
    if (arg === '-v' || arg === '--verbose') {
      verboseCount = 1;
    } else if (arg.startsWith('-v') && !arg.startsWith('--')) {
      // Handle -vv, -vvv, -vvvv
      const vCount = (arg.match(/v/g) || []).length;
      verboseCount = Math.max(verboseCount, vCount);
    }
  }

  // Map count to level
  switch (verboseCount) {
    case 0:
      return LogLevel.error; // Default: errors only
    case 1:
      return LogLevel.info;
    case 2:
      return LogLevel.verbose;
    case 3:
      return LogLevel.debug;
    default:
      return LogLevel.trace; // 4+
  }
}

/**
 * Initialize the logger based on CLI arguments
 * @req FR:cli.verbosity
 */
function initializeLogger(args: string[]): void {
  const level = getLogLevelFromArgs(args);
  const logger = new ConsoleLogger(level);
  LoggerSingleton.initialize(logger);
}

/**
 * Main CLI entry point
 * @req FR:cli.entry
 */
export async function main(args: string[]): Promise<void> {
  // Initialize logger before parsing (so it's available during command execution)
  initializeLogger(args);

  const logger = LoggerSingleton.getInstance();
  const program = createProgram();

  try {
    await program.parseAsync(args, { from: 'user' });
  } catch (error) {
    if (error instanceof CatalystError) {
      logger.error(formatError(error));
      process.exit(getExitCode(error));
    }

    // Unknown error
    if (error instanceof Error) {
      logger.error(`Unexpected error: ${error.message}`);
      logger.debug('Stack trace', { stack: error.stack });
    } else {
      logger.error(`Unexpected error: ${String(error)}`);
    }
    process.exit(1);
  }
}

// Default export for bin/catalyst.js
export default main;
