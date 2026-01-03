import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as yaml from 'js-yaml';
import type { Playbook } from '../types/playbook';
import type { PlaybookLoader } from '../types/playbook-loader';
import { PlaybookProvider } from '../registry/playbook-provider';
import { transformPlaybook } from './transformer';

/**
 * Playbook loader for loading YAML files
 *
 * @req FR:playbook-yaml/provider.interface
 * @req FR:playbook-yaml/provider.existence
 * @req FR:playbook-yaml/provider.transformation
 * @req FR:playbook-yaml/provider.registration
 *
 * Loads playbooks from .yaml and .yml files. Path resolution is handled by
 * PlaybookProvider - this loader just checks file existence and
 * loads/transforms the file if it exists.
 *
 * @see {@link PlaybookLoader} Loader interface
 * @see {@link registerYamlLoader} Registration function
 *
 * @example
 * ```typescript
 * const loader = new YamlPlaybookLoader();
 * loader.supports('/path/to/playbook.yaml')  // true
 * loader.supports('/path/to/playbook.yml')   // true
 * loader.supports('/path/to/playbook.ts')    // false
 *
 * const playbook = await loader.load('/path/to/playbook.yaml');
 * ```
 */
export class YamlPlaybookLoader implements PlaybookLoader {
  readonly name = 'yaml';

  /**
   * Check if loader can load the specified file path
   *
   * Returns true for paths ending with .yaml or .yml extension.
   *
   * @param identifier - File path (already resolved by PlaybookProvider)
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
   * returns undefined to allow loader chain to continue. Errors are logged for debugging.
   *
   * @param identifier - File path to load (already resolved by PlaybookProvider)
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
      // Log error for debugging but return undefined to allow loader chain
      console.error(`YamlPlaybookLoader failed to load ${identifier}:`, error);
      return undefined;
    }
  }
}

/**
 * Register YAML loader with PlaybookProvider
 *
 * @req FR:playbook-yaml/provider.registration - Registers provider with PlaybookProvider
 * @req FR:playbook-yaml/provider.initialization - Called during application startup
 *
 * Called by generated initialization code during application startup.
 * Creates YamlPlaybookLoader instance and registers with singleton provider.
 *
 * @example
 * ```typescript
 * // In generated registry/initialize-providers.ts
 * import { registerYamlLoader } from '../yaml/provider';
 *
 * export function initializeProviders() {
 *   registerYamlLoader();
 * }
 * ```
 */
export function registerYamlLoader(): void {
  const provider = PlaybookProvider.getInstance();
  provider.register(new YamlPlaybookLoader());
}
