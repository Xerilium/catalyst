import { PlaybookDiscovery } from '../../../../src/playbooks/scripts/playbooks/yaml/discovery';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('PlaybookDiscovery', () => {
  let discovery: PlaybookDiscovery;

  beforeEach(() => {
    discovery = new PlaybookDiscovery();
  });

  describe('discover()', () => {
    it('should discover playbooks in playbooks/ directory', async () => {
      // This test assumes playbooks/ exists with .yaml files
      const paths = await discovery.discover();

      expect(Array.isArray(paths)).toBe(true);
      // Should find at least the package playbooks we'll create
      paths.forEach(p => {
        expect(p).toMatch(/\.yaml$/);
      });
    });

    it('should discover playbooks in .xe/playbooks/ directory', async () => {
      // Create a test playbook in .xe/playbooks/
      const testDir = path.join(process.cwd(), '.xe/playbooks');
      await fs.mkdir(testDir, { recursive: true });

      const testFile = path.join(testDir, 'test-playbook.yaml');
      await fs.writeFile(testFile, `
name: test-playbook
description: Test
owner: Engineer
steps:
  - custom-action: "test"
`);

      const paths = await discovery.discover();

      expect(paths.some(p => p.includes('test-playbook.yaml'))).toBe(true);

      // Cleanup
      await fs.unlink(testFile);
    });

    it('should filter by .yaml extension', async () => {
      const paths = await discovery.discover();

      paths.forEach(p => {
        expect(p).toMatch(/\.yaml$/);
        expect(p).not.toMatch(/\.yml$/);
        expect(p).not.toMatch(/\.txt$/);
      });
    });

    it('should handle missing directories gracefully', async () => {
      // Test when directories don't exist
      const discovery = new PlaybookDiscovery();

      await expect(discovery.discover()).resolves.toBeDefined();
    });

    it('should return sorted paths', async () => {
      const paths = await discovery.discover();

      const sorted = [...paths].sort();
      expect(paths).toEqual(sorted);
    });

    it('should return absolute paths', async () => {
      const paths = await discovery.discover();

      paths.forEach(p => {
        expect(path.isAbsolute(p)).toBe(true);
      });
    });
  });
});
