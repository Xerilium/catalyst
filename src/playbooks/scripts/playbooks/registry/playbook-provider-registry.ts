import * as path from 'path';
import { CatalystError } from '../../errors';
import type { Playbook } from '../types/playbook';
import type { PlaybookProvider } from '../types/playbook-provider';

/**
 * Singleton registry for managing playbook providers
 *
 * Provides centralized playbook loading with automatic provider selection and path resolution.
 * Enables zero-coupling architecture where features register providers without compile-time
 * dependencies.
 *
 * **Path Resolution Strategy**:
 * - Absolute paths or paths starting with ./ or ../ → used as-is
 * - Relative names → resolved against search paths ['.xe/playbooks', 'node_modules/@xerilium/catalyst/playbooks']
 * - Extensions tried: .yaml, .yml, original identifier
 * - First-wins: return first provider that successfully loads any candidate path
 *
 * **Provider Selection**:
 * - Providers checked in registration order
 * - First provider where supports(path) returns true attempts load
 * - If load returns undefined, next provider tries (allows provider chain)
 *
 * @see {@link PlaybookProvider} Provider interface
 * @see research.md § Playbook Provider Registry for design rationale
 *
 * @example
 * ```typescript
 * // Register provider (done by generated initialization code)
 * const registry = PlaybookProviderRegistry.getInstance();
 * registry.register(new YamlPlaybookProvider());
 *
 * // Load playbook (consumer code)
 * const playbook = await registry.load('start-rollout');
 * // Resolves to .xe/playbooks/start-rollout.yaml if exists
 * ```
 */
export class PlaybookProviderRegistry {
  private static instance: PlaybookProviderRegistry | null = null;

  private providers: Map<string, PlaybookProvider> = new Map();
  private providerOrder: string[] = [];

  /** Search paths for resolving relative playbook names */
  private readonly searchPaths = [
    '.xe/playbooks',
    'node_modules/@xerilium/catalyst/playbooks'
  ];

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Get singleton registry instance
   *
   * @returns The singleton PlaybookProviderRegistry instance
   */
  static getInstance(): PlaybookProviderRegistry {
    if (!PlaybookProviderRegistry.instance) {
      PlaybookProviderRegistry.instance = new PlaybookProviderRegistry();
    }
    return PlaybookProviderRegistry.instance;
  }

  /**
   * Register a playbook provider
   *
   * Providers are checked in registration order during load(). First provider
   * that supports and successfully loads a playbook wins.
   *
   * @param provider - Provider implementation to register
   * @throws {CatalystError} If provider with same name already registered
   *
   * @example
   * ```typescript
   * registry.register(new YamlPlaybookProvider());
   * ```
   */
  register(provider: PlaybookProvider): void {
    if (this.providers.has(provider.name)) {
      throw new CatalystError(
        `Provider '${provider.name}' is already registered`,
        'DuplicateProviderName',
        `A provider with name '${provider.name}' has already been registered. ` +
          `Provider names must be unique. Check your provider initialization code.`
      );
    }

    this.providers.set(provider.name, provider);
    this.providerOrder.push(provider.name);
  }

  /**
   * Unregister a provider by name
   *
   * Primarily for testing - allows cleaning up providers between tests.
   *
   * @param providerName - Name of provider to remove
   */
  unregister(providerName: string): void {
    this.providers.delete(providerName);
    this.providerOrder = this.providerOrder.filter(name => name !== providerName);
  }

  /**
   * Clear all registered providers
   *
   * Testing only - removes all providers from registry.
   */
  clearAll(): void {
    this.providers.clear();
    this.providerOrder = [];
  }

  /**
   * Get list of registered provider names
   *
   * @returns Array of provider names in registration order
   */
  getProviderNames(): string[] {
    return [...this.providerOrder];
  }

  /**
   * Load playbook using registered providers
   *
   * **Path Resolution**:
   * 1. If identifier is absolute or starts with ./ or ../, use as-is
   * 2. Otherwise, resolve against search paths with extension variants
   * 3. Try each candidate path with each provider in registration order
   * 4. Return first successful load
   *
   * @param identifier - Playbook identifier (file path or name)
   * @returns Loaded playbook, or undefined if not found
   *
   * @example
   * ```typescript
   * // Load by name (resolves to .xe/playbooks/start-rollout.yaml)
   * const playbook = await registry.load('start-rollout');
   *
   * // Load by relative path
   * const playbook = await registry.load('./custom/my-playbook.yaml');
   *
   * // Load by absolute path
   * const playbook = await registry.load('/abs/path/to/playbook.yaml');
   * ```
   */
  async load(identifier: string): Promise<Playbook | undefined> {
    const candidates = this.resolveCandidates(identifier);

    // Try each candidate path with each provider
    for (const candidatePath of candidates) {
      for (const providerName of this.providerOrder) {
        const provider = this.providers.get(providerName)!;

        if (provider.supports(candidatePath)) {
          const playbook = await provider.load(candidatePath);
          if (playbook) {
            return playbook;
          }
          // Provider returned undefined, try next provider for this path
        }
      }
    }

    return undefined;
  }

  /**
   * Resolve identifier to candidate file paths
   *
   * @param identifier - Playbook identifier
   * @returns Array of candidate paths to try
   */
  private resolveCandidates(identifier: string): string[] {
    // Absolute path or explicit relative path → use as-is
    if (path.isAbsolute(identifier) || identifier.startsWith('./') || identifier.startsWith('../')) {
      return [identifier];
    }

    // Relative name → resolve against search paths with extension variants
    const candidates: string[] = [];

    for (const searchPath of this.searchPaths) {
      const basePath = path.join(searchPath, identifier);

      // Try with extensions first
      candidates.push(`${basePath}.yaml`);
      candidates.push(`${basePath}.yml`);

      // Try original identifier (might already have extension)
      candidates.push(basePath);
    }

    return candidates;
  }
}
