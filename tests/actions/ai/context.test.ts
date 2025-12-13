/**
 * Tests for context assembly utilities
 *
 * @req FR:playbook-actions-ai/ai-prompt.context
 * @req FR:playbook-actions-ai/ai-prompt.return
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  assembleContext,
  assembleReturnInstruction,
  cleanupTempFiles,
  readOutputFile
} from '@playbooks/actions/ai/context';

// @req FR:playbook-actions-ai/ai-prompt.context
describe('assembleContext', () => {
  let createdFiles: string[] = [];

  afterEach(async () => {
    // Clean up any files created during tests
    await cleanupTempFiles(createdFiles);
    createdFiles = [];
  });

  describe('empty context', () => {
    it('should return empty instruction for undefined context', async () => {
      const result = await assembleContext(undefined);
      expect(result.instruction).toBe('');
      expect(result.cleanupFiles).toHaveLength(0);
    });

    it('should return empty instruction for empty object', async () => {
      const result = await assembleContext({});
      expect(result.instruction).toBe('');
      expect(result.cleanupFiles).toHaveLength(0);
    });
  });

  describe('single context value', () => {
    it('should create temp file for single value', async () => {
      const result = await assembleContext({
        'source-code': 'const x = 1;'
      });
      createdFiles = result.cleanupFiles;

      expect(result.cleanupFiles).toHaveLength(1);
      expect(result.cleanupFiles[0]).toMatch(/catalyst-context-source-code-/);

      // Verify file exists and has content
      const content = await fs.readFile(result.cleanupFiles[0], 'utf-8');
      expect(content).toBe('const x = 1;');
    });

    it('should include file reference in instruction', async () => {
      const result = await assembleContext({
        'my-file': 'content'
      });
      createdFiles = result.cleanupFiles;

      expect(result.instruction).toContain('## Context Files');
      expect(result.instruction).toContain('- my-file:');
      expect(result.instruction).toContain(result.cleanupFiles[0]);
    });
  });

  describe('multiple context values', () => {
    it('should create temp file for each value', async () => {
      const result = await assembleContext({
        'file-a': 'content a',
        'file-b': 'content b',
        'file-c': 'content c'
      });
      createdFiles = result.cleanupFiles;

      expect(result.cleanupFiles).toHaveLength(3);
    });

    it('should include all file references in instruction', async () => {
      const result = await assembleContext({
        'source': 'code',
        'requirements': 'spec'
      });
      createdFiles = result.cleanupFiles;

      expect(result.instruction).toContain('- source:');
      expect(result.instruction).toContain('- requirements:');
    });
  });

  describe('value types', () => {
    it('should write string values as-is', async () => {
      const result = await assembleContext({
        'text': 'plain text content'
      });
      createdFiles = result.cleanupFiles;

      const content = await fs.readFile(result.cleanupFiles[0], 'utf-8');
      expect(content).toBe('plain text content');
    });

    it('should JSON-stringify object values', async () => {
      const result = await assembleContext({
        'data': { key: 'value', nested: { a: 1 } }
      });
      createdFiles = result.cleanupFiles;

      const content = await fs.readFile(result.cleanupFiles[0], 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual({ key: 'value', nested: { a: 1 } });
    });

    it('should JSON-stringify array values', async () => {
      const result = await assembleContext({
        'items': [1, 2, 3]
      });
      createdFiles = result.cleanupFiles;

      const content = await fs.readFile(result.cleanupFiles[0], 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual([1, 2, 3]);
    });

    it('should JSON-stringify number values', async () => {
      const result = await assembleContext({
        'count': 42
      });
      createdFiles = result.cleanupFiles;

      const content = await fs.readFile(result.cleanupFiles[0], 'utf-8');
      expect(content).toBe('42');
    });
  });

  describe('instruction format', () => {
    it('should match spec format', async () => {
      const result = await assembleContext({
        'context-file': 'content'
      });
      createdFiles = result.cleanupFiles;

      expect(result.instruction).toMatch(/^## Context Files\n\n/);
      expect(result.instruction).toContain('Review the following files for context');
      expect(result.instruction).toMatch(/- context-file: .+\n\n$/);
    });
  });

  describe('special characters in names', () => {
    it('should sanitize special characters in file names', async () => {
      const result = await assembleContext({
        'file/with/slashes': 'content'
      });
      createdFiles = result.cleanupFiles;

      // Should replace slashes with underscores
      expect(result.cleanupFiles[0]).toMatch(/catalyst-context-file_with_slashes-/);
    });
  });

  // @req FR:playbook-actions-ai/ai-prompt.context.detection
  describe('file path detection', () => {
    let tempFile: string;

    beforeEach(async () => {
      // Create a real temp file to test path detection
      tempFile = path.join(require('os').tmpdir(), `test-context-file-${Date.now()}.txt`);
      await fs.writeFile(tempFile, 'file content from disk');
    });

    afterEach(async () => {
      await fs.unlink(tempFile).catch(() => {});
    });

    it('should use existing file directly when path exists', async () => {
      const result = await assembleContext({
        'existing-file': tempFile
      });
      createdFiles = result.cleanupFiles;

      // Should NOT create a temp file (cleanupFiles should be empty)
      expect(result.cleanupFiles).toHaveLength(0);

      // Instruction should reference the original file path
      expect(result.instruction).toContain(`- existing-file: ${tempFile}`);
    });

    it('should create temp file when path does not exist', async () => {
      const result = await assembleContext({
        'missing-file': '/nonexistent/path/to/file.txt'
      });
      createdFiles = result.cleanupFiles;

      // Should create a temp file with the path string as content
      expect(result.cleanupFiles).toHaveLength(1);

      const content = await fs.readFile(result.cleanupFiles[0], 'utf-8');
      expect(content).toBe('/nonexistent/path/to/file.txt');
    });

    it('should create temp file for string without path separators', async () => {
      const result = await assembleContext({
        'plain-text': 'this is just text, not a path'
      });
      createdFiles = result.cleanupFiles;

      // Should create a temp file
      expect(result.cleanupFiles).toHaveLength(1);

      const content = await fs.readFile(result.cleanupFiles[0], 'utf-8');
      expect(content).toBe('this is just text, not a path');
    });

    it('should handle mix of file paths and literal content', async () => {
      const result = await assembleContext({
        'real-file': tempFile,
        'literal-content': 'some inline text',
        'object-data': { key: 'value' }
      });
      createdFiles = result.cleanupFiles;

      // Should only create temp files for non-path values
      expect(result.cleanupFiles).toHaveLength(2);

      // Should reference original file for path
      expect(result.instruction).toContain(`- real-file: ${tempFile}`);

      // Should reference temp files for other values
      expect(result.instruction).toContain('- literal-content:');
      expect(result.instruction).toContain('- object-data:');
    });

    it('should detect relative paths with forward slashes', async () => {
      // Create a file relative to current directory for this test
      const relativePath = './test-relative-file.txt';
      await fs.writeFile(relativePath, 'relative file content');

      try {
        const result = await assembleContext({
          'relative-file': relativePath
        });
        createdFiles = result.cleanupFiles;

        // Should use the file directly
        expect(result.cleanupFiles).toHaveLength(0);
        expect(result.instruction).toContain(`- relative-file: ${relativePath}`);
      } finally {
        await fs.unlink(relativePath).catch(() => {});
      }
    });

    it('should detect single-word file paths like LICENSE', async () => {
      // Create a single-word file in current directory
      const singleWordPath = 'TEST_LICENSE_FILE';
      await fs.writeFile(singleWordPath, 'License content');

      try {
        const result = await assembleContext({
          'license': singleWordPath
        });
        createdFiles = result.cleanupFiles;

        // Should use the file directly
        expect(result.cleanupFiles).toHaveLength(0);
        expect(result.instruction).toContain(`- license: ${singleWordPath}`);
      } finally {
        await fs.unlink(singleWordPath).catch(() => {});
      }
    });

    it('should treat multi-line strings as content, not file paths', async () => {
      const multiLineContent = 'line 1\nline 2\nline 3';

      const result = await assembleContext({
        'multi-line': multiLineContent
      });
      createdFiles = result.cleanupFiles;

      // Should create a temp file (multi-line is never a file path)
      expect(result.cleanupFiles).toHaveLength(1);

      const content = await fs.readFile(result.cleanupFiles[0], 'utf-8');
      expect(content).toBe(multiLineContent);
    });

    it('should treat multi-line strings as content even if first line looks like path', async () => {
      // Create a file that matches the first line
      const firstLine = './some-file.txt';
      await fs.writeFile(firstLine, 'file content');

      try {
        const multiLineWithPath = `${firstLine}\nmore content\neven more`;

        const result = await assembleContext({
          'tricky-content': multiLineWithPath
        });
        createdFiles = result.cleanupFiles;

        // Should create a temp file (multi-line is never a file path)
        expect(result.cleanupFiles).toHaveLength(1);

        const content = await fs.readFile(result.cleanupFiles[0], 'utf-8');
        expect(content).toBe(multiLineWithPath);
      } finally {
        await fs.unlink(firstLine).catch(() => {});
      }
    });
  });
});

// @req FR:playbook-actions-ai/ai-prompt.return
describe('assembleReturnInstruction', () => {
  // @req FR:playbook-actions-ai/ai-prompt.return.empty
  describe('empty return', () => {
    it('should return null outputFile for undefined return', () => {
      const result = assembleReturnInstruction(undefined);
      expect(result.instruction).toBe('');
      expect(result.outputFile).toBeNull();
    });

    it('should return null outputFile for empty string', () => {
      const result = assembleReturnInstruction('');
      expect(result.instruction).toBe('');
      expect(result.outputFile).toBeNull();
    });

    it('should return null outputFile for whitespace only', () => {
      const result = assembleReturnInstruction('   ');
      expect(result.instruction).toBe('');
      expect(result.outputFile).toBeNull();
    });
  });

  // @req FR:playbook-actions-ai/ai-prompt.return.file
  describe('valid return', () => {
    it('should create instruction with file path', () => {
      const result = assembleReturnInstruction('A JSON array of results.');

      expect(result.instruction).toContain('## Required Output');
      expect(result.instruction).toContain('A JSON array of results.');
      expect(result.instruction).toContain('IMPORTANT: Write your output to:');
      expect(result.outputFile).not.toBeNull();
      expect(result.instruction).toContain(result.outputFile!);
    });

    it('should create unique output file path', () => {
      const result1 = assembleReturnInstruction('Output 1');
      const result2 = assembleReturnInstruction('Output 2');

      expect(result1.outputFile).not.toBe(result2.outputFile);
    });

    it('should use temp directory for output file', () => {
      const result = assembleReturnInstruction('Some output');
      expect(result.outputFile).toMatch(/catalyst-output-/);
    });
  });

  describe('instruction format', () => {
    it('should match spec format', () => {
      const result = assembleReturnInstruction('Expected output description.');

      expect(result.instruction).toMatch(/\n## Required Output\n\n/);
      expect(result.instruction).toContain('Expected output description.');
      expect(result.instruction).toMatch(/IMPORTANT: Write your output to:/);
    });
  });
});

describe('cleanupTempFiles', () => {
  it('should delete existing files', async () => {
    // Create a temp file
    const tempFile = path.join(require('os').tmpdir(), `test-cleanup-${Date.now()}.txt`);
    await fs.writeFile(tempFile, 'test content');

    // Verify it exists
    const existsBefore = await fs.access(tempFile).then(() => true).catch(() => false);
    expect(existsBefore).toBe(true);

    // Clean up
    await cleanupTempFiles([tempFile]);

    // Verify it's deleted
    const existsAfter = await fs.access(tempFile).then(() => true).catch(() => false);
    expect(existsAfter).toBe(false);
  });

  it('should silently ignore non-existent files', async () => {
    const nonExistent = '/tmp/non-existent-file-12345.txt';

    // Should not throw
    await expect(cleanupTempFiles([nonExistent])).resolves.not.toThrow();
  });

  it('should handle empty array', async () => {
    await expect(cleanupTempFiles([])).resolves.not.toThrow();
  });
});

describe('readOutputFile', () => {
  it('should read existing file contents', async () => {
    // Create a temp file
    const tempFile = path.join(require('os').tmpdir(), `test-read-${Date.now()}.txt`);
    await fs.writeFile(tempFile, 'test output content');

    try {
      const content = await readOutputFile(tempFile);
      expect(content).toBe('test output content');
    } finally {
      await cleanupTempFiles([tempFile]);
    }
  });

  it('should return null for non-existent file', async () => {
    const content = await readOutputFile('/tmp/non-existent-output-12345.txt');
    expect(content).toBeNull();
  });
});
