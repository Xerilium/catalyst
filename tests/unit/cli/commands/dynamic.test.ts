/**
 * Unit tests for dynamic command discovery and registration
 * @req FR:cli.dynamic
 */

import * as fs from 'fs';
import { discoverCommands, resolveCommandsDir } from '../../../../src/cli/commands/dynamic';

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
        'rollout.yaml'
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
        name: 'rollout',
        path: '/test/cli-commands/rollout.yaml'
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

  describe('resolveCommandsDir', () => {
    // @req FR:cli.dynamic
    it('should return path relative to module location', () => {
      const dir = resolveCommandsDir();

      // Should end with cli-commands
      expect(dir).toMatch(/cli-commands$/);
    });
  });
});
