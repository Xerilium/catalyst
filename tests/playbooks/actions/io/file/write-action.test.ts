// @req FR:playbook-actions-io/file.write-action.implementation
// @req FR:playbook-actions-io/file.write-action.atomic-write
// @req FR:playbook-actions-io/file.write-action.content-processing
// @req FR:playbook-actions-io/file.write-action.error-handling
// @req NFR:playbook-actions-io/testability.isolation
// @req NFR:playbook-actions-io/testability.error-coverage
// @req NFR:playbook-actions-io/testability.success-coverage

/**
 * Unit tests for FileWriteAction
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileWriteAction } from '@playbooks/actions/io/file/write-action';

describe('FileWriteAction', () => {
  const testDir = path.join(process.cwd(), '.tmp-test-file-write');
  let action: FileWriteAction;

  beforeEach(async () => {
    action = new FileWriteAction();
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe('execute', () => {
    it('should write file successfully', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Hello, World!';

      const result = await action.execute({
        path: filePath,
        content
      });

      expect(result.code).toBe('Success');
      expect(result.value).toEqual({
        path: filePath,
        bytesWritten: Buffer.byteLength(content)
      });
      expect(result.error).toBeUndefined();

      // Verify file was written
      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(content);
    });

    it('should handle UTF-8 encoding', async () => {
      const filePath = path.join(testDir, 'utf8.txt');
      const content = 'Hello, 世界! 🌍';

      const result = await action.execute({
        path: filePath,
        content,
        encoding: 'utf8'
      });

      expect(result.code).toBe('Success');

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(content);
    });

    it('should create parent directories', async () => {
      const filePath = path.join(testDir, 'nested', 'dir', 'file.txt');
      const content = 'Nested content';

      const result = await action.execute({
        path: filePath,
        content
      });

      expect(result.code).toBe('Success');

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(content);
    });

    it('should add front matter to markdown files', async () => {
      const filePath = path.join(testDir, 'doc.md');
      const content = '# Title\n\nContent';
      const frontMatter = {
        id: 'my-doc',
        author: '@user'
      };

      const result = await action.execute({
        path: filePath,
        content,
        frontMatter
      });

      expect(result.code).toBe('Success');

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toContain('---');
      expect(written).toContain('id: my-doc');
      expect(written).toContain('author');
      expect(written).toContain('# Title');
    });

    it('should not add front matter to non-markdown files', async () => {
      const filePath = path.join(testDir, 'doc.txt');
      const content = 'Plain text';
      const frontMatter = { id: 'test' };

      const result = await action.execute({
        path: filePath,
        content,
        frontMatter
      });

      expect(result.code).toBe('Success');

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(content);
      expect(written).not.toContain('---');
    });

    it('should apply replace dictionary', async () => {
      const filePath = path.join(testDir, 'replace.txt');
      const content = 'Hello {{name}}, welcome to {{place}}!';
      const replace = {
        '{{name}}': 'Alice',
        '{{place}}': 'Wonderland'
      };

      const result = await action.execute({
        path: filePath,
        content,
        replace
      });

      expect(result.code).toBe('Success');

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe('Hello Alice, welcome to Wonderland!');
    });

    it('should apply replace dictionary multiple times', async () => {
      const filePath = path.join(testDir, 'multiple.txt');
      const content = 'The {{word}} is {{word}} and {{word}}.';
      const replace = {
        '{{word}}': 'answer'
      };

      const result = await action.execute({
        path: filePath,
        content,
        replace
      });

      expect(result.code).toBe('Success');

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe('The answer is answer and answer.');
    });

    it('should apply both front matter and replace', async () => {
      const filePath = path.join(testDir, 'combined.md');
      const content = '# {{title}}\n\nContent here';
      const frontMatter = { id: 'test' };
      const replace = {
        '{{title}}': 'My Title'
      };

      const result = await action.execute({
        path: filePath,
        content,
        frontMatter,
        replace
      });

      expect(result.code).toBe('Success');

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toContain('id: test');
      expect(written).toContain('# My Title');
    });

    it('should handle empty content', async () => {
      const filePath = path.join(testDir, 'empty.txt');
      const content = '';

      const result = await action.execute({
        path: filePath,
        content
      });

      expect(result.code).toBe('Success');
      expect(result.value).toEqual({
        path: filePath,
        bytesWritten: 0
      });
    });

    it('should overwrite existing files', async () => {
      const filePath = path.join(testDir, 'overwrite.txt');
      await fs.writeFile(filePath, 'Original content');

      const newContent = 'New content';
      const result = await action.execute({
        path: filePath,
        content: newContent
      });

      expect(result.code).toBe('Success');

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(newContent);
    });

    it('should reject missing path config', async () => {
      const result = await action.execute({ content: 'test' } as any);

      expect(result.code).toBe('FileConfigInvalid');
      expect(result.error).toBeDefined();
      expect(result.message).toContain('path');
    });

    it('should reject missing content config', async () => {
      const result = await action.execute({ path: 'test.txt' } as any);

      expect(result.code).toBe('FileConfigInvalid');
      expect(result.error).toBeDefined();
      expect(result.message).toContain('content');
    });

    it('should reject directory traversal attempts', async () => {
      const result = await action.execute({
        path: '../../../etc/passwd',
        content: 'malicious'
      });

      expect(result.code).toBe('FileInvalidPath');
      expect(result.error).toBeDefined();
    });

    it('should include success message', async () => {
      const filePath = path.join(testDir, 'message.txt');
      const content = 'content';

      const result = await action.execute({
        path: filePath,
        content
      });

      expect(result.message).toContain('Successfully wrote');
      expect(result.message).toContain('bytes');
      expect(result.message).toContain(filePath);
    });

    it('should handle paths with spaces', async () => {
      const filePath = path.join(testDir, 'file with spaces.txt');
      const content = 'Content';

      const result = await action.execute({
        path: filePath,
        content
      });

      expect(result.code).toBe('Success');

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(content);
    });

    it('should handle special characters in content', async () => {
      const filePath = path.join(testDir, 'special.txt');
      const content = 'Special: \t\n\r quotes"\'';

      const result = await action.execute({
        path: filePath,
        content
      });

      expect(result.code).toBe('Success');

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(content);
    });

    it('should provide error guidance for invalid config', async () => {
      const result = await action.execute({} as any);

      expect(result.error).toBeDefined();
      const error = result.error as any;
      expect(error.guidance).toBeDefined();
    });

    it('should handle large content', async () => {
      const filePath = path.join(testDir, 'large.txt');
      const content = 'x'.repeat(100000);

      const result = await action.execute({
        path: filePath,
        content
      });

      expect(result.code).toBe('Success');
      expect((result.value as any)?.bytesWritten).toBe(100000);
    });

    it('should handle multiline content', async () => {
      const filePath = path.join(testDir, 'multiline.txt');
      const content = 'Line 1\nLine 2\nLine 3';

      const result = await action.execute({
        path: filePath,
        content
      });

      expect(result.code).toBe('Success');

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(content);
    });

    it('should handle replace with regex special characters', async () => {
      const filePath = path.join(testDir, 'regex.txt');
      const content = 'Value: $100 and $200';
      const replace = {
        '$100': '€85',
        '$200': '€170'
      };

      const result = await action.execute({
        path: filePath,
        content,
        replace
      });

      expect(result.code).toBe('Success');

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe('Value: €85 and €170');
    });

    it('should use default encoding if not specified', async () => {
      const filePath = path.join(testDir, 'default.txt');
      const content = 'Default encoding';

      const result = await action.execute({
        path: filePath,
        content
      });

      expect(result.code).toBe('Success');

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(content);
    });

    it('should return bytes written in result', async () => {
      const filePath = path.join(testDir, 'bytes.txt');
      const content = 'test content';

      const result = await action.execute({
        path: filePath,
        content
      });

      expect((result.value as any)?.bytesWritten).toBe(Buffer.byteLength(content));
    });
  });
});
