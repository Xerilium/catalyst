import { PlaybookProvider } from '@playbooks/registry/playbook-provider';
import type { PlaybookLoader } from '@playbooks/types/playbook-loader';
import type { Playbook } from '@playbooks/types/playbook';
import { CatalystError } from '@core/errors';

/**
 * @req NFR:playbook-definition/testability.coverage
 */
describe('PlaybookProvider', () => {
  let providerInstance: PlaybookProvider;

  // Mock loader for testing
  class MockLoader implements PlaybookLoader {
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
    providerInstance = PlaybookProvider.getInstance();
    providerInstance.clearAll(); // Clean slate for each test
  });

  afterEach(() => {
    providerInstance.clearAll(); // Cleanup after each test
  });

  describe('Singleton pattern', () => {
    it('getInstance() returns same singleton instance on multiple calls', () => {
      const instance1 = PlaybookProvider.getInstance();
      const instance2 = PlaybookProvider.getInstance();
      const instance3 = PlaybookProvider.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  describe('register()', () => {
    it('adds loader to provider', () => {
      const loader = new MockLoader('yaml', ['.yaml', '.yml']);

      providerInstance.register(loader);

      const names = providerInstance.getProviderNames();
      expect(names).toEqual(['yaml']);
    });

    it('throws CatalystError with code DuplicateProviderName for duplicate', () => {
      const loader1 = new MockLoader('yaml', ['.yaml']);
      const loader2 = new MockLoader('yaml', ['.yml']);

      providerInstance.register(loader1);

      expect(() => providerInstance.register(loader2)).toThrow(CatalystError);
      expect(() => providerInstance.register(loader2)).toThrow(/already registered/);

      try {
        providerInstance.register(loader2);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        expect((error as CatalystError).code).toBe('DuplicateLoaderName');
        expect((error as CatalystError).message).toContain('yaml');
      }
    });

    it('allows multiple loaders with different names', () => {
      const yamlLoader = new MockLoader('yaml', ['.yaml']);
      const jsonLoader = new MockLoader('json', ['.json']);
      const tsLoader = new MockLoader('typescript', ['.ts']);

      providerInstance.register(yamlLoader);
      providerInstance.register(jsonLoader);
      providerInstance.register(tsLoader);

      const names = providerInstance.getProviderNames();
      expect(names).toEqual(['yaml', 'json', 'typescript']);
    });
  });

  describe('load()', () => {
    it('returns playbook from first matching loader', async () => {
      const yamlLoader = new MockLoader('yaml', ['.yaml', '.yml']);
      const mockPlaybook: Playbook = {
        name: 'test-playbook',
        description: 'Test',
        owner: 'Engineer',
        steps: []
      };

      yamlLoader.addPlaybook('.xe/playbooks/test.yaml', mockPlaybook);
      providerInstance.register(yamlLoader);

      const result = await providerInstance.load('test');

      expect(result).toEqual(mockPlaybook);
    });

    it('checks loaders in registration order', async () => {
      const loader1 = new MockLoader('loader1', ['.yaml']);
      const loader2 = new MockLoader('loader2', ['.yaml']);

      const playbook1: Playbook = {
        name: 'playbook1',
        description: 'From loader 1',
        owner: 'Engineer',
        steps: []
      };

      const playbook2: Playbook = {
        name: 'playbook2',
        description: 'From loader 2',
        owner: 'Engineer',
        steps: []
      };

      loader1.addPlaybook('.xe/playbooks/test.yaml', playbook1);
      loader2.addPlaybook('.xe/playbooks/test.yaml', playbook2);

      // Register in order: loader1, then loader2
      providerInstance.register(loader1);
      providerInstance.register(loader2);

      const result = await providerInstance.load('test');

      // Should return from loader1 (first in order)
      expect(result).toEqual(playbook1);
    });

    it('returns undefined when no loader supports identifier', async () => {
      const yamlLoader = new MockLoader('yaml', ['.yaml']);
      providerInstance.register(yamlLoader);

      // No loader supports .txt
      const result = await providerInstance.load('test.txt');

      expect(result).toBeUndefined();
    });

    it('tries next loader if first returns undefined', async () => {
      const loader1 = new MockLoader('loader1', ['.yaml']);
      const loader2 = new MockLoader('loader2', ['.yaml']);

      const playbook2: Playbook = {
        name: 'playbook2',
        description: 'From loader 2',
        owner: 'Engineer',
        steps: []
      };

      // loader1 supports but doesn't have the file
      // loader2 has the file
      loader2.addPlaybook('.xe/playbooks/test.yaml', playbook2);

      providerInstance.register(loader1);
      providerInstance.register(loader2);

      const result = await providerInstance.load('test');

      // Should fallback to loader2
      expect(result).toEqual(playbook2);
    });

    it('resolves absolute paths as-is', async () => {
      const yamlLoader = new MockLoader('yaml', ['.yaml']);
      const mockPlaybook: Playbook = {
        name: 'test',
        description: 'Test',
        owner: 'Engineer',
        steps: []
      };

      yamlLoader.addPlaybook('/absolute/path/playbook.yaml', mockPlaybook);
      providerInstance.register(yamlLoader);

      const result = await providerInstance.load('/absolute/path/playbook.yaml');

      expect(result).toEqual(mockPlaybook);
    });

    it('resolves paths starting with ./ as-is', async () => {
      const yamlLoader = new MockLoader('yaml', ['.yaml']);
      const mockPlaybook: Playbook = {
        name: 'test',
        description: 'Test',
        owner: 'Engineer',
        steps: []
      };

      yamlLoader.addPlaybook('./relative/playbook.yaml', mockPlaybook);
      providerInstance.register(yamlLoader);

      const result = await providerInstance.load('./relative/playbook.yaml');

      expect(result).toEqual(mockPlaybook);
    });

    it('tries search paths with extension variants for relative names', async () => {
      const yamlLoader = new MockLoader('yaml', ['.yaml', '.yml']);
      const mockPlaybook: Playbook = {
        name: 'test',
        description: 'Test',
        owner: 'Engineer',
        steps: []
      };

      // Should try: .xe/playbooks/test.yaml, .xe/playbooks/test.yml, .xe/playbooks/test,
      //             node_modules/@xerilium/catalyst/playbooks/test.yaml, etc.
      yamlLoader.addPlaybook('.xe/playbooks/test.yaml', mockPlaybook);
      providerInstance.register(yamlLoader);

      const result = await providerInstance.load('test');

      expect(result).toEqual(mockPlaybook);
    });
  });

  describe('unregister()', () => {
    it('removes loader by name', () => {
      const loader = new MockLoader('yaml', ['.yaml']);
      providerInstance.register(loader);

      expect(providerInstance.getProviderNames()).toEqual(['yaml']);

      providerInstance.unregister('yaml');

      expect(providerInstance.getProviderNames()).toEqual([]);
    });

    it('handles unregistering non-existent loader gracefully', () => {
      expect(() => providerInstance.unregister('nonexistent')).not.toThrow();
    });
  });

  describe('clearAll()', () => {
    it('removes all loaders', () => {
      const loader1 = new MockLoader('yaml', ['.yaml']);
      const loader2 = new MockLoader('json', ['.json']);

      providerInstance.register(loader1);
      providerInstance.register(loader2);

      expect(providerInstance.getProviderNames()).toEqual(['yaml', 'json']);

      providerInstance.clearAll();

      expect(providerInstance.getProviderNames()).toEqual([]);
    });
  });

  describe('getProviderNames()', () => {
    it('returns array of registered names in registration order', () => {
      const loader1 = new MockLoader('yaml', ['.yaml']);
      const loader2 = new MockLoader('json', ['.json']);
      const loader3 = new MockLoader('typescript', ['.ts']);

      providerInstance.register(loader1);
      providerInstance.register(loader2);
      providerInstance.register(loader3);

      const names = providerInstance.getProviderNames();

      expect(names).toEqual(['yaml', 'json', 'typescript']);
    });

    it('returns empty array when no loaders registered', () => {
      const names = providerInstance.getProviderNames();

      expect(names).toEqual([]);
    });
  });

  describe('Performance', () => {
    it('registration completes in <5ms per loader', () => {
      const loader = new MockLoader('yaml', ['.yaml']);

      const start = Date.now();
      providerInstance.register(loader);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5);
    });

    it('load operation completes in <10ms for 10 loaders', async () => {
      // Register 10 loaders
      for (let i = 0; i < 10; i++) {
        const loader = new MockLoader(`loader${i}`, [`.ext${i}`]);
        providerInstance.register(loader);
      }

      // Add playbook to last loader (worst case - checks all)
      const lastLoader = new MockLoader('yaml', ['.yaml']);
      const mockPlaybook: Playbook = {
        name: 'test',
        description: 'Test',
        owner: 'Engineer',
        steps: []
      };
      lastLoader.addPlaybook('.xe/playbooks/test.yaml', mockPlaybook);
      providerInstance.register(lastLoader);

      const start = Date.now();
      await providerInstance.load('test');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10);
    });
  });
});
