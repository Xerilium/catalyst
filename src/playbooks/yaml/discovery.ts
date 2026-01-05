import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { LoggerSingleton } from '@core/logging';

/**
 * Playbook discovery service
 *
 * @req FR:playbook-yaml/discovery.locations
 * @req FR:playbook-yaml/discovery.extension
 * @req FR:playbook-yaml/discovery.performance
 * @req FR:playbook-yaml/discovery.naming
 * @req NFR:playbook-yaml/performance.discovery
 *
 * Discovers playbook YAML files in package and custom directories.
 * Scans both `playbooks/` (package playbooks) and `.xe/playbooks/` (custom playbooks).
 *
 * @example
 * ```typescript
 * const discovery = new PlaybookDiscovery();
 * const playbookPaths = await discovery.discover();
 *
 * console.log(`Found ${playbookPaths.length} playbooks`);
 *
 * // Load each discovered playbook
 * const loader = new PlaybookLoader();
 * for (const path of playbookPaths) {
 *   const playbook = await loader.load(path);
 *   console.log(`- ${playbook.name}: ${playbook.description}`);
 * }
 * ```
 */
export class PlaybookDiscovery {
  private readonly searchPaths: string[];

  constructor() {
    // Define search paths
    this.searchPaths = [
      path.join(process.cwd(), 'playbooks'),      // Package playbooks
      path.join(process.cwd(), '.xe/playbooks'),  // Custom playbooks
    ];
  }

  /**
   * Discover all playbook YAML files
   *
   * Scans package (playbooks/) and custom (.xe/playbooks/) directories
   * for .yaml files.
   *
   * @returns Array of absolute paths to playbook files, sorted alphabetically
   */
  async discover(): Promise<string[]> {
    const logger = LoggerSingleton.getInstance();
    const allPaths: string[] = [];

    logger.debug('PlaybookDiscovery', 'Discover', 'Discovering playbooks', { searchPaths: this.searchPaths });

    for (const searchPath of this.searchPaths) {
      try {
        // Check if directory exists
        await fs.access(searchPath);

        // Glob for .yaml files
        const pattern = path.join(searchPath, '**/*.yaml');
        const files = await glob(pattern, {
          absolute: true,
          nodir: true,
        });

        logger.trace('PlaybookDiscovery', 'Discover', 'Found playbooks in path', { path: searchPath, count: files.length });
        allPaths.push(...files);
      } catch (err) {
        // Directory doesn't exist, skip silently
        logger.trace('PlaybookDiscovery', 'Discover', 'Playbook directory not found', { path: searchPath });
        continue;
      }
    }

    // Remove duplicates and sort
    const uniquePaths = Array.from(new Set(allPaths));
    uniquePaths.sort();

    logger.debug('PlaybookDiscovery', 'Discover', 'Playbook discovery complete', { total: uniquePaths.length });

    return uniquePaths;
  }
}
