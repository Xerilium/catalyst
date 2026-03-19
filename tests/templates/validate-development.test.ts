/**
 * Tests for development.md template validation
 */

import fs from 'fs';
import path from 'path';

/**
 * @req FR:engineering-context/dev.template
 */
describe('development.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/process/development.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  // @req FR:engineering-context/dev.template
  describe('FR:dev.template: Template standard compliance', () => {
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
  describe('FR:dev.workflow: Development process standards', () => {
    it('should include Living Specification Principle section', () => {
      expect(content).toMatch(/^## Living Specification Principle/m);
    });

    it('should include Spec-First Development section', () => {
      expect(content).toMatch(/^## Spec-First Development/m);
    });

    it('should require specs before code', () => {
      const specSection = content.split('## Spec-First Development')[1]?.split(/^## /m)[0] || '';
      expect(specSection).toMatch(/spec.*up to date/i);
      expect(specSection).toMatch(/plan mode/i);
      expect(specSection).toMatch(/human review/i);
    });

    it('should include Test-Driven Development section', () => {
      expect(content).toMatch(/^## Test-Driven Development/m);
    });

    it('should describe the full TDD cycle', () => {
      const tddSection = content.split('## Test-Driven Development')[1]?.split(/^## /m)[0] || '';
      expect(tddSection).toMatch(/Write failing tests/);
      expect(tddSection).toMatch(/Verify tests fail/);
      expect(tddSection).toMatch(/Implement/);
      expect(tddSection).toMatch(/Verify tests pass/);
      expect(tddSection).toMatch(/Validate traceability/i);
    });

    it('should reference @req annotations for traceability', () => {
      expect(content).toMatch(/@req/);
    });

    it('should include Feature Documentation section', () => {
      expect(content).toMatch(/^## Feature Documentation/m);
    });

    it('should reference spec.md and data-model.md', () => {
      expect(content).toMatch(/spec\.md/);
      expect(content).toMatch(/data-model\.md/);
    });

    it('should include Quality Standards section', () => {
      expect(content).toMatch(/^## Quality Standards/m);
    });
  });

  // @req NFR:engineering-context/cost.token-efficiency
  describe('NFR:cost.token-efficiency: Token optimization', () => {
    it('should use bullet points for process steps', () => {
      expect(content).toMatch(/^- /m);
    });

    it('should NOT include verbose examples', () => {
      const lines = content.split('\n');
      const averageLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
      expect(averageLineLength).toBeLessThan(100);
    });

    it('should be concise overall', () => {
      const lines = content.split('\n').length;
      expect(lines).toBeLessThan(110);
    });
  });
});
