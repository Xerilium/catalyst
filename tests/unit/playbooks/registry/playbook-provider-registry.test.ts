import { PlaybookProviderRegistry } from '../../../../src/playbooks/scripts/playbooks/registry/playbook-provider-registry';
import type { PlaybookProvider } from '../../../../src/playbooks/scripts/playbooks/types/playbook-provider';
import type { Playbook } from '../../../../src/playbooks/scripts/playbooks/types/playbook';
import { CatalystError } from '../../../../src/playbooks/scripts/errors';

describe('PlaybookProviderRegistry', () => {
  let registry: PlaybookProviderRegistry;

  // Mock provider for testing
  class MockProvider implements PlaybookProvider {
    constructor(
      public readonly name: string,
      private readonly supportedExtensions: string[],
      private readonly playbooks: Map<string, Playbook> = new Map()
    ) {}

    supports(identifier: string): boolean {
      return this.supportedExtensions.some(ext => identifier.endsWith(ext));
    }

    async load(identifier: string): Promise<Playbook | undefined> {
      return this.playbooks.get(identifier);
    }

    // Helper for tests
    addPlaybook(path: string, playbook: Playbook): void {
      this.playbooks.set(path, playbook);
    }
  }

  beforeEach(() => {
    registry = PlaybookProviderRegistry.getInstance();
    registry.clearAll(); // Clean slate for each test
  });

  afterEach(() => {
    registry.clearAll(); // Cleanup after each test
  });

  describe('Singleton pattern', () => {
    it('getInstance() returns same singleton instance on multiple calls', () => {
      const instance1 = PlaybookProviderRegistry.getInstance();
      const instance2 = PlaybookProviderRegistry.getInstance();
      const instance3 = PlaybookProviderRegistry.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  describe('register()', () => {
    it('adds provider to registry', () => {
      const provider = new MockProvider('yaml', ['.yaml', '.yml']);

      registry.register(provider);

      const names = registry.getProviderNames();
      expect(names).toEqual(['yaml']);
    });

    it('throws CatalystError with code DuplicateProviderName for duplicate', () => {
      const provider1 = new MockProvider('yaml', ['.yaml']);
      const provider2 = new MockProvider('yaml', ['.yml']);

      registry.register(provider1);

      expect(() => registry.register(provider2)).toThrow(CatalystError);
      expect(() => registry.register(provider2)).toThrow(/already registered/);

      try {
        registry.register(provider2);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        expect((error as CatalystError).code).toBe('DuplicateProviderName');
        expect((error as CatalystError).message).toContain('yaml');
      }
    });

    it('allows multiple providers with different names', () => {
      const yamlProvider = new MockProvider('yaml', ['.yaml']);
      const jsonProvider = new MockProvider('json', ['.json']);
      const tsProvider = new MockProvider('typescript', ['.ts']);

      registry.register(yamlProvider);
      registry.register(jsonProvider);
      registry.register(tsProvider);

      const names = registry.getProviderNames();
      expect(names).toEqual(['yaml', 'json', 'typescript']);
    });
  });

  describe('load()', () => {
    it('returns playbook from first matching provider', async () => {
      const yamlProvider = new MockProvider('yaml', ['.yaml', '.yml']);
      const mockPlaybook: Playbook = {
        name: 'test-playbook',
        description: 'Test',
        owner: 'Engineer',
        steps: []
      };

      yamlProvider.addPlaybook('.xe/playbooks/test.yaml', mockPlaybook);
      registry.register(yamlProvider);

      const result = await registry.load('test');

      expect(result).toEqual(mockPlaybook);
    });

    it('checks providers in registration order', async () => {
      const provider1 = new MockProvider('provider1', ['.yaml']);
      const provider2 = new MockProvider('provider2', ['.yaml']);

      const playbook1: Playbook = {
        name: 'playbook1',
        description: 'From provider 1',
        owner: 'Engineer',
        steps: []
      };

      const playbook2: Playbook = {
        name: 'playbook2',
        description: 'From provider 2',
        owner: 'Engineer',
        steps: []
      };

      provider1.addPlaybook('.xe/playbooks/test.yaml', playbook1);
      provider2.addPlaybook('.xe/playbooks/test.yaml', playbook2);

      // Register in order: provider1, then provider2
      registry.register(provider1);
      registry.register(provider2);

      const result = await registry.load('test');

      // Should return from provider1 (first in order)
      expect(result).toEqual(playbook1);
    });

    it('returns undefined when no provider supports identifier', async () => {
      const yamlProvider = new MockProvider('yaml', ['.yaml']);
      registry.register(yamlProvider);

      // No provider supports .txt
      const result = await registry.load('test.txt');

      expect(result).toBeUndefined();
    });

    it('tries next provider if first returns undefined', async () => {
      const provider1 = new MockProvider('provider1', ['.yaml']);
      const provider2 = new MockProvider('provider2', ['.yaml']);

      const playbook2: Playbook = {
        name: 'playbook2',
        description: 'From provider 2',
        owner: 'Engineer',
        steps: []
      };

      // provider1 supports but doesn't have the file
      // provider2 has the file
      provider2.addPlaybook('.xe/playbooks/test.yaml', playbook2);

      registry.register(provider1);
      registry.register(provider2);

      const result = await registry.load('test');

      // Should fallback to provider2
      expect(result).toEqual(playbook2);
    });

    it('resolves absolute paths as-is', async () => {
      const yamlProvider = new MockProvider('yaml', ['.yaml']);
      const mockPlaybook: Playbook = {
        name: 'test',
        description: 'Test',
        owner: 'Engineer',
        steps: []
      };

      yamlProvider.addPlaybook('/absolute/path/playbook.yaml', mockPlaybook);
      registry.register(yamlProvider);

      const result = await registry.load('/absolute/path/playbook.yaml');

      expect(result).toEqual(mockPlaybook);
    });

    it('resolves paths starting with ./ as-is', async () => {
      const yamlProvider = new MockProvider('yaml', ['.yaml']);
      const mockPlaybook: Playbook = {
        name: 'test',
        description: 'Test',
        owner: 'Engineer',
        steps: []
      };

      yamlProvider.addPlaybook('./relative/playbook.yaml', mockPlaybook);
      registry.register(yamlProvider);

      const result = await registry.load('./relative/playbook.yaml');

      expect(result).toEqual(mockPlaybook);
    });

    it('tries search paths with extension variants for relative names', async () => {
      const yamlProvider = new MockProvider('yaml', ['.yaml', '.yml']);
      const mockPlaybook: Playbook = {
        name: 'test',
        description: 'Test',
        owner: 'Engineer',
        steps: []
      };

      // Should try: .xe/playbooks/test.yaml, .xe/playbooks/test.yml, .xe/playbooks/test,
      //             node_modules/@xerilium/catalyst/playbooks/test.yaml, etc.
      yamlProvider.addPlaybook('.xe/playbooks/test.yaml', mockPlaybook);
      registry.register(yamlProvider);

      const result = await registry.load('test');

      expect(result).toEqual(mockPlaybook);
    });
  });

  describe('unregister()', () => {
    it('removes provider by name', () => {
      const provider = new MockProvider('yaml', ['.yaml']);
      registry.register(provider);

      expect(registry.getProviderNames()).toEqual(['yaml']);

      registry.unregister('yaml');

      expect(registry.getProviderNames()).toEqual([]);
    });

    it('handles unregistering non-existent provider gracefully', () => {
      expect(() => registry.unregister('nonexistent')).not.toThrow();
    });
  });

  describe('clearAll()', () => {
    it('removes all providers', () => {
      const provider1 = new MockProvider('yaml', ['.yaml']);
      const provider2 = new MockProvider('json', ['.json']);

      registry.register(provider1);
      registry.register(provider2);

      expect(registry.getProviderNames()).toEqual(['yaml', 'json']);

      registry.clearAll();

      expect(registry.getProviderNames()).toEqual([]);
    });
  });

  describe('getProviderNames()', () => {
    it('returns array of registered names in registration order', () => {
      const provider1 = new MockProvider('yaml', ['.yaml']);
      const provider2 = new MockProvider('json', ['.json']);
      const provider3 = new MockProvider('typescript', ['.ts']);

      registry.register(provider1);
      registry.register(provider2);
      registry.register(provider3);

      const names = registry.getProviderNames();

      expect(names).toEqual(['yaml', 'json', 'typescript']);
    });

    it('returns empty array when no providers registered', () => {
      const names = registry.getProviderNames();

      expect(names).toEqual([]);
    });
  });

  describe('Performance', () => {
    it('registration completes in <5ms per provider', () => {
      const provider = new MockProvider('yaml', ['.yaml']);

      const start = Date.now();
      registry.register(provider);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5);
    });

    it('load operation completes in <10ms for 10 providers', async () => {
      // Register 10 providers
      for (let i = 0; i < 10; i++) {
        const provider = new MockProvider(`provider${i}`, [`.ext${i}`]);
        registry.register(provider);
      }

      // Add playbook to last provider (worst case - checks all)
      const lastProvider = new MockProvider('yaml', ['.yaml']);
      const mockPlaybook: Playbook = {
        name: 'test',
        description: 'Test',
        owner: 'Engineer',
        steps: []
      };
      lastProvider.addPlaybook('.xe/playbooks/test.yaml', mockPlaybook);
      registry.register(lastProvider);

      const start = Date.now();
      await registry.load('test');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10);
    });
  });
});
