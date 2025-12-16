/**
 * Catalyst CLI entry point
 * @req FR:cli.entry
 * @req FR:cli.help
 * @req FR:cli.version
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
    .version(getVersion(), '-v, --version', 'Display version number')
    .option('-q, --quiet', 'Suppress all output except errors')
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
 * Main CLI entry point
 * @req FR:cli.entry
 */
export async function main(args: string[]): Promise<void> {
  const program = createProgram();

  try {
    await program.parseAsync(args, { from: 'user' });
  } catch (error) {
    if (error instanceof CatalystError) {
      console.error(formatErrorMessage(formatError(error)));
      process.exit(getExitCode(error));
    }

    // Unknown error
    if (error instanceof Error) {
      console.error(formatErrorMessage(`Unexpected error: ${error.message}`));
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
    } else {
      console.error(formatErrorMessage(`Unexpected error: ${String(error)}`));
    }
    process.exit(1);
  }
}

// Default export for bin/catalyst.js
export default main;
