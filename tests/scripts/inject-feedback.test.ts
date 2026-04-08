/**
 * Tests for feedback injection script
 *
 * @req FR:feedback-loop/inject.script
 * @req FR:feedback-loop/inject.all-providers
 * @req FR:feedback-loop/inject.preamble
 * @req FR:feedback-loop/inject.trigger
 * @req FR:feedback-loop/inject.provider-conventions
 * @req FR:feedback-loop/inject.source-safe
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  PROVIDER_COMMAND_CONFIGS,
  type ProviderCommandEntry,
} from '@ai/providers/command-configs';

// Mock fs module
jest.mock('fs');
const mockFs = jest.mocked(fs);

// Import after mocking
import {
  getPlaybookPath,
  buildPreamble,
  buildTrigger,
  insertPreamble,
  injectFeedback,
} from '../../scripts/inject-feedback';

const claudeProvider = PROVIDER_COMMAND_CONFIGS.claude;
const copilotProvider = PROVIDER_COMMAND_CONFIGS.copilot;
const cursorProvider = PROVIDER_COMMAND_CONFIGS.cursor;

describe('inject-feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPlaybookPath', () => {
    // @req FR:feedback-loop/inject.provider-conventions
    it('should return standard path for Claude provider', () => {
      expect(getPlaybookPath(claudeProvider)).toBe(
        'node_modules/@xerilium/catalyst/playbooks/invoke-retrospective.md'
      );
    });

    // @req FR:feedback-loop/inject.provider-conventions
    it('should return dot-separated path for Copilot provider', () => {
      expect(getPlaybookPath(copilotProvider)).toBe(
        'node_modules/@xerilium/catalyst.playbooks/invoke-retrospective.md'
      );
    });

    // @req FR:feedback-loop/inject.provider-conventions
    it('should return standard path for Cursor provider', () => {
      expect(getPlaybookPath(cursorProvider)).toBe(
        'node_modules/@xerilium/catalyst/playbooks/invoke-retrospective.md'
      );
    });
  });

  describe('buildPreamble', () => {
    // @req FR:feedback-loop/inject.preamble
    it('should return HTML comment with tracking instructions', () => {
      const preamble = buildPreamble();
      expect(preamble).toContain('<!--');
      expect(preamble).toContain('-->');
      expect(preamble).toContain('quality');
    });

    // @req FR:feedback-loop/inject.preamble
    it('should not contain markdown headings or frontmatter markers', () => {
      const preamble = buildPreamble();
      expect(preamble).not.toContain('---');
      expect(preamble).not.toMatch(/^#/m);
    });

    // @req FR:feedback-loop/inject.preamble
    it('should include AUQ compliance reminder', () => {
      const preamble = buildPreamble();
      expect(preamble).toContain('AUQ');
      expect(preamble).toContain('AskUserQuestion');
    });
  });

  describe('buildTrigger', () => {
    // @req FR:feedback-loop/inject.trigger
    it('should include Execute line with feedback playbook path for Claude', () => {
      const trigger = buildTrigger(claudeProvider);
      expect(trigger).toContain(
        'Execute @node_modules/@xerilium/catalyst/playbooks/invoke-retrospective.md'
      );
    });

    // @req FR:feedback-loop/inject.trigger
    it('should include Execute line with Copilot-transformed path', () => {
      const trigger = buildTrigger(copilotProvider);
      expect(trigger).toContain(
        'Execute @node_modules/@xerilium/catalyst.playbooks/invoke-retrospective.md'
      );
    });

    // @req FR:feedback-loop/inject.trigger
    it('should include section heading', () => {
      const trigger = buildTrigger(claudeProvider);
      expect(trigger).toContain('## After completing all steps above');
    });
  });

  describe('insertPreamble', () => {
    const claudeContent = [
      '---',
      'name: "create"',
      'description: Create new features',
      '---',
      '',
      '# Create new features',
      '',
      'Execute @node_modules/@xerilium/catalyst/playbooks/create-feature.md',
    ].join('\n');

    const copilotContent = [
      '# Create new features',
      '',
      'Execute @node_modules/@xerilium/catalyst.playbooks/create-feature.md',
    ].join('\n');

    // @req FR:feedback-loop/inject.preamble
    it('should insert after frontmatter closing --- for Claude', () => {
      const result = insertPreamble(claudeContent, claudeProvider);
      const lines = result.split('\n');
      expect(lines[0]).toBe('---');
      const closingIdx = lines.indexOf('---', 1);
      expect(closingIdx).toBeGreaterThan(0);
      const afterFrontmatter = lines.slice(closingIdx + 1).join('\n');
      expect(afterFrontmatter).toContain('<!--');
    });

    // @req FR:feedback-loop/inject.preamble
    it('should insert after frontmatter closing --- for Cursor', () => {
      const result = insertPreamble(claudeContent, cursorProvider);
      const lines = result.split('\n');
      const closingIdx = lines.indexOf('---', 1);
      const afterFrontmatter = lines.slice(closingIdx + 1).join('\n');
      expect(afterFrontmatter).toContain('<!--');
    });

    // @req FR:feedback-loop/inject.preamble
    it('should insert at top for Copilot (no frontmatter)', () => {
      const result = insertPreamble(copilotContent, copilotProvider);
      expect(result).toMatch(/^<!--/);
    });

    // @req FR:feedback-loop/inject.preamble
    it('should not break existing frontmatter parsing', () => {
      const result = insertPreamble(claudeContent, claudeProvider);
      expect(result).toMatch(/^---\nname: "create"/);
      expect(result).toContain(
        'Execute @node_modules/@xerilium/catalyst/playbooks/create-feature.md'
      );
    });
  });

  describe('injectFeedback', () => {
    const projectRoot = '/test/project';

    // @req FR:feedback-loop/inject.script
    it('should read and write to generated command files', () => {
      const claudeDir = path.join(
        projectRoot,
        claudeProvider.commands.path,
        'catalyst'
      );

      mockFs.existsSync.mockImplementation((p: fs.PathLike) => p === claudeDir);
      (mockFs.readdirSync as jest.Mock).mockImplementation((p: string) => {
        if (p === claudeDir) return ['create.md'];
        return [];
      });
      mockFs.readFileSync.mockReturnValue(
        '---\nname: "create"\n---\n\n# Create\n\nExecute @node_modules/@xerilium/catalyst/playbooks/create-feature.md'
      );

      injectFeedback(projectRoot);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writtenContent = (mockFs.writeFileSync as jest.Mock).mock
        .calls[0][1] as string;
      expect(writtenContent).toContain('<!--');
      expect(writtenContent).toContain('invoke-retrospective.md');
    });

    // @req FR:feedback-loop/inject.script
    it('should handle missing provider directories gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => injectFeedback(projectRoot)).not.toThrow();
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    // @req FR:feedback-loop/inject.all-providers
    it('should handle namespaced directory structure (Claude)', () => {
      const claudeDir = path.join(
        projectRoot,
        claudeProvider.commands.path,
        'catalyst'
      );

      mockFs.existsSync.mockImplementation((p: fs.PathLike) => p === claudeDir);
      (mockFs.readdirSync as jest.Mock).mockImplementation((p: string) => {
        if (p === claudeDir) return ['create.md', 'fix.md'];
        return [];
      });
      mockFs.readFileSync.mockReturnValue(
        '---\nname: "test"\n---\n\n# Test\n\nExecute @node_modules/@xerilium/catalyst/playbooks/create-feature.md'
      );

      injectFeedback(projectRoot);

      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    // @req FR:feedback-loop/inject.all-providers
    it('should handle flat directory structure (Copilot)', () => {
      const copilotDir = path.join(projectRoot, copilotProvider.commands.path);

      mockFs.existsSync.mockImplementation(
        (p: fs.PathLike) => p === copilotDir
      );
      (mockFs.readdirSync as jest.Mock).mockImplementation((p: string) => {
        if (p === copilotDir)
          return [
            'catalyst.create.prompt.md',
            'catalyst.fix.prompt.md',
            'other-file.md',
          ];
        return [];
      });
      mockFs.readFileSync.mockReturnValue(
        '# Create\n\nExecute @node_modules/@xerilium/catalyst.playbooks/create-feature.md'
      );

      injectFeedback(projectRoot);

      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    // @req FR:feedback-loop/inject.source-safe
    it('should NOT process source template directories', () => {
      mockFs.existsSync.mockReturnValue(false);

      injectFeedback(projectRoot);

      const checkedPaths = (mockFs.existsSync as jest.Mock).mock.calls.map(
        (call: any[]) => call[0] as string
      );
      for (const checkedPath of checkedPaths) {
        expect(checkedPath).not.toContain('src/resources');
        expect(checkedPath).not.toContain('ai-config');
      }
    });
  });
});
