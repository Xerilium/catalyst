/**
 * Spec file parser for extracting requirement definitions.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import {
  type RequirementDefinition,
  type RequirementState,
  type RequirementPriority,
  type TraceabilityMode,
  parseTraceabilityModeValue,
} from '../types/index.js';
import { parseShortFormId, buildQualifiedId } from './id-parser.js';

/**
 * Metadata extracted from spec.md YAML frontmatter.
 * @req FR:req-traceability/scan.traceability-mode.frontmatter.output
 */
export interface FeatureMetadata {
  id?: string;
  title?: string;
  traceability?: TraceabilityMode;
  dependencies?: string[];
}

/**
 * Path token: kebab-cased segments. Sigils per FR:id.format:
 * - `$` (entity) at start only
 * - `@` (interface) at start or after a `.`
 */
const PATH = '(?:\\$|@)?[a-z0-9][a-z0-9-]*(?:\\.@?[a-z0-9][a-z0-9-]*)*';
const ID_BODY = '[A-Z]+:[$@a-z0-9./-]+';

/**
 * Regex pattern for bold requirement lines in spec files.
 * Matches:
 * - **FR:path.to.req**: Description (with bullet)
 * - **FR:path.to.req** (P1): Description (with priority)
 * - **FR:path.to.req**: [deferred] Description (with bullet)
 * - ~~**FR:path**~~: [deprecated: FR:new.path] Description (with bullet, description optional)
 * - **FR:path.to.req**: [@req:exempt=reason] Description (with exempt and reason)
 * - **FR:path.to.req**: Description (group header without bullet)
 * - **FR:$entity-name**: Description (entity FR with `$` prefix)
 * - **FR:path.@interface**: Description (interface FR with `@` prefix)
 *
 * @req FR:req-traceability/state.marker
 * @req FR:req-traceability/state.deprecated-format
 * @req FR:req-traceability/priority.syntax
 * @req FR:req-traceability/id.format.entity
 * @req FR:req-traceability/id.format.interface
 */
const BOLD_REQ_PATTERN =
  new RegExp(`^(?:[-*]\\s*)?(?:~~)?\\*\\*([A-Z]+):(${PATH})\\*\\*(?:~~)?(?:\\s*\\((P[1-5])\\))?:\\s*(?:\\[(@req:exempt)=([^\\]]+)\\]\\s*|\\[([a-z]+)(?::\\s*(${ID_BODY}))?\\]\\s*)?(.*)$`);

/**
 * Regex pattern for heading requirement lines in spec files.
 * Matches:
 * - #### FR:path.to.req: Description (heading format)
 * - ### FR:path.to.req (P1): Description (heading format with priority)
 * - ### FR:$entity (P1): Description (entity FR with `$` prefix)
 * - ### FR:@interface (P1): Description (interface FR with `@` prefix)
 *
 * @req FR:req-traceability/state.marker
 * @req FR:req-traceability/priority.syntax
 * @req FR:req-traceability/id.format.entity
 * @req FR:req-traceability/id.format.interface
 */
const HEADING_REQ_PATTERN =
  new RegExp(`^#{2,6}\\s+([A-Z]+):(${PATH})(?:\\s*\\((P[1-5])\\))?:\\s*(.+)$`);

/**
 * Parser for spec.md files that extracts requirement definitions.
 * @req FR:req-traceability/scan.features
 * @req FR:req-traceability/scan.initiatives
 * @req FR:req-traceability/state.values
 * @req FR:req-traceability/state.marker
 * @req FR:req-traceability/state.deprecated-format
 * @req FR:req-traceability/priority.syntax
 * @req FR:req-traceability/priority.defaults
 */
export class SpecParser {
  /**
   * Parse a single spec.md file and extract requirements.
   *
   * `scope` may be supplied by the caller (e.g. from `parseDirectory` when walking
   * a nested feature tree, where scope is the full relative path from the features
   * root — `portal/shell`, not just `shell`). When omitted, falls back to the
   * spec's immediate parent directory name.
   *
   * @req FR:req-traceability/scan.features
   */
  async parseFile(filePath: string, scope?: string): Promise<RequirementDefinition[]> {
    const requirements: RequirementDefinition[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      const effectiveScope = scope ?? this.extractScope(filePath);

      // Track fenced code block state — FR-shaped content inside ``` fences is
      // example/illustration, not a real requirement declaration.
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
          let priorityStr: string | undefined;
          let exemptMarker: string | undefined;
          let exemptReason: string | undefined;
          let stateStr: string | undefined;
          let deprecatedTarget: string | undefined;
          let text: string;

          if (isHeadingFormat) {
            // Heading format: [, type, path, priority?, text]
            [, typeStr, reqPath, priorityStr, text] = match;
            stateStr = undefined;
            deprecatedTarget = undefined;
          } else {
            // Bold format: [, type, path, priority?, exemptMarker?, exemptReason?, state?, deprecatedTarget?, text]
            [, typeStr, reqPath, priorityStr, exemptMarker, exemptReason, stateStr, deprecatedTarget, text] = match;
          }

          // Parse the short-form ID
          const shortId = parseShortFormId(`${typeStr}:${reqPath}`);
          if (!shortId) {
            // Skip malformed IDs
            continue;
          }

          // Build qualified ID with scope
          const id = buildQualifiedId(shortId, effectiveScope);

          // Determine state
          // @req FR:req-traceability/state.values
          let state: RequirementState = 'active';
          let parsedExemptReason: string | undefined;
          if (exemptMarker === '@req:exempt') {
            state = 'exempt';
            parsedExemptReason = exemptReason?.trim();
          } else if (stateStr === 'deferred') {
            state = 'deferred';
          } else if (stateStr === 'deprecated') {
            state = 'deprecated';
          }

          // Determine priority (default P3)
          // @req FR:req-traceability/priority.defaults
          const priority: RequirementPriority = (priorityStr as RequirementPriority) || 'P3';

          requirements.push({
            id,
            state,
            priority,
            text: text.trim(),
            specFile: filePath,
            specLine: i + 1, // 1-indexed
            deprecatedTarget,
            exemptReason: parsedExemptReason,
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
   * Walk the feature tree recursively and yield every `{dir}/spec.md` along with
   * its scope (relative path from `rootDir`, slash-separated). A directory is a
   * "feature dir" iff it contains a `spec.md` file; nested grouping dirs without
   * a spec are traversed but not yielded. Honors FR:feature-context/spec.@file.nesting.
   */
  private async findFeatureSpecs(
    rootDir: string
  ): Promise<Array<{ specPath: string; scope: string }>> {
    const found: Array<{ specPath: string; scope: string }> = [];

    const walk = async (currentDir: string): Promise<void> => {
      let entries;
      try {
        entries = await fs.readdir(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      const subdirs = entries.filter((e) => e.isDirectory());
      await Promise.all(
        subdirs.map(async (entry) => {
          const childDir = path.join(currentDir, entry.name);
          const specPath = path.join(childDir, 'spec.md');
          let hasSpec = false;
          try {
            await fs.access(specPath);
            hasSpec = true;
          } catch {
            // no spec.md here — keep walking
          }

          if (hasSpec) {
            const scope = path.relative(rootDir, childDir).split(path.sep).join('/');
            found.push({ specPath, scope });
          } else {
            await walk(childDir);
          }
        })
      );
    };

    await walk(rootDir);
    return found;
  }

  /**
   * Parse all spec.md files in a directory (recursively).
   * @req FR:req-traceability/scan.features
   * @req FR:req-traceability/scan.initiatives
   * @req FR:req-traceability/scan.feature-exclude.blueprint
   * @req FR:feature-context/spec.@file.nesting
   */
  async parseDirectory(dirPath: string): Promise<RequirementDefinition[]> {
    const specs = await this.findFeatureSpecs(dirPath);
    const results = await Promise.all(
      specs.map(({ specPath, scope }) => this.parseFile(specPath, scope))
    );
    return results.flat();
  }

  /**
   * Parse YAML frontmatter from a spec.md file to extract feature metadata.
   * @req FR:req-traceability/scan.traceability-mode.frontmatter
   * @req FR:req-traceability/scan.traceability-mode.frontmatter.input
   * @req FR:req-traceability/scan.traceability-mode.frontmatter.output
   */
  async parseFeatureMetadata(filePath: string): Promise<FeatureMetadata> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.extractFrontmatter(content);
    } catch {
      return {};
    }
  }

  /**
   * Parse frontmatter from all spec.md files in a directory.
   * Returns a map keyed by feature ID (full relative path from `dirPath`).
   * @req FR:req-traceability/scan.traceability-mode.frontmatter
   * @req FR:feature-context/spec.@file.nesting
   */
  async parseDirectoryMetadata(dirPath: string): Promise<Map<string, FeatureMetadata>> {
    const result = new Map<string, FeatureMetadata>();

    try {
      const specs = await this.findFeatureSpecs(dirPath);
      const parsePromises = specs.map(async ({ specPath, scope }) => {
        const metadata = await this.parseFeatureMetadata(specPath);
        return { scope, metadata };
      });

      const results = await Promise.all(parsePromises);
      for (const { scope, metadata } of results) {
        // Only include features that have a spec.md (non-empty metadata or at least the file existed)
        if (metadata.id !== undefined || metadata.title !== undefined || metadata.traceability !== undefined) {
          result.set(scope, metadata);
        }
      }
    } catch {
      // Directory doesn't exist - return empty map
    }

    return result;
  }

  /**
   * Extract YAML frontmatter from markdown content.
   */
  private extractFrontmatter(content: string): FeatureMetadata {
    // Frontmatter must start at the beginning of the file
    if (!content.startsWith('---')) {
      return {};
    }

    const endIndex = content.indexOf('\n---', 3);
    if (endIndex === -1) {
      return {};
    }

    const yamlStr = content.substring(4, endIndex);

    try {
      const parsed = yaml.load(yamlStr, { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') {
        return {};
      }

      const metadata: FeatureMetadata = {};

      if (typeof parsed.id === 'string') {
        metadata.id = parsed.id;
      }
      if (typeof parsed.title === 'string') {
        metadata.title = parsed.title;
      }

      // Extract traceability settings
      // @req FR:req-traceability/scan.traceability-mode.frontmatter.input
      const trace = parsed.traceability;
      if (trace && typeof trace === 'object') {
        const traceObj = trace as Record<string, unknown>;
        const mode: TraceabilityMode = {};
        let hasValidField = false;

        const normalizedCode = parseTraceabilityModeValue(traceObj.code);
        if (normalizedCode !== undefined) {
          mode.code = normalizedCode;
          hasValidField = true;
        }
        const normalizedTest = parseTraceabilityModeValue(traceObj.test);
        if (normalizedTest !== undefined) {
          mode.test = normalizedTest;
          hasValidField = true;
        }

        if (hasValidField) {
          metadata.traceability = mode;
        }
      }

      // Extract feature dependencies
      if (Array.isArray(parsed.dependencies)) {
        metadata.dependencies = parsed.dependencies.filter(
          (d: unknown) => typeof d === 'string'
        );
      }

      return metadata;
    } catch {
      // Malformed YAML - return empty metadata
      // @req NFR:req-traceability/test.parser-robustness
      return {};
    }
  }

  /**
   * Fallback scope extraction when the caller does not supply scope (single-file
   * `parseFile` usage outside a directory walk). Returns the immediate parent
   * directory name; callers walking nested feature trees MUST supply the full
   * relative path as scope instead.
   */
  private extractScope(filePath: string): string {
    const dir = path.dirname(filePath);
    return path.basename(dir);
  }
}
