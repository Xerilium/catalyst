/**
 * Smoke tests for I/O actions
 *
 * Quick validation tests to ensure basic functionality works
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { FileReadAction } from '../../../../src/playbooks/scripts/playbooks/actions/io/file/read-action';
import { FileWriteAction } from '../../../../src/playbooks/scripts/playbooks/actions/io/file/write-action';
import { HttpGetAction } from '../../../../src/playbooks/scripts/playbooks/actions/io/http/get-action';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('I/O Actions Smoke Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'io-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('File Write Action', () => {
    it('should write a simple text file', async () => {
      const action = new FileWriteAction();
      const filePath = path.join(tempDir, 'test.txt');

      const result = await action.execute({
        path: filePath,
        content: 'Hello, World!'
      });

      expect(result.code).toBe('Success');
      expect(result.error).toBeUndefined();
      expect(result.value).toHaveProperty('path', filePath);
      expect(result.value).toHaveProperty('bytesWritten');

      // Verify file was actually written
      const fileContent = await fs.readFile(filePath, 'utf8');
      expect(fileContent).toBe('Hello, World!');
    });

    it('should write a markdown file with front matter', async () => {
      const action = new FileWriteAction();
      const filePath = path.join(tempDir, 'doc.md');

      const result = await action.execute({
        path: filePath,
        content: '# Hello\n\nContent here',
        frontMatter: {
          title: 'Test Document',
          author: 'Test Author'
        }
      });

      expect(result.code).toBe('Success');

      // Verify front matter was added
      const fileContent = await fs.readFile(filePath, 'utf8');
      expect(fileContent).toContain('---\n');
      expect(fileContent).toContain('title: Test Document');
      expect(fileContent).toContain('author: Test Author');
      expect(fileContent).toContain('# Hello');
    });

    it('should apply replace dictionary', async () => {
      const action = new FileWriteAction();
      const filePath = path.join(tempDir, 'template.txt');

      const result = await action.execute({
        path: filePath,
        content: 'Hello {name}, welcome to {place}!',
        replace: {
          '{name}': 'Alice',
          '{place}': 'Wonderland'
        }
      });

      expect(result.code).toBe('Success');

      const fileContent = await fs.readFile(filePath, 'utf8');
      expect(fileContent).toBe('Hello Alice, welcome to Wonderland!');
    });
  });

  describe('File Read Action', () => {
    it('should read a text file', async () => {
      const filePath = path.join(tempDir, 'read-test.txt');
      await fs.writeFile(filePath, 'Test content', 'utf8');

      const action = new FileReadAction();
      const result = await action.execute({
        path: filePath,
        encoding: 'utf8'
      });

      expect(result.code).toBe('Success');
      expect(result.error).toBeUndefined();
      expect(result.value).toBe('Test content');
    });

    it('should return error for missing file', async () => {
      const action = new FileReadAction();
      const result = await action.execute({
        path: path.join(tempDir, 'nonexistent.txt')
      });

      expect(result.code).toBe('FileNotFound');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('File not found');
    });

    it('should reject directory traversal attempts', async () => {
      const action = new FileReadAction();
      const result = await action.execute({
        path: '../../../etc/passwd'
      });

      expect(result.code).toBe('FileInvalidPath');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('directory traversal');
    });
  });

  describe('HTTP GET Action', () => {
    it('should make a successful GET request', async () => {
      const action = new HttpGetAction();

      // Use a reliable test endpoint
      const result = await action.execute({
        url: 'https://httpbin.org/get',
        timeout: 10000,
        retries: 2
      });

      expect(result.code).toBe('Success');
      expect(result.error).toBeUndefined();
      expect(result.value).toHaveProperty('status', 200);
      expect(result.value).toHaveProperty('body');
      expect(result.value).toHaveProperty('headers');
    });

    it('should handle 404 errors', async () => {
      const action = new HttpGetAction();

      const result = await action.execute({
        url: 'https://httpbin.org/status/404',
        timeout: 10000,
        retries: 0 // Don't retry 404s
      });

      expect(result.code).toBe('HttpInvalidStatus');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('status 404');
    });

    it('should handle invalid URLs', async () => {
      const action = new HttpGetAction();

      const result = await action.execute({
        url: 'not-a-valid-url'
      });

      expect(result.code).toBe('HttpConfigInvalid');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Invalid URL');
    });
  });
});
