/**
 * Unit tests for path validation utility
 */

import { describe, it, expect } from '@jest/globals';
import * as path from 'path';
import {
  validatePath,
  isSafePath
} from '../../../../../src/playbooks/scripts/playbooks/actions/io/utils/path-validation';
import { CatalystError } from '../../../../../src/playbooks/scripts/errors';

describe('Path Validation Utility', () => {
  describe('validatePath', () => {
    it('should accept simple file paths', () => {
      const result = validatePath('file.txt');
      expect(result).toBeTruthy();
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should accept nested paths', () => {
      const result = validatePath('.xe/features/my-feature/spec.md');
      expect(result).toBeTruthy();
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should reject paths with directory traversal (..)', () => {
      expect(() => validatePath('../../../etc/passwd')).toThrow(CatalystError);
      expect(() => validatePath('foo/../../bar')).toThrow(CatalystError);
      expect(() => validatePath('./../secrets.txt')).toThrow(CatalystError);
    });

    it('should accept paths starting with ./ (current directory)', () => {
      const result = validatePath('./file.txt');
      expect(result).toBeTruthy();
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should normalize paths', () => {
      const result = validatePath('./foo//bar///baz.txt');
      expect(result).toBeTruthy();
      expect(result).not.toContain('//');
    });

    it('should return absolute paths', () => {
      const result = validatePath('relative/path/file.txt');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should throw CatalystError for traversal attacks', () => {
      const paths = [
        '../file.txt',
        'foo/../../../bar.txt',
        './foo/../../secrets.txt',
        'valid/path/../../../../../../etc/passwd'
      ];

      for (const testPath of paths) {
        expect(() => validatePath(testPath)).toThrow(CatalystError);
      }
    });

    it('should include error code in exception', () => {
      try {
        validatePath('../secret.txt');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        const catalystError = error as CatalystError;
        expect(catalystError.code).toBe('FileInvalidPath');
      }
    });

    it('should use custom error code when provided', () => {
      try {
        validatePath('../secret.txt', 'CustomPathError');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        const catalystError = error as CatalystError;
        expect(catalystError.code).toBe('CustomPathError');
      }
    });

    it('should provide helpful guidance in error', () => {
      try {
        validatePath('../../etc/passwd');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        const catalystError = error as CatalystError;
        expect(catalystError.guidance).toBeDefined();
        expect(catalystError.guidance).toContain('traversal');
      }
    });

    it('should accept absolute paths', () => {
      const absolutePath = path.resolve('/tmp/test.txt');
      const result = validatePath(absolutePath);
      expect(result).toBe(absolutePath);
    });

    it('should handle paths with special characters', () => {
      const specialPaths = [
        'file with spaces.txt',
        'file-with-dashes.txt',
        'file_with_underscores.txt',
        'file.multiple.dots.txt',
        '@special/folder/file.txt'
      ];

      for (const testPath of specialPaths) {
        const result = validatePath(testPath);
        expect(result).toBeTruthy();
        expect(path.isAbsolute(result)).toBe(true);
      }
    });

    it('should detect traversal in normalized paths', () => {
      // These should fail because after normalization they contain '..'
      const traversalPaths = [
        'a/b/../../../c',
        './foo/bar/../../../../etc/passwd'
      ];

      for (const testPath of traversalPaths) {
        expect(() => validatePath(testPath)).toThrow(CatalystError);
      }
    });

    it('should allow paths that normalize to parent but stay within bounds', () => {
      // Note: This behavior depends on implementation
      // If 'a/b/../c' normalizes to 'a/c' without '..' it should be allowed
      const result = validatePath('a/b/../c');
      expect(result).toBeTruthy();
      expect(result).not.toContain('..');
    });
  });

  describe('isSafePath', () => {
    it('should return true for safe paths', () => {
      expect(isSafePath('file.txt')).toBe(true);
      expect(isSafePath('.xe/features/spec.md')).toBe(true);
      expect(isSafePath('./relative/path.txt')).toBe(true);
    });

    it('should return false for paths with traversal', () => {
      expect(isSafePath('../file.txt')).toBe(false);
      expect(isSafePath('foo/../../bar.txt')).toBe(false);
      expect(isSafePath('./../../secrets.txt')).toBe(false);
    });

    it('should return true for absolute safe paths', () => {
      const absolutePath = path.resolve('/tmp/safe/file.txt');
      expect(isSafePath(absolutePath)).toBe(true);
    });

    it('should allow absolute paths that normalize safely', () => {
      // '/tmp/../etc/passwd' normalizes to '/etc/passwd' which is safe (no '..')
      expect(isSafePath('/tmp/../etc/passwd')).toBe(true);
      // '/var/www/../../root/.ssh/id_rsa' normalizes to '/root/.ssh/id_rsa' which is safe
      expect(isSafePath('/var/www/../../root/.ssh/id_rsa')).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(isSafePath('')).toBe(true); // Empty path (current dir)
      expect(isSafePath('.')).toBe(true); // Current directory
      expect(isSafePath('..')).toBe(false); // Parent directory
    });

    it('should detect paths that start with .. after normalization', () => {
      // These normalize to paths that start with '..' and should fail
      expect(isSafePath('a/../..')).toBe(false);
      expect(isSafePath('foo/../../bar')).toBe(false);
    });

    it('should allow paths with parent references that resolve safely', () => {
      // 'a/b/../c' resolves to 'a/c' which is safe
      expect(isSafePath('a/b/../c')).toBe(true);
      expect(isSafePath('foo/bar/../baz.txt')).toBe(true);
    });
  });
});
