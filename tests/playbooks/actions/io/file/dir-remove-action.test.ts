// @req FR:playbook-actions-io/dir-remove.@action
// @req FR:playbook-actions-io/dir-remove.input
// @req FR:playbook-actions-io/dir-remove.remove
// @req FR:playbook-actions-io/dir-remove.output
// @req FR:playbook-actions-io/dir-remove.errors

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DirRemoveAction } from '@playbooks/actions/io/file/dir-remove-action';

describe('DirRemoveAction', () => {
  const root = path.join(process.cwd(), '.tmp-test-dir-remove');
  const action = new DirRemoveAction();

  beforeEach(async () => {
    await fs.mkdir(root, { recursive: true });
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  async function fullDir(name: string): Promise<string> {
    const dir = path.join(root, name);
    await fs.mkdir(path.join(dir, 'sub'), { recursive: true });
    await fs.writeFile(path.join(dir, 'sub', 'f.txt'), 'x');
    return dir;
  }

  it('exposes action type and primary property', () => {
    expect(DirRemoveAction.actionType).toBe('dir-remove');
    expect(DirRemoveAction.primaryProperty).toBe('path');
  });

  it('removes an empty directory', async () => {
    const dir = path.join(root, 'empty');
    await fs.mkdir(dir);
    const r = await action.execute({ path: dir });
    expect(r.code).toBe('Success');
    expect(r.value).toBe(true);
    await expect(fs.stat(dir)).rejects.toThrow();
  });

  it('errors with DirNotEmpty for a non-empty directory by default', async () => {
    const dir = await fullDir('full');
    const r = await action.execute({ path: dir });
    expect(r.code).toBe('DirNotEmpty');
    await expect(fs.stat(path.join(dir, 'sub', 'f.txt'))).resolves.toBeDefined();
  });

  it('removes a non-empty directory and its contents when recursive is true', async () => {
    const dir = await fullDir('full');
    const r = await action.execute({ path: dir, recursive: true });
    expect(r.code).toBe('Success');
    expect(r.value).toBe(true);
    await expect(fs.stat(dir)).rejects.toThrow();
  });

  it('rejects recursive together with onlyEmpty', async () => {
    const dir = await fullDir('both');
    const r = await action.execute({ path: dir, recursive: true, onlyEmpty: true });
    expect(r.code).toBe('FileConfigInvalid');
    await expect(fs.stat(dir)).resolves.toBeDefined();
  });

  it('keeps a non-empty directory when onlyEmpty is true', async () => {
    const dir = await fullDir('keep');
    const r = await action.execute({ path: dir, onlyEmpty: true });
    expect(r.code).toBe('Success');
    expect(r.value).toBe(false);
    await expect(fs.stat(path.join(dir, 'sub', 'f.txt'))).resolves.toBeDefined();
  });

  it('returns false for a missing directory by default', async () => {
    const r = await action.execute({ path: path.join(root, 'nope') });
    expect(r.code).toBe('Success');
    expect(r.value).toBe(false);
  });

  it('errors with FileNotFound for a missing directory when ignoreMissing is false', async () => {
    const r = await action.execute({ path: path.join(root, 'nope'), ignoreMissing: false });
    expect(r.code).toBe('FileNotFound');
  });

  it('errors when the path is a file', async () => {
    const file = path.join(root, 'file.txt');
    await fs.writeFile(file, 'x');
    const r = await action.execute({ path: file });
    expect(r.code).toBe('FileConfigInvalid');
    await expect(fs.stat(file)).resolves.toBeDefined();
  });

  it('refuses to remove the working directory or an ancestor of it', async () => {
    const cwd = await action.execute({ path: '.', recursive: true });
    expect(cwd.code).toBe('FileInvalidPath');
    const parent = await action.execute({ path: path.dirname(process.cwd()), recursive: true });
    expect(parent.code).toBe('FileInvalidPath');
  });

  it('errors on missing path', async () => {
    const r = await action.execute({} as never);
    expect(r.code).toBe('FileConfigInvalid');
  });

  it('errors on path traversal', async () => {
    const r = await action.execute({ path: '../x' });
    expect(r.code).toBe('FileInvalidPath');
  });
});
