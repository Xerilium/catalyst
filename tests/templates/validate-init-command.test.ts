import fs from 'fs';
import path from 'path';

describe('init command validation', () => {
  const commandPath = path.join(__dirname, '../../src/resources/ai-config/commands/init.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(commandPath, 'utf-8');
  });

  // @req FR:init-workflow/workflow.@ai-command
  it('should exist at the required path', () => {
    expect(fs.existsSync(commandPath)).toBe(true);
  });

  // @req FR:init-workflow/workflow.@ai-command
  describe('Frontmatter', () => {
    it('should declare name as init', () => {
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
      expect(frontmatter).toMatch(/name:\s*"?init"?/);
    });

    it('should include a description', () => {
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
      expect(frontmatter).toMatch(/description:/);
    });

    it('should declare allowed-tools', () => {
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
      expect(frontmatter).toMatch(/allowed-tools:/);
    });

    it('should declare Usage example with /catalyst:init', () => {
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
      expect(frontmatter).toMatch(/Usage:\s*\/catalyst:init/);
    });
  });

  // @req FR:init-workflow/workflow.@ai-command + FR:workflow.playbook (cli invokes playbook)
  describe('Body', () => {
    it('should invoke the start-initialization.md playbook via Execute @ pattern', () => {
      expect(content).toMatch(/Execute @node_modules\/@xerilium\/catalyst\/playbooks\/start-initialization\.md/);
    });
  });

  // Regression: minimal command shape (delegated to playbook per create.md / blueprint.md)
  describe('Regression: minimal command shape', () => {
    it('should NOT include an Error handling section', () => {
      expect(content).not.toMatch(/^## Error handling/m);
    });

    it('should NOT include a Success criteria section', () => {
      expect(content).not.toMatch(/^## Success criteria/m);
    });

    it('should NOT reference the legacy issue-based flow with required issue-id', () => {
      expect(content).not.toMatch(/issue-id.*required/i);
    });

    it('should NOT reference new-init-issue', () => {
      expect(content).not.toMatch(/new-init-issue/);
    });
  });
});
