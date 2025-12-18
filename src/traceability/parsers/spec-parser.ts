/**
 * Spec file parser for extracting requirement definitions.
 * @req FR:req-traceability/scan.features
 * @req FR:req-traceability/scan.initiatives
 * @req FR:req-traceability/state.values
 * @req FR:req-traceability/state.marker
 * @req FR:req-traceability/state.deprecated-format
 * @req FR:req-traceability/severity.syntax
 * @req FR:req-traceability/severity.defaults
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  RequirementDefinition,
  RequirementState,
  RequirementSeverity,
} from '../types/index.js';
import { parseShortFormId, buildQualifiedId } from './id-parser.js';

/**
 * Regex pattern for bold requirement lines in spec files.
 * Matches:
 * - **FR:path.to.req**: Description (with bullet)
 * - **FR:path.to.req** (S1): Description (with severity)
 * - **FR:path.to.req**: [deferred] Description (with bullet)
 * - ~~**FR:path**~~: [deprecated: FR:new.path] Description (with bullet)
 * - **FR:path.to.req**: Description (group header without bullet)
 *
 * @req FR:req-traceability/state.marker
 * @req FR:req-traceability/state.deprecated-format
 * @req FR:req-traceability/severity.syntax
 */
const BOLD_REQ_PATTERN =
  /^(?:[-*]\s*)?(?:~~)?\*\*([A-Z]+):([a-z0-9][a-z0-9.-]*)\*\*(?:~~)?(?:\s*\((S[1-5])\))?:\s*(?:\[([a-z]+)(?::\s*([A-Z]+:[a-z0-9./-]+))?\]\s*)?(.+)$/;

/**
 * Regex pattern for heading requirement lines in spec files.
 * Matches:
 * - #### FR:path.to.req: Description (heading format)
 * - ### FR:path.to.req (S1): Description (heading format with severity)
 *
 * @req FR:req-traceability/state.marker
 * @req FR:req-traceability/severity.syntax
 */
const HEADING_REQ_PATTERN =
  /^#{2,6}\s+([A-Z]+):([a-z0-9][a-z0-9.-]*)(?:\s*\((S[1-5])\))?:\s*(.+)$/;

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

        // Try bold format first (more common)
        let match = line.match(BOLD_REQ_PATTERN);
        let isHeadingFormat = false;

        if (!match) {
          // Try heading format
          match = line.match(HEADING_REQ_PATTERN);
          isHeadingFormat = true;
        }

        if (match) {
          let typeStr: string;
          let reqPath: string;
          let severityStr: string | undefined;
          let stateStr: string | undefined;
          let deprecatedTarget: string | undefined;
          let text: string;

          if (isHeadingFormat) {
            // Heading format: [, type, path, severity?, text]
            [, typeStr, reqPath, severityStr, text] = match;
            stateStr = undefined;
            deprecatedTarget = undefined;
          } else {
            // Bold format: [, type, path, severity?, state?, deprecatedTarget?, text]
            [, typeStr, reqPath, severityStr, stateStr, deprecatedTarget, text] = match;
          }

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

          // Determine severity (default S3)
          // @req FR:req-traceability/severity.defaults
          const severity: RequirementSeverity = (severityStr as RequirementSeverity) || 'S3';

          requirements.push({
            id,
            state,
            severity,
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
