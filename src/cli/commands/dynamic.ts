/**
 * Dynamic command discovery and registration
 * @req FR:cli.dynamic
 */

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import type { RunOptions } from '../types';
import { runCommand } from './run';

/**
 * Command definition discovered from cli-commands directory
 */
export interface DynamicCommand {
  name: string;
  path: string;
}

/**
 * Resolve the cli-commands directory path
 * Tries multiple locations to support both development and installed scenarios
 * @req FR:cli.dynamic
 */
export function resolveCommandsDir(): string {
  // Try multiple locations
  const locations = [
    path.join(__dirname, '..', '..', 'resources', 'cli-commands'),      // From dist/cli/commands/
    path.join(__dirname, '..', '..', '..', 'src', 'resources', 'cli-commands') // From src/cli/commands/
  ];

  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      return loc;
    }
  }

  // Return first location as default (even if it doesn't exist)
  return locations[0];
}

/**
 * Discover command playbooks in the given directory
 * @req FR:cli.dynamic
 */
export function discoverCommands(dir: string): DynamicCommand[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir);
  const commands: DynamicCommand[] = [];

  for (const file of files) {
    const ext = path.extname(file);
    if (ext === '.yaml' || ext === '.yml') {
      const name = path.basename(file, ext);
      commands.push({
        name,
        path: path.join(dir, file)
      });
    }
  }

  return commands;
}

/**
 * Collect multiple values for repeatable options
 */
function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

/**
 * Register dynamic commands with the CLI program
 * @req FR:cli.dynamic
 */
export function registerDynamicCommands(program: Command): void {
  const commandsDir = resolveCommandsDir();
  const commands = discoverCommands(commandsDir);

  for (const cmd of commands) {
    program
      .command(cmd.name)
      .description(`Execute ${cmd.name} playbook`)
      .option('-i, --input <key=value>', 'Playbook input (repeatable)', collect, [])
      .option('-q, --quiet', 'Suppress all output except errors')
      .action(async (options: RunOptions) => {
        // Inherit global options from parent
        const parentOpts = program.opts();
        if (parentOpts.quiet) {
          options.quiet = true;
        }
        if (parentOpts.json) {
          options.json = true;
        }

        // Run command with full path to playbook file
        await runCommand(cmd.path, options);
      });
  }
}
