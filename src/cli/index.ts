/**
 * Catalyst CLI entry point
 * @req FR:cli.entry
 * @req FR:cli.help
 * @req FR:cli.version
 * @req FR:cli.verbosity
 * @req FR:cli.global
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import type { RunOptions, TraceabilityOptions, DepsOptions } from './types';
import { runCommand } from './commands/run';
import { traceabilityCommand } from './commands/traceability';
import { depsCommand } from './commands/deps';
import { indexCommand } from './commands/index';
import { registerDynamicCommands } from './commands/dynamic';
import { formatError, getExitCode } from './utils/errors';
import { generateBanner } from './utils/output';
import { CatalystError } from '../core/errors';
import { LogLevel, LogManager, ConsoleLogger } from '../core/logging';
import type { Logger } from '../core/logging';

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
function createProgram(logLevel?: LogLevel, playbookLogger?: Logger): Command {
  const program = new Command();

  program
    .name('catalyst')
    .description('Catalyst AI execution framework')
    .version(getVersion(), '--version', 'Display version number')
    .option('-q, --quiet', 'Suppress all output except errors')
    .option('--json', 'Output in compact JSON format (for piping)')
    .option('-v, --verbose', 'Enable verbose output (-v info, -vv verbose, -vvv debug, -vvvv trace)')
    .option('--debug', 'Enable debug output (same as -vvv)')
    .option('--diagnostics', 'Include framework instrumentation logs (suppressed by default)')
    .addHelpText('beforeAll', generateBanner());

  // Run command
  // @req FR:run.execute
  program
    .command('run <playbook-id>')
    .description('Execute a playbook by ID')
    .option('-i, --input <key=value>', 'Playbook input (repeatable)', collect, [])
    .option('-q, --quiet', 'Suppress all output except errors')
    .option('--what-if', 'Preview playbook steps without executing')
    .action(async (playbookId: string, options: RunOptions) => {
      // Inherit global options from parent
      const parentOpts = program.opts();
      if (parentOpts.quiet) {
        options.quiet = true;
      }
      if (parentOpts.json) {
        options.json = true;
      }
      if (logLevel !== undefined && logLevel >= LogLevel.debug) {
        (options as any).debug = true;
      }

      await runCommand(playbookId, options, playbookLogger);
    });

  // Traceability command
  // @req FR:catalyst-cli/traceability.execute
  program
    .command('traceability [feature]')
    .description('Run requirement traceability analysis')
    .option('--min-priority <priority>', 'Minimum priority level (P1-P5)')
    .action(async (feature: string | undefined, options: TraceabilityOptions) => {
      // Inherit global options from parent
      // @req FR:catalyst-cli/traceability.output
      const parentOpts = program.opts();
      if (parentOpts.quiet) {
        options.quiet = true;
      }
      if (parentOpts.json) {
        options.json = true;
      }
      if (parentOpts.verbose) {
        options.verbose = true;
      }

      await traceabilityCommand(feature, options);
    });

  // Deps command
  // @req FR:catalyst-cli/deps.execute
  // @req FR:req-traceability/deps.output.command
  program
    .command('deps [feature]')
    .description('Show cross-feature dependency graph')
    .option('--format <format>', 'Output format: text, json, mermaid', 'text')
    .option('--reverse', 'Show reverse dependencies')
    .action(async (feature: string | undefined, options: DepsOptions) => {
      const parentOpts = program.opts();
      if (parentOpts.json) {
        options.format = 'json';
      }

      await depsCommand(feature, options);
    });

  // Index command
  // @req FR:catalyst-cli/index.execute
  program
    .command('index')
    .description('Generate .xe/features/README.md from spec frontmatter')
    .action(async () => {
      await indexCommand();
    });

  // Register dynamic commands from cli-commands directory
  // @req FR:cli.dynamic
  registerDynamicCommands(program, logLevel, playbookLogger);

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
 * Detect whether framework diagnostic logs should be surfaced.
 * @req FR:cli.global
 */
function getDiagnosticsFromArgs(args: string[]): boolean {
  if (args.includes('--diagnostics')) return true;
  const env = process.env.CATALYST_DIAGNOSTICS;
  return env === '1' || env === 'true';
}

/**
 * Main CLI entry point
 * @req FR:cli.entry
 * @req FR:cli.global
 */
export async function main(args: string[]): Promise<void> {
  // Resolve log level from CLI arguments
  const logLevel = getLogLevelFromArgs(args);
  const diagnostics = getDiagnosticsFromArgs(args);

  // Framework logger: surfaces only when --diagnostics (or CATALYST_DIAGNOSTICS) is set.
  // Otherwise silent so playbook log output isn't lost in framework noise.
  const frameworkLogger = new ConsoleLogger(diagnostics ? logLevel : LogLevel.silent);
  LogManager.setFramework(frameworkLogger);

  // Playbook logger: user-facing output (log actions + CLI status messages) at -v level.
  const playbookLogger = new ConsoleLogger(logLevel);
  const logger = playbookLogger;
  const program = createProgram(logLevel, playbookLogger);

  try {
    // Establish the playbook logger as the active scope for all CLI command
    // handlers so user-facing output (CLI status + playbook log actions)
    // resolves via LogManager.current(). Framework-internal code calls
    // LogManager.framework() to bypass this scope.
    await LogManager.scope(playbookLogger, () => program.parseAsync(args, { from: 'user' }));
    // Explicit exit on success — without this, idle HTTP keep-alive sockets
    // and stdin handles can delay process exit by 5-15 seconds.
    // Flush stdout before exiting to avoid truncating output.
    if (process.stdout.writableEnded) {
      process.exit(0);
    } else {
      process.stdout.write('', () => process.exit(0));
    }
  } catch (error) {
    if (error instanceof CatalystError) {
      logger.error('CLI', 'Main', formatError(error));
      process.exit(getExitCode(error));
    }

    // Unknown error
    if (error instanceof Error) {
      logger.error('CLI', 'Main', `Unexpected error: ${error.message}`);
      logger.debug('CLI', 'Main', 'Stack trace', { stack: error.stack });
    } else {
      logger.error('CLI', 'Main', `Unexpected error: ${String(error)}`);
    }
    process.exit(1);
  }
}

// Default export for bin/catalyst.js
export default main;
