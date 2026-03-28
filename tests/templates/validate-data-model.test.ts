import fs from 'fs';
import path from 'path';

describe('data-model.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/data-model.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  // @req FR:feature-context/data-model.template
  describe('FR:data-model.template: Template standard compliance', () => {
    it('should exist as a file', () => {
      expect(fs.existsSync(templatePath)).toBe(true);
    });

    it('should use > [INSTRUCTIONS] prefix for guidance', () => {
      expect(content).toMatch(/> \[INSTRUCTIONS\]/);
    });

    it('should have a Data Model heading', () => {
      expect(content).toMatch(/^# Data Model:/m);
    });
  });

  // @req FR:feature-context/data-model.entities
  describe('FR:data-model.entities: Entities section', () => {
    it('should include Entities section', () => {
      expect(content).toMatch(/^## Entities/m);
    });

    it('should include entity-name sub-heading pattern', () => {
      expect(content).toMatch(/^### \{entity-name\}/m);
    });

    it('should include guidance for purpose, fields, relationships, and validation', () => {
      const entitiesSection = content.split('## Entities')[1]?.split(/^## /m)[0] || '';
      expect(entitiesSection).toMatch(/fields/i);
      expect(entitiesSection).toMatch(/relationships/i);
      expect(entitiesSection).toMatch(/validation/i);
    });
  });

  // @req FR:feature-context/data-model.lightweight
  describe('FR:data-model.lightweight: Lightweight prose definitions', () => {
    it('should guide toward prose definitions, not code', () => {
      const entitiesSection = content.split('## Entities')[1]?.split(/^## /m)[0] || '';
      expect(entitiesSection).toMatch(/prose/i);
    });
  });

  // @req FR:feature-context/data-model.references
  describe('FR:data-model.references: Referenced Entities section', () => {
    it('should include Referenced Entities section', () => {
      expect(content).toMatch(/^## Referenced Entities/m);
    });

    it('should link to other features data models', () => {
      const referencedSection = content.split('## Referenced Entities')[1] || '';
      expect(referencedSection).toMatch(/data-model/i);
    });
  });

  // @req FR:feature-context/data-model.frontmatter
  describe('FR:data-model.frontmatter: Frontmatter with feature field', () => {
    it('should have frontmatter', () => {
      expect(content).toMatch(/^---$/m);
    });

    it('should include feature field in frontmatter', () => {
      const frontmatter = content.split('---')[1] || '';
      expect(frontmatter).toMatch(/^feature:/m);
    });
  });
});
