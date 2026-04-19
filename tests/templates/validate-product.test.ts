import fs from 'fs';
import path from 'path';

describe('product.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/product.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  // @req FR:product-context/product.output
  it('should exist at the required output path', () => {
    expect(fs.existsSync(templatePath)).toBe(true);
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

  // @req FR:product-context/product.purpose
  describe('FR:product.purpose: Purpose section', () => {
    it('should include Purpose section', () => {
      expect(content).toMatch(/^## Purpose/m);
    });

    it('should include instruction for product description', () => {
      const purposeSection = content.split('## Purpose')[1]?.split(/^## /m)[0] || '';
      expect(purposeSection).toMatch(/> \[INSTRUCTIONS\]/);
      expect(purposeSection).toMatch(/what it does|core value|primary benefits|product description/i);
    });
  });

  // @req FR:product-context/product.scenarios
  describe('FR:product.scenarios: Scenarios section', () => {
    it('should include Scenarios section', () => {
      expect(content).toMatch(/^## Scenarios/m);
    });

    it('should instruct scenarios to use FR IDs', () => {
      const scenariosSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenariosSection).toMatch(/FR:\{?[a-z][^}]*\}?/i);
    });

    it('should prohibit nested MUST/SHOULD sub-requirements', () => {
      const scenariosSection = content.split('## Scenarios')[1]?.split(/^## /m)[0] || '';
      expect(scenariosSection).toMatch(/(not|no|without).*(nest|sub-requirement|MUST\/SHOULD)/i);
    });
  });

  // @req FR:product-context/product.journey
  describe('FR:product.journey: Customer Journey section', () => {
    it('should include Customer Journey section', () => {
      expect(content).toMatch(/^## Customer Journey/m);
    });

    it('should reference .xe/customer-journey.md', () => {
      const journeySection = content.split('## Customer Journey')[1]?.split(/^## /m)[0] || '';
      expect(journeySection).toMatch(/customer-journey\.md/);
    });

  });

  describe('Regression: dropped sections', () => {
    it('should NOT include Technical Requirements section', () => {
      expect(content).not.toMatch(/^## Technical Requirements/m);
    });

    it('should NOT include System Overview section (merged into Purpose)', () => {
      expect(content).not.toMatch(/^## System Overview/m);
    });

    it('should NOT include Non-Goals section (merged into Purpose)', () => {
      expect(content).not.toMatch(/^## Non-Goals/m);
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

  // @req FR:product-context/product.personas
  describe('FR:product.personas: Personas section', () => {
    it('should include Personas section', () => {
      expect(content).toMatch(/^## Personas/m);
    });

    it('should define persona format', () => {
      const personasSection = content.split('## Personas')[1]?.split('##')[0] || '';
      expect(personasSection).toMatch(/\{persona-name\}/);
    });

    it('should reference feature specs using personas in scenarios', () => {
      const personasSection = content.split('## Personas')[1]?.split('##')[0] || '';
      expect(personasSection).toMatch(/scenarios/i);
    });
  });

  describe('FR:product.optimized: Token optimization', () => {
    // @req FR:product-context/product.optimized
    // @req NFR:product-context/cost.token-efficiency
    it('should have concise instructions', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\][^]*?(?=\n\n|$)/g) || [];
      instructions.forEach(instruction => {
        // Product templates allow longer instructions for complex guidance (up to 800 chars)
        expect(instruction.length).toBeLessThan(800);
      });
    });
  });

  describe('NFR:reliability: Template reliability', () => {
    // @req NFR:product-context/reliability.syntax
    it('should use standard markdown syntax', () => {
      expect(content).toMatch(/^# /m);
      expect(content).toMatch(/^## /m);
    });

    // @req NFR:product-context/reliability.structure
    it('should have consistent heading structure', () => {
      // Product Vision template uses H1 for title and H2 for sections
      expect(content).toMatch(/^# Product Vision/m);
      expect(content).toMatch(/^## Purpose/m);
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
