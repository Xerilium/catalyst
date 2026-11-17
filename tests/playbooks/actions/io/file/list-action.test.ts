// @req FR:playbook-actions-io/file-list.@action
// @req FR:playbook-actions-io/file-list.input
// @req FR:playbook-actions-io/file-list.enumerate
// @req FR:playbook-actions-io/file-list.format
// @req FR:playbook-actions-io/file-list.errors
// @req FR:playbook-actions-io/file-list.output
// @req NFR:playbook-actions-io/testability.isolation
// @req NFR:playbook-actions-io/testability.error-coverage
// @req NFR:playbook-actions-io/testability.success-coverage

/**
 * Unit tests for FileListAction
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileListAction } from '@playbooks/actions/io/file/list-action';

describe('FileListAction', () => {
  const testDir = path.join(process.cwd(), '.tmp-test-file-list');
  let action: FileListAction;

  beforeEach(async () => {
    action = new FileListAction();
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  // ----------------------------------------------------------------------
  // FR:file-list.@action — interface
  // ----------------------------------------------------------------------
  describe('static properties', () => {
    // @req FR:playbook-actions-io/file-list.@action
    it('exposes actionType as "file-list"', () => {
      expect(FileListAction.actionType).toBe('file-list');
    });

    // @req FR:playbook-actions-io/file-list.@action
    it('exposes primaryProperty as "path" for YAML shorthand', () => {
      expect(FileListAction.primaryProperty).toBe('path');
    });
  });

  // ----------------------------------------------------------------------
  // FR:file-list.input — config + defaults
  // ----------------------------------------------------------------------
  describe('input defaults', () => {
    // @req FR:playbook-actions-io/file-list.input
    it('defaults pattern to "*" (lists all entries)', async () => {
      await fs.writeFile(path.join(testDir, 'a.txt'), '');
      await fs.writeFile(path.join(testDir, 'b.md'), '');

      const result = await action.execute({ path: testDir });

      expect(result.code).toBe('Success');
      expect(result.value).toEqual(expect.arrayContaining(['a.txt', 'b.md']));
    });

    // @req FR:playbook-actions-io/file-list.input
    it('defaults relativeTo to "root" (paths relative to path input)', async () => {
      await fs.writeFile(path.join(testDir, 'a.md'), '');

      const result = await action.execute({ path: testDir, pattern: '*.md' });

      expect(result.value).toEqual(['a.md']);
    });
  });

  // ----------------------------------------------------------------------
  // FR:file-list.enumerate — glob behavior
  // ----------------------------------------------------------------------
  describe('enumerate (glob)', () => {
    // @req FR:playbook-actions-io/file-list.enumerate
    it('matches flat glob pattern (*.md)', async () => {
      await fs.writeFile(path.join(testDir, 'a.md'), '');
      await fs.writeFile(path.join(testDir, 'b.txt'), '');
      await fs.writeFile(path.join(testDir, 'c.md'), '');

      const result = await action.execute({ path: testDir, pattern: '*.md' });

      expect(result.value).toEqual(expect.arrayContaining(['a.md', 'c.md']));
      expect(result.value).not.toContain('b.txt');
    });

    // @req FR:playbook-actions-io/file-list.enumerate
    it('matches recursive glob pattern (**/*.md) across subdirectories', async () => {
      const subDir = path.join(testDir, 'sub');
      await fs.mkdir(subDir);
      await fs.writeFile(path.join(testDir, 'top.md'), '');
      await fs.writeFile(path.join(subDir, 'nested.md'), '');
      await fs.writeFile(path.join(subDir, 'other.txt'), '');

      const result = await action.execute({ path: testDir, pattern: '**/*.md' });

      expect(result.value).toEqual(expect.arrayContaining(['top.md', 'sub/nested.md']));
      expect((result.value as string[]).some((p) => p.endsWith('other.txt'))).toBe(false);
    });

    // @req FR:playbook-actions-io/file-list.enumerate
    it('matches complex pattern (catalyst.*.prompt.md)', async () => {
      await fs.writeFile(path.join(testDir, 'catalyst.fix.prompt.md'), '');
      await fs.writeFile(path.join(testDir, 'catalyst.run.prompt.md'), '');
      await fs.writeFile(path.join(testDir, 'other.md'), '');

      const result = await action.execute({ path: testDir, pattern: 'catalyst.*.prompt.md' });

      expect((result.value as string[]).sort()).toEqual([
        'catalyst.fix.prompt.md',
        'catalyst.run.prompt.md'
      ]);
    });

    // @req FR:playbook-actions-io/file-list.enumerate
    it('returns empty array when no matches', async () => {
      await fs.writeFile(path.join(testDir, 'a.txt'), '');

      const result = await action.execute({ path: testDir, pattern: '*.md' });

      expect(result.code).toBe('Success');
      expect(result.value).toEqual([]);
    });
  });

  // ----------------------------------------------------------------------
  // FR:file-list.format — relativeTo modes
  // ----------------------------------------------------------------------
  describe('relativeTo formatting', () => {
    // @req FR:playbook-actions-io/file-list.format
    it('returns paths relative to path input when relativeTo=root', async () => {
      const subDir = path.join(testDir, 'nested');
      await fs.mkdir(subDir);
      await fs.writeFile(path.join(subDir, 'file.md'), '');

      const result = await action.execute({
        path: testDir,
        pattern: '**/*.md',
        relativeTo: 'root'
      });

      expect(result.value).toEqual(['nested/file.md']);
    });

    // @req FR:playbook-actions-io/file-list.format
    it('returns paths relative to cwd when relativeTo=cwd', async () => {
      await fs.writeFile(path.join(testDir, 'file.md'), '');

      const result = await action.execute({
        path: testDir,
        pattern: '*.md',
        relativeTo: 'cwd'
      });

      // testDir is `cwd + .tmp-test-file-list`, so the cwd-relative path
      // should include the test directory.
      expect((result.value as string[])[0]).toBe(
        path.join('.tmp-test-file-list', 'file.md')
      );
    });

    // @req FR:playbook-actions-io/file-list.format
    it('returns absolute paths when relativeTo=absolute', async () => {
      const filePath = path.join(testDir, 'file.md');
      await fs.writeFile(filePath, '');

      const result = await action.execute({
        path: testDir,
        pattern: '*.md',
        relativeTo: 'absolute'
      });

      expect(result.value).toEqual([filePath]);
    });

    // @req FR:playbook-actions-io/file-list.errors
    it('throws FileConfigInvalid for unknown relativeTo value', async () => {
      const result = await action.execute({
        path: testDir,
        // @ts-expect-error — testing invalid runtime input
        relativeTo: 'bogus'
      });

      expect(result.code).toBe('FileConfigInvalid');
      expect(result.error).toBeDefined();
    });
  });

  // ----------------------------------------------------------------------
  // FR:file-list.errors — error mapping
  // ----------------------------------------------------------------------
  describe('errors', () => {
    // @req FR:playbook-actions-io/file-list.errors
    it('returns FileNotFound when directory does not exist', async () => {
      const result = await action.execute({
        path: path.join(testDir, 'does-not-exist')
      });

      expect(result.code).toBe('FileNotFound');
      expect(result.error).toBeDefined();
    });

    // @req FR:playbook-actions-io/file-list.errors
    it('returns FileInvalidPath when path contains .. traversal', async () => {
      const result = await action.execute({
        path: '../../../etc'
      });

      expect(result.code).toBe('FileInvalidPath');
      expect(result.error).toBeDefined();
    });

    // @req FR:playbook-actions-io/file-list.errors
    it('throws FileConfigInvalid when path is missing', async () => {
      // @ts-expect-error — testing invalid runtime input
      const result = await action.execute({});

      expect(result.code).toBe('FileConfigInvalid');
      expect(result.error).toBeDefined();
    });
  });

  // ----------------------------------------------------------------------
  // FR:file-list.output — return shape
  // ----------------------------------------------------------------------
  describe('output', () => {
    // @req FR:playbook-actions-io/file-list.output
    it('returns sorted array of paths', async () => {
      await fs.writeFile(path.join(testDir, 'c.md'), '');
      await fs.writeFile(path.join(testDir, 'a.md'), '');
      await fs.writeFile(path.join(testDir, 'b.md'), '');

      const result = await action.execute({ path: testDir, pattern: '*.md' });

      expect(result.value).toEqual(['a.md', 'b.md', 'c.md']);
    });

    // @req FR:playbook-actions-io/file-list.output
    it('result message includes match count', async () => {
      await fs.writeFile(path.join(testDir, 'a.md'), '');
      await fs.writeFile(path.join(testDir, 'b.md'), '');

      const result = await action.execute({ path: testDir, pattern: '*.md' });

      expect(result.message).toMatch(/2/);
    });
  });

  // ----------------------------------------------------------------------
  // FR:file-list.input — multiple patterns, dotfiles, missing directory
  // ----------------------------------------------------------------------
  describe('patterns, dot, ignoreMissing', () => {
    // @req FR:playbook-actions-io/file-list.input
    it('accepts a list of patterns and de-duplicates matches', async () => {
      await fs.writeFile(path.join(testDir, 'a.md'), '');
      await fs.writeFile(path.join(testDir, 'b.txt'), '');
      await fs.writeFile(path.join(testDir, 'c.json'), '');

      const result = await action.execute({ path: testDir, pattern: ['*.md', '*.txt', 'a.*'] });

      expect(result.code).toBe('Success');
      expect(result.value).toEqual(['a.md', 'b.txt']);
    });

    // @req FR:playbook-actions-io/file-list.errors
    it('rejects absolute patterns and parent traversal with FileInvalidPath', async () => {
      for (const pattern of ['../outside/*.txt', '/etc/*', ['*.md', 'a/../../b/*']]) {
        const result = await action.execute({ path: testDir, pattern });
        expect(result.code).toBe('FileInvalidPath');
      }
    });

    // @req FR:playbook-actions-io/file-list.enumerate
    it('extglob keeps the restricted catalyst prompt name filter', async () => {
      await fs.writeFile(path.join(testDir, 'catalyst.fix.prompt.md'), '');
      await fs.writeFile(path.join(testDir, 'catalyst.review.custom.prompt.md'), '');
      await fs.writeFile(path.join(testDir, 'catalyst.MyNotes.prompt.md'), '');

      const result = await action.execute({ path: testDir, pattern: 'catalyst.+([a-z0-9-]).prompt.md' });

      expect(result.value).toEqual(['catalyst.fix.prompt.md']);
    });

    // @req FR:playbook-actions-io/file-list.input
    it('skips dotfiles by default and includes them when dot is true', async () => {
      await fs.writeFile(path.join(testDir, '.hidden'), '');
      await fs.writeFile(path.join(testDir, 'shown'), '');

      const hidden = await action.execute({ path: testDir });
      const all = await action.execute({ path: testDir, dot: true });

      expect(hidden.value).toEqual(['shown']);
      expect(all.value).toEqual(['.hidden', 'shown']);
    });

    // @req FR:playbook-actions-io/file-list.errors
    it('returns an empty list for a missing directory when ignoreMissing is true', async () => {
      const result = await action.execute({ path: path.join(testDir, 'nope'), ignoreMissing: true });

      expect(result.code).toBe('Success');
      expect(result.value).toEqual([]);
    });

    // @req FR:playbook-actions-io/file-list.errors
    it('rejects an empty pattern list', async () => {
      const result = await action.execute({ path: testDir, pattern: [] });

      expect(result.code).toBe('FileConfigInvalid');
    });
  });
});
