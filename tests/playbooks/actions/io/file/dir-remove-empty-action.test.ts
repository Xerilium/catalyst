// @req FR:playbook-actions-io/dir-remove-empty.@action
// @req FR:playbook-actions-io/dir-remove-empty.remove
// @req FR:playbook-actions-io/dir-remove-empty.output
// @req FR:playbook-actions-io/dir-remove-empty.errors

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DirRemoveEmptyAction } from '@playbooks/actions/io/file/dir-remove-empty-action';

describe('DirRemoveEmptyAction', () => {
  const root = path.join(process.cwd(), '.tmp-test-dir-remove-empty');
  const action = new DirRemoveEmptyAction();

  beforeEach(async () => {
    await fs.mkdir(root, { recursive: true });
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('exposes action type and primary property', () => {
    expect(DirRemoveEmptyAction.actionType).toBe('dir-remove-empty');
    expect(DirRemoveEmptyAction.primaryProperty).toBe('path');
  });

  it('removes an empty directory', async () => {
    const dir = path.join(root, 'empty');
    await fs.mkdir(dir);
    const r = await action.execute({ path: dir });
    expect(r.code).toBe('Success');
    expect(r.value).toBe(true);
    await expect(fs.stat(dir)).rejects.toThrow();
  });

  it('keeps a non-empty directory', async () => {
    const dir = path.join(root, 'full');
    await fs.mkdir(dir);
    await fs.writeFile(path.join(dir, 'f'), '');
    const r = await action.execute({ path: dir });
    expect(r.code).toBe('Success');
    expect(r.value).toBe(false);
    await expect(fs.stat(dir)).resolves.toBeDefined();
  });

  it('returns false for missing directory', async () => {
    const r = await action.execute({ path: path.join(root, 'nope') });
    expect(r.code).toBe('Success');
    expect(r.value).toBe(false);
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
