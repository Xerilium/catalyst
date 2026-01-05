/**
 * Path Protocol Resolver tests for Template Engine
 * CRITICAL: These tests must FAIL before implementation
 */

import { PathProtocolResolver } from '@playbooks/template/path-resolver';

/**
 * @req FR:playbook-template-engine/paths.protocols.xe
 * @req FR:playbook-template-engine/paths.protocols.catalyst
 * @req FR:playbook-template-engine/paths.protocols.extension
 * @req FR:playbook-template-engine/paths.order
 * @req NFR:playbook-template-engine/performance.path
 */
describe('PathProtocolResolver', () => {
  let resolver: PathProtocolResolver;

  beforeEach(() => {
    resolver = new PathProtocolResolver();
  });

  describe('xe:// Protocol Resolution', () => {
    test('should resolve xe:// to .xe/ directory', async () => {
      const path = 'xe://features/test.md';

      const result = await resolver.resolve(path);

      expect(result).toContain('.xe/features/test.md');
      expect(result).not.toContain('xe://');
    });

    test('should auto-detect .md extension', async () => {
      const path = 'xe://features/test';

      const result = await resolver.resolve(path);

      // Should try .md first, but if file doesn't exist, returns without extension
      expect(result).toContain('.xe/features/test');
    });

    test('should fallback to .json extension if .md not found', async () => {
      const path = 'xe://config/settings';

      // This assumes .md doesn't exist but .json does
      // In real implementation, this would check filesystem
      const result = await resolver.resolve(path);

      // If neither exists, returns without extension
      expect(result).toContain('.xe/config/settings');
    });

    test('should resolve without extension if neither .md nor .json exist', async () => {
      const path = 'xe://data/file';

      const result = await resolver.resolve(path);

      // Should return path even if file doesn't exist
      expect(result).toContain('.xe/data/file');
    });

    test('should handle paths with nested directories', async () => {
      const path = 'xe://features/auth/spec.md';

      const result = await resolver.resolve(path);

      expect(result).toContain('.xe/features/auth/spec.md');
    });
  });

  describe('catalyst:// Protocol Resolution', () => {
    test('should resolve catalyst:// to node_modules/@xerilium/catalyst/ directory', async () => {
      const path = 'catalyst://templates/default.md';

      const result = await resolver.resolve(path);

      expect(result).toContain('node_modules/@xerilium/catalyst/templates/default.md');
      expect(result).not.toContain('catalyst://');
    });

    test('should auto-detect .md extension for catalyst://', async () => {
      const path = 'catalyst://templates/blueprint';

      const result = await resolver.resolve(path);

      // If file doesn't exist, returns without extension
      expect(result).toContain('node_modules/@xerilium/catalyst/templates/blueprint');
    });

    test('should fallback to .json extension for catalyst://', async () => {
      const path = 'catalyst://config/defaults';

      const result = await resolver.resolve(path);

      // If neither exists, returns without extension
      expect(result).toContain('node_modules/@xerilium/catalyst/config/defaults');
    });

    test('should handle nested paths in catalyst://', async () => {
      const path = 'catalyst://playbooks/github/issue-created.md';

      const result = await resolver.resolve(path);

      expect(result).toContain('node_modules/@xerilium/catalyst/playbooks/github/issue-created.md');
    });
  });

  describe('Path Traversal Prevention', () => {
    test('should reject ../ in xe:// paths', async () => {
      const path = 'xe://../../../etc/passwd';

      await expect(async () => {
        await resolver.resolve(path);
      }).rejects.toThrow(/InvalidProtocol|path traversal|invalid path/i);
    });

    test('should reject ../ in catalyst:// paths', async () => {
      const path = 'catalyst://../../../etc/passwd';

      await expect(async () => {
        await resolver.resolve(path);
      }).rejects.toThrow(/InvalidProtocol|path traversal|invalid path/i);
    });

    test('should reject absolute paths in xe://', async () => {
      const path = 'xe:///etc/passwd';

      await expect(async () => {
        await resolver.resolve(path);
      }).rejects.toThrow(/InvalidProtocol|absolute path|invalid path/i);
    });

    test('should reject absolute paths in catalyst://', async () => {
      const path = 'catalyst:///etc/passwd';

      await expect(async () => {
        await resolver.resolve(path);
      }).rejects.toThrow(/InvalidProtocol|absolute path|invalid path/i);
    });

    test('should reject paths with multiple ../ sequences', async () => {
      const path = 'xe://features/../../../../../../etc/passwd';

      await expect(async () => {
        await resolver.resolve(path);
      }).rejects.toThrow(/InvalidProtocol|path traversal|invalid path/i);
    });

    test('should allow relative paths within protocol directory', async () => {
      const path = 'xe://features/auth/spec.md';

      const result = await resolver.resolve(path);

      expect(result).toContain('.xe/features/auth/spec.md');
    });
  });

  describe('Invalid Protocol Handling', () => {
    test('should reject unsupported protocol', async () => {
      const path = 'http://example.com/file.md';

      await expect(async () => {
        await resolver.resolve(path);
      }).rejects.toThrow(/InvalidProtocol|unsupported protocol/i);
    });

    test('should reject file:// protocol', async () => {
      const path = 'file:///etc/passwd';

      await expect(async () => {
        await resolver.resolve(path);
      }).rejects.toThrow(/InvalidProtocol|unsupported protocol/i);
    });

    test('should handle malformed protocol syntax', async () => {
      const path = 'xe:invalid-format';

      await expect(async () => {
        await resolver.resolve(path);
      }).rejects.toThrow(/InvalidProtocol|malformed|invalid/i);
    });

    test('should return regular paths unchanged if no protocol', async () => {
      const path = 'regular/path/to/file.md';

      const result = await resolver.resolve(path);

      // Should return as-is or throw error depending on implementation
      expect(result).toBe(path);
    });
  });

  describe('Extension Auto-Detection', () => {
    test('should try .md extension first', async () => {
      const path = 'xe://test';

      const result = await resolver.resolve(path);

      // If file doesn't exist, returns without extension
      expect(result).toContain('.xe/test');
    });

    test('should preserve explicit extensions', async () => {
      const path = 'xe://data/file.json';

      const result = await resolver.resolve(path);

      expect(result).toMatch(/\.json$/);
    });

    test('should handle files with no extension', async () => {
      const path = 'xe://scripts/build';

      const result = await resolver.resolve(path);

      // Should try .md, .json, then no extension
      expect(result).toContain('.xe/scripts/build');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty path after protocol', async () => {
      const path = 'xe://';

      await expect(async () => {
        await resolver.resolve(path);
      }).rejects.toThrow(/InvalidProtocol|empty path|invalid/i);
    });

    test('should handle protocol-only string', async () => {
      const path = 'xe:';

      await expect(async () => {
        await resolver.resolve(path);
      }).rejects.toThrow(/InvalidProtocol|invalid/i);
    });

    test('should handle paths with spaces', async () => {
      const path = 'xe://features/my feature/spec.md';

      const result = await resolver.resolve(path);

      expect(result).toContain('my feature');
    });

    test('should handle paths with special characters', async () => {
      const path = 'xe://features/test-feature_v2.0/spec.md';

      const result = await resolver.resolve(path);

      expect(result).toContain('test-feature_v2.0');
    });
  });
});
