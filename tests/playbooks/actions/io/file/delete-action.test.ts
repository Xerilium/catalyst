// @req FR:playbook-actions-io/file.delete-action.implementation
// @req FR:playbook-actions-io/file.delete-action.deletion
// @req FR:playbook-actions-io/file.delete-action.result-format
// @req FR:playbook-actions-io/file.delete-action.error-handling
// @req NFR:playbook-actions-io/testability.isolation
// @req NFR:playbook-actions-io/testability.error-coverage
// @req NFR:playbook-actions-io/testability.success-coverage

/**
 * Unit tests for FileDeleteAction
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileDeleteAction } from '@playbooks/actions/io/file/delete-action';

describe('FileDeleteAction', () => {
  const testDir = path.join(process.cwd(), '.tmp-test-file-delete');
  let action: FileDeleteAction;

  beforeEach(async () => {
    action = new FileDeleteAction();
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
      expect(FileDeleteAction.actionType).toBe('file-delete');
    });

    it('should have correct primaryProperty', () => {
      expect(FileDeleteAction.primaryProperty).toBe('path');
    });
  });

  describe('execute', () => {
    describe('successful deletion', () => {
      it('should delete an existing file', async () => {
        const filePath = path.join(testDir, 'test.txt');
        await fs.writeFile(filePath, 'content');

        const result = await action.execute({ path: filePath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(true);
        expect(result.error).toBeUndefined();

        // Verify file is actually deleted
        await expect(fs.access(filePath)).rejects.toThrow();
      });

      it('should delete an empty file', async () => {
        const filePath = path.join(testDir, 'empty.txt');
        await fs.writeFile(filePath, '');

        const result = await action.execute({ path: filePath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(true);

        // Verify file is actually deleted
        await expect(fs.access(filePath)).rejects.toThrow();
      });

      it('should delete a file in nested directory', async () => {
        const filePath = path.join(testDir, 'nested', 'dir', 'file.txt');
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, 'nested content');

        const result = await action.execute({ path: filePath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(true);
        await expect(fs.access(filePath)).rejects.toThrow();
      });

      it('should include success message with file path', async () => {
        const filePath = path.join(testDir, 'message.txt');
        await fs.writeFile(filePath, 'content');

        const result = await action.execute({ path: filePath });

        expect(result.message).toContain('deleted');
        expect(result.message).toContain(filePath);

        // Verify file is actually deleted
        await expect(fs.access(filePath)).rejects.toThrow();
      });

      it('should handle files with spaces in name', async () => {
        const filePath = path.join(testDir, 'file with spaces.txt');
        await fs.writeFile(filePath, 'content');

        const result = await action.execute({ path: filePath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(true);
        await expect(fs.access(filePath)).rejects.toThrow();
      });

      it('should handle files with special characters', async () => {
        const filePath = path.join(testDir, 'file-with_special.chars.txt');
        await fs.writeFile(filePath, 'content');

        const result = await action.execute({ path: filePath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(true);
        await expect(fs.access(filePath)).rejects.toThrow();
      });
    });

    describe('non-existing files', () => {
      it('should return FileNotFound error for non-existing file', async () => {
        const filePath = path.join(testDir, 'does-not-exist.txt');

        const result = await action.execute({ path: filePath });

        expect(result.code).toBe('FileNotFound');
        expect(result.error).toBeDefined();
      });

      it('should return FileNotFound for non-existing nested path', async () => {
        const filePath = path.join(testDir, 'non', 'existing', 'path', 'file.txt');

        const result = await action.execute({ path: filePath });

        expect(result.code).toBe('FileNotFound');
        expect(result.error).toBeDefined();
      });

      it('should include path in error message', async () => {
        const filePath = path.join(testDir, 'missing.txt');

        const result = await action.execute({ path: filePath });

        expect(result.message).toContain(filePath);
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
    });

    describe('different file types', () => {
      it('should delete markdown files', async () => {
        const filePath = path.join(testDir, 'doc.md');
        await fs.writeFile(filePath, '# Title');

        const result = await action.execute({ path: filePath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(true);
      });

      it('should delete JSON files', async () => {
        const filePath = path.join(testDir, 'data.json');
        await fs.writeFile(filePath, '{}');

        const result = await action.execute({ path: filePath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(true);
      });

      it('should delete YAML files', async () => {
        const filePath = path.join(testDir, 'config.yaml');
        await fs.writeFile(filePath, 'key: value');

        const result = await action.execute({ path: filePath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle symbolic links', async () => {
        const targetPath = path.join(testDir, 'target.txt');
        const linkPath = path.join(testDir, 'link.txt');
        await fs.writeFile(targetPath, 'content');
        await fs.symlink(targetPath, linkPath);

        const result = await action.execute({ path: linkPath });

        expect(result.code).toBe('Success');
        expect(result.value).toBe(true);
        // Link should be removed but target should still exist
        await expect(fs.access(linkPath)).rejects.toThrow();
        await expect(fs.access(targetPath)).resolves.toBeUndefined();
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
