import fs from 'fs';
import path from 'path';

describe('competitive-analysis.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/competitive-analysis.md');
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

    it('should have clear heading hierarchy (H1, H2, H3)', () => {
      expect(content).toMatch(/^# Competitive Analysis/m);
      expect(content).toMatch(/^## /m);
      expect(content).toMatch(/^### /m);
    });
  });

  describe('FR-2.2: Should We Build This? section', () => {
    it('should include Should We Build This? section', () => {
      expect(content).toMatch(/^## Should We Build This\?/m);
    });

    const requiredElements = [
      'Problem severity',
      'demand',
      'Team',
      'risks',
      'Go/no-go',
    ];

    requiredElements.forEach(element => {
      it(`should address ${element}`, () => {
        const section = content.split('## Should We Build This?')[1]?.split('##')[0] || '';
        expect(section).toMatch(new RegExp(element, 'i'));
      });
    });
  });

  describe('FR-2.3: Competitive Landscape section', () => {
    it('should include Competitive Landscape section', () => {
      expect(content).toMatch(/^## Competitive Landscape/m);
    });

    it('should have competitor template with strengths', () => {
      expect(content).toMatch(/\*\*Strengths:\*\*/);
    });

    it('should have competitor template with weaknesses', () => {
      expect(content).toMatch(/\*\*Weaknesses:\*\*/);
    });

    it('should have competitor template with customer sentiment', () => {
      expect(content).toMatch(/\*\*Customer Sentiment:\*\*/);
    });
  });

  describe('FR-2.4: Table-Stakes Features section', () => {
    it('should include Table-Stakes Features section', () => {
      expect(content).toMatch(/^## Table-Stakes Features/m);
    });

    it('should have instruction about competing', () => {
      const section = content.split('## Table-Stakes Features')[1]?.split('##')[0] || '';
      expect(section).toMatch(/compete/i);
    });
  });

  describe('FR-2.5: Revolutionary Differentiation section', () => {
    it('should include Revolutionary Differentiation section', () => {
      expect(content).toMatch(/^## Revolutionary Differentiation/m);
    });

    it('should have instruction about 10x better', () => {
      const section = content.split('## Revolutionary Differentiation')[1]?.split('##')[0] || '';
      expect(section).toMatch(/10x better/i);
    });

    it('should emphasize bold innovation', () => {
      const section = content.split('## Revolutionary Differentiation')[1]?.split('##')[0] || '';
      expect(section).toMatch(/bold|game-changing|revolutionary/i);
    });
  });

  describe('FR-2.6: Recommended Positioning section', () => {
    it('should include Recommended Positioning section', () => {
      expect(content).toMatch(/^## Recommended Positioning/m);
    });

    it('should include Target Segment', () => {
      expect(content).toMatch(/\*\*Target Segment\*\*/);
    });

    it('should include Positioning', () => {
      expect(content).toMatch(/\*\*Positioning\*\*/);
    });

    it('should include Key Message', () => {
      expect(content).toMatch(/\*\*Key Message\*\*/);
    });
  });

  describe('FR-2.7: Token optimization', () => {
    it('should have concise instructions', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\][^]*?(?=\n\n|$)/g) || [];
      instructions.forEach(instruction => {
        // Each instruction block should be under 400 characters for product templates
        expect(instruction.length).toBeLessThan(400);
      });
    });

    it('should emphasize honesty and revolutionary thinking', () => {
      expect(content).toMatch(/brutally honest|revolutionary|10x better/i);
    });
  });
});
