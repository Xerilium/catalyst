#!/usr/bin/env npx tsx
/**
 * Spec Validation Script
 *
 * Validates spec.md files for correct FR/NFR ID format.
 *
 * Usage:
 *   npx tsx scripts/validate-spec.ts [path/to/spec.md]
 *   npx tsx scripts/validate-spec.ts --all
 *
 * Exit codes:
 *   0 - All validations passed
 *   1 - Validation errors found
 *
 * @req FR:req-traceability/id.format
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationError {
  file: string;
  line: number;
  message: string;
  id?: string;
}

interface ValidationResult {
  file: string;
  errors: ValidationError[];
  warnings: ValidationError[];
  requirementCount: number;
}

/**
 * Valid ID format: TYPE:path.to.req
 * - TYPE is FR, NFR, or REQ
 * - path uses dots for hierarchy (not slashes)
 * - path is lowercase kebab-case segments separated by dots
 */
const VALID_ID_PATTERN = /^(FR|NFR|REQ):([a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)*)$/;

/**
 * Pattern to find requirement IDs in spec files.
 * Matches:
 * - **FR:path.to.req**: Description (bold format with bullet or without)
 * - #### FR:path.to.req: Description (heading format)
 */
const SPEC_ID_PATTERN = /(?:^\*\*|\*\*)(FR|NFR|REQ):([^*]+)\*\*|^#{2,6}\s+(FR|NFR|REQ):([^:]+):/gm;

/**
 * Extract all requirement IDs from a spec file.
 */
function extractIds(content: string, filePath: string): Array<{ id: string; line: number; raw: string }> {
  const ids: Array<{ id: string; line: number; raw: string }> = [];
  const lines = content.split('\n');
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track code block state
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Skip lines in code blocks
    if (inCodeBlock) {
      continue;
    }

    // Skip format example lines (contain backticks with **FR: inside)
    if (line.includes('`') && line.includes('**FR:') && line.includes('`')) {
      continue;
    }

    // Skip lines that look like format documentation (start with "Format:")
    if (line.trim().startsWith('- Format:') || line.trim().startsWith('Format:')) {
      continue;
    }

    // Check for bold format: **FR:xxx** or - **FR:xxx**
    const boldMatches = [...line.matchAll(/\*\*(FR|NFR|REQ):([^*]+)\*\*/g)];
    for (const match of boldMatches) {
      ids.push({
        id: `${match[1]}:${match[2]}`,
        line: i + 1,
        raw: match[0],
      });
    }

    // Check for heading format: #### FR:xxx:
    const headingMatch = line.match(/^#{2,6}\s+(FR|NFR|REQ):([^:]+):/);
    if (headingMatch) {
      ids.push({
        id: `${headingMatch[1]}:${headingMatch[2]}`,
        line: i + 1,
        raw: headingMatch[0],
      });
    }
  }

  return ids;
}

/**
 * Get feature name from spec file path.
 */
function getFeatureName(filePath: string): string {
  const dir = path.dirname(filePath);
  return path.basename(dir);
}

/**
 * Validate a single requirement ID.
 */
function validateId(
  id: string,
  line: number,
  featureName: string,
  filePath: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for slashes in path (should use dots)
  if (id.includes('/')) {
    errors.push({
      file: filePath,
      line,
      id,
      message: `ID "${id}" uses slashes - use dots for hierarchy (e.g., FR:path.to.req)`,
    });
    return errors; // Other checks don't apply if format is wrong
  }

  // Check for feature name prefix (duplicative)
  const [type, idPath] = id.split(':');
  if (idPath && idPath.startsWith(featureName + '.')) {
    errors.push({
      file: filePath,
      line,
      id,
      message: `ID "${id}" includes feature name prefix - IDs should not include the feature name (e.g., use FR:${idPath.substring(featureName.length + 1)} instead)`,
    });
  }

  // Validate overall format
  if (!VALID_ID_PATTERN.test(id)) {
    errors.push({
      file: filePath,
      line,
      id,
      message: `ID "${id}" has invalid format - must match TYPE:path.to.req (lowercase kebab-case with dots)`,
    });
  }

  return errors;
}

/**
 * Validate a spec file.
 */
function validateSpec(filePath: string): ValidationResult {
  const result: ValidationResult = {
    file: filePath,
    errors: [],
    warnings: [],
    requirementCount: 0,
  };

  if (!fs.existsSync(filePath)) {
    result.errors.push({
      file: filePath,
      line: 0,
      message: `File not found: ${filePath}`,
    });
    return result;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const featureName = getFeatureName(filePath);
  const ids = extractIds(content, filePath);

  result.requirementCount = ids.length;

  // Check for duplicate IDs
  const seenIds = new Map<string, number>();
  for (const { id, line } of ids) {
    if (seenIds.has(id)) {
      result.errors.push({
        file: filePath,
        line,
        id,
        message: `Duplicate ID "${id}" (first seen on line ${seenIds.get(id)})`,
      });
    } else {
      seenIds.set(id, line);
    }

    // Validate ID format
    const idErrors = validateId(id, line, featureName, filePath);
    result.errors.push(...idErrors);
  }

  return result;
}

/**
 * Find all spec.md files in features and initiatives.
 */
function findAllSpecs(rootDir: string): string[] {
  const specs: string[] = [];
  const xeDir = path.join(rootDir, '.xe');

  const searchDirs = [
    path.join(xeDir, 'features'),
    path.join(xeDir, 'initiatives'),
  ];

  for (const searchDir of searchDirs) {
    if (!fs.existsSync(searchDir)) continue;

    const entries = fs.readdirSync(searchDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const specPath = path.join(searchDir, entry.name, 'spec.md');
        if (fs.existsSync(specPath)) {
          specs.push(specPath);
        }
      }
    }
  }

  return specs;
}

/**
 * Main function.
 */
function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Spec Validation Script

Usage:
  npx tsx scripts/validate-spec.ts [path/to/spec.md]
  npx tsx scripts/validate-spec.ts --all

Options:
  --all     Validate all spec.md files in .xe/features and .xe/initiatives
  --help    Show this help message

Validation Rules:
  1. FR/NFR IDs must use dots for hierarchy (not slashes)
  2. IDs must not include the feature name prefix
  3. IDs must be lowercase kebab-case
  4. IDs must be unique within a spec
`);
    process.exit(0);
  }

  let specs: string[];

  if (args.includes('--all')) {
    const rootDir = process.cwd();
    specs = findAllSpecs(rootDir);
    console.log(`Found ${specs.length} spec files to validate\n`);
  } else {
    specs = args.filter((arg) => !arg.startsWith('--'));
  }

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalRequirements = 0;

  for (const specPath of specs) {
    const result = validateSpec(specPath);
    totalRequirements += result.requirementCount;

    if (result.errors.length > 0) {
      console.log(`\n${result.file}:`);
      for (const error of result.errors) {
        console.log(`  Line ${error.line}: ${error.message}`);
        totalErrors++;
      }
    }

    if (result.warnings.length > 0) {
      console.log(`\n${result.file} (warnings):`);
      for (const warning of result.warnings) {
        console.log(`  Line ${warning.line}: ${warning.message}`);
        totalWarnings++;
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Validated ${specs.length} spec files`);
  console.log(`Found ${totalRequirements} requirements`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`Warnings: ${totalWarnings}`);

  if (totalErrors > 0) {
    console.log(`\nValidation FAILED`);
    process.exit(1);
  } else {
    console.log(`\nValidation PASSED`);
    process.exit(0);
  }
}

main();
