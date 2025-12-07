import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as yaml from 'js-yaml';
import type { Playbook } from '../types/playbook';
import type { PlaybookProvider } from '../types/playbook-provider';
import { PlaybookProviderRegistry } from '../registry/playbook-provider-registry';
import { transformPlaybook } from './transformer';

/**
 * Playbook provider for loading YAML files
 *
 * Loads playbooks from .yaml and .yml files. Path resolution is handled by
 * PlaybookProviderRegistry - this provider just checks file existence and
 * loads/transforms the file if it exists.
 *
 * @see {@link PlaybookProvider} Provider interface
 * @see {@link registerYamlProvider} Registration function
 *
 * @example
 * ```typescript
 * const provider = new YamlPlaybookProvider();
 * provider.supports('/path/to/playbook.yaml')  // true
 * provider.supports('/path/to/playbook.yml')   // true
 * provider.supports('/path/to/playbook.ts')    // false
 *
 * const playbook = await provider.load('/path/to/playbook.yaml');
 * ```
 */
export class YamlPlaybookProvider implements PlaybookProvider {
  readonly name = 'yaml';

  /**
   * Check if provider can load the specified file path
   *
   * Returns true for paths ending with .yaml or .yml extension.
   *
   * @param identifier - File path (already resolved by registry)
   * @returns true if identifier ends with .yaml or .yml
   */
  supports(identifier: string): boolean {
    return identifier.endsWith('.yaml') || identifier.endsWith('.yml');
  }

  /**
   * Load and transform YAML playbook file
   *
   * **Flow**:
   * 1. Check if file exists (return undefined if not)
   * 2. Read file content as UTF-8
   * 3. Parse YAML using js-yaml
   * 4. Transform to Playbook interface using YamlTransformer
   * 5. Return playbook or undefined on error
   *
   * **Error Handling**: Catches all errors (file read, YAML parse, transform) and
   * returns undefined to allow provider chain to continue. Errors are logged for debugging.
   *
   * @param identifier - File path to load (already resolved by registry)
   * @returns Playbook if loaded successfully, undefined if file not found or load failed
   */
  async load(identifier: string): Promise<Playbook | undefined> {
    try {
      // Check file exists
      if (!fs.existsSync(identifier)) {
        return undefined;
      }

      // Read file content
      const content = await fsPromises.readFile(identifier, 'utf-8');

      // Parse YAML
      const yamlContent = yaml.load(content);

      // Transform to Playbook interface
      const playbook = transformPlaybook(yamlContent);

      return playbook;
    } catch (error) {
      // Log error for debugging but return undefined to allow provider chain
      console.error(`YamlPlaybookProvider failed to load ${identifier}:`, error);
      return undefined;
    }
  }
}

/**
 * Register YAML provider with PlaybookProviderRegistry
 *
 * Called by generated initialization code during application startup.
 * Creates YamlPlaybookProvider instance and registers with singleton registry.
 *
 * @example
 * ```typescript
 * // In generated registry/initialize-providers.ts
 * import { registerYamlProvider } from '../yaml/provider';
 *
 * export function initializeProviders() {
 *   registerYamlProvider();
 * }
 * ```
 */
export function registerYamlProvider(): void {
  const registry = PlaybookProviderRegistry.getInstance();
  registry.register(new YamlPlaybookProvider());
}
