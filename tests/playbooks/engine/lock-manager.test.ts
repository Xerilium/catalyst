import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { LockManager, type ResourceLock } from '../../../src/playbooks/scripts/engine/lock-manager';
import { CatalystError } from '../../../src/playbooks/scripts/errors';

describe('LockManager', () => {
  const testLocksDir = '.xe/runs/locks-test';
  let lockManager: LockManager;

  beforeEach(async () => {
    lockManager = new LockManager(testLocksDir);
    // Clean up test directory
    try {
      await fs.rm(testLocksDir, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testLocksDir, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  describe('acquire', () => {
    it('should acquire lock on resources', async () => {
      const resources: ResourceLock = {
        paths: ['src/api'],
        branches: ['main']
      };

      await lockManager.acquire('run-1', resources, 'user@example.com');

      const isLocked = await lockManager.isLocked(resources);
      expect(isLocked).toBe(true);
    });

    it('should create locks directory if it does not exist', async () => {
      const resources: ResourceLock = {
        paths: ['src/api']
      };

      await lockManager.acquire('run-1', resources, 'user@example.com');

      const dirExists = await fs.access(testLocksDir).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });

    it('should fail if resources are already locked', async () => {
      const resources: ResourceLock = {
        paths: ['src/api']
      };

      await lockManager.acquire('run-1', resources, 'user@example.com');

      await expect(
        lockManager.acquire('run-2', resources, 'another@example.com')
      ).rejects.toThrow(CatalystError);

      await expect(
        lockManager.acquire('run-2', resources, 'another@example.com')
      ).rejects.toThrow('run-1');
    });

    it('should detect path conflicts (parent path)', async () => {
      await lockManager.acquire('run-1', { paths: ['src'] }, 'user@example.com');

      await expect(
        lockManager.acquire('run-2', { paths: ['src/api'] }, 'another@example.com')
      ).rejects.toThrow(CatalystError);
    });

    it('should detect path conflicts (child path)', async () => {
      await lockManager.acquire('run-1', { paths: ['src/api'] }, 'user@example.com');

      await expect(
        lockManager.acquire('run-2', { paths: ['src'] }, 'another@example.com')
      ).rejects.toThrow(CatalystError);
    });

    it('should detect branch conflicts', async () => {
      await lockManager.acquire('run-1', { branches: ['main'] }, 'user@example.com');

      await expect(
        lockManager.acquire('run-2', { branches: ['main'] }, 'another@example.com')
      ).rejects.toThrow(CatalystError);
    });

    it('should allow locks on different resources', async () => {
      await lockManager.acquire('run-1', { paths: ['src/api'] }, 'user@example.com');

      await expect(
        lockManager.acquire('run-2', { paths: ['src/ui'] }, 'another@example.com')
      ).resolves.not.toThrow();
    });

    it('should allow locks on different branches', async () => {
      await lockManager.acquire('run-1', { branches: ['main'] }, 'user@example.com');

      await expect(
        lockManager.acquire('run-2', { branches: ['feature'] }, 'another@example.com')
      ).resolves.not.toThrow();
    });
  });

  describe('release', () => {
    it('should release lock and allow re-acquisition', async () => {
      const resources: ResourceLock = {
        paths: ['src/api']
      };

      await lockManager.acquire('run-1', resources, 'user@example.com');
      await lockManager.release('run-1');

      const isLocked = await lockManager.isLocked(resources);
      expect(isLocked).toBe(false);

      // Should be able to acquire again
      await expect(
        lockManager.acquire('run-2', resources, 'another@example.com')
      ).resolves.not.toThrow();
    });

    it('should not fail when releasing non-existent lock', async () => {
      await expect(
        lockManager.release('non-existent')
      ).resolves.not.toThrow();
    });
  });

  describe('isLocked', () => {
    it('should return false when no locks exist', async () => {
      const isLocked = await lockManager.isLocked({ paths: ['src/api'] });
      expect(isLocked).toBe(false);
    });

    it('should return true when resources are locked', async () => {
      await lockManager.acquire('run-1', { paths: ['src/api'] }, 'user@example.com');

      const isLocked = await lockManager.isLocked({ paths: ['src/api'] });
      expect(isLocked).toBe(true);
    });

    it('should return false after lock is released', async () => {
      await lockManager.acquire('run-1', { paths: ['src/api'] }, 'user@example.com');
      await lockManager.release('run-1');

      const isLocked = await lockManager.isLocked({ paths: ['src/api'] });
      expect(isLocked).toBe(false);
    });
  });

  describe('cleanupStale', () => {
    it('should remove expired locks', async () => {
      // Acquire lock with very short TTL
      await lockManager.acquire('run-1', { paths: ['src/api'] }, 'user@example.com', 100);

      // Wait for lock to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const cleaned = await lockManager.cleanupStale();
      expect(cleaned).toBe(1);

      const isLocked = await lockManager.isLocked({ paths: ['src/api'] });
      expect(isLocked).toBe(false);
    });

    it('should not remove active locks', async () => {
      await lockManager.acquire('run-1', { paths: ['src/api'] }, 'user@example.com', 10000);

      const cleaned = await lockManager.cleanupStale();
      expect(cleaned).toBe(0);

      const isLocked = await lockManager.isLocked({ paths: ['src/api'] });
      expect(isLocked).toBe(true);

      // Cleanup
      await lockManager.release('run-1');
    });

    it('should return 0 when locks directory does not exist', async () => {
      const cleaned = await lockManager.cleanupStale();
      expect(cleaned).toBe(0);
    });

    it('should remove corrupted lock files', async () => {
      // Create locks directory
      await fs.mkdir(testLocksDir, { recursive: true });

      // Write corrupted lock file
      await fs.writeFile(path.join(testLocksDir, 'run-corrupted.lock'), 'invalid json', 'utf-8');

      const cleaned = await lockManager.cleanupStale();
      expect(cleaned).toBe(1);
    });
  });

  describe('getAllLocks', () => {
    it('should return empty array when no locks exist', async () => {
      const locks = await lockManager.getAllLocks();
      expect(locks).toEqual([]);
    });

    it('should return all active locks', async () => {
      await lockManager.acquire('run-1', { paths: ['src/api'] }, 'user1@example.com');
      await lockManager.acquire('run-2', { paths: ['src/ui'] }, 'user2@example.com');

      const locks = await lockManager.getAllLocks();
      expect(locks).toHaveLength(2);
      expect(locks[0].runId).toBe('run-1');
      expect(locks[1].runId).toBe('run-2');
    });

    it('should not return expired locks', async () => {
      await lockManager.acquire('run-1', { paths: ['src/api'] }, 'user@example.com', 100);

      // Wait for lock to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const locks = await lockManager.getAllLocks();
      expect(locks).toEqual([]);
    });

    it('should skip corrupted lock files', async () => {
      await lockManager.acquire('run-1', { paths: ['src/api'] }, 'user@example.com');

      // Write corrupted lock file
      await fs.writeFile(path.join(testLocksDir, 'run-corrupted.lock'), 'invalid json', 'utf-8');

      const locks = await lockManager.getAllLocks();
      expect(locks).toHaveLength(1);
      expect(locks[0].runId).toBe('run-1');

      // Cleanup
      await lockManager.release('run-1');
    });
  });

  describe('atomic acquisition', () => {
    it('should write lock file atomically', async () => {
      await lockManager.acquire('run-1', { paths: ['src/api'] }, 'user@example.com');

      // Check that temp file does not exist
      const tempFile = path.join(testLocksDir, 'run-run-1.lock.tmp');
      const tempExists = await fs.access(tempFile).then(() => true).catch(() => false);
      expect(tempExists).toBe(false);

      // Check that actual lock file exists
      const lockFile = path.join(testLocksDir, 'run-run-1.lock');
      const lockExists = await fs.access(lockFile).then(() => true).catch(() => false);
      expect(lockExists).toBe(true);

      // Cleanup
      await lockManager.release('run-1');
    });
  });

  describe('lock holder information', () => {
    it('should include lock holder information in errors', async () => {
      await lockManager.acquire('run-1', { paths: ['src/api'] }, 'owner@example.com');

      try {
        await lockManager.acquire('run-2', { paths: ['src/api'] }, 'another@example.com');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        const catalystError = error as CatalystError;
        expect(catalystError.message).toContain('run-1');
        expect(catalystError.message).toContain('owner@example.com');
        expect(catalystError.code).toBe('ResourceLocked');
      }

      // Cleanup
      await lockManager.release('run-1');
    });
  });
});
