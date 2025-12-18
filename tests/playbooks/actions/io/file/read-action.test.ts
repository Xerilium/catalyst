// @req FR:playbook-actions-io/file.read-action.implementation
// @req FR:playbook-actions-io/file.read-action.file-reading
// @req FR:playbook-actions-io/file.read-action.error-handling
// @req NFR:playbook-actions-io/testability.isolation
// @req NFR:playbook-actions-io/testability.error-coverage
// @req NFR:playbook-actions-io/testability.success-coverage

/**
 * Unit tests for FileReadAction
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileReadAction } from '@playbooks/actions/io/file/read-action';

describe('FileReadAction', () => {
  const testDir = path.join(process.cwd(), '.tmp-test-file-read');
  let action: FileReadAction;

  beforeEach(async () => {
    action = new FileReadAction();
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
    it('should read file successfully', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Hello, World!';
      await fs.writeFile(filePath, content);

      const result = await action.execute({ path: filePath });

      expect(result.code).toBe('Success');
      expect(result.value).toBe(content);
      expect(result.error).toBeUndefined();
    });

    it('should handle UTF-8 encoding', async () => {
      const filePath = path.join(testDir, 'utf8.txt');
      const content = 'Hello, 世界! 🌍';
      await fs.writeFile(filePath, content, 'utf8');

      const result = await action.execute({
        path: filePath,
        encoding: 'utf8'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe(content);
    });

    it('should handle different encodings', async () => {
      const filePath = path.join(testDir, 'ascii.txt');
      const content = 'Simple ASCII text';
      await fs.writeFile(filePath, content, 'ascii');

      const result = await action.execute({
        path: filePath,
        encoding: 'ascii'
      });

      expect(result.code).toBe('Success');
      expect(result.value).toBe(content);
    });

    it('should include success message', async () => {
      const filePath = path.join(testDir, 'message.txt');
      await fs.writeFile(filePath, 'content');

      const result = await action.execute({ path: filePath });

      expect(result.message).toContain('Successfully read');
      expect(result.message).toContain(filePath);
    });

    it('should handle empty files', async () => {
      const filePath = path.join(testDir, 'empty.txt');
      await fs.writeFile(filePath, '');

      const result = await action.execute({ path: filePath });

      expect(result.code).toBe('Success');
      expect(result.value).toBe('');
    });

    it('should handle large files', async () => {
      const filePath = path.join(testDir, 'large.txt');
      const content = 'x'.repeat(100000);
      await fs.writeFile(filePath, content);

      const result = await action.execute({ path: filePath });

      expect(result.code).toBe('Success');
      expect(result.value).toBe(content);
    });

    it('should handle multiline content', async () => {
      const filePath = path.join(testDir, 'multiline.txt');
      const content = 'Line 1\nLine 2\nLine 3';
      await fs.writeFile(filePath, content);

      const result = await action.execute({ path: filePath });

      expect(result.code).toBe('Success');
      expect(result.value).toBe(content);
    });

    it('should handle files in nested directories', async () => {
      const filePath = path.join(testDir, 'nested', 'dir', 'file.txt');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, 'nested content');

      const result = await action.execute({ path: filePath });

      expect(result.code).toBe('Success');
      expect(result.value).toBe('nested content');
    });

    it('should reject missing path config', async () => {
      const result = await action.execute({} as any);

      expect(result.code).toBe('FileConfigInvalid');
      expect(result.error).toBeDefined();
      expect(result.message).toContain('path');
    });

    it('should reject directory traversal attempts', async () => {
      const result = await action.execute({
        path: '../../../etc/passwd'
      });

      expect(result.code).toBe('FileInvalidPath');
      expect(result.error).toBeDefined();
      expect(result.message).toContain('traversal');
    });

    it('should handle non-existent files', async () => {
      const filePath = path.join(testDir, 'does-not-exist.txt');

      const result = await action.execute({ path: filePath });

      expect(result.code).toBe('FileNotFound');
      expect(result.error).toBeDefined();
    });

    it('should handle permission errors', async () => {
      // This test is platform-dependent and may not work on all systems
      const filePath = '/root/protected-file.txt';

      const result = await action.execute({ path: filePath });

      // Will be FileNotFound since the file doesn't exist
      expect(['FileNotFound', 'FileReadFailed']).toContain(result.code);
      expect(result.error).toBeDefined();
    });

    it('should use default encoding if not specified', async () => {
      const filePath = path.join(testDir, 'default.txt');
      const content = 'Default encoding';
      await fs.writeFile(filePath, content);

      const result = await action.execute({ path: filePath });

      expect(result.code).toBe('Success');
      expect(result.value).toBe(content);
    });

    it('should handle paths with spaces', async () => {
      const filePath = path.join(testDir, 'file with spaces.txt');
      const content = 'Content';
      await fs.writeFile(filePath, content);

      const result = await action.execute({ path: filePath });

      expect(result.code).toBe('Success');
      expect(result.value).toBe(content);
    });

    it('should handle special characters in content', async () => {
      const filePath = path.join(testDir, 'special.txt');
      const content = 'Special: \t\n\r quotes"\'';
      await fs.writeFile(filePath, content);

      const result = await action.execute({ path: filePath });

      expect(result.code).toBe('Success');
      expect(result.value).toBe(content);
    });

    it('should provide error guidance for invalid config', async () => {
      const result = await action.execute({} as any);

      expect(result.error).toBeDefined();
      const error = result.error as any;
      expect(error.guidance).toBeDefined();
      expect(error.guidance).toContain('path');
    });

    it('should handle markdown files', async () => {
      const filePath = path.join(testDir, 'doc.md');
      const content = '# Title\n\nContent here';
      await fs.writeFile(filePath, content);

      const result = await action.execute({ path: filePath });

      expect(result.code).toBe('Success');
      expect(result.value).toBe(content);
    });

    it('should handle JSON files', async () => {
      const filePath = path.join(testDir, 'data.json');
      const content = '{"key": "value"}';
      await fs.writeFile(filePath, content);

      const result = await action.execute({ path: filePath });

      expect(result.code).toBe('Success');
      expect(result.value).toBe(content);
    });

    it('should include bytes read in message', async () => {
      const filePath = path.join(testDir, 'bytes.txt');
      const content = 'test content';
      await fs.writeFile(filePath, content);

      const result = await action.execute({ path: filePath });

      expect(result.message).toContain('bytes');
    });
  });
});
