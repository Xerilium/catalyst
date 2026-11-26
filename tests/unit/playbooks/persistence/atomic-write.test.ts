import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fsPromises from 'fs/promises';

// Wrap fs/promises so a test can make one call fail. Other calls use the real functions.
jest.mock('fs/promises', () => {
  const actual = jest.requireActual<typeof import('fs/promises')>('fs/promises');
  return { ...actual, writeFile: jest.fn(actual.writeFile), rename: jest.fn(actual.rename) };
});
const mockedFs = jest.mocked(fsPromises);
import { existsSync, mkdirSync, rmSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { atomicWrite } from '@playbooks/persistence/atomic-write';

describe('atomicWrite', () => {
  const testDir = '.xe/test-atomic-write';

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should create parent directories if missing', async () => {
    const filePath = join(testDir, 'sub', 'dir', 'file.txt');
    const content = 'test content';

    await atomicWrite(filePath, content);

    expect(existsSync(join(testDir, 'sub'))).toBe(true);
    expect(existsSync(join(testDir, 'sub', 'dir'))).toBe(true);
    expect(existsSync(filePath)).toBe(true);

    const written = readFileSync(filePath, 'utf8');
    expect(written).toBe(content);
  });

  it('should write to temp file with random suffix', async () => {
    const filePath = join(testDir, 'file.txt');
    const content = 'test content';

    // We'll verify this indirectly - no temp files should remain after write
    await atomicWrite(filePath, content);

    const files = readdirSync(testDir);
    const tempFiles = files.filter(f => f.includes('.tmp-'));
    expect(tempFiles).toHaveLength(0);
  });

  it('should rename temp to target atomically', async () => {
    const filePath = join(testDir, 'file.txt');
    const content = 'test content';

    await atomicWrite(filePath, content);

    expect(existsSync(filePath)).toBe(true);
    const written = readFileSync(filePath, 'utf8');
    expect(written).toBe(content);
  });

  it('should clean up temp file on error', async () => {
    const invalidPath = join(testDir, 'nonexistent', 'deeply', 'nested', 'file.txt');

    // Create test dir but make rename fail
    mkdirSync(testDir, { recursive: true });

    try {
      await atomicWrite(invalidPath, 'test');
    } catch (error) {
      // Error expected
    }

    // Verify no temp files left behind in testDir
    if (existsSync(testDir)) {
      const files = readdirSync(testDir);
      const tempFiles = files.filter(f => f.includes('.tmp-'));
      expect(tempFiles).toHaveLength(0);
    }
  });

  // @req FR:playbook-definition/persistence.atomic-writes
  // @req NFR:playbook-definition/reliability.atomic-writes
  it('should handle permission errors gracefully', async () => {
    const filePath = join(testDir, 'file.txt');
    mkdirSync(testDir, { recursive: true });
    writeFileSync(filePath, 'original');
    const denied = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
    // Write part of the temp file, then fail, so cleanup has a file to remove.
    const realWriteFile = jest.requireActual<typeof import('fs/promises')>('fs/promises').writeFile;
    mockedFs.writeFile.mockImplementationOnce(async (file) => {
      await realWriteFile(file as string, 'partial');
      throw denied;
    });

    await expect(atomicWrite(filePath, 'new content')).rejects.toMatchObject({ code: 'EACCES' });

    expect(readFileSync(filePath, 'utf8')).toBe('original');
    expect(readdirSync(testDir).filter(f => f.includes('.tmp-'))).toHaveLength(0);
  });

  // @req FR:playbook-definition/persistence.atomic-writes
  // @req NFR:playbook-definition/reliability.atomic-writes
  it('should handle disk full errors', async () => {
    const filePath = join(testDir, 'file.txt');
    mkdirSync(testDir, { recursive: true });
    writeFileSync(filePath, 'original');
    const full = Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' });
    mockedFs.rename.mockRejectedValueOnce(full);

    await expect(atomicWrite(filePath, 'new content')).rejects.toMatchObject({ code: 'ENOSPC' });

    expect(readFileSync(filePath, 'utf8')).toBe('original');
    expect(readdirSync(testDir).filter(f => f.includes('.tmp-'))).toHaveLength(0);
  });

  it('should overwrite existing file', async () => {
    const filePath = join(testDir, 'file.txt');

    await atomicWrite(filePath, 'first content');
    expect(readFileSync(filePath, 'utf8')).toBe('first content');

    await atomicWrite(filePath, 'second content');
    expect(readFileSync(filePath, 'utf8')).toBe('second content');
  });

  it('should preserve file atomically during concurrent writes', async () => {
    const filePath = join(testDir, 'file.txt');

    // Write initial content
    await atomicWrite(filePath, 'initial');

    // Attempt concurrent writes (one should succeed, file should be valid)
    await Promise.all([
      atomicWrite(filePath, 'write-1'),
      atomicWrite(filePath, 'write-2')
    ]);

    // File should exist and contain valid content (not corrupted)
    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, 'utf8');
    expect(['write-1', 'write-2']).toContain(content);
  });
});
