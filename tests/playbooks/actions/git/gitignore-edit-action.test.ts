// @req FR:playbook-actions-git/gitignore-edit.@action
// @req FR:playbook-actions-git/gitignore-edit.input
// @req FR:playbook-actions-git/gitignore-edit.section-model
// @req FR:playbook-actions-git/gitignore-edit.add
// @req FR:playbook-actions-git/gitignore-edit.remove
// @req FR:playbook-actions-git/gitignore-edit.idempotent
// @req FR:playbook-actions-git/gitignore-edit.errors
// @req FR:playbook-actions-git/gitignore-edit.output

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GitignoreEditAction } from '@playbooks/actions/git/gitignore-edit-action';

describe('GitignoreEditAction', () => {
  const testDir = path.join(process.cwd(), '.tmp-test-gitignore-edit');
  let action: GitignoreEditAction;

  beforeEach(async () => {
    action = new GitignoreEditAction();
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
  // FR:gitignore-edit.@action — interface
  // ----------------------------------------------------------------------
  describe('static properties', () => {
    // @req FR:playbook-actions-git/gitignore-edit.@action
    it('exposes actionType as "gitignore-edit"', () => {
      expect(GitignoreEditAction.actionType).toBe('gitignore-edit');
    });

    // @req FR:playbook-actions-git/gitignore-edit.@action
    it('exposes primaryProperty as "path" for YAML shorthand', () => {
      expect(GitignoreEditAction.primaryProperty).toBe('path');
    });
  });

  // ----------------------------------------------------------------------
  // FR:gitignore-edit.add — new file path
  // ----------------------------------------------------------------------
  describe('add on a missing file', () => {
    // @req FR:playbook-actions-git/gitignore-edit.add
    it('creates the file with the new section', async () => {
      const filePath = path.join(testDir, '.gitignore');

      const result = await action.execute({
        path: filePath,
        header: 'Build outputs',
        add: ['dist/', '*.tsbuildinfo']
      });

      expect(result.code).toBe('Success');
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBe('# Build outputs\ndist/\n*.tsbuildinfo\n');
    });

    // @req FR:playbook-actions-git/gitignore-edit.output
    it('returns changed=true with bytesWritten matching file size', async () => {
      const filePath = path.join(testDir, '.gitignore');

      const result = await action.execute({
        path: filePath,
        header: 'Build outputs',
        add: ['dist/']
      });

      const stat = await fs.stat(filePath);
      expect(result.value).toEqual({
        path: filePath,
        bytesWritten: stat.size,
        changed: true
      });
    });
  });

  // ----------------------------------------------------------------------
  // FR:gitignore-edit.add — existing file, new section
  // ----------------------------------------------------------------------
  describe('add when section does not exist', () => {
    // @req FR:playbook-actions-git/gitignore-edit.add
    it('appends a new section to the file', async () => {
      const filePath = path.join(testDir, '.gitignore');
      await fs.writeFile(filePath, '# User rules\n.env\nsecrets/\n', 'utf8');

      await action.execute({
        path: filePath,
        header: 'Build outputs',
        add: ['dist/']
      });

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBe('# User rules\n.env\nsecrets/\n\n# Build outputs\ndist/\n');
    });

    // @req FR:playbook-actions-git/gitignore-edit.add
    it('preserves user content above the new section verbatim', async () => {
      const filePath = path.join(testDir, '.gitignore');
      const userContent = 'node_modules/\n.env\n';
      await fs.writeFile(filePath, userContent, 'utf8');

      await action.execute({
        path: filePath,
        header: 'Catalyst commands',
        add: ['*']
      });

      const content = await fs.readFile(filePath, 'utf8');
      expect(content.startsWith(userContent)).toBe(true);
    });
  });

  // ----------------------------------------------------------------------
  // FR:gitignore-edit.add — section exists, splice into section
  // ----------------------------------------------------------------------
  describe('add when section exists', () => {
    // @req FR:playbook-actions-git/gitignore-edit.add
    // @req FR:playbook-actions-git/gitignore-edit.section-model
    it('appends missing patterns inside the existing section', async () => {
      const filePath = path.join(testDir, '.gitignore');
      await fs.writeFile(
        filePath,
        '# Build outputs\ndist/\n\n# User stuff\n.env\n',
        'utf8'
      );

      await action.execute({
        path: filePath,
        header: 'Build outputs',
        add: ['*.tsbuildinfo']
      });

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBe('# Build outputs\ndist/\n*.tsbuildinfo\n\n# User stuff\n.env\n');
    });

    // @req FR:playbook-actions-git/gitignore-edit.section-model
    it('matches header case-insensitively', async () => {
      const filePath = path.join(testDir, '.gitignore');
      await fs.writeFile(filePath, '# Build Outputs\ndist/\n', 'utf8');

      await action.execute({
        path: filePath,
        header: 'build outputs', // lowercase
        add: ['*.log']
      });

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBe('# Build Outputs\ndist/\n*.log\n');
    });

    // @req FR:playbook-actions-git/gitignore-edit.add
    it('does not duplicate patterns already present in the section', async () => {
      const filePath = path.join(testDir, '.gitignore');
      await fs.writeFile(filePath, '# Build outputs\ndist/\n', 'utf8');

      await action.execute({
        path: filePath,
        header: 'Build outputs',
        add: ['dist/', '*.log']
      });

      const content = await fs.readFile(filePath, 'utf8');
      const distCount = (content.match(/dist\//g) || []).length;
      expect(distCount).toBe(1);
      expect(content).toContain('*.log');
    });
  });

  // ----------------------------------------------------------------------
  // FR:gitignore-edit.remove
  // ----------------------------------------------------------------------
  describe('remove', () => {
    // @req FR:playbook-actions-git/gitignore-edit.remove
    it('deletes matching patterns from the section', async () => {
      const filePath = path.join(testDir, '.gitignore');
      await fs.writeFile(
        filePath,
        '# Build outputs\ndist/\n*.log\nold-build/\n',
        'utf8'
      );

      await action.execute({
        path: filePath,
        header: 'Build outputs',
        remove: ['old-build/']
      });

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBe('# Build outputs\ndist/\n*.log\n');
    });

    // @req FR:playbook-actions-git/gitignore-edit.remove
    it('deletes the header when the section becomes empty', async () => {
      const filePath = path.join(testDir, '.gitignore');
      await fs.writeFile(
        filePath,
        '# Keep\n.env\n\n# Build outputs\ndist/\n',
        'utf8'
      );

      await action.execute({
        path: filePath,
        header: 'Build outputs',
        remove: ['dist/']
      });

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBe('# Keep\n.env\n');
    });

    // @req FR:playbook-actions-git/gitignore-edit.remove
    it('is a no-op when the pattern is not present', async () => {
      const filePath = path.join(testDir, '.gitignore');
      await fs.writeFile(filePath, '# Build outputs\ndist/\n', 'utf8');
      const before = await fs.readFile(filePath, 'utf8');

      const result = await action.execute({
        path: filePath,
        header: 'Build outputs',
        remove: ['never-was-here']
      });

      expect(result.code).toBe('Success');
      expect((result.value as { changed: boolean }).changed).toBe(false);
      const after = await fs.readFile(filePath, 'utf8');
      expect(after).toBe(before);
    });
  });

  // ----------------------------------------------------------------------
  // FR:gitignore-edit.idempotent
  // ----------------------------------------------------------------------
  describe('idempotency', () => {
    // @req FR:playbook-actions-git/gitignore-edit.idempotent
    // @req FR:playbook-actions-git/gitignore-edit.output
    it('is a no-op when add patterns are already present', async () => {
      const filePath = path.join(testDir, '.gitignore');
      await fs.writeFile(filePath, '# Build outputs\ndist/\n*.log\n', 'utf8');
      const before = await fs.readFile(filePath, 'utf8');

      const result = await action.execute({
        path: filePath,
        header: 'Build outputs',
        add: ['dist/', '*.log']
      });

      expect(result.code).toBe('Success');
      expect(result.value).toEqual({
        path: filePath,
        bytesWritten: 0,
        changed: false
      });
      const after = await fs.readFile(filePath, 'utf8');
      expect(after).toBe(before);
    });
  });

  // ----------------------------------------------------------------------
  // FR:gitignore-edit.errors
  // ----------------------------------------------------------------------
  describe('errors', () => {
    // @req FR:playbook-actions-git/gitignore-edit.errors
    it('returns GitignoreEditConfigInvalid when path is missing', async () => {
      // @ts-expect-error — testing invalid runtime input
      const result = await action.execute({ header: 'X', add: ['*'] });

      expect(result.code).toBe('GitignoreEditConfigInvalid');
      expect(result.error).toBeDefined();
    });

    // @req FR:playbook-actions-git/gitignore-edit.errors
    it('returns GitignoreEditConfigInvalid when header is missing', async () => {
      // @ts-expect-error — testing invalid runtime input
      const result = await action.execute({
        path: path.join(testDir, '.gitignore'),
        add: ['*']
      });

      expect(result.code).toBe('GitignoreEditConfigInvalid');
    });

    // @req FR:playbook-actions-git/gitignore-edit.errors
    it('returns GitignoreEditConfigInvalid when both add and remove are absent', async () => {
      const result = await action.execute({
        path: path.join(testDir, '.gitignore'),
        header: 'X'
      });

      expect(result.code).toBe('GitignoreEditConfigInvalid');
    });

    // @req FR:playbook-actions-git/gitignore-edit.errors
    it('propagates FileInvalidPath for path traversal', async () => {
      const result = await action.execute({
        path: '../../../etc/.gitignore',
        header: 'X',
        add: ['*']
      });

      expect(result.code).toBe('FileInvalidPath');
    });
  });
});
