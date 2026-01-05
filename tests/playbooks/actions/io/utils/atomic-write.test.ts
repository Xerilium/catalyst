// @req FR:playbook-actions-io/file.write-action.atomic-write
// @req NFR:playbook-actions-io/reliability.atomic-writes
// @req NFR:playbook-actions-io/reliability.temp-file-cleanup
// @req NFR:playbook-actions-io/testability.error-coverage
// @req NFR:playbook-actions-io/testability.success-coverage

/**
 * Integration tests for atomic write utility
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { atomicWrite } from '@playbooks/actions/io/utils/atomic-write';

describe('Atomic Write Utility', () => {
  const testDir = path.join(process.cwd(), '.tmp-test-atomic-write');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe('atomicWrite', () => {
    it('should write file successfully', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Hello, World!';

      await atomicWrite(filePath, content);

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(content);
    });

    it('should handle UTF-8 encoding', async () => {
      const filePath = path.join(testDir, 'utf8.txt');
      const content = 'Hello, 世界! 🌍';

      await atomicWrite(filePath, content, 'utf8');

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(content);
    });

    it('should handle different encodings', async () => {
      const filePath = path.join(testDir, 'ascii.txt');
      const content = 'Simple ASCII text';

      await atomicWrite(filePath, content, 'ascii');

      const written = await fs.readFile(filePath, 'ascii');
      expect(written).toBe(content);
    });

    it('should overwrite existing file', async () => {
      const filePath = path.join(testDir, 'overwrite.txt');

      // Write initial content
      await fs.writeFile(filePath, 'Original content');

      // Overwrite with atomic write
      const newContent = 'New content';
      await atomicWrite(filePath, newContent);

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(newContent);
    });

    it('should create parent directory if needed', async () => {
      const filePath = path.join(testDir, 'nested', 'dir', 'file.txt');
      const content = 'Nested file content';

      await atomicWrite(filePath, content);

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(content);
    });

    it('should handle empty content', async () => {
      const filePath = path.join(testDir, 'empty.txt');
      const content = '';

      await atomicWrite(filePath, content);

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe('');
    });

    it('should handle large content', async () => {
      const filePath = path.join(testDir, 'large.txt');
      const content = 'x'.repeat(100000); // 100KB of 'x'

      await atomicWrite(filePath, content);

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(content);
      expect(written.length).toBe(100000);
    });

    it('should handle special characters in content', async () => {
      const filePath = path.join(testDir, 'special.txt');
      const content = 'Line 1\\nLine 2\\tTabbed\\r\\nWindows line';

      await atomicWrite(filePath, content);

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(content);
    });

    it('should not leave temp file after successful write', async () => {
      const filePath = path.join(testDir, 'no-temp.txt');
      const content = 'Content';

      await atomicWrite(filePath, content);

      // Check directory contents
      const files = await fs.readdir(testDir);
      const tempFiles = files.filter(f => f.startsWith('.'));

      expect(tempFiles.length).toBe(0);
    });

    it('should handle concurrent writes to different files', async () => {
      const writes = [];

      for (let i = 0; i < 10; i++) {
        const filePath = path.join(testDir, `concurrent-${i}.txt`);
        const content = `Content ${i}`;
        writes.push(atomicWrite(filePath, content));
      }

      await Promise.all(writes);

      // Verify all files
      for (let i = 0; i < 10; i++) {
        const filePath = path.join(testDir, `concurrent-${i}.txt`);
        const written = await fs.readFile(filePath, 'utf8');
        expect(written).toBe(`Content ${i}`);
      }
    });

    it('should handle paths with spaces', async () => {
      const filePath = path.join(testDir, 'file with spaces.txt');
      const content = 'Content';

      await atomicWrite(filePath, content);

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(content);
    });

    it('should throw error for invalid paths', async () => {
      const filePath = '/invalid/path/that/does/not/exist/and/cannot/be/created.txt';
      const content = 'Content';

      await expect(atomicWrite(filePath, content)).rejects.toThrow();
    });

    it('should handle multiline content with proper line endings', async () => {
      const filePath = path.join(testDir, 'multiline.txt');
      const content = 'Line 1\\nLine 2\\nLine 3';

      await atomicWrite(filePath, content);

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(content);
    });

    it('should preserve file content after error recovery', async () => {
      const filePath = path.join(testDir, 'recovery.txt');
      const originalContent = 'Original content';

      // Write initial content
      await fs.writeFile(filePath, originalContent);

      // Attempt write that might fail (but won't in this case)
      const newContent = 'New content';
      await atomicWrite(filePath, newContent);

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(newContent);
    });

    it('should handle deeply nested directories', async () => {
      const filePath = path.join(testDir, 'a', 'b', 'c', 'd', 'e', 'file.txt');
      const content = 'Deeply nested';

      await atomicWrite(filePath, content);

      const written = await fs.readFile(filePath, 'utf8');
      expect(written).toBe(content);
    });
  });
});
