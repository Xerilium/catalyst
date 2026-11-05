// @req FR:playbook-actions-io/file-glob.@action
// @req FR:playbook-actions-io/file-glob.input
// @req FR:playbook-actions-io/file-glob.match
// @req FR:playbook-actions-io/file-glob.output
// @req FR:playbook-actions-io/file-glob.errors

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileGlobAction } from '@playbooks/actions/io/file/glob-action';

describe('FileGlobAction', () => {
  const root = path.join(process.cwd(), '.tmp-test-file-glob');
  const action = new FileGlobAction();

  beforeEach(async () => {
    await fs.mkdir(path.join(root, 'sub'), { recursive: true });
    await fs.writeFile(path.join(root, 'a.md'), '');
    await fs.writeFile(path.join(root, 'b.txt'), '');
    await fs.writeFile(path.join(root, '.hidden.md'), '');
    await fs.writeFile(path.join(root, 'sub', 'c.md'), '');
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('exposes action type', () => {
    expect(FileGlobAction.actionType).toBe('file-glob');
  });

  it('matches multiple patterns, sorted absolute paths', async () => {
    const r = await action.execute({ root, patterns: ['*.txt', '**/*.md'] });
    expect(r.code).toBe('Success');
    expect(r.value).toEqual([
      path.join(root, 'a.md'),
      path.join(root, 'b.txt'),
      path.join(root, 'sub', 'c.md')
    ]);
  });

  it('accepts a single string pattern', async () => {
    const r = await action.execute({ root, patterns: '*.txt' });
    expect(r.value).toEqual([path.join(root, 'b.txt')]);
  });

  it('excludes dotfiles unless dot is true', async () => {
    expect(((await action.execute({ root, patterns: '*.md' })).value as string[]).length).toBe(1);
    expect(((await action.execute({ root, patterns: '*.md', dot: true })).value as string[]).length).toBe(2);
  });

  it('excludes directories', async () => {
    const r = await action.execute({ root, patterns: '*' });
    expect(r.value as string[]).not.toContain(path.join(root, 'sub'));
  });

  it('returns empty list for missing root', async () => {
    const r = await action.execute({ root: path.join(root, 'nope'), patterns: '*' });
    expect(r.code).toBe('Success');
    expect(r.value).toEqual([]);
  });

  it('errors on missing patterns', async () => {
    const r = await action.execute({ root } as never);
    expect(r.code).toBe('FileConfigInvalid');
  });

  it('errors on path traversal', async () => {
    const r = await action.execute({ root: '../x', patterns: '*' });
    expect(r.code).toBe('FileInvalidPath');
  });
});
