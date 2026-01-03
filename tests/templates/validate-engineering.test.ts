/**
 * Tests for engineering.md template validation
 */

import fs from 'fs';
import path from 'path';

/**
 * @req FR:engineering-context/eng.template
 */
describe('engineering.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/engineering.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  // @req FR:engineering-context/eng.template
  describe('FR:eng.template: Template standard compliance', () => {
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
      expect(content).toMatch(/^# Engineering Principles/m);
      expect(content).toMatch(/^## Core Principles/m);
    });
  });

  // @req FR:engineering-context/eng.principles
  // @req FR:engineering-context/eng.principles.list
  describe('FR:eng.principles: Core Principles section', () => {
    it('should include Core Principles section', () => {
      expect(content).toMatch(/^## Core Principles/m);
    });

    const requiredPrinciples = [
      'KISS',
      'YAGNI',
      'Separation of Concerns',
      'Single Responsibility',
      'Open/Closed',
      'Dependency Inversion',
      'Principle of Least Astonishment',
      'DRY',
      'Fail Fast',
      'Design for Testability',
      'Deterministic Processing',
    ];

    requiredPrinciples.forEach(principle => {
      it(`should include ${principle} principle`, () => {
        expect(content).toMatch(new RegExp(`\\*\\*${principle.replace(/[()]/g, '\\$&')}`, 'm'));
      });
    });

    it('should have exactly 11 principles', () => {
      const principlesSection = content.split('## Core Principles')[1]?.split('##')[0] || '';
      const principles = principlesSection.match(/^- \*\*/gm) || [];
      expect(principles.length).toBe(11);
    });
  });

  // @req FR:engineering-context/eng.standards
  describe('FR:eng.standards: Technical Standards section', () => {
    it('should include Technical Standards section', () => {
      expect(content).toMatch(/^## Technical Standards/m);
    });

    it('should have pointer to standards directory', () => {
      expect(content).toMatch(/\.xe\/standards\//);
    });

    it('should have pointer to development process', () => {
      expect(content).toMatch(/development\.md/);
    });
  });

  // @req FR:engineering-context/eng.quality
  describe('FR:eng.quality: Quality section', () => {
    it('should include Quality section under Technical Standards', () => {
      expect(content).toMatch(/- \*\*Quality\*\*/m);
    });

    // @req FR:engineering-context/eng.quality.threshold
    it('should define priority threshold', () => {
      expect(content).toMatch(/Priority threshold:.*P\d/);
    });

    // @req FR:engineering-context/eng.quality.traceability
    it('should define requirements traceability target', () => {
      expect(content).toMatch(/Requirements traceability:.*\d+%/);
    });

    // @req FR:engineering-context/eng.quality.code-coverage
    it('should define code coverage target', () => {
      expect(content).toMatch(/Code coverage:.*\d+%/);
    });

    // @req FR:engineering-context/eng.quality.priority
    // @req FR:engineering-context/eng.quality.priority.defaults
    it('should define priority classifications P1-P5', () => {
      expect(content).toMatch(/P1.*Critical/i);
      expect(content).toMatch(/P2.*Important/i);
      expect(content).toMatch(/P3.*Standard/i);
      expect(content).toMatch(/P4.*Minor/i);
      expect(content).toMatch(/P5.*Informational/i);
    });
  });

  // @req NFR:engineering-context/cost.token-efficiency
  describe('NFR:cost.token-efficiency: Token optimization', () => {
    it('should have concise instructions', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\][^]*?(?=\n\n|$)/g) || [];
      instructions.forEach(instruction => {
        // Each instruction block should be under 300 characters
        expect(instruction.length).toBeLessThan(300);
      });
    });

    it('should have concise principle descriptions', () => {
      const principlesSection = content.split('## Core Principles')[1]?.split('##')[0] || '';
      const principles = principlesSection.match(/^- \*\*[^:]+:\*\* .+$/gm) || [];
      principles.forEach(principle => {
        // Each principle should be under 150 characters
        expect(principle.length).toBeLessThan(150);
      });
    });
  });
});
