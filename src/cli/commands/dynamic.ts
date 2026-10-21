/**
 * Dynamic command discovery and registration
 * @req FR:cli.dynamic
 */

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import * as yaml from 'js-yaml';
import type { RunOptions } from '../types';
import type { InputParameter } from '../../playbooks/types/playbook';
import { runCommand } from './run';
import { LogLevel, type Logger } from '../../core/logging';

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

/** Option names the command itself owns; a playbook input can't shadow one. */
const RESERVED_OPTIONS = new Set(['input', 'quiet', 'what-if', 'json', 'verbose', 'debug', 'diagnostics', 'help']);

/**
 * Read a command playbook's declared inputs.
 *
 * Returns nothing when the file can't be parsed: a malformed playbook should
 * fail when it runs, with the engine's error, not break `catalyst --help`.
 *
 * @req FR:cli-engine/cli.dynamic.input-flags
 */
export function readInputs(playbookPath: string): InputParameter[] {
  try {
    const doc = yaml.load(fs.readFileSync(playbookPath, 'utf8')) as { inputs?: unknown };
    if (!Array.isArray(doc?.inputs)) { return []; }
    // YAML shorthand: each entry is `{ <type>: <name>, ...rest }`
    return doc.inputs.flatMap((raw) => {
      const entry = raw as Record<string, unknown>;
      for (const type of ['string', 'number', 'boolean'] as const) {
        if (typeof entry[type] === 'string') {
          return [{ ...entry, name: entry[type] as string, type } as InputParameter];
        }
      }
      return typeof entry.name === 'string' ? [entry as unknown as InputParameter] : [];
    });
  } catch {
    return [];
  }
}

/**
 * Add one `--<input>` option per declared playbook input, so scripts and CI can
 * write `catalyst init --platform claude-code` instead of the generic
 * `-i platform=claude-code`. Both forms work; `-i` wins on a conflict, since
 * it's the more explicit one to reach for.
 *
 * @req FR:cli-engine/cli.dynamic.input-flags
 */
function registerInputOptions(command: Command, inputs: InputParameter[]): InputParameter[] {
  const registered: InputParameter[] = [];
  for (const input of inputs) {
    if (RESERVED_OPTIONS.has(input.name) || !/^[a-z][a-z0-9-]*$/.test(input.name)) { continue; }
    const allowed = input.allowed?.length ? ` (${input.allowed.join(', ')})` : '';
    const describe = `${input.description ?? `Playbook input: ${input.name}`}${allowed}`;
    command.option(input.type === 'boolean' ? `--${input.name}` : `--${input.name} <value>`, describe);
    registered.push(input);
  }
  return registered;
}

/** Turn named option values into the `key=value` inputs the engine takes. */
function inputsFromOptions(options: Record<string, unknown>, declared: InputParameter[]): string[] {
  return declared.flatMap((input) => {
    // Commander camelCases dashed option names
    const key = input.name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
    const value = options[key];
    return value === undefined ? [] : [`${input.name}=${String(value)}`];
  });
}

/**
 * Register dynamic commands with the CLI program
 * @req FR:cli.dynamic
 */
export function registerDynamicCommands(program: Command, logLevel?: LogLevel, playbookLogger?: Logger): void {
  const commandsDir = resolveCommandsDir();
  const commands = discoverCommands(commandsDir);

  for (const cmd of commands) {
    const command = program
      .command(cmd.name)
      .description(`Execute ${cmd.name} playbook`)
      .option('-i, --input <key=value>', 'Playbook input (repeatable)', collect, [])
      .option('-q, --quiet', 'Suppress all output except errors')
      .option('--what-if', 'Preview playbook steps without executing');

    const declared = registerInputOptions(command, readInputs(cmd.path));

    command
      .action(async (options: RunOptions) => {
        // Named input flags fill in first, so an explicit -i overrides them
        options.input = [
          ...inputsFromOptions(options as unknown as Record<string, unknown>, declared),
          ...(options.input ?? []),
        ];

        // Inherit global options from parent
        const parentOpts = program.opts();
        if (parentOpts.quiet) {
          options.quiet = true;
        }
        if (parentOpts.json) {
          options.json = true;
        }
        if (logLevel !== undefined && logLevel >= LogLevel.debug) {
          options.debug = true;
        }

        // Run command with full path to playbook file
        await runCommand(cmd.path, options, playbookLogger);
      });
  }
}
