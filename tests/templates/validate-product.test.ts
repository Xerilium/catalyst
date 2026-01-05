import fs from 'fs';
import path from 'path';

describe('product.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/product.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  // @req FR:product-context/product.template
  describe('FR:product.template: Template standard compliance', () => {
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

  // @req FR:product-context/product.overview
  describe('FR:product.overview: Overview section with pointers', () => {
    it('should include System Overview section', () => {
      expect(content).toMatch(/^## System Overview/m);
    });
  });

  // @req FR:product-context/product.system
  describe('FR:product.system: System Overview section', () => {
    it('should include System Overview section', () => {
      expect(content).toMatch(/^## System Overview/m);
    });

    it('should have instruction for 2-3 sentence description', () => {
      const overviewSection = content.split('## System Overview')[1]?.split('##')[0] || '';
      expect(overviewSection).toMatch(/2-3 sentences/i);
    });
  });

  // @req FR:product-context/product.strategy
  describe('FR:product.strategy: Product Strategy section', () => {
    it('should include Product Strategy section', () => {
      expect(content).toMatch(/^## Product Strategy/m);
    });

    it('should have strategic priorities list', () => {
      expect(content).toMatch(/^1\. /m);
    });
  });

  // @req FR:product-context/product.principles
  describe('FR:product.principles: Design Principles section', () => {
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

  // @req FR:product-context/product.nongoals
  describe('FR:product.nongoals: Non-Goals section', () => {
    it('should include Non-Goals section', () => {
      expect(content).toMatch(/^## Non-Goals/m);
    });

    it('should have instruction about preventing scope creep', () => {
      const nonGoalsSection = content.split('## Non-Goals')[1]?.split('##')[0] || '';
      expect(nonGoalsSection).toMatch(/scope creep/i);
    });
  });

  // @req FR:product-context/product.team
  describe('FR:product.team: Team section', () => {
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

  // @req FR:product-context/product.optimized
  // @req NFR:product-context/cost
  describe('FR:product.optimized: Token optimization', () => {
    it('should have concise instructions', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\][^]*?(?=\n\n|$)/g) || [];
      instructions.forEach(instruction => {
        // Product templates allow longer instructions for complex guidance (up to 800 chars)
        expect(instruction.length).toBeLessThan(800);
      });
    });
  });

  // @req NFR:product-context/reliability
  describe('NFR:reliability: Template reliability', () => {
    it('should use standard markdown syntax', () => {
      expect(content).toMatch(/^# /m);
      expect(content).toMatch(/^## /m);
    });

    it('should have consistent heading structure', () => {
      // Product Vision template uses H1 for title and H2 for sections
      expect(content).toMatch(/^# Product Vision/m);
      expect(content).toMatch(/^## System Overview/m);
    });

    it('should have consistent instruction block format', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\]/g) || [];
      expect(instructions.length).toBeGreaterThan(0);
    });

    it('should use consistent placeholder format if any placeholders exist', () => {
      const placeholders = content.match(/\{[^}]+\}/g) || [];
      // Product template may not have placeholders, but if it does they should be kebab-case
      placeholders.forEach(placeholder => {
        const inner = placeholder.slice(1, -1);
        expect(inner).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      });
    });
  });
});
