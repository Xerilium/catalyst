/**
 * Tests for development.md template validation
 */

import fs from 'fs';
import path from 'path';

/**
 * @req FR:engineering-context/dev.template
 */
describe('development.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/development.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  // @req FR:engineering-context/dev.template
  describe('FR:dev.template: Template standard compliance', () => {
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
      expect(content).toMatch(/^# Development Process/m);
      expect(content).toMatch(/^## /m);
      expect(content).toMatch(/^### /m);
    });
  });

  // @req FR:engineering-context/dev.workflow
  describe('FR:dev.workflow: Workflow phases, checkpoints, and quality gates', () => {
    const requiredPhases = [
      'Phase 0. Setup',
      'Phase 1. Analysis',
      'Phase 2. Specification',
      'Phase 3. Planning',
      'Phase 4. Implementation',
      'Phase 5. Validation',
      'Phase 6. Documentation',
      'Phase 7. Review',
    ];

    requiredPhases.forEach(phase => {
      it(`should include ${phase}`, () => {
        expect(content).toMatch(new RegExp(`### ${phase.replace(/\./g, '\\.')}`, 'm'));
      });
    });

    it('should include Living Specification Principle section', () => {
      expect(content).toMatch(/^## Living Specification Principle/m);
    });

    it('should include Development Workflow section', () => {
      expect(content).toMatch(/^## Development Workflow/m);
    });

    it('should include Quality Requirements section', () => {
      expect(content).toMatch(/^## Quality Requirements/m);
    });

    it('should include Testing Strategy section', () => {
      expect(content).toMatch(/^## Testing Strategy/m);
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

    it('should use bullet points for process steps', () => {
      expect(content).toMatch(/^- /m);
    });

    it('should NOT include verbose examples', () => {
      const lines = content.split('\n');
      const averageLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
      // Average line length should be reasonable (not overly verbose)
      expect(averageLineLength).toBeLessThan(100);
    });
  });
});
