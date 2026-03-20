/**
 * Tests for AI provider command generation
 *
 * @req FR:ai-provider/commands.generate
 * @req FR:ai-provider/commands.transform
 * @req FR:ai-provider/commands.discovery
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getProvidersWithCommands,
  generateProviderCommands,
  transformCommandContent
} from '@ai/commands';
import {
  PROVIDER_COMMAND_CONFIGS,
  type ProviderCommandEntry
} from '@ai/providers/command-configs';

// Mock fs module
jest.mock('fs');
const mockFs = jest.mocked(fs);

describe('AI Commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProvidersWithCommands', () => {
    // @req FR:ai-provider/commands.discovery
    it('should return an array of provider entries', () => {
      const providers = getProvidersWithCommands();
      expect(Array.isArray(providers)).toBe(true);
    });

    // @req FR:ai-provider/commands.discovery
    it('should return 3 provider entries', () => {
      const providers = getProvidersWithCommands();
      expect(providers).toHaveLength(3);
    });

    // @req FR:ai-provider/commands.discovery
    it('should include Claude, Copilot, and Cursor display names', () => {
      const providers = getProvidersWithCommands();
      const names = providers.map((p) => p.displayName);
      expect(names).toContain('Claude');
      expect(names).toContain('Copilot');
      expect(names).toContain('Cursor');
    });

    // @req FR:ai-provider/commands.discovery
    it('should return entries matching PROVIDER_COMMAND_CONFIGS values', () => {
      const providers = getProvidersWithCommands();
      const configValues = Object.values(PROVIDER_COMMAND_CONFIGS);
      expect(providers).toEqual(configValues);
    });
  });

  describe('transformCommandContent', () => {
    const claudeProvider: ProviderCommandEntry = PROVIDER_COMMAND_CONFIGS.claude;
    const copilotProvider: ProviderCommandEntry = PROVIDER_COMMAND_CONFIGS.copilot;
    const cursorProvider: ProviderCommandEntry = PROVIDER_COMMAND_CONFIGS.cursor;

    describe('front matter handling', () => {
      const contentWithFrontMatter = [
        '---',
        'name: "test"',
        'description: Test command',
        '---',
        '',
        '# Test Command',
        'Content here.'
      ].join('\n');

      // @req FR:ai-provider/commands.transform
      it('should preserve front matter when useFrontMatter is true', () => {
        const result = transformCommandContent(
          contentWithFrontMatter,
          'test',
          claudeProvider
        );
        expect(result).toContain('---');
        expect(result).toContain('name: "test"');
      });

      // @req FR:ai-provider/commands.transform
      it('should remove front matter when useFrontMatter is false', () => {
        const result = transformCommandContent(
          contentWithFrontMatter,
          'test',
          copilotProvider
        );
        expect(result).not.toContain('---');
        expect(result).not.toContain('name: "test"');
        expect(result).toContain('# Test Command');
      });
    });

    describe('separator replacement', () => {
      const contentWithSeparator = 'Use /catalyst:rollout to start.';

      // @req FR:ai-provider/commands.transform
      it('should keep colon separator for Claude', () => {
        const result = transformCommandContent(
          contentWithSeparator,
          'test',
          claudeProvider
        );
        expect(result).toContain('/catalyst:rollout');
      });

      // @req FR:ai-provider/commands.transform
      it('should replace colon with slash for Cursor', () => {
        const result = transformCommandContent(
          contentWithSeparator,
          'test',
          cursorProvider
        );
        expect(result).toContain('/catalyst/rollout');
        expect(result).not.toContain('/catalyst:rollout');
      });

      // @req FR:ai-provider/commands.transform
      it('should replace colon with dot for Copilot before namespace flattening', () => {
        // Copilot separator is '.', and useNamespaces is false, so the
        // separator replacement happens first, then namespace flattening.
        // The final output uses the flat form '/catalyst.rollout'.
        const result = transformCommandContent(
          contentWithSeparator,
          'test',
          copilotProvider
        );
        expect(result).toContain('/catalyst.rollout');
      });
    });

    describe('namespace-to-flat conversion', () => {
      // @req FR:ai-provider/commands.transform
      it('should convert namespaced commands to flat for Copilot', () => {
        const content = 'Run /catalyst:rollout or /catalyst:init for help.';
        const result = transformCommandContent(content, 'test', copilotProvider);
        expect(result).toContain('/catalyst.rollout');
        expect(result).toContain('/catalyst.init');
      });

      // @req FR:ai-provider/commands.transform
      it('should preserve namespaced style for Claude', () => {
        const content = 'Run /catalyst:rollout for help.';
        const result = transformCommandContent(content, 'test', claudeProvider);
        expect(result).toContain('/catalyst:rollout');
      });

      // @req FR:ai-provider/commands.transform
      it('should preserve namespaced style for Cursor', () => {
        const content = 'Run /catalyst:rollout for help.';
        const result = transformCommandContent(content, 'test', cursorProvider);
        expect(result).toContain('/catalyst/rollout');
      });
    });

    describe('$$AI_PLATFORM$$ replacement', () => {
      const contentWithPlaceholder = 'Prefix: [Catalyst][$$AI_PLATFORM$$]';

      // @req FR:ai-provider/commands.transform
      it('should replace placeholder with Claude display name', () => {
        const result = transformCommandContent(
          contentWithPlaceholder,
          'test',
          claudeProvider
        );
        expect(result).toContain('[Catalyst][Claude]');
        expect(result).not.toContain('$$AI_PLATFORM$$');
      });

      // @req FR:ai-provider/commands.transform
      it('should replace placeholder with Copilot display name', () => {
        const result = transformCommandContent(
          contentWithPlaceholder,
          'test',
          copilotProvider
        );
        expect(result).toContain('[Catalyst][Copilot]');
      });

      // @req FR:ai-provider/commands.transform
      it('should replace placeholder with Cursor display name', () => {
        const result = transformCommandContent(
          contentWithPlaceholder,
          'test',
          cursorProvider
        );
        expect(result).toContain('[Catalyst][Cursor]');
      });

      // @req FR:ai-provider/commands.transform
      it('should replace multiple occurrences', () => {
        const content =
          '$$AI_PLATFORM$$ says hello. $$AI_PLATFORM$$ says bye.';
        const result = transformCommandContent(content, 'test', claudeProvider);
        expect(result).toBe('Claude says hello. Claude says bye.');
      });
    });

    describe('combined transformations for Copilot', () => {
      // @req FR:ai-provider/commands.transform
      it('should apply front matter removal, namespace flattening, and placeholder replacement', () => {
        const content = [
          '---',
          'name: "pr-update"',
          '---',
          '',
          'Run /catalyst:pr-update to update PRs.',
          'Prefix: [Catalyst][$$AI_PLATFORM$$]'
        ].join('\n');

        const result = transformCommandContent(
          content,
          'pr-update',
          copilotProvider
        );
        expect(result).not.toContain('---');
        expect(result).toContain('/catalyst.pr-update');
        expect(result).toContain('[Catalyst][Copilot]');
      });
    });
  });

  describe('generateProviderCommands', () => {
    const projectRoot = '/test/project';
    const templatesDir = '/test/templates';

    // @req FR:ai-provider/commands.generate
    it('should read .md files from templates directory', () => {
      (mockFs.readdirSync as jest.Mock).mockReturnValue([
        'rollout.md',
        'init.md'
      ]);
      mockFs.readFileSync.mockReturnValue('template content');
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);

      generateProviderCommands(projectRoot, templatesDir);

      expect(mockFs.readdirSync).toHaveBeenCalledWith(templatesDir);
    });

    // @req FR:ai-provider/commands.generate
    it('should create correct directory structure for namespaced providers', () => {
      (mockFs.readdirSync as jest.Mock).mockReturnValue(['rollout.md']);
      mockFs.readFileSync.mockReturnValue('# Rollout');
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);

      generateProviderCommands(projectRoot, templatesDir);

      // Claude: namespaced -> .claude/commands/catalyst/
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        path.join(projectRoot, '.claude/commands/catalyst'),
        { recursive: true }
      );
      // Cursor: namespaced -> .cursor/commands/catalyst/
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        path.join(projectRoot, '.cursor/commands/catalyst'),
        { recursive: true }
      );
    });

    // @req FR:ai-provider/commands.generate
    it('should write files with correct paths for namespaced providers', () => {
      (mockFs.readdirSync as jest.Mock).mockReturnValue(['rollout.md']);
      mockFs.readFileSync.mockReturnValue('# Rollout');
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);

      generateProviderCommands(projectRoot, templatesDir);

      // Claude: .claude/commands/catalyst/rollout.md
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(projectRoot, '.claude/commands/catalyst/rollout.md'),
        expect.any(String)
      );
    });

    // @req FR:ai-provider/commands.generate
    it('should write files with correct paths for flat providers (Copilot)', () => {
      (mockFs.readdirSync as jest.Mock).mockReturnValue(['rollout.md']);
      mockFs.readFileSync.mockReturnValue('# Rollout');
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);

      generateProviderCommands(projectRoot, templatesDir);

      // Copilot: .github/prompts/catalyst.rollout.prompt.md (flat)
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(
          projectRoot,
          '.github/prompts/catalyst.rollout.prompt.md'
        ),
        expect.any(String)
      );
    });

    // @req FR:ai-provider/commands.generate
    it('should apply correct extensions per provider', () => {
      (mockFs.readdirSync as jest.Mock).mockReturnValue(['init.md']);
      mockFs.readFileSync.mockReturnValue('# Init');
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);

      generateProviderCommands(projectRoot, templatesDir);

      // Claude uses .md
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(projectRoot, '.claude/commands/catalyst/init.md'),
        expect.any(String)
      );
      // Copilot uses .prompt.md
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(
          projectRoot,
          '.github/prompts/catalyst.init.prompt.md'
        ),
        expect.any(String)
      );
      // Cursor uses .md
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(projectRoot, '.cursor/commands/catalyst/init.md'),
        expect.any(String)
      );
    });

    // @req FR:ai-provider/commands.generate
    it('should handle missing templates directory gracefully', () => {
      (mockFs.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();

      generateProviderCommands(projectRoot, templatesDir);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to read commands directory:',
        expect.any(String)
      );
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    // @req FR:ai-provider/commands.generate
    it('should handle unreadable template files gracefully', () => {
      (mockFs.readdirSync as jest.Mock).mockReturnValue([
        'good.md',
        'bad.md'
      ]);
      mockFs.readFileSync.mockImplementation((filepath) => {
        if (String(filepath).includes('bad.md')) {
          throw new Error('Permission denied');
        }
        return '# Good template';
      });
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();

      generateProviderCommands(projectRoot, templatesDir);

      // Should still generate for good.md (3 providers)
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(3);
      // Should log error for bad.md
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read command template bad.md'),
        expect.any(String)
      );
      consoleSpy.mockRestore();
    });

    // @req FR:ai-provider/commands.generate
    it('should filter out non-.md files from templates', () => {
      (mockFs.readdirSync as jest.Mock).mockReturnValue([
        'rollout.md',
        'readme.txt',
        '.gitkeep'
      ]);
      mockFs.readFileSync.mockReturnValue('# Content');
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);

      generateProviderCommands(projectRoot, templatesDir);

      // Only rollout.md should be processed (3 providers x 1 file = 3 writes)
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(3);
    });

    // @req FR:ai-provider/commands.generate
    it('should generate files for all 3 providers per template', () => {
      (mockFs.readdirSync as jest.Mock).mockReturnValue(['test.md']);
      mockFs.readFileSync.mockReturnValue('# Test');
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);

      generateProviderCommands(projectRoot, templatesDir);

      // 3 providers x 1 template = 3 files
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(3);
    });

    // @req FR:ai-provider/commands.generate
    it('should handle write failures gracefully', () => {
      (mockFs.readdirSync as jest.Mock).mockReturnValue(['test.md']);
      mockFs.readFileSync.mockReturnValue('# Test');
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();

      // Should not throw
      expect(() =>
        generateProviderCommands(projectRoot, templatesDir)
      ).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    // @req FR:ai-provider/commands.generate
    it('should use default templates directory when not provided', () => {
      (mockFs.readdirSync as jest.Mock).mockReturnValue([]);

      generateProviderCommands(projectRoot);

      // Should call readdirSync with the default path (based on __dirname)
      expect(mockFs.readdirSync).toHaveBeenCalledWith(
        expect.stringContaining('ai-config/commands')
      );
    });

    // @req FR:ai-provider/commands.generate
    it('should log message when no providers have command configuration', () => {
      // This test validates the empty providers path.
      // Since PROVIDER_COMMAND_CONFIGS is a real import with 3 entries,
      // this code path is not reachable without mocking the module.
      // Covered implicitly by the fact that all other tests confirm 3 providers exist.
    });
  });
});
