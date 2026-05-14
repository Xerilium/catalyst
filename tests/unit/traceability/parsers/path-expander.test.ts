/**
 * Unit tests for path pattern expansion.
 *
 * @req FR:req-traceability/scan.code
 * @req FR:req-traceability/scan.tests
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { expandPathPatterns } from '@traceability/parsers/path-expander.js';

describe('expandPathPatterns', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'path-expander-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // @req FR:req-traceability/scan.code
  it('expands `apps/**/src/` glob to matching directory paths', async () => {
    await fs.mkdir(path.join(tempDir, 'apps/foo/src'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'apps/bar/src'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'apps/baz/lib'), { recursive: true });

    const result = await expandPathPatterns(['apps/**/src/']);

    expect(result.sort()).toEqual(['apps/bar/src', 'apps/foo/src']);
  });

  // @req FR:req-traceability/scan.code
  it('passes non-glob entries through unchanged', async () => {
    const result = await expandPathPatterns(['src/', 'tests/']);
    expect(result).toEqual(['src/', 'tests/']);
  });

  // @req FR:req-traceability/scan.code
  it('mixes glob and non-glob entries', async () => {
    await fs.mkdir(path.join(tempDir, 'packages/a/src'), { recursive: true });

    const result = await expandPathPatterns(['scripts/', 'packages/**/src/']);

    expect(result).toContain('scripts/');
    expect(result).toContain('packages/a/src');
  });

  // @req FR:req-traceability/scan.code
  it('returns empty array when glob matches nothing', async () => {
    const result = await expandPathPatterns(['no-such-dir/**/src/']);
    expect(result).toEqual([]);
  });

  // @req FR:req-traceability/scan.code
  it('deduplicates overlapping glob matches', async () => {
    await fs.mkdir(path.join(tempDir, 'pkg/a'), { recursive: true });

    const result = await expandPathPatterns(['pkg/*', 'pkg/**']);

    const aMatches = result.filter((p) => p === 'pkg/a').length;
    expect(aMatches).toBe(1);
  });

  // @req FR:req-traceability/scan.code
  it('handles empty patterns array', async () => {
    const result = await expandPathPatterns([]);
    expect(result).toEqual([]);
  });
});
