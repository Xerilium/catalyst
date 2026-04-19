import fs from 'fs';
import path from 'path';

describe('customer-journey.md template validation', () => {
  const templatePath = path.join(__dirname, '../../src/resources/templates/specs/customer-journey.md');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(templatePath, 'utf-8');
  });

  // @req FR:product-context/journey.output
  it('should exist at the required output path', () => {
    expect(fs.existsSync(templatePath)).toBe(true);
  });

  // @req FR:product-context/journey.location
  it('should be referenced from product.md template at the expected project-root location', () => {
    const productTemplatePath = path.join(__dirname, '../../src/resources/templates/specs/product.md');
    const productContent = fs.readFileSync(productTemplatePath, 'utf-8');
    expect(productContent).toMatch(/customer-journey\.md/);
  });

  // @req FR:product-context/journey.template
  describe('FR:journey.template: Template standard compliance', () => {
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
      expect(content).toMatch(/^# /m);
      expect(content).toMatch(/^## /m);
    });
  });

  // @req FR:product-context/journey.structure
  describe('FR:journey.structure: Multi-journey structure', () => {
    it('should guide the author to include a title as H1', () => {
      expect(content).toMatch(/^# [A-Z]/m);
    });

    it('should instruct the author to include a textual description per journey', () => {
      expect(content).toMatch(/descri(be|ption)/i);
    });

    it('should include a mermaid sequenceDiagram placeholder', () => {
      expect(content).toMatch(/mermaid/i);
      expect(content).toMatch(/sequenceDiagram/);
    });

    it('should support multiple named journeys in one file', () => {
      expect(content).toMatch(/multiple|each journey|per journey|one or more/i);
    });

    it('should have at least one H2 journey section as example or placeholder', () => {
      const h2Matches = content.match(/^## /gm) || [];
      expect(h2Matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('NFR:reliability: Template reliability', () => {
    // @req NFR:product-context/reliability.syntax
    it('should use standard markdown syntax', () => {
      expect(content).toMatch(/^# /m);
      expect(content).toMatch(/^## /m);
    });

    // @req NFR:product-context/reliability.structure
    it('should have consistent instruction block format', () => {
      const instructions = content.match(/> \[INSTRUCTIONS\]/g) || [];
      expect(instructions.length).toBeGreaterThan(0);
    });

    it('should use consistent placeholder format if any placeholders exist', () => {
      const placeholders = content.match(/\{[^}]+\}/g) || [];
      placeholders.forEach(placeholder => {
        const inner = placeholder.slice(1, -1);
        expect(inner).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      });
    });
  });
});
