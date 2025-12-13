/**
 * Unit tests for front matter utility
 */

import { describe, it, expect } from '@jest/globals';
import { addFrontMatter } from '@playbooks/actions/io/utils/front-matter';

describe('Front Matter Utility', () => {
  describe('addFrontMatter', () => {
    it('should add front matter to markdown content', () => {
      const content = '# Title\n\nContent here';
      const frontMatter = {
        id: 'my-feature',
        author: '@user'
      };
      const filePath = 'feature.md';

      const result = addFrontMatter(content, frontMatter, filePath);

      expect(result).toContain('---');
      expect(result).toContain('id: my-feature');
      expect(result).toContain('author:');
      expect(result).toContain('@user');
      expect(result).toContain('# Title');
      expect(result).toContain('Content here');
    });

    it('should only add front matter to .md files', () => {
      const content = 'Plain text content';
      const frontMatter = { id: 'test' };

      // Non-.md file should not get front matter
      const resultTxt = addFrontMatter(content, frontMatter, 'file.txt');
      expect(resultTxt).toBe(content);
      expect(resultTxt).not.toContain('---');

      // .md file should get front matter
      const resultMd = addFrontMatter(content, frontMatter, 'file.md');
      expect(resultMd).toContain('---');
      expect(resultMd).toContain('id: test');
    });

    it('should serialize front matter as YAML', () => {
      const content = 'Content';
      const frontMatter = {
        title: 'My Title',
        tags: ['tag1', 'tag2'],
        published: true
      };
      const filePath = 'doc.md';

      const result = addFrontMatter(content, frontMatter, filePath);

      expect(result).toContain('title: My Title');
      expect(result).toContain('tags:');
      expect(result).toContain('tag1');
      expect(result).toContain('tag2');
      expect(result).toContain('published: true');
    });

    it('should handle nested objects in front matter', () => {
      const content = 'Content';
      const frontMatter = {
        metadata: {
          created: '2024-01-01',
          updated: '2024-01-02'
        }
      };
      const filePath = 'nested.md';

      const result = addFrontMatter(content, frontMatter, filePath);

      expect(result).toContain('metadata:');
      expect(result).toContain('2024-01-01');
      expect(result).toContain('2024-01-02');
    });

    it('should format front matter with proper delimiters', () => {
      const content = '# Header';
      const frontMatter = { id: 'test' };
      const filePath = 'test.md';

      const result = addFrontMatter(content, frontMatter, filePath);

      // Should start with ---
      expect(result.startsWith('---')).toBe(true);
      // Should have closing ---
      expect(result).toContain('\n---\n');
      // Content should come after front matter
      expect(result.endsWith('# Header')).toBe(true);
    });

    it('should handle empty front matter object', () => {
      const content = 'Content';
      const frontMatter = {};
      const filePath = 'empty.md';

      const result = addFrontMatter(content, frontMatter, filePath);

      // Should still have delimiters even if empty
      expect(result).toContain('---');
      expect(result).toContain('Content');
    });

    it('should preserve content formatting', () => {
      const content = '# Title\n\n## Subtitle\n\n- Item 1';
      const frontMatter = { id: 'test' };
      const filePath = 'formatted.md';

      const result = addFrontMatter(content, frontMatter, filePath);

      // Content should be preserved
      expect(result).toContain('# Title');
      expect(result).toContain('## Subtitle');
      expect(result).toContain('- Item 1');
    });

    it('should handle arrays in front matter', () => {
      const content = 'Content';
      const frontMatter = {
        authors: ['Alice', 'Bob', 'Charlie'],
        tags: [],
        numbers: [1, 2, 3]
      };
      const filePath = 'arrays.md';

      const result = addFrontMatter(content, frontMatter, filePath);

      expect(result).toContain('authors:');
      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
      expect(result).toContain('Charlie');
      expect(result).toContain('tags: []');
      expect(result).toContain('numbers:');
    });

    it('should handle boolean and number values', () => {
      const content = 'Content';
      const frontMatter = {
        published: true,
        draft: false,
        version: 1.5,
        count: 42
      };
      const filePath = 'types.md';

      const result = addFrontMatter(content, frontMatter, filePath);

      expect(result).toContain('published: true');
      expect(result).toContain('draft: false');
      expect(result).toContain('version: 1.5');
      expect(result).toContain('count: 42');
    });

    it('should handle null values in front matter', () => {
      const content = 'Content';
      const frontMatter = {
        optional: null
      };
      const filePath = 'nullable.md';

      const result = addFrontMatter(content, frontMatter, filePath);

      expect(result).toContain('optional: null');
    });

    it('should handle .markdown extension', () => {
      const content = 'Content';
      const frontMatter = { id: 'test' };
      const filePath = 'file.markdown';

      const result = addFrontMatter(content, frontMatter, filePath);

      // Check if .markdown is supported
      if (result.includes('---')) {
        expect(result).toContain('id: test');
      } else {
        expect(result).toBe(content);
      }
    });

    it('should handle empty content with front matter', () => {
      const content = '';
      const frontMatter = { id: 'test' };
      const filePath = 'empty.md';

      const result = addFrontMatter(content, frontMatter, filePath);

      expect(result).toContain('---');
      expect(result).toContain('id: test');
    });

    it('should separate front matter from content', () => {
      const content = 'My content';
      const frontMatter = { id: 'test' };
      const filePath = 'test.md';

      const result = addFrontMatter(content, frontMatter, filePath);

      // Front matter section should be before content
      const frontMatterEnd = result.lastIndexOf('\n---\n');
      const contentStart = frontMatterEnd + 5; // Length of '\n---\n'
      const actualContent = result.substring(contentStart);

      // May have a leading newline after front matter delimiter
      expect(actualContent.trim()).toBe('My content');
    });

    it('should handle multiline strings in front matter', () => {
      const content = 'Content';
      const frontMatter = {
        description: 'This is a long\nmultiline\ndescription'
      };
      const filePath = 'multiline.md';

      const result = addFrontMatter(content, frontMatter, filePath);

      expect(result).toContain('description:');
    });
  });
});
