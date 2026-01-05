/**
 * Source code annotation scanner.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { RequirementAnnotation, ScanOptions } from '../types/index.js';
import { parseQualifiedId } from './id-parser.js';
import { parseGitignore } from './gitignore-parser.js';

/**
 * Regex pattern for `@req` annotations in code.
 * Matches:
 * - `@req FR:{feature}/path.to.req`
 * - `@req:partial FR:{feature}/path`
 * - `@req FR:{feature}/path1, FR:{feature}/path2` (comma-separated)
 *
 * @req FR:req-traceability/annotation.tag
 * @req FR:req-traceability/annotation.partial
 * @req NFR:req-traceability/compat.annotation-format
 */
const CODE_REQ_PATTERN = /@req(:partial)?\s+([A-Z]+:[a-z0-9-]+\/[a-z0-9.-]+)/g;

/**
 * Pattern to detect if a line is a comment.
 * Matches lines that start with common comment prefixes (after optional whitespace):
 * - // or /// (JS/TS/C-style)
 * - # (Python/Shell/YAML)
 * - * or /** (JSDoc/block comments)
 * - <!-- (HTML/XML)
 * - ; (INI/assembly)
 * - -- (SQL/Lua)
 */
const COMMENT_LINE_PATTERN = /^\s*(\/\/|\/?\*|#|<!--|;|--)/;

/**
 * Pattern for extracting additional comma-separated IDs after an @req tag.
 */
const COMMA_SEP_PATTERN = /,\s*([A-Z]+:[a-z0-9-]+\/[a-z0-9.-]+)/g;

/**
 * Scanner for @req annotations in source code files.
 * @req FR:req-traceability/scan.code
 * @req FR:req-traceability/scan.tests
 * @req FR:req-traceability/scan.gitignore
 * @req FR:req-traceability/annotation.tag
 * @req FR:req-traceability/annotation.single-line
 * @req FR:req-traceability/annotation.block
 * @req FR:req-traceability/annotation.partial
 * @req FR:req-traceability/annotation.language-compat
 */
export class AnnotationScanner {
  /**
   * Scan a single file for @req annotations.
   * @req FR:req-traceability/annotation.single-line
   * @req FR:req-traceability/annotation.block
   */
  async scanFile(
    filePath: string,
    isTest: boolean
  ): Promise<RequirementAnnotation[]> {
    const annotations: RequirementAnnotation[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      // Track template literal state across lines
      let insideTemplateLiteral = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Update template literal state based on backticks in this line
        // Count unescaped backticks to toggle state
        const backtickCount = this.countUnescapedBackticks(line);
        const wasInsideTemplateLiteral = insideTemplateLiteral;

        // Odd number of backticks toggles the state
        if (backtickCount % 2 === 1) {
          insideTemplateLiteral = !insideTemplateLiteral;
        }

        // Skip annotation extraction if we're inside a template literal
        // (either started on previous line, or line starts inside one)
        if (wasInsideTemplateLiteral) {
          continue;
        }

        const lineAnnotations = this.extractAnnotationsFromLine(
          line,
          filePath,
          i + 1, // 1-indexed
          isTest
        );
        annotations.push(...lineAnnotations);
      }
    } catch (error) {
      // File doesn't exist or can't be read - return empty array
    }

    return annotations;
  }

  /**
   * Count unescaped backticks in a line.
   * Used to track template literal state across lines.
   */
  private countUnescapedBackticks(line: string): number {
    let count = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '`') {
        // Check if escaped (preceded by odd number of backslashes)
        let backslashCount = 0;
        for (let j = i - 1; j >= 0 && line[j] === '\\'; j--) {
          backslashCount++;
        }
        if (backslashCount % 2 === 0) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Scan a directory recursively for @req annotations.
   * @req FR:req-traceability/scan.code
   * @req FR:req-traceability/scan.tests
   * @req FR:req-traceability/scan.gitignore
   */
  async scanDirectory(
    dirPath: string,
    options: ScanOptions
  ): Promise<RequirementAnnotation[]> {
    const annotations: RequirementAnnotation[] = [];

    try {
      // Load .gitignore patterns if requested
      let gitignorePatterns: string[] = [];
      if (options.respectGitignore) {
        gitignorePatterns = await this.loadGitignorePatterns(dirPath);
      }

      const mergedExclude = [...options.exclude, ...gitignorePatterns];
      const mergedOptions = { ...options, exclude: mergedExclude };

      await this.scanDirectoryRecursive(dirPath, dirPath, mergedOptions, annotations);
    } catch (error) {
      // Directory doesn't exist - return empty array
    }

    return annotations;
  }

  /**
   * Load .gitignore patterns from the directory.
   * @req FR:req-traceability/scan.gitignore
   */
  private async loadGitignorePatterns(dirPath: string): Promise<string[]> {
    const gitignorePath = path.join(dirPath, '.gitignore');
    try {
      const content = await fs.readFile(gitignorePath, 'utf-8');
      return parseGitignore(content);
    } catch {
      // No .gitignore or can't read - return empty
      return [];
    }
  }

  /**
   * Recursively scan directory for files.
   */
  private async scanDirectoryRecursive(
    basePath: string,
    currentPath: string,
    options: ScanOptions,
    annotations: RequirementAnnotation[]
  ): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    const promises: Promise<void>[] = [];

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      // Check exclude patterns
      if (this.shouldExclude(relativePath, options.exclude)) {
        continue;
      }

      if (entry.isDirectory()) {
        promises.push(
          this.scanDirectoryRecursive(basePath, fullPath, options, annotations)
        );
      } else if (entry.isFile() && this.isSourceFile(entry.name)) {
        const isTest = this.isTestFile(fullPath, options.testDirs);
        promises.push(
          this.scanFile(fullPath, isTest).then((fileAnnotations) => {
            annotations.push(...fileAnnotations);
          })
        );
      }
    }

    await Promise.all(promises);
  }

  /**
   * Extract all @req annotations from a single line.
   * Only extracts annotations from comment lines to avoid false positives
   * from string literals containing @req patterns.
   * @req FR:req-traceability/annotation.multi-line
   * @req FR:req-traceability/annotation.multi-inline
   */
  private extractAnnotationsFromLine(
    line: string,
    filePath: string,
    lineNumber: number,
    isTest: boolean
  ): RequirementAnnotation[] {
    const annotations: RequirementAnnotation[] = [];

    // Only extract annotations from comment lines to avoid false positives
    // from string literals in test files that contain @req patterns
    if (!COMMENT_LINE_PATTERN.test(line)) {
      return annotations;
    }

    // Skip lines that appear to be inside template literals or string assignments
    // These patterns indicate the line content is a string value, not actual code
    if (this.isInsideStringLiteral(line)) {
      return annotations;
    }

    // Reset regex lastIndex
    CODE_REQ_PATTERN.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = CODE_REQ_PATTERN.exec(line)) !== null) {
      // match[1] is the :partial marker (or undefined)
      // match[2] is the first requirement ID
      const isPartial = match[1] === ':partial';
      const idString = match[2];
      const id = parseQualifiedId(idString);

      if (id) {
        annotations.push({
          id,
          file: filePath,
          line: lineNumber,
          isPartial,
          isTest,
        });
      }

      // Check for comma-separated IDs after this match
      // Get the rest of the line after this match
      const afterMatch = line.substring(match.index + match[0].length);
      COMMA_SEP_PATTERN.lastIndex = 0;

      let commaMatch: RegExpExecArray | null;
      while ((commaMatch = COMMA_SEP_PATTERN.exec(afterMatch)) !== null) {
        const commaIdString = commaMatch[1];
        const commaId = parseQualifiedId(commaIdString);

        if (commaId) {
          annotations.push({
            id: commaId,
            file: filePath,
            line: lineNumber,
            isPartial: false, // comma-separated IDs are not partial
            isTest,
          });
        }
      }
    }

    return annotations;
  }

  /**
   * Check if a file should be excluded based on patterns.
   * @req FR:req-traceability/scan.exclude
   */
  private shouldExclude(relativePath: string, excludePatterns: string[]): boolean {
    for (const pattern of excludePatterns) {
      if (this.matchGlobPattern(relativePath, pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Simple glob pattern matching.
   * Supports ** for any path and * for any file/folder name.
   */
  private matchGlobPattern(filePath: string, pattern: string): boolean {
    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, '/');
    const normalizedPattern = pattern.replace(/\\/g, '/');

    // Convert glob pattern to regex
    // Use placeholders for ** patterns to avoid interference with * replacement
    let regexPattern = normalizedPattern
      // Escape regex special chars except * and /
      .replace(/[.+?^${}()|[\]]/g, '\\$&')
      // Replace **/ at start or middle with placeholder
      .replace(/\*\*\//g, '\x00STARSTAR_SLASH\x00')
      // Replace /** at end with placeholder
      .replace(/\/\*\*$/g, '\x00SLASH_STARSTAR\x00')
      // Replace remaining ** with placeholder
      .replace(/\*\*/g, '\x00STARSTAR\x00')
      // Replace * with single segment match
      .replace(/\*/g, '[^/]*')
      // Now replace placeholders with actual regex patterns
      .replace(/\x00STARSTAR_SLASH\x00/g, '(?:.*\\/)?')
      .replace(/\x00SLASH_STARSTAR\x00/g, '(?:\\/.*)?')
      .replace(/\x00STARSTAR\x00/g, '.*');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(normalizedPath);
  }

  /**
   * Check if a line appears to be inside a string literal.
   * Detects lines that are part of template literals or string assignments
   * by looking for patterns like backticks, quotes before the @req, or
   * string assignment patterns.
   */
  private isInsideStringLiteral(line: string): boolean {
    // Check if line contains a backtick before @req (template literal)
    const reqIndex = line.indexOf('@req');
    if (reqIndex === -1) return false;

    const beforeReq = line.substring(0, reqIndex);

    // If there's a backtick, single quote, or double quote before @req,
    // this line is likely inside a string literal
    if (beforeReq.includes('`') || beforeReq.includes('"') || beforeReq.includes("'")) {
      return true;
    }

    // Check for common string assignment patterns at start of line
    // e.g., "const content = `// @req" or "await fs.writeFile(..., `// @req"
    const stringAssignmentPattern = /^\s*(const|let|var|=|,|\()\s*.*[`'"]/;
    if (stringAssignmentPattern.test(beforeReq)) {
      return true;
    }

    return false;
  }

  /**
   * Check if a file is a source file we should scan.
   * Excludes .d.ts declaration files which are TypeScript build artifacts.
   */
  private isSourceFile(filename: string): boolean {
    // Exclude TypeScript declaration files
    if (filename.endsWith('.d.ts')) {
      return false;
    }

    const extensions = [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.py',
      '.go',
      '.rs',
      '.java',
      '.kt',
      '.rb',
      '.sql',
      '.sh',
    ];
    return extensions.some((ext) => filename.endsWith(ext));
  }

  /**
   * Check if a file is in a test directory.
   * @req FR:req-traceability/annotation.tests
   */
  private isTestFile(filePath: string, testDirs: string[]): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return testDirs.some((testDir) => {
      const normalizedTestDir = testDir.replace(/\\/g, '/');
      return normalizedPath.includes(normalizedTestDir);
    });
  }
}
