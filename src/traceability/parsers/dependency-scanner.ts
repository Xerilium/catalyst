/**
 * Scanner for cross-feature dependency links in spec files.
 *
 * Parses blockquote `@req` links (e.g., `> - @req FR:product-context/product.personas`)
 * to build a directed dependency graph between features at the FR level.
 *
 * @req FR:req-traceability/deps.scan
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { SpecDependency, FeatureDependencies } from '../types/dependency.js';
import { SpecParser } from './spec-parser.js';

/**
 * Regex for bold requirement lines (matches FR parent context).
 * Simplified from spec-parser.ts — we only need type + path for context tracking.
 */
const BOLD_REQ_PATTERN =
  /^(?:[-*]\s*)?(?:~~)?\*\*([A-Z]+):([a-z0-9][a-z0-9.-]*)\*\*(?:~~)?/;

/**
 * Regex for heading requirement lines (matches FR parent context).
 */
const HEADING_REQ_PATTERN =
  /^#{2,6}\s+([A-Z]+):([a-z0-9][a-z0-9.-]*)/;

/**
 * Regex for blockquote @req dependency links.
 * Matches:
 *   > - @req FR:feature-id/fr.path
 *   > @req FR:feature-id/fr.path
 *
 * @req FR:req-traceability/deps.scan
 */
const BLOCKQUOTE_REQ_PATTERN =
  /^>\s*-?\s*@req\s+FR:([a-z0-9-]+)\/([a-z0-9][a-z0-9.-]*)/;

/**
 * Scans spec.md files for cross-feature dependency declarations.
 * @req FR:req-traceability/deps.scan
 */
export class DependencyScanner {
  private specParser = new SpecParser();

  /**
   * Scan a single spec.md file for blockquote @req dependency links.
   * @req FR:req-traceability/deps.scan
   */
  async scanFile(filePath: string): Promise<SpecDependency[]> {
    const dependencies: SpecDependency[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const sourceFeature = this.extractScope(filePath);

      let currentFR: string | undefined;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Track current FR context from bold or heading patterns
        const boldMatch = line.match(BOLD_REQ_PATTERN);
        if (boldMatch) {
          currentFR = `${boldMatch[1]}:${boldMatch[2]}`;
          continue;
        }

        const headingMatch = line.match(HEADING_REQ_PATTERN);
        if (headingMatch) {
          currentFR = `${headingMatch[1]}:${headingMatch[2]}`;
          continue;
        }

        // Check for blockquote @req link
        const depMatch = line.match(BLOCKQUOTE_REQ_PATTERN);
        if (depMatch && currentFR) {
          dependencies.push({
            sourceFeature,
            sourceFR: currentFR,
            targetFeature: depMatch[1],
            targetFR: depMatch[2],
            specFile: filePath,
            specLine: i + 1, // 1-indexed
          });
        }
      }
    } catch {
      // File doesn't exist or can't be read — return empty array
    }

    return dependencies;
  }

  /**
   * Scan all spec.md files in a directory for dependency links.
   * Returns per-feature dependency data including frontmatter dependencies.
   * @req FR:req-traceability/deps.scan
   */
  async scanDirectory(dirPath: string): Promise<FeatureDependencies[]> {
    const features: FeatureDependencies[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      const scanPromises = entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const specPath = path.join(dirPath, entry.name, 'spec.md');

          // Check if spec.md exists
          try {
            await fs.access(specPath);
          } catch {
            return null;
          }

          const [dependencies, metadata] = await Promise.all([
            this.scanFile(specPath),
            this.specParser.parseFeatureMetadata(specPath),
          ]);

          return {
            featureId: entry.name,
            dependencies,
            frontmatterDeps: metadata.dependencies ?? [],
          };
        });

      const results = await Promise.all(scanPromises);
      for (const result of results) {
        if (result) {
          features.push(result);
        }
      }
    } catch {
      // Directory doesn't exist — return empty array
    }

    return features;
  }

  /**
   * Extract the scope (feature name) from the file path.
   */
  private extractScope(filePath: string): string {
    const dir = path.dirname(filePath);
    return path.basename(dir);
  }
}
