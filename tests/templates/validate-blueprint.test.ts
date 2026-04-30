import fs from 'fs';
import path from 'path';

describe('blueprint.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/blueprint.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  // @req FR:blueprint-context/blueprint.template
  // @req NFR:blueprint-context/testability.validation
  it('should exist at the required output path', () => {
    expect(fs.existsSync(templatePath)).toBe(true);
  });

  // @req FR:blueprint-context/blueprint.template
  describe('FR:blueprint.template: Template standard compliance', () => {
    it('should use {placeholder-name} kebab-case format if placeholders exist', () => {
      const placeholders = content.match(/\{[^}\n]+\}/g) || [];
      placeholders.forEach(placeholder => {
        const inner = placeholder.slice(1, -1);
        expect(inner).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      });
    });

    it('should use > [INSTRUCTIONS] prefix for guidance', () => {
      expect(content).toMatch(/> \[INSTRUCTIONS\]/);
    });

    it('should have H1 Blueprint heading', () => {
      expect(content).toMatch(/^# Blueprint:/m);
    });
  });

  // @req FR:blueprint-context/blueprint.arch
  describe('FR:blueprint.arch: Architecture section content', () => {
    it('should include a visual dependency graph grouped by functional area', () => {
      const section = content.split('## Architecture')[1]?.split(/^## /m)[0] || '';
      expect(section).toMatch(/> \[INSTRUCTIONS\]/);
      expect(section).toMatch(/```mermaid/);
      expect(section).toMatch(/graph (TD|LR|TB|BT|RL)/);
      expect(section).toMatch(/subgraph/);
    });
  });

  // @req FR:blueprint-context/blueprint.data-model
  describe('FR:blueprint.data-model: Data Model section content', () => {
    it('should visualize entities and relationships', () => {
      const section = content.split('## Data Model')[1]?.split(/^## /m)[0] || '';
      expect(section).toMatch(/> \[INSTRUCTIONS\]/);
      expect(section).toMatch(/```mermaid/);
      expect(section).toMatch(/classDiagram|erDiagram/);
    });
  });

  // @req FR:blueprint-context/blueprint.roadmap
  describe('FR:blueprint.roadmap: Roadmap section content', () => {
    it('should reference product strategy and require a visual', () => {
      const section = content.split('## Roadmap')[1]?.split(/^## /m)[0] || '';
      expect(section).toMatch(/> \[INSTRUCTIONS\]/);
      expect(section).toMatch(/product\.md/i);
      expect(section).toMatch(/Strategy/i);
      expect(section).toMatch(/```mermaid/);
    });
  });

  // @req FR:blueprint-context/blueprint.roadmap.detail
  describe('FR:blueprint.roadmap.detail: Per-feature detail', () => {
    it('should require id, complexity, purpose, scope, and dependencies', () => {
      const section = content.split('## Roadmap')[1]?.split(/^## /m)[0] || '';
      expect(section).toMatch(/complexity/i);
      expect(section).toMatch(/purpose/i);
      expect(section).toMatch(/scope/i);
      expect(section).toMatch(/dependencies/i);
      expect(section).toMatch(/Small/);
      expect(section).toMatch(/Medium/);
      expect(section).toMatch(/Large/);
    });
  });

  // Regression: dropped FRs MUST NOT reappear
  describe('Regression: dropped sections', () => {
    it('should NOT include frontmatter (FR:blueprint.frontmatter dropped)', () => {
      expect(content).not.toMatch(/^---\s*$/m);
    });

    it('should NOT include References section (FR:blueprint.references dropped)', () => {
      expect(content).not.toMatch(/^## References/m);
    });
  });

  // @req NFR:blueprint-context/cost.tokens
  describe('NFR:cost.tokens: Token-optimized instructions', () => {
    it('should keep instruction blocks concise', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\][^]*?(?=\n\n|$)/g) || [];
      instructions.forEach(instruction => {
        expect(instruction.length).toBeLessThan(800);
      });
    });
  });

  // @req NFR:blueprint-context/reliability.markdown
  // @req NFR:blueprint-context/reliability.structure
  describe('NFR:reliability: Template reliability', () => {
    it('should use standard markdown syntax', () => {
      expect(content).toMatch(/^# /m);
      expect(content).toMatch(/^## /m);
    });

    it('should have consistent instruction block format', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\]/g) || [];
      expect(instructions.length).toBeGreaterThan(0);
    });

    it('should use consistent placeholder format if any placeholders exist', () => {
      const placeholders = content.match(/\{[^}\n]+\}/g) || [];
      placeholders.forEach(placeholder => {
        const inner = placeholder.slice(1, -1);
        expect(inner).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      });
    });
  });
});
