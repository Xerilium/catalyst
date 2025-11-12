/**
 * Unit tests for CLI command routing and parsing
 * Tests T035-T039: CLI parser tests
 */

import { parseCommand, executeCommand } from '../../../src/playbooks/scripts/github/cli';

describe('CLI Parser', () => {
  describe('command routing', () => {
    it('should route issue commands', () => {
      const cmd = parseCommand(['issue', 'get', '42']);
      expect(cmd.category).toBe('issue');
      expect(cmd.action).toBe('get');
      expect(cmd.args).toEqual(['42']);
    });

    it('should route PR commands', () => {
      const cmd = parseCommand(['pr', 'list']);
      expect(cmd.category).toBe('pr');
      expect(cmd.action).toBe('list');
    });

    it('should route repo commands', () => {
      const cmd = parseCommand(['repo', 'info']);
      expect(cmd.category).toBe('repo');
      expect(cmd.action).toBe('info');
    });

    it('should route auth commands', () => {
      const cmd = parseCommand(['auth']);
      expect(cmd.category).toBe('auth');
      expect(cmd.action).toBe('login');
    });
  });

  describe('argument parsing', () => {
    it('should parse positional arguments', () => {
      const cmd = parseCommand(['issue', 'get', '42']);
      expect(cmd.args).toContain('42');
    });

    it('should parse multiple arguments', () => {
      const cmd = parseCommand(['pr', 'reply', '10', '123', 'Response']);
      expect(cmd.args).toEqual(['10', '123', 'Response']);
    });
  });

  describe('flag parsing', () => {
    it('should parse --flag=value format', () => {
      const cmd = parseCommand(['issue', 'create', '--title=Test', '--body=Description']);
      expect(cmd.flags.title).toBe('Test');
      expect(cmd.flags.body).toBe('Description');
    });

    it('should parse boolean flags', () => {
      const cmd = parseCommand(['issue', 'get', '42', '--with-comments']);
      expect(cmd.flags['with-comments']).toBe(true);
    });

    it('should parse --flag value format', () => {
      const cmd = parseCommand(['issue', 'list', '--state', 'closed']);
      expect(cmd.flags.state).toBe('closed');
    });
  });

  describe('help system', () => {
    it('should recognize --help flag', () => {
      const cmd = parseCommand(['issue', '--help']);
      expect(cmd.showHelp).toBe(true);
    });

    it('should show help for unknown commands', () => {
      const cmd = parseCommand(['unknown']);
      expect(cmd.showHelp).toBe(true);
    });
  });

  describe('output formatting', () => {
    it('should detect --json flag for structured output', () => {
      const cmd = parseCommand(['repo', 'info', '--json']);
      expect(cmd.format).toBe('json');
    });

    it('should default to text format', () => {
      const cmd = parseCommand(['repo', 'info']);
      expect(cmd.format).toBe('text');
    });
  });
});
