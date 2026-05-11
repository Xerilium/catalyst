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
 * Path token: kebab-cased segments. Sigils per FR:id.format:
 * - `$` (entity) at start only
 * - `@` (interface) at start or after a `.`
 */
const PATH = '(?:\\$|@)?[a-z0-9][a-z0-9-]*(?:\\.@?[a-z0-9][a-z0-9-]*)*';

/**
 * Regex for bold requirement lines (matches FR parent context).
 * Simplified from spec-parser.ts — we only need type + path for context tracking.
 * @req FR:req-traceability/id.format.entity
 * @req FR:req-traceability/id.format.interface
 */
const BOLD_REQ_PATTERN =
  new RegExp(`^(?:[-*]\\s*)?(?:~~)?\\*\\*([A-Z]+):(${PATH})\\*\\*(?:~~)?`);

/**
 * Regex for heading requirement lines (matches FR parent context).
 * @req FR:req-traceability/id.format.entity
 * @req FR:req-traceability/id.format.interface
 */
const HEADING_REQ_PATTERN =
  new RegExp(`^#{2,6}\\s+([A-Z]+):(${PATH})`);

/**
 * Regex for blockquote @req dependency links.
 * Matches:
 *   > - @req FR:feature-id/fr.path
 *   > @req FR:feature-id/fr.path
 *
 * @req FR:req-traceability/deps.scan
 * @req FR:req-traceability/deps.scan.blockquote
 */
const BLOCKQUOTE_REQ_PATTERN =
  new RegExp(`^>\\s*-?\\s*@req\\s+FR:([a-z0-9-]+)\\/(${PATH})`);

/**
 * Regex for inline @req references within FR description text.
 * Matches: (@req FR:feature/path) or (@req FR:path)
 * Anchored on parens to keep noise low; literal `@req FR:` prefix
 * prevents prose tokens (e.g., currency strings like $5.00, email-like fragments) from being
 * misread as requirement IDs.
 *
 * @req FR:req-traceability/deps.scan
 * @req FR:req-traceability/deps.scan.inline
 */
const INLINE_REQ_PATTERN =
  new RegExp(`\\(@req\\s+FR:(?:([a-z0-9-]+)\\/)?(${PATH})\\)`, 'g');

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

      // Track fenced code block state — @req references inside ``` fences are
      // example/illustration, not a real cross-feature dependency declaration.
      let insideCodeFence = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Toggle fence state on lines starting with ``` (with optional language tag)
        if (/^```/.test(line)) {
          insideCodeFence = !insideCodeFence;
          continue;
        }

        if (insideCodeFence) {
          continue;
        }

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
        // @req FR:req-traceability/deps.scan.blockquote
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
          continue;
        }

        // Check for inline @req references within FR description text.
        // Only emit cross-feature edges; same-feature short-form refs are not deps.
        // Skip matches inside single-backtick code spans (illustration, not real refs).
        // @req FR:req-traceability/deps.scan.inline
        if (currentFR) {
          const codeSpans = this.findInlineCodeSpans(line);
          INLINE_REQ_PATTERN.lastIndex = 0;
          let inlineMatch: RegExpExecArray | null;
          while ((inlineMatch = INLINE_REQ_PATTERN.exec(line)) !== null) {
            if (this.isPositionInRanges(inlineMatch.index, codeSpans)) {
              continue;
            }
            const targetFeature = inlineMatch[1];
            const targetFR = inlineMatch[2];
            if (targetFeature && targetFeature !== sourceFeature) {
              dependencies.push({
                sourceFeature,
                sourceFR: currentFR,
                targetFeature,
                targetFR,
                specFile: filePath,
                specLine: i + 1,
              });
            }
          }
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

  /**
   * Find ranges of inline code spans (backtick-delimited) on a line.
   * Supports both single (`x`) and multi-backtick (``x``) spans per CommonMark —
   * a span is delimited by a run of N backticks and ends at the next run of
   * exactly N backticks. Returns inclusive [start, end] index pairs.
   * Inline @req references inside these spans are illustration, not real refs.
   */
  private findInlineCodeSpans(line: string): Array<[number, number]> {
    const spans: Array<[number, number]> = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '`') {
        const start = i;
        let runLength = 0;
        while (i < line.length && line[i] === '`') {
          runLength++;
          i++;
        }
        // Search for a closing run of exactly the same length
        let j = i;
        while (j < line.length) {
          if (line[j] === '`') {
            let closeLen = 0;
            while (j < line.length && line[j] === '`') {
              closeLen++;
              j++;
            }
            if (closeLen === runLength) {
              spans.push([start, j - 1]);
              i = j;
              break;
            }
          } else {
            j++;
          }
        }
        if (j >= line.length) {
          // No closing run found — treat opening as literal
          break;
        }
      } else {
        i++;
      }
    }
    return spans;
  }

  /**
   * Check if a position falls within any of the given ranges.
   */
  private isPositionInRanges(pos: number, ranges: Array<[number, number]>): boolean {
    for (const [start, end] of ranges) {
      if (pos >= start && pos <= end) {
        return true;
      }
    }
    return false;
  }
}
