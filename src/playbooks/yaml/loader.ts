import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as yaml from 'js-yaml';
import type { Playbook } from '../types/playbook';
import type { PlaybookLoader } from '../types/playbook-loader';
import { PlaybookProvider } from '../registry/playbook-provider';
import { transformPlaybook } from './transformer';
import { LoggerSingleton } from '@core/logging';
import { CatalystError } from '@core/errors';

/**
 * Playbook loader for loading YAML files
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
   * 5. Return playbook or throw error on failure
   *
   * **Error Handling**: Returns undefined only for "file not found".
   * Throws CatalystError for load failures (YAML parse, transform errors).
   *
   * @param identifier - File path to load (already resolved by PlaybookProvider)
   * @returns Playbook if loaded successfully, undefined if file not found
   * @throws {CatalystError} If file exists but fails to load (parse/transform error)
   */
  async load(identifier: string): Promise<Playbook | undefined> {
    const logger = LoggerSingleton.getInstance();

    // Check file exists - return undefined to allow loader chain to continue
    if (!fs.existsSync(identifier)) {
      logger.trace('YamlPlaybookLoader', 'Load', 'YAML file not found', { path: identifier });
      return undefined;
    }

    logger.debug('YamlPlaybookLoader', 'Load', 'Loading YAML playbook', { path: identifier });

    try {
      // Read file content
      const content = await fsPromises.readFile(identifier, 'utf-8');

      // Parse YAML
      const yamlContent = yaml.load(content);

      // Transform to Playbook interface
      const playbook = transformPlaybook(yamlContent);

      logger.trace('YamlPlaybookLoader', 'Load', 'YAML playbook loaded', { name: playbook.name, steps: playbook.steps?.length });

      return playbook;
    } catch (error) {
      // File exists but failed to load - throw error with details
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new CatalystError(
        `Failed to load playbook "${identifier}": ${errorMessage}`,
        'PlaybookLoadFailed',
        'Check the playbook YAML syntax and structure.',
        error instanceof Error ? error : undefined
      );
    }
  }
}

/**
 * Register YAML loader with PlaybookProvider
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
