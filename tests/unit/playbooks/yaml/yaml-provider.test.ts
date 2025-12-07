import * as fs from 'fs';
import * as path from 'path';
import { YamlPlaybookProvider, registerYamlProvider } from '../../../../src/playbooks/scripts/playbooks/yaml/provider';
import { PlaybookProviderRegistry } from '../../../../src/playbooks/scripts/playbooks/registry/playbook-provider-registry';
import type { Playbook } from '../../../../src/playbooks/scripts/playbooks/types/playbook';

describe('YamlPlaybookProvider', () => {
  let provider: YamlPlaybookProvider;
  let testFixturesDir: string;

  beforeAll(() => {
    testFixturesDir = path.join(__dirname, '../../../fixtures/playbooks');
  });

  beforeEach(() => {
    provider = new YamlPlaybookProvider();
  });

  describe('name property', () => {
    it('returns "yaml"', () => {
      expect(provider.name).toBe('yaml');
    });
  });

  describe('supports()', () => {
    it('returns true for .yaml extension', () => {
      expect(provider.supports('playbook.yaml')).toBe(true);
      expect(provider.supports('/path/to/playbook.yaml')).toBe(true);
      expect(provider.supports('.xe/playbooks/test.yaml')).toBe(true);
    });

    it('returns true for .yml extension', () => {
      expect(provider.supports('playbook.yml')).toBe(true);
      expect(provider.supports('/path/to/playbook.yml')).toBe(true);
      expect(provider.supports('.xe/playbooks/test.yml')).toBe(true);
    });

    it('returns false for other extensions', () => {
      expect(provider.supports('playbook.json')).toBe(false);
      expect(provider.supports('playbook.ts')).toBe(false);
      expect(provider.supports('playbook.txt')).toBe(false);
      expect(provider.supports('playbook')).toBe(false);
    });
  });

  describe('load()', () => {
    it('returns playbook for valid YAML file', async () => {
      const validYamlPath = path.join(testFixturesDir, 'valid-minimal.yaml');

      const playbook = await provider.load(validYamlPath);

      expect(playbook).toBeDefined();
      expect(playbook?.name).toBeDefined();
      expect(playbook?.description).toBeDefined();
      expect(playbook?.owner).toBeDefined();
      expect(playbook?.steps).toBeInstanceOf(Array);
    });

    it('returns undefined for missing file', async () => {
      const missingPath = path.join(testFixturesDir, 'does-not-exist.yaml');

      const playbook = await provider.load(missingPath);

      expect(playbook).toBeUndefined();
    });

    it('returns undefined for invalid YAML syntax', async () => {
      const invalidYamlPath = path.join(testFixturesDir, 'invalid-syntax.yaml');

      // Create test file with invalid YAML
      if (!fs.existsSync(testFixturesDir)) {
        fs.mkdirSync(testFixturesDir, { recursive: true });
      }
      fs.writeFileSync(invalidYamlPath, 'invalid: yaml: syntax: [[[');

      const playbook = await provider.load(invalidYamlPath);

      expect(playbook).toBeUndefined();

      // Cleanup
      fs.unlinkSync(invalidYamlPath);
    });

    it('returns undefined for transformation errors', async () => {
      const malformedPath = path.join(testFixturesDir, 'malformed-structure.yaml');

      // Create test file with valid YAML but invalid structure
      if (!fs.existsSync(testFixturesDir)) {
        fs.mkdirSync(testFixturesDir, { recursive: true });
      }
      fs.writeFileSync(malformedPath, 'not: a\nvalid: playbook\nstructure: true');

      const playbook = await provider.load(malformedPath);

      expect(playbook).toBeUndefined();

      // Cleanup
      fs.unlinkSync(malformedPath);
    });

    it('handles absolute paths', async () => {
      const absolutePath = path.resolve(testFixturesDir, 'valid-minimal.yaml');

      const playbook = await provider.load(absolutePath);

      expect(playbook).toBeDefined();
    });

    it('handles relative paths', async () => {
      const relativePath = path.join('tests/fixtures/playbooks', 'valid-minimal.yaml');

      const playbook = await provider.load(relativePath);

      // May or may not exist depending on cwd, but should not throw
      expect(playbook).toBeDefined();
    });
  });
});

describe('registerYamlProvider', () => {
  let registry: PlaybookProviderRegistry;

  beforeEach(() => {
    registry = PlaybookProviderRegistry.getInstance();
    registry.clearAll();
  });

  afterEach(() => {
    registry.clearAll();
  });

  it('registers provider with PlaybookProviderRegistry', () => {
    registerYamlProvider();

    const names = registry.getProviderNames();
    expect(names).toContain('yaml');
  });

  it('provider is usable after registration', async () => {
    registerYamlProvider();

    const testPath = path.join(__dirname, '../../../fixtures/playbooks/valid-minimal.yaml');
    const playbook = await registry.load(testPath);

    expect(playbook).toBeDefined();
  });

  it('throws on duplicate registration', () => {
    registerYamlProvider();

    // Second registration should throw
    expect(() => registerYamlProvider()).toThrow();
    expect(() => registerYamlProvider()).toThrow(/already registered/);
  });
});
