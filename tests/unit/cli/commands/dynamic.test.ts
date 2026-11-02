/**
 * Unit tests for dynamic command discovery and registration
 * @req FR:cli.dynamic
 */

import * as fs from 'fs';
import { Command } from 'commander';
import {
  discoverCommands,
  readInputs,
  registerDynamicCommands,
  resolveCommandsDir,
} from '../../../../src/cli/commands/dynamic';

// Mock fs module
jest.mock('fs');
const mockFs = jest.mocked(fs);

describe('dynamic commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('discoverCommands', () => {
    // @req FR:cli.dynamic
    it('should discover .yaml files in commands directory', () => {
      mockFs.existsSync.mockReturnValue(true);
      (mockFs.readdirSync as jest.Mock).mockReturnValue([
        'init.yaml',
        'blueprint.yaml',
        'change.yaml'
      ]);

      const commands = discoverCommands('/test/cli-commands');

      expect(commands).toHaveLength(3);
      expect(commands).toContainEqual({
        name: 'init',
        path: '/test/cli-commands/init.yaml'
      });
      expect(commands).toContainEqual({
        name: 'blueprint',
        path: '/test/cli-commands/blueprint.yaml'
      });
      expect(commands).toContainEqual({
        name: 'change',
        path: '/test/cli-commands/change.yaml'
      });
    });

    // @req FR:cli.dynamic
    it('should discover .yml files in commands directory', () => {
      mockFs.existsSync.mockReturnValue(true);
      (mockFs.readdirSync as jest.Mock).mockReturnValue([
        'init.yml',
        'blueprint.yml'
      ]);

      const commands = discoverCommands('/test/cli-commands');

      expect(commands).toHaveLength(2);
      expect(commands).toContainEqual({
        name: 'init',
        path: '/test/cli-commands/init.yml'
      });
      expect(commands).toContainEqual({
        name: 'blueprint',
        path: '/test/cli-commands/blueprint.yml'
      });
    });

    // @req FR:cli.dynamic
    it('should derive command name from filename without extension', () => {
      mockFs.existsSync.mockReturnValue(true);
      (mockFs.readdirSync as jest.Mock).mockReturnValue([
        'start-project.yaml',
        'my-command.yml'
      ]);

      const commands = discoverCommands('/test/cli-commands');

      expect(commands).toContainEqual({
        name: 'start-project',
        path: '/test/cli-commands/start-project.yaml'
      });
      expect(commands).toContainEqual({
        name: 'my-command',
        path: '/test/cli-commands/my-command.yml'
      });
    });

    // @req FR:cli.dynamic
    it('should ignore non-yaml files', () => {
      mockFs.existsSync.mockReturnValue(true);
      (mockFs.readdirSync as jest.Mock).mockReturnValue([
        'init.yaml',
        'readme.md',
        '.gitkeep',
        'script.js'
      ]);

      const commands = discoverCommands('/test/cli-commands');

      expect(commands).toHaveLength(1);
      expect(commands[0].name).toBe('init');
    });

    // @req FR:cli.dynamic
    it('should return empty array for empty directory', () => {
      mockFs.existsSync.mockReturnValue(true);
      (mockFs.readdirSync as jest.Mock).mockReturnValue([]);

      const commands = discoverCommands('/test/cli-commands');

      expect(commands).toEqual([]);
    });

    // @req FR:cli.dynamic
    it('should return empty array for non-existent directory', () => {
      mockFs.existsSync.mockReturnValue(false);

      const commands = discoverCommands('/test/cli-commands');

      expect(commands).toEqual([]);
      expect(mockFs.readdirSync).not.toHaveBeenCalled();
    });
  });

  describe('readInputs', () => {
    const read = (yaml: string) => {
      mockFs.readFileSync.mockReturnValue(yaml);
      return readInputs('/test/cli-commands/init.yaml');
    };

    // @req FR:cli-engine/cli.dynamic.input-flags
    it('reads the YAML shorthand each command playbook uses', () => {
      expect(
        read(`name: init
inputs:
  - string: platform
    description: AI platform to set up
    required: false
    allowed: [claude-code, cursor]
  - boolean: skip-checks
    description: Skip the checks
steps: []
`),
      ).toEqual([
        {
          name: 'platform',
          type: 'string',
          string: 'platform',
          description: 'AI platform to set up',
          required: false,
          allowed: ['claude-code', 'cursor'],
        },
        { name: 'skip-checks', type: 'boolean', boolean: 'skip-checks', description: 'Skip the checks' },
      ]);
    });

    // @req FR:cli-engine/cli.dynamic.input-flags
    it('reads the explicit name/type form too', () => {
      expect(read('inputs:\n  - name: tag\n    type: string\n')).toEqual([{ name: 'tag', type: 'string' }]);
    });

    // @req FR:cli-engine/cli.dynamic.input-flags
    it.each([
      ['no inputs block', 'name: init\nsteps: []\n'],
      ['inputs that is not a list', 'inputs: nope\n'],
      ['an entry with no usable name', 'inputs:\n  - description: orphan\n'],
      ['unparseable YAML', 'inputs: [\n  - :::\n'],
    ])('contributes no options for %s, so --help still works', (_label, yaml) => {
      expect(read(yaml)).toEqual([]);
    });

    // @req FR:cli-engine/cli.dynamic.input-flags
    it('contributes no options when the file cannot be read', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      expect(readInputs('/missing.yaml')).toEqual([]);
    });
  });

  describe('registerDynamicCommands', () => {
    /** Register one playbook whose declared inputs come from `yaml`. */
    const register = (yaml: string): Command => {
      mockFs.existsSync.mockReturnValue(true);
      (mockFs.readdirSync as jest.Mock).mockReturnValue(['init.yaml']);
      mockFs.readFileSync.mockReturnValue(yaml);
      const program = new Command();
      program.exitOverride();
      registerDynamicCommands(program);
      return program.commands.find((c) => c.name() === 'init') as Command;
    };

    const optionFlags = (cmd: Command) => cmd.options.map((o) => o.flags);

    // @req FR:cli-engine/cli.dynamic.input-flags
    it('adds one option per declared input, typed by the input', () => {
      const init = register(
        'inputs:\n  - string: platform\n    description: AI platform\n  - boolean: dry-run\n',
      );

      expect(optionFlags(init)).toContain('--platform <value>');
      expect(optionFlags(init)).toContain('--dry-run');
    });

    // @req FR:cli-engine/cli.dynamic.input-flags
    it('lists allowed values in the option description', () => {
      const init = register('inputs:\n  - string: platform\n    description: AI platform\n    allowed: [a, b]\n');
      const platform = init.options.find((o) => o.flags === '--platform <value>');

      expect(platform?.description).toBe('AI platform (a, b)');
    });

    // An input named `quiet` or `input` would shadow the command's own flag.
    // @req FR:cli-engine/cli.dynamic.input-flags
    it('skips inputs that collide with the command\'s own options', () => {
      const init = register('inputs:\n  - boolean: quiet\n  - string: input\n  - string: json\n  - string: keep\n');

      expect(optionFlags(init)).toContain('--keep <value>');
      expect(optionFlags(init)).toEqual(expect.not.arrayContaining(['--json <value>', '--input <value>']));
      expect(init.options.filter((o) => o.flags.includes('quiet'))).toHaveLength(1);
    });

    // @req FR:cli-engine/cli.dynamic.input-flags
    it('skips input names that are not safe option names', () => {
      const init = register('inputs:\n  - string: Platform\n  - string: "with space"\n  - string: ok-name\n');

      expect(optionFlags(init)).toContain('--ok-name <value>');
      expect(optionFlags(init).filter((f) => /Platform|space/.test(f))).toEqual([]);
    });

    // @req FR:cli.dynamic
    it('keeps the generic -i, --input option', () => {
      expect(optionFlags(register('inputs:\n  - string: platform\n'))).toContain('-i, --input <key=value>');
    });
  });

  describe('resolveCommandsDir', () => {
    // @req FR:cli.dynamic
    it('should return path relative to module location', () => {
      const dir = resolveCommandsDir();

      // Should end with cli-commands
      expect(dir).toMatch(/cli-commands$/);
    });
  });
});
