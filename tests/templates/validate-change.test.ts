import fs from 'fs';
import path from 'path';

describe('change.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/change.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  // @req FR:feature-context/change.template
  describe('FR:change.template: Template structure', () => {
    it('should have a top-level Change heading with placeholder', () => {
      expect(content).toMatch(/^# Change: \{change-id\}/m);
    });

    it('should use > [INSTRUCTIONS] prefix for guidance', () => {
      expect(content).toMatch(/> \[INSTRUCTIONS\]/);
    });

    it('should NOT have frontmatter', () => {
      expect(content).not.toMatch(/^---$/m);
    });
  });

  // @req FR:feature-context/change.overview
  describe('FR:change.overview: Overview section', () => {
    it('should include Overview section', () => {
      expect(content).toMatch(/^## Overview/m);
    });
  });

  // @req FR:feature-context/change.tasks
  describe('FR:change.tasks: Tasks section', () => {
    it('should include Tasks section', () => {
      expect(content).toMatch(/^## Tasks/m);
    });

    it('should use checkbox format for tasks', () => {
      expect(content).toMatch(/- \[ \]/);
    });
  });

  // @req FR:feature-context/change.notes
  describe('FR:change.notes: Notes section', () => {
    it('should include Notes section', () => {
      expect(content).toMatch(/^## Notes/m);
    });
  });

  // @req NFR:feature-context/cost.tokens
  describe('NFR:cost.tokens: Token optimization', () => {
    it('should be concise', () => {
      const lines = content.split('\n').length;
      expect(lines).toBeLessThan(30);
    });
  });
});
