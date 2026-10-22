/**
 * Tests for check document loading.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadSpecs } from '../../../src/check/documents';

describe('loadSpecs', () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-docs-'));
    for (const id of ['b', 'a', 'group/c']) {
      const dir = path.join(root, '.xe', 'features', ...id.split('/'));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'spec.md'), `# ${id}`);
      fs.writeFileSync(path.join(dir, 'feedback.md'), 'not a spec');
    }
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  // @req FR:cli-check/spec.input
  it('loads every spec.md, nested included, as sorted repo-relative POSIX paths', () => {
    const docs = loadSpecs(root);
    expect(docs.map((d) => d.path)).toEqual([
      '.xe/features/a/spec.md',
      '.xe/features/b/spec.md',
      '.xe/features/group/c/spec.md',
    ]);
    expect(docs[0].content).toBe('# a');
  });

  // @req FR:cli-check/check.input
  it('filters by exact feature ID or wildcard', () => {
    expect(loadSpecs(root, 'group/c').map((d) => d.path)).toEqual(['.xe/features/group/c/spec.md']);
    expect(loadSpecs(root, 'group/*')).toHaveLength(1);
    expect(loadSpecs(root, '?')).toHaveLength(2);
    expect(loadSpecs(root, 'nope')).toEqual([]);
  });

  // @req FR:cli-check/spec.input
  it('returns nothing when the features directory is absent', () => {
    expect(loadSpecs(path.join(root, 'empty'))).toEqual([]);
  });
});
