import type { Playbook } from './playbook';

/**
 * Interface for loading playbooks from various sources
 *
 * Implementations provide pluggable playbook loading from different sources (YAML files,
 * TypeScript modules, remote APIs, custom formats) without coupling consumers to specific
 * providers.
 *
 * **Design Pattern**: Inversion of control via provider registry. Providers register themselves
 * at application startup, and consumers load playbooks through the registry without knowing
 * which provider will handle the request.
 *
 * **Provider Contract**:
 * - `supports()` checks if provider can load the given identifier (file path, name, URL, etc.)
 * - `load()` attempts to load playbook, returns undefined if not found (NOT an error)
 * - Providers should handle errors gracefully and return undefined to allow provider chain
 *
 * @see {@link PlaybookProviderRegistry} Registry for managing providers
 * @see research.md § Playbook Provider Registry for design rationale
 *
 * @example
 * ```typescript
 * // YAML provider implementation
 * class YamlPlaybookProvider implements PlaybookProvider {
 *   readonly name = 'yaml';
 *
 *   supports(identifier: string): boolean {
 *     return identifier.endsWith('.yaml') || identifier.endsWith('.yml');
 *   }
 *
 *   async load(identifier: string): Promise<Playbook | undefined> {
 *     if (!fs.existsSync(identifier)) return undefined;
 *     const content = await fs.readFile(identifier, 'utf-8');
 *     return yamlTransformer.transform(content);
 *   }
 * }
 * ```
 */
export interface PlaybookProvider {
  /**
   * Unique provider identifier
   *
   * Used for registry tracking and error messages. Should be lowercase, kebab-case
   * (e.g., 'yaml', 'typescript', 'remote-api').
   */
  readonly name: string;

  /**
   * Check if provider can load the specified identifier
   *
   * Quick validation based on identifier format (file extension, URL scheme, etc.).
   * Should be fast (<1ms) as it's called for every registered provider during load.
   *
   * @param identifier - Playbook identifier (file path, name, URL, etc.)
   * @returns true if provider can attempt to load this identifier
   *
   * @example
   * ```typescript
   * supports('my-playbook.yaml')  // true for YAML provider
   * supports('my-playbook.ts')    // false for YAML provider
   * ```
   */
  supports(identifier: string): boolean;

  /**
   * Load playbook from the given identifier
   *
   * Attempts to load playbook from source. Returns undefined if playbook not found
   * or cannot be loaded (NOT an error - allows provider chain to continue).
   *
   * **Error Handling**: Providers should catch errors and return undefined to allow
   * other providers to attempt loading. Log errors for debugging but don't throw.
   *
   * @param identifier - Playbook identifier (file path resolved by registry)
   * @returns Playbook object if loaded successfully, undefined if not found or load failed
   *
   * @example
   * ```typescript
   * // File-based provider
   * async load(filePath: string): Promise<Playbook | undefined> {
   *   try {
   *     if (!fs.existsSync(filePath)) return undefined;
   *     const content = await fs.readFile(filePath, 'utf-8');
   *     return parsePlaybook(content);
   *   } catch (error) {
   *     console.error(`Failed to load ${filePath}:`, error);
   *     return undefined; // Let other providers try
   *   }
   * }
   * ```
   */
  load(identifier: string): Promise<Playbook | undefined>;
}
