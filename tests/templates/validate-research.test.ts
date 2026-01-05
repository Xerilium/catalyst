import fs from 'fs';
import path from 'path';

describe('research.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/research.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  // @req FR:feature-context/research.template.standard
  describe('FR:research.template.standard: Template standard compliance', () => {
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
      expect(content).toMatch(/^# Research:/m);
      expect(content).toMatch(/^## /m);
    });
  });

  // @req FR:feature-context/research.template.overview
  describe('FR:research.template.overview: Overview section (Summary + Scope)', () => {
    it('should include Summary section for overview', () => {
      expect(content).toMatch(/^## Summary/m);
    });

    it('should include Scope section for research scope', () => {
      expect(content).toMatch(/^## Scope/m);
    });

    it('should have guidance for research scope', () => {
      const scopeSection = content.split('## Scope')[1]?.split('##')[0] || '';
      expect(scopeSection).toMatch(/scope|investigated/i);
    });
  });

  // @req FR:feature-context/research.template.findings
  describe('FR:research.template.findings: Key Findings section (Technical Context + Methods + Sources)', () => {
    it('should include Technical Context section for findings', () => {
      expect(content).toMatch(/^## Technical Context/m);
    });

    it('should include Methods section', () => {
      expect(content).toMatch(/^## Methods/m);
    });

    it('should include Sources section', () => {
      expect(content).toMatch(/^## Sources/m);
    });
  });

  // @req FR:feature-context/research.template.decisions
  describe('FR:research.template.decisions: Design Decisions section (Decision Log)', () => {
    it('should include Decision Log section', () => {
      expect(content).toMatch(/^## Decision Log/m);
    });

    it('should have structure for documenting choices, rationale, and alternatives', () => {
      const decisionsSection = content.split('## Decision Log')[1]?.split('##')[0] || '';
      expect(decisionsSection).toMatch(/Rationale/i);
      expect(decisionsSection).toMatch(/Alternatives considered/i);
    });

    it('should include decision list format', () => {
      const decisionsSection = content.split('## Decision Log')[1]?.split('##')[0] || '';
      expect(decisionsSection).toMatch(/Decision:/i);
    });
  });

  // @req FR:feature-context/research.template.recommendations
  describe('FR:research.template.recommendations: Recommendations section (Open Questions)', () => {
    it('should include Open Questions section for next steps', () => {
      expect(content).toMatch(/^## Open Questions/m);
    });

    it('should have structure for tracking unanswered questions', () => {
      const questionsSection = content.split('## Open Questions')[1]?.split('##')[0] || '';
      expect(questionsSection).toMatch(/Owner|ETA/i);
    });
  });

  // @req FR:feature-context/research.template.references
  describe('FR:research.template.references: References section', () => {
    it('should include References section', () => {
      expect(content).toMatch(/^## References/m);
    });

    it('should have guidance for sources', () => {
      const refsSection = content.split('## References')[1] || '';
      expect(refsSection).toMatch(/sources|references|links/i);
    });
  });

  // @req FR:feature-context/research.template.optimized
  // @req NFR:feature-context/cost.tokens
  describe('FR:research.template.optimized: Token optimization', () => {
    it('should have reasonably concise instructions', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\][^]*?(?=\n\n|$)/g) || [];
      instructions.forEach(instruction => {
        // Research templates should be concise (up to 800 chars)
        expect(instruction.length).toBeLessThan(800);
      });
    });

    it('should be reasonably concise overall', () => {
      const lines = content.split('\n').length;
      // Research template should be comprehensive but not excessive
      expect(lines).toBeLessThan(100);
    });
  });
});
