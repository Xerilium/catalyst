import fs from 'fs';
import path from 'path';

describe('engineering.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/templates/specs/engineering.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  describe('FR-2.1: Template standard compliance', () => {
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

  describe('FR-2.2: Core Principles section with 12 items', () => {
    it('should include Core Principles section', () => {
      expect(content).toMatch(/^## Core Principles/m);
    });

    const requiredPrinciples = [
      'KISS',
      'YAGNI',
      'Convention over Configuration',
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

    it('should have exactly 12 principles', () => {
      const principlesSection = content.split('## Core Principles')[1]?.split('##')[0] || '';
      const principles = principlesSection.match(/^- \*\*/gm) || [];
      expect(principles.length).toBe(12);
    });
  });

  describe('FR-2.3: Technical Standards section', () => {
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

  describe('FR-2.4: Token optimization', () => {
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
