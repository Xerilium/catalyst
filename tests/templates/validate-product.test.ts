import fs from 'fs';
import path from 'path';

describe('product.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/templates/specs/product.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  describe('FR-1.1: Template standard compliance', () => {
    it('should use {placeholder-name} kebab-case format if placeholders exist', () => {
      const placeholders = content.match(/\{[^}]+\}/g) || [];
      placeholders.forEach(placeholder => {
        const inner = placeholder.slice(1, -1);
        expect(inner).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      });
    });

    it('should use > [INSTRUCTIONS] prefix for guidance', () => {
      expect(content).toMatch(/> \[INSTRUCTIONS\]/);
    });

    it('should have clear heading hierarchy (H1, H2)', () => {
      expect(content).toMatch(/^# Product Vision/m);
      expect(content).toMatch(/^## /m);
    });
  });

  describe('FR-1.2: Overview section with pointers', () => {
    it('should include System Overview section', () => {
      expect(content).toMatch(/^## System Overview/m);
    });
  });

  describe('FR-1.3: System Overview section', () => {
    it('should include System Overview section', () => {
      expect(content).toMatch(/^## System Overview/m);
    });

    it('should have instruction for 2-3 sentence description', () => {
      const overviewSection = content.split('## System Overview')[1]?.split('##')[0] || '';
      expect(overviewSection).toMatch(/2-3 sentences/i);
    });
  });

  describe('FR-1.4: Product Strategy section', () => {
    it('should include Product Strategy section', () => {
      expect(content).toMatch(/^## Product Strategy/m);
    });

    it('should have strategic priorities list', () => {
      expect(content).toMatch(/^1\. /m);
    });
  });

  describe('FR-1.5: Design Principles section', () => {
    it('should include Design Principles section', () => {
      expect(content).toMatch(/^## Design Principles/m);
    });

    it('should have instruction for 3-5 principles', () => {
      const principlesSection = content.split('## Design Principles')[1]?.split('##')[0] || '';
      expect(principlesSection).toMatch(/3-5 non-negotiable/i);
    });

    it('should have format examples', () => {
      const principlesSection = content.split('## Design Principles')[1]?.split('##')[0] || '';
      expect(principlesSection).toMatch(/\*\*Directive statement\*\*/);
      expect(principlesSection).toMatch(/Examples:/);
    });
  });

  describe('FR-1.6: Non-Goals section', () => {
    it('should include Non-Goals section', () => {
      expect(content).toMatch(/^## Non-Goals/m);
    });

    it('should have instruction about preventing scope creep', () => {
      const nonGoalsSection = content.split('## Non-Goals')[1]?.split('##')[0] || '';
      expect(nonGoalsSection).toMatch(/scope creep/i);
    });
  });

  describe('FR-1.7: Team section', () => {
    it('should include Team section', () => {
      expect(content).toMatch(/^## Team/m);
    });

    it('should include Product Manager role', () => {
      expect(content).toMatch(/Product Manager/);
    });

    it('should include Architect role', () => {
      expect(content).toMatch(/Architect/);
    });

    it('should include Engineer role', () => {
      expect(content).toMatch(/Engineer/);
    });

    it('should include AI Reviewers section', () => {
      expect(content).toMatch(/AI Reviewers/);
    });
  });

  describe('FR-1.8: Token optimization', () => {
    it('should have concise instructions', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\][^]*?(?=\n\n|$)/g) || [];
      instructions.forEach(instruction => {
        // Product templates allow longer instructions for complex guidance (up to 800 chars)
        expect(instruction.length).toBeLessThan(800);
      });
    });
  });
});
