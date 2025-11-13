/**
 * Unit tests for template operations
 * Tests T040-T043: Template functions
 */

import {
  readIssueTemplate,
  parseTemplateFrontmatter,
  replaceTemplatePlaceholders,
  createIssueFromTemplate,
} from '../../../src/playbooks/scripts/github/templates';

describe('Template Operations', () => {
  describe('readIssueTemplate()', () => {
    it('should read template file', async () => {
      const result = await readIssueTemplate('test-template');
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('frontmatter');
      expect(result.data).toHaveProperty('body');
    });

    it('should handle missing template', async () => {
      const result = await readIssueTemplate('nonexistent');
      expect(result.success).toBe(false);
    });
  });

  describe('parseTemplateFrontmatter()', () => {
    it('should parse YAML frontmatter', () => {
      const content = `---
title: Test Issue
labels: [bug, urgent]
---
Body content`;
      
      const result = parseTemplateFrontmatter(content);
      expect(result.frontmatter.title).toBe('Test Issue');
      expect(result.frontmatter.labels).toEqual(['bug', 'urgent']);
      expect(result.body).toBe('Body content');
    });

    it('should handle missing frontmatter', () => {
      const result = parseTemplateFrontmatter('Just body text');
      expect(result.frontmatter).toEqual({});
      expect(result.body).toBe('Just body text');
    });
  });

  describe('replaceTemplatePlaceholders()', () => {
    it('should replace placeholders', () => {
      const template = 'Hello {name}, welcome to {project}!';
      const replacements = { name: 'Alice', project: 'Catalyst' };
      
      const result = replaceTemplatePlaceholders(template, replacements);
      expect(result).toBe('Hello Alice, welcome to Catalyst!');
    });

    it('should handle missing replacements', () => {
      const template = 'Hello {name}!';
      const result = replaceTemplatePlaceholders(template, {});
      expect(result).toBe('Hello {name}!');
    });
  });

  describe('createIssueFromTemplate()', () => {
    it('should create issue from template with replacements', async () => {
      const result = await createIssueFromTemplate('init', { project: 'TestProject' });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('number');
    });
  });
});
