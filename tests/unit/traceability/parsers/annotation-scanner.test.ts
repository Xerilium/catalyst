/**
 * Unit tests for AnnotationScanner.
 * @req FR:req-traceability/annotation.tag
 * @req FR:req-traceability/annotation.single-line
 * @req FR:req-traceability/annotation.block
 * @req FR:req-traceability/annotation.multi-line
 * @req FR:req-traceability/annotation.multi-inline
 * @req FR:req-traceability/annotation.partial
 * @req FR:req-traceability/annotation.tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { AnnotationScanner } from '../../../../src/traceability/parsers/annotation-scanner.js';

describe('AnnotationScanner', () => {
  let scanner: AnnotationScanner;
  let tempDir: string;

  beforeEach(async () => {
    scanner = new AnnotationScanner();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'annotation-scanner-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // @req FR:req-traceability/annotation.single-line
  describe('scanFile - single-line comments', () => {
    it('should extract @req from // comment', async () => {
      const content = `// @req FR:auth/session.expiry
function checkExpiry() {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].id.type).toBe('FR');
      expect(results[0].id.scope).toBe('auth');
      expect(results[0].id.path).toBe('session.expiry');
      expect(results[0].file).toBe(filePath);
      expect(results[0].line).toBe(1);
      expect(results[0].isPartial).toBe(false);
      expect(results[0].isTest).toBe(false);
    });

    it('should extract @req from # comment (Python)', async () => {
      const content = `# @req FR:auth/session.expiry
def check_expiry():
    pass
`;
      const filePath = path.join(tempDir, 'test.py');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].id.path).toBe('session.expiry');
    });

    it('should extract @req from -- comment (SQL)', async () => {
      const content = `-- @req FR:data/query.optimize
SELECT * FROM users;
`;
      const filePath = path.join(tempDir, 'test.sql');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].id.path).toBe('query.optimize');
    });
  });

  // @req FR:req-traceability/annotation.block
  describe('scanFile - block comments', () => {
    it('should extract @req from /* */ block comment', async () => {
      const content = `/* @req FR:auth/session.expiry */
function checkExpiry() {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].id.path).toBe('session.expiry');
    });

    it('should extract @req from /** */ JSDoc block comment', async () => {
      const content = `/**
 * Checks session expiry.
 * @req FR:auth/session.expiry
 */
function checkExpiry() {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].id.path).toBe('session.expiry');
      expect(results[0].line).toBe(3); // Line where @req appears
    });
  });

  // @req FR:req-traceability/annotation.multi-line
  describe('scanFile - multiple @req on separate lines', () => {
    it('should extract multiple @req tags on separate lines', async () => {
      const content = `// @req FR:auth/session.expiry
// @req FR:auth/session.validation
function validateSession() {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(2);
      expect(results[0].id.path).toBe('session.expiry');
      expect(results[0].line).toBe(1);
      expect(results[1].id.path).toBe('session.validation');
      expect(results[1].line).toBe(2);
    });
  });

  // @req FR:req-traceability/annotation.multi-inline
  describe('scanFile - comma-separated @req on single line', () => {
    it('should extract comma-separated @req tags', async () => {
      const content = `// @req FR:auth/session.expiry, FR:auth/session.validation
function validateSession() {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(2);
      expect(results[0].id.path).toBe('session.expiry');
      expect(results[1].id.path).toBe('session.validation');
      // Both on same line
      expect(results[0].line).toBe(1);
      expect(results[1].line).toBe(1);
    });
  });

  // @req FR:req-traceability/annotation.partial
  describe('scanFile - @req:partial marker', () => {
    it('should detect @req:partial annotation', async () => {
      const content = `// @req:partial FR:auth/session.validation
function helperFunction() {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].isPartial).toBe(true);
      expect(results[0].id.path).toBe('session.validation');
    });

    it('should distinguish partial from full implementation', async () => {
      const content = `// @req FR:auth/session.expiry
// @req:partial FR:auth/session.validation
function mixedFunction() {}
`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(2);
      expect(results[0].isPartial).toBe(false);
      expect(results[1].isPartial).toBe(true);
    });
  });

  // @req FR:req-traceability/annotation.tests
  describe('scanFile - isTest flag', () => {
    it('should set isTest=true when passed as parameter', async () => {
      const content = `// @req FR:auth/session.expiry
describe('session', () => {});
`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, true);

      expect(results).toHaveLength(1);
      expect(results[0].isTest).toBe(true);
    });

    it('should set isTest=false when passed as parameter', async () => {
      const content = `// @req FR:auth/session.expiry
function checkExpiry() {}
`;
      const filePath = path.join(tempDir, 'src.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].isTest).toBe(false);
    });
  });

  describe('scanFile - edge cases', () => {
    it('should handle empty file', async () => {
      const filePath = path.join(tempDir, 'empty.ts');
      await fs.writeFile(filePath, '');

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(0);
    });

    it('should handle file with no annotations', async () => {
      const content = `function noAnnotations() {
  return 'hello';
}
`;
      const filePath = path.join(tempDir, 'clean.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(0);
    });

    it('should ignore malformed @req tags', async () => {
      const content = `// @req missing-type-prefix
// @req FR: missing-path
// @req FR:valid/path.here
`;
      const filePath = path.join(tempDir, 'mixed.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].id.path).toBe('path.here');
    });

    it('should handle @req in string literals (false positive accepted)', async () => {
      // Note: We accept false positives from string literals for simplicity
      const content = `const str = "// @req FR:fake/path.in.string";
// @req FR:real/actual.annotation
`;
      const filePath = path.join(tempDir, 'strings.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      // We accept that string literal might be picked up
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r) => r.id.path === 'actual.annotation')).toBe(true);
    });
  });

  describe('scanDirectory', () => {
    it('should scan all files in directory recursively', async () => {
      const srcDir = path.join(tempDir, 'src');
      const subDir = path.join(srcDir, 'utils');
      await fs.mkdir(subDir, { recursive: true });

      await fs.writeFile(
        path.join(srcDir, 'main.ts'),
        '// @req FR:feature/main.entry\n'
      );
      await fs.writeFile(
        path.join(subDir, 'helper.ts'),
        '// @req FR:feature/util.helper\n'
      );

      const results = await scanner.scanDirectory(srcDir, {
        exclude: [],
        testDirs: ['tests/'],
        respectGitignore: false,
      });

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id.path).sort()).toEqual([
        'main.entry',
        'util.helper',
      ]);
    });

    it('should exclude patterns from scan', async () => {
      const srcDir = path.join(tempDir, 'src');
      const nodeModules = path.join(srcDir, 'node_modules', 'pkg');
      await fs.mkdir(nodeModules, { recursive: true });

      await fs.writeFile(
        path.join(srcDir, 'main.ts'),
        '// @req FR:feature/main\n'
      );
      await fs.writeFile(
        path.join(nodeModules, 'index.ts'),
        '// @req FR:feature/excluded\n'
      );

      const results = await scanner.scanDirectory(srcDir, {
        exclude: ['**/node_modules/**'],
        testDirs: [],
        respectGitignore: false,
      });

      expect(results).toHaveLength(1);
      expect(results[0].id.path).toBe('main');
    });

    it('should detect test files based on testDirs', async () => {
      const srcDir = path.join(tempDir, 'src');
      const testDir = path.join(tempDir, 'tests');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.mkdir(testDir, { recursive: true });

      await fs.writeFile(
        path.join(srcDir, 'main.ts'),
        '// @req FR:feature/main\n'
      );
      await fs.writeFile(
        path.join(testDir, 'main.test.ts'),
        '// @req FR:feature/main\n'
      );

      const srcResults = await scanner.scanDirectory(srcDir, {
        exclude: [],
        testDirs: ['tests/'],
        respectGitignore: false,
      });

      const testResults = await scanner.scanDirectory(testDir, {
        exclude: [],
        testDirs: ['tests/'],
        respectGitignore: false,
      });

      expect(srcResults[0].isTest).toBe(false);
      expect(testResults[0].isTest).toBe(true);
    });

    it('should return empty array for non-existent directory', async () => {
      const results = await scanner.scanDirectory('/non/existent', {
        exclude: [],
        testDirs: [],
        respectGitignore: false,
      });

      expect(results).toHaveLength(0);
    });
  });
});
