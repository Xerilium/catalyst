/**
 * Spec file parser for extracting requirement definitions.
 * @req FR:req-traceability/scan.features
 * @req FR:req-traceability/scan.initiatives
 * @req FR:req-traceability/state.values
 * @req FR:req-traceability/state.marker
 * @req FR:req-traceability/state.deprecated-format
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  RequirementDefinition,
  RequirementState,
} from '../types/index.js';
import { parseShortFormId, buildQualifiedId } from './id-parser.js';

/**
 * Regex pattern for requirement lines in spec files.
 * Matches:
 * - **FR:path.to.req**: Description
 * - **FR:path.to.req**: [deferred] Description
 * - ~~**FR:path**~~: [deprecated: FR:new.path] Description
 *
 * @req FR:req-traceability/state.marker
 * @req FR:req-traceability/state.deprecated-format
 */
const SPEC_REQ_PATTERN =
  /^[-*]\s*(?:~~)?\*\*([A-Z]+):([a-z0-9][a-z0-9.-]*)\*\*(?:~~)?:\s*(?:\[([a-z]+)(?::\s*([A-Z]+:[a-z0-9./-]+))?\]\s*)?(.+)$/;

/**
 * Parser for spec.md files that extracts requirement definitions.
 * @req FR:req-traceability/scan.features
 */
export class SpecParser {
  /**
   * Parse a single spec.md file and extract requirements.
   * @req FR:req-traceability/scan.features
   */
  async parseFile(filePath: string): Promise<RequirementDefinition[]> {
    const requirements: RequirementDefinition[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      // Extract scope from directory name
      const scope = this.extractScope(filePath);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const match = line.match(SPEC_REQ_PATTERN);

        if (match) {
          const [, typeStr, reqPath, stateStr, deprecatedTarget, text] = match;

          // Parse the short-form ID
          const shortId = parseShortFormId(`${typeStr}:${reqPath}`);
          if (!shortId) {
            // Skip malformed IDs
            continue;
          }

          // Build qualified ID with scope
          const id = buildQualifiedId(shortId, scope);

          // Determine state
          let state: RequirementState = 'active';
          if (stateStr === 'deferred') {
            state = 'deferred';
          } else if (stateStr === 'deprecated') {
            state = 'deprecated';
          }

          requirements.push({
            id,
            state,
            text: text.trim(),
            specFile: filePath,
            specLine: i + 1, // 1-indexed
            deprecatedTarget,
          });
        }
      }
    } catch (error) {
      // File doesn't exist or can't be read - return empty array
      // This is not an error, just means no requirements found
    }

    return requirements;
  }

  /**
   * Parse all spec.md files in a directory (recursively).
   * @req FR:req-traceability/scan.features
   * @req FR:req-traceability/scan.initiatives
   */
  async parseDirectory(dirPath: string): Promise<RequirementDefinition[]> {
    const requirements: RequirementDefinition[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      const parsePromises = entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const specPath = path.join(dirPath, entry.name, 'spec.md');
          return this.parseFile(specPath);
        });

      const results = await Promise.all(parsePromises);
      for (const result of results) {
        requirements.push(...result);
      }
    } catch (error) {
      // Directory doesn't exist - return empty array
    }

    return requirements;
  }

  /**
   * Extract the scope (feature/initiative name) from the file path.
   * The scope is the directory name containing the spec.md file.
   */
  private extractScope(filePath: string): string {
    const dir = path.dirname(filePath);
    return path.basename(dir);
  }
}
