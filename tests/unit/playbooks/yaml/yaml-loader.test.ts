import * as fs from 'fs';
import * as path from 'path';
import { YamlPlaybookLoader, registerYamlLoader } from '@playbooks/yaml/loader';
import { PlaybookProvider } from '@playbooks/registry/playbook-provider';
import type { Playbook } from '@playbooks/types/playbook';

describe('YamlPlaybookLoader', () => {
  let loader: YamlPlaybookLoader;
  let testFixturesDir: string;

  beforeAll(() => {
    testFixturesDir = path.join(__dirname, '../../../fixtures/playbooks');
  });

  beforeEach(() => {
    loader = new YamlPlaybookLoader();
  });

  describe('name property', () => {
    it('returns "yaml"', () => {
      expect(loader.name).toBe('yaml');
    });
  });

  describe('supports()', () => {
    it('returns true for .yaml extension', () => {
      expect(loader.supports('playbook.yaml')).toBe(true);
      expect(loader.supports('/path/to/playbook.yaml')).toBe(true);
      expect(loader.supports('.xe/playbooks/test.yaml')).toBe(true);
    });

    it('returns true for .yml extension', () => {
      expect(loader.supports('playbook.yml')).toBe(true);
      expect(loader.supports('/path/to/playbook.yml')).toBe(true);
      expect(loader.supports('.xe/playbooks/test.yml')).toBe(true);
    });

    it('returns false for other extensions', () => {
      expect(loader.supports('playbook.json')).toBe(false);
      expect(loader.supports('playbook.ts')).toBe(false);
      expect(loader.supports('playbook.txt')).toBe(false);
      expect(loader.supports('playbook')).toBe(false);
    });
  });

  describe('load()', () => {
    it('returns playbook for valid YAML file', async () => {
      const validYamlPath = path.join(testFixturesDir, 'valid-minimal.yaml');

      const playbook = await loader.load(validYamlPath);

      expect(playbook).toBeDefined();
      expect(playbook?.name).toBeDefined();
      expect(playbook?.description).toBeDefined();
      expect(playbook?.owner).toBeDefined();
      expect(playbook?.steps).toBeInstanceOf(Array);
    });

    it('returns undefined for missing file', async () => {
      const missingPath = path.join(testFixturesDir, 'does-not-exist.yaml');

      const playbook = await loader.load(missingPath);

      expect(playbook).toBeUndefined();
    });

    it('throws error for invalid YAML syntax', async () => {
      const invalidYamlPath = path.join(testFixturesDir, 'invalid-syntax.yaml');

      // Create test file with invalid YAML
      if (!fs.existsSync(testFixturesDir)) {
        fs.mkdirSync(testFixturesDir, { recursive: true });
      }
      fs.writeFileSync(invalidYamlPath, 'invalid: yaml: syntax: [[[');

      await expect(loader.load(invalidYamlPath)).rejects.toMatchObject({
        code: 'PlaybookLoadFailed',
        message: expect.stringContaining('invalid-syntax.yaml')
      });

      // Cleanup
      fs.unlinkSync(invalidYamlPath);
    });

    it('throws error for transformation errors', async () => {
      const malformedPath = path.join(testFixturesDir, 'malformed-structure.yaml');

      // Create test file with valid YAML but invalid structure
      if (!fs.existsSync(testFixturesDir)) {
        fs.mkdirSync(testFixturesDir, { recursive: true });
      }
      fs.writeFileSync(malformedPath, 'not: a\nvalid: playbook\nstructure: true');

      await expect(loader.load(malformedPath)).rejects.toMatchObject({
        code: 'PlaybookLoadFailed',
        message: expect.stringContaining('malformed-structure.yaml')
      });

      // Cleanup
      fs.unlinkSync(malformedPath);
    });

    it('handles absolute paths', async () => {
      const absolutePath = path.resolve(testFixturesDir, 'valid-minimal.yaml');

      const playbook = await loader.load(absolutePath);

      expect(playbook).toBeDefined();
    });

    it('handles relative paths', async () => {
      const relativePath = path.join('tests/fixtures/playbooks', 'valid-minimal.yaml');

      const playbook = await loader.load(relativePath);

      // May or may not exist depending on cwd, but should not throw
      expect(playbook).toBeDefined();
    });
  });
});

describe('registerYamlLoader', () => {
  let providerInstance: PlaybookProvider;

  beforeEach(() => {
    providerInstance = PlaybookProvider.getInstance();
    providerInstance.clearAll();
  });

  afterEach(() => {
    providerInstance.clearAll();
  });

  it('registers loader with PlaybookProvider', () => {
    registerYamlLoader();

    const names = providerInstance.getProviderNames();
    expect(names).toContain('yaml');
  });

  it('loader is usable after registration', async () => {
    registerYamlLoader();

    const testPath = path.join(__dirname, '../../../fixtures/playbooks/valid-minimal.yaml');
    const playbook = await providerInstance.load(testPath);

    expect(playbook).toBeDefined();
  });

  it('throws on duplicate registration', () => {
    registerYamlLoader();

    // Second registration should throw
    expect(() => registerYamlLoader()).toThrow();
    expect(() => registerYamlLoader()).toThrow(/already registered/);
  });
});
