import fs from 'fs';
import path from 'path';

describe('blueprint command validation', () => {
  const commandPath = path.join(__dirname, '../../src/resources/ai-config/commands/blueprint.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(commandPath, 'utf-8');
  });

  // @req FR:blueprint-workflow/workflow.ai-command
  it('should exist at the required path', () => {
    expect(fs.existsSync(commandPath)).toBe(true);
  });

  // @req FR:blueprint-workflow/workflow.ai-command
  describe('Frontmatter', () => {
    it('should declare name as blueprint', () => {
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
      expect(frontmatter).toMatch(/name:\s*"?blueprint"?/);
    });

    it('should include a description', () => {
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
      expect(frontmatter).toMatch(/description:/);
    });

    it('should declare allowed-tools', () => {
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
      expect(frontmatter).toMatch(/allowed-tools:/);
    });

    it('should declare argument-hint with optional issue parameter', () => {
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
      expect(frontmatter).toMatch(/argument-hint:\s*\[issue\]/);
    });

    it('should declare Usage example with /catalyst:blueprint', () => {
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
      expect(frontmatter).toMatch(/Usage:\s*\/catalyst:blueprint/);
    });
  });

  // @req FR:blueprint-workflow/workflow.ai-command + FR:workflow.playbook (cli invokes playbook)
  describe('Body', () => {
    it('should invoke the start-blueprint.md playbook via Execute @ pattern', () => {
      expect(content).toMatch(/Execute @node_modules\/@xerilium\/catalyst\/playbooks\/start-blueprint\.md/);
    });
  });

  // Regression: no inline error handling or success criteria (delegated to playbook per create.md)
  describe('Regression: minimal command shape', () => {
    it('should NOT include an Error handling section', () => {
      expect(content).not.toMatch(/^## Error handling/m);
    });

    it('should NOT include a Success criteria section', () => {
      expect(content).not.toMatch(/^## Success criteria/m);
    });

    it('should NOT reference the legacy start-blueprint flow with required issue-id', () => {
      expect(content).not.toMatch(/issue-id.*required/i);
    });
  });
});
