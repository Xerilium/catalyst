/**
 * Unit tests for AnnotationScanner.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { AnnotationScanner } from '@traceability/parsers/annotation-scanner.js';

/**
 * @req FR:req-traceability/annotation.tag
 * @req FR:req-traceability/annotation.single-line
 * @req FR:req-traceability/annotation.block
 * @req FR:req-traceability/annotation.multi-line
 * @req FR:req-traceability/annotation.multi-inline
 * @req FR:req-traceability/annotation.partial
 * @req FR:req-traceability/annotation.tests
 * @req NFR:req-traceability/compat.annotation-format
 */
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

    // @req FR:req-traceability/annotation.language-compat
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

    // @req FR:req-traceability/scan.code
    it('should not miss annotations after a backtick in a regex literal', async () => {
      const bt = String.fromCharCode(96); // backtick
      const content = [
        '// @req FR:feature/before.regex',
        'const PATTERN = /' + bt + '/;',
        '',
        '// @req FR:feature/after.regex',
        'function processTemplate() {}',
        '',
      ].join('\n');
      const filePath = path.join(tempDir, 'regex-backtick.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(2);
      expect(results.some((r) => r.id.path === 'before.regex')).toBe(true);
      expect(results.some((r) => r.id.path === 'after.regex')).toBe(true);
    });

    // @req FR:req-traceability/scan.code
    it('should not miss annotations after a backtick in a string literal', async () => {
      const bt = String.fromCharCode(96); // backtick
      const content = [
        '// @req FR:feature/before.string',
        "const char = '" + bt + "';",
        '',
        '// @req FR:feature/after.string',
        'function handleBacktick() {}',
        '',
      ].join('\n');
      const filePath = path.join(tempDir, 'string-backtick.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(2);
      expect(results.some((r) => r.id.path === 'before.string')).toBe(true);
      expect(results.some((r) => r.id.path === 'after.string')).toBe(true);
    });

    // @req FR:req-traceability/scan.code
    it('should not miss annotations after a backtick in a double-quoted string', async () => {
      const bt = String.fromCharCode(96); // backtick
      const content = [
        '// @req FR:feature/before.dquote',
        'const char = "' + bt + '";',
        '',
        '// @req FR:feature/after.dquote',
        'function handleBacktick() {}',
        '',
      ].join('\n');
      const filePath = path.join(tempDir, 'dquote-backtick.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(2);
      expect(results.some((r) => r.id.path === 'before.dquote')).toBe(true);
      expect(results.some((r) => r.id.path === 'after.dquote')).toBe(true);
    });
  });

  /**
   * @req FR:req-traceability/annotation.file-level-detection
   */
  describe('scanFile - file-level detection', () => {
    it('should mark annotation directly above function as not file-level', async () => {
      const content = `// @req FR:auth/session.expiry\nfunction checkExpiry() {}\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].isFileLevel).toBe(false);
    });

    it('should mark annotation above export function as not file-level', async () => {
      const content = `// @req FR:auth/session.expiry\nexport function checkExpiry() {}\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].isFileLevel).toBe(false);
    });

    it('should mark annotation above export async function as not file-level', async () => {
      const content = `// @req FR:auth/session.expiry\nexport async function checkExpiry() {}\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].isFileLevel).toBe(false);
    });

    it('should mark annotation above class as not file-level', async () => {
      const content = `// @req FR:auth/session.manager\nexport class SessionManager {}\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].isFileLevel).toBe(false);
    });

    it('should mark annotation above interface as not file-level', async () => {
      const content = `// @req FR:auth/session.type\nexport interface SessionConfig {}\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].isFileLevel).toBe(false);
    });

    it('should mark annotation 2 lines above function (blank line) as not file-level', async () => {
      const content = `// @req FR:auth/session.expiry\n\nfunction checkExpiry() {}\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].isFileLevel).toBe(false);
    });

    it('should mark annotation 3 lines above function as not file-level', async () => {
      const content = `// @req FR:auth/session.expiry\n//\n// Some other comment\nfunction checkExpiry() {}\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].isFileLevel).toBe(false);
    });

    it('should mark annotation 4+ lines above function as file-level', async () => {
      const content = `// @req FR:auth/session.expiry\n//\n// Some comment\n// Another comment\nfunction checkExpiry() {}\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].isFileLevel).toBe(true);
    });

    it('should mark annotation above only imports/blanks as file-level', async () => {
      const content = `// @req FR:auth/session.expiry\n\nimport { something } from './somewhere';\n\nconst x = 1;\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].isFileLevel).toBe(true);
    });

    it('should mark annotation at end of file as file-level', async () => {
      const content = `function something() {}\n\n// @req FR:auth/session.expiry\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].isFileLevel).toBe(true);
    });

    it('should mark JSDoc @req with function after closing */ as not file-level', async () => {
      const content = `/**\n * Check session expiry.\n * @req FR:auth/session.expiry\n */\nfunction checkExpiry() {}\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].isFileLevel).toBe(false);
    });

    it('should mark test file annotation above describe() as not file-level', async () => {
      const content = `// @req FR:auth/session.expiry\ndescribe('session tests', () => {\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, true);

      expect(results).toHaveLength(1);
      expect(results[0].isFileLevel).toBe(false);
    });

    it('should mark test file annotation above it() as not file-level', async () => {
      const content = `    // @req FR:auth/session.expiry\n    it('should check expiry', () => {\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, true);

      expect(results).toHaveLength(1);
      expect(results[0].isFileLevel).toBe(false);
    });

    it('should mark test file annotation above test() as not file-level', async () => {
      const content = `    // @req FR:auth/session.expiry\n    test('should check expiry', () => {\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, true);

      expect(results).toHaveLength(1);
      expect(results[0].isFileLevel).toBe(false);
    });

    it('should mark test file annotation above describe.skip() as not file-level', async () => {
      const content = `// @req FR:auth/session.expiry\ndescribe.skip('skipped tests', () => {\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, true);

      expect(results).toHaveLength(1);
      expect(results[0].isFileLevel).toBe(false);
    });

    it('should mark annotation above export re-export as file-level', async () => {
      const content = `// @req FR:auth/session.expiry\nexport { something } from './somewhere';\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].isFileLevel).toBe(true);
    });

    it('should handle mixed file-level and function-level annotations', async () => {
      const content = `// @req FR:auth/session.cop-out\n\nimport { stuff } from './stuff';\n\n// @req FR:auth/session.expiry\nfunction checkExpiry() {}\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(2);
      const copOut = results.find(r => r.id.path === 'session.cop-out');
      const proper = results.find(r => r.id.path === 'session.expiry');
      expect(copOut?.isFileLevel).toBe(true);
      expect(proper?.isFileLevel).toBe(false);
    });

    it('should mark annotation above export default class as not file-level', async () => {
      const content = `// @req FR:auth/session.manager\nexport default class SessionManager {}\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].isFileLevel).toBe(false);
    });

    it('should mark annotation above abstract class as not file-level', async () => {
      const content = `// @req FR:auth/session.base\nexport abstract class BaseSession {}\n`;
      const filePath = path.join(tempDir, 'test.ts');
      await fs.writeFile(filePath, content);

      const results = await scanner.scanFile(filePath, false);

      expect(results).toHaveLength(1);
      expect(results[0].isFileLevel).toBe(false);
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

    // @req FR:req-traceability/scan.exclude
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

    // @req FR:req-traceability/scan.gitignore
    it('should respect .gitignore when respectGitignore is true', async () => {
      const projectDir = path.join(tempDir, 'git-project');
      await fs.mkdir(projectDir, { recursive: true });

      // Create .gitignore
      await fs.writeFile(
        path.join(projectDir, '.gitignore'),
        'ignored.ts\n'
      );

      // Create ignored file
      await fs.writeFile(
        path.join(projectDir, 'ignored.ts'),
        '// @req FR:feature/ignored\n'
      );

      // Create non-ignored file
      await fs.writeFile(
        path.join(projectDir, 'included.ts'),
        '// @req FR:feature/included\n'
      );

      const results = await scanner.scanDirectory(projectDir, {
        exclude: [],
        testDirs: [],
        respectGitignore: true,
      });

      // Should only find the included file
      expect(results).toHaveLength(1);
      expect(results[0].id.path).toBe('included');
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
