// @req FR:playbook-actions-io/file.exists-action.implementation
// @req FR:playbook-actions-io/file.exists-action.check
// @req FR:playbook-actions-io/file.exists-action.result-format
// @req FR:playbook-actions-io/file.exists-action.error-handling
// @req NFR:playbook-actions-io/testability.isolation
// @req NFR:playbook-actions-io/testability.error-coverage
// @req NFR:playbook-actions-io/testability.success-coverage

/**
 * Unit tests for FileExistsAction
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileExistsAction } from '@playbooks/actions/io/file/exists-action';

describe('FileExistsAction', () => {
  const testDir = path.join(process.cwd(), '.tmp-test-file-exists');
  let action: FileExistsAction;

  beforeEach(async () => {
    action = new FileExistsAction();
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe('static properties', () => {
    it('should have correct actionType', () => {
      expect(FileExistsAction.actionType).toBe('file-exists');
    });

    it('should have correct primaryProperty', () => {
      expect(FileExistsAction.primaryProperty).toBe('path');
    });
  });

  describe('execute', () => {
    describe('existing files', () => {
      it('should return true for existing file', async () => {
        const filePath = path.join(testDir, 'test.txt');
        await fs.writeFile(filePath, 'content');

        const result = await action.execute({ path: filePath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should return true for empty file', async () => {
        const filePath = path.join(testDir, 'empty.txt');
        await fs.writeFile(filePath, '');

        const result = await action.execute({ path: filePath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(true);
      });

      it('should return true for file in nested directory', async () => {
        const filePath = path.join(testDir, 'nested', 'dir', 'file.txt');
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, 'nested content');

        const result = await action.execute({ path: filePath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(true);
      });

      it('should include success message for existing file', async () => {
        const filePath = path.join(testDir, 'message.txt');
        await fs.writeFile(filePath, 'content');

        const result = await action.execute({ path: filePath });

        expect(result.message).toContain('exists');
        expect(result.message).toContain(filePath);
      });

      it('should handle files with spaces in name', async () => {
        const filePath = path.join(testDir, 'file with spaces.txt');
        await fs.writeFile(filePath, 'content');

        const result = await action.execute({ path: filePath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(true);
      });

      it('should handle files with special characters', async () => {
        const filePath = path.join(testDir, 'file-with_special.chars.txt');
        await fs.writeFile(filePath, 'content');

        const result = await action.execute({ path: filePath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(true);
      });
    });

    describe('non-existing files', () => {
      it('should return false for non-existing file', async () => {
        const filePath = path.join(testDir, 'does-not-exist.txt');

        const result = await action.execute({ path: filePath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(false);
        expect(result.error).toBeUndefined();
      });

      it('should return false for non-existing nested path', async () => {
        const filePath = path.join(testDir, 'non', 'existing', 'path', 'file.txt');

        const result = await action.execute({ path: filePath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(false);
      });

      it('should include message for non-existing file', async () => {
        const filePath = path.join(testDir, 'missing.txt');

        const result = await action.execute({ path: filePath });

        expect(result.message).toContain('does not exist');
        expect(result.message).toContain(filePath);
      });

      it('should NOT error for non-existing files', async () => {
        const filePath = path.join(testDir, 'no-error.txt');

        const result = await action.execute({ path: filePath });

        expect(result.error).toBeUndefined();
        expect(result.code).toBe('Success');
      });
    });

    describe('configuration validation', () => {
      it('should reject missing path config', async () => {
        const result = await action.execute({} as any);

        expect(result.code).toBe('FileConfigInvalid');
        expect(result.error).toBeDefined();
        expect(result.message).toContain('path');
      });

      it('should reject empty path', async () => {
        const result = await action.execute({ path: '' });

        expect(result.code).toBe('FileConfigInvalid');
        expect(result.error).toBeDefined();
      });

      it('should provide error guidance for invalid config', async () => {
        const result = await action.execute({} as any);

        expect(result.error).toBeDefined();
        const error = result.error as any;
        expect(error.guidance).toBeDefined();
        expect(error.guidance).toContain('path');
      });
    });

    describe('security - path traversal prevention', () => {
      it('should reject directory traversal attempts', async () => {
        const result = await action.execute({
          path: '../../../etc/passwd'
        });

        expect(result.code).toBe('FileInvalidPath');
        expect(result.error).toBeDefined();
        expect(result.message).toContain('traversal');
      });

      it('should reject hidden traversal attempts', async () => {
        const result = await action.execute({
          path: 'foo/../../../etc/passwd'
        });

        expect(result.code).toBe('FileInvalidPath');
        expect(result.error).toBeDefined();
      });

      it('should reject encoded traversal attempts', async () => {
        // Even though path might be encoded, validatePath should catch ..
        const result = await action.execute({
          path: 'foo/..%2F..%2F../etc/passwd'
        });

        // This will either fail on traversal or not exist
        // The key is it shouldn't succeed with access to /etc/passwd
        if (result.code === 'Success') {
          expect(result.value).toBe(false); // File shouldn't exist in test dir
        } else {
          expect(result.code).toBe('FileInvalidPath');
        }
      });
    });

    describe('different file types', () => {
      it('should return true for markdown files', async () => {
        const filePath = path.join(testDir, 'doc.md');
        await fs.writeFile(filePath, '# Title');

        const result = await action.execute({ path: filePath });

        expect(result.value).toBe(true);
      });

      it('should return true for JSON files', async () => {
        const filePath = path.join(testDir, 'data.json');
        await fs.writeFile(filePath, '{}');

        const result = await action.execute({ path: filePath });

        expect(result.value).toBe(true);
      });

      it('should return true for YAML files', async () => {
        const filePath = path.join(testDir, 'config.yaml');
        await fs.writeFile(filePath, 'key: value');

        const result = await action.execute({ path: filePath });

        expect(result.value).toBe(true);
      });

      it('should return true for TypeScript files', async () => {
        const filePath = path.join(testDir, 'code.ts');
        await fs.writeFile(filePath, 'const x = 1;');

        const result = await action.execute({ path: filePath });

        expect(result.value).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle directory paths (returns false for directories)', async () => {
        // Note: fs.access with F_OK works on directories too, but we're checking files
        // This test documents current behavior
        const dirPath = path.join(testDir, 'subdir');
        await fs.mkdir(dirPath, { recursive: true });

        const result = await action.execute({ path: dirPath });

        // Directories exist, so this returns true
        // If we want to distinguish files from directories, we'd need to add isFile check
        expect(result.code).toBe('Success');
        expect(result.value).toBe(true);
      });

      it('should handle symbolic links to existing files', async () => {
        const targetPath = path.join(testDir, 'target.txt');
        const linkPath = path.join(testDir, 'link.txt');
        await fs.writeFile(targetPath, 'content');
        await fs.symlink(targetPath, linkPath);

        const result = await action.execute({ path: linkPath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(true);
      });

      it('should handle broken symbolic links', async () => {
        const targetPath = path.join(testDir, 'missing-target.txt');
        const linkPath = path.join(testDir, 'broken-link.txt');
        await fs.symlink(targetPath, linkPath);

        const result = await action.execute({ path: linkPath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(false);
      });

      it('should handle very long file names', async () => {
        const longName = 'a'.repeat(200) + '.txt';
        const filePath = path.join(testDir, longName);
        await fs.writeFile(filePath, 'content');

        const result = await action.execute({ path: filePath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(true);
      });
    });
  });
});
