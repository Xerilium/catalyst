#!/usr/bin/env tsx

/**
 * Build script: Generate action catalog from action implementations
 *
 * Scans all action files in src/playbooks/actions/
 * and extracts metadata (dependencies, primaryProperty, configSchema) to
 * generate a unified action catalog TypeScript file.
 *
 * The catalog includes:
 * - ACTION_CATALOG: Metadata for each action (actionType, className, configSchema, etc.)
 * - ACTION_CLASSES: Map of className to actual class constructor
 * - Import statements for all action classes
 *
 * Uses typescript-json-schema to generate JSON schemas from config interfaces.
 *
 * Usage: tsx scripts/generate-action-registry.ts [--test]
 *   --test: Generate registry from test fixtures instead
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import * as TJS from 'typescript-json-schema';
import type { ActionMetadata } from '@playbooks/types';

interface CatalogEntry {
  [actionType: string]: ActionMetadata;
}

interface ActionClassInfo {
  className: string;
  importPath: string;  // Relative path for import statement
}

async function generateCatalog(testMode = false): Promise<void> {
  console.log(`[Catalog] ${testMode ? 'Test mode' : 'Production mode'}`);

  // Determine scan paths
  const scanPaths = testMode
    ? ['tests/fixtures/actions']
    : [
        'src/playbooks/actions',     // Standard actions
        'src/playbooks/engine/actions'         // Built-in privileged actions (var, return)
      ];

  // Find all *-action.ts files from all scan paths
  const actionFiles: string[] = [];
  for (const baseDir of scanPaths) {
    const pattern = path.join(baseDir, '**/*-action.ts');
    console.log(`[Catalog] Scanning: ${pattern}`);

    const files = await glob(pattern, {
      absolute: true,
      nodir: true
    });
    actionFiles.push(...files);
  }

  console.log(`[Catalog] Found ${actionFiles.length} action files`);

  // Set up typescript-json-schema
  const tsConfigPath = path.resolve('tsconfig.json');
  const compilerOptions: TJS.CompilerOptions = {
    strictNullChecks: true
  };

  const settings: TJS.PartialArgs = {
    required: true,           // Mark non-optional properties as required
    noExtraProps: false,      // Allow additional properties (important for Record types)
    ref: false,               // Inline references instead of using $ref
    titles: true,             // Include title from interface name
    defaultProps: false       // Don't add default properties
  };

  // Build list of all TypeScript files to include in schema generation
  const typesFiles = await glob([
    'src/playbooks/actions/**/*.ts',
    'src/playbooks/engine/actions/**/*.ts'
  ], {
    absolute: true,
    nodir: true
  });

  const program = TJS.getProgramFromFiles(
    typesFiles,
    compilerOptions
  );

  const catalog: CatalogEntry = {};
  const actionClasses: ActionClassInfo[] = [];

  // Process each action file
  for (const filePath of actionFiles) {
    try {
      // Dynamically import the module
      const module = await import(filePath);

      // Find exported classes with execute method
      for (const exportName of Object.keys(module)) {
        const exported = module[exportName];

        // Check if it's a class constructor with execute method
        if (
          typeof exported === 'function' &&
          exported.prototype &&
          'execute' in exported.prototype
        ) {
          // Skip abstract base classes (they don't have actionType and shouldn't be registered)
          // Abstract classes typically have "Base" in their name
          if (exportName.includes('Base') || exportName.endsWith('Base')) {
            console.log(`[Catalog] ⏭  ${exportName}: Skipping abstract base class`);
            continue;
          }

          // Extract actionType from static property (REQUIRED)
          if (!('actionType' in exported) || typeof exported.actionType !== 'string') {
            const filename = path.basename(filePath, '.ts');
            console.error(`[Catalog] ✗ ${exportName} in ${filename}: Missing required static property 'actionType'`);
            console.error(`[Catalog]   Add: static readonly actionType = 'your-action-name';`);
            throw new Error(`Action ${exportName} missing required static readonly actionType property`);
          }

          const actionType = exported.actionType as string;

          // Validate actionType format (kebab-case)
          if (!/^[a-z][a-z0-9-]*$/.test(actionType)) {
            console.error(`[Catalog] ✗ ${exportName}: actionType '${actionType}' must be kebab-case`);
            throw new Error(`Invalid actionType '${actionType}': must be kebab-case (lowercase letters, numbers, hyphens)`);
          }

          // Check for duplicate actionType
          if (catalog[actionType]) {
            console.error(`[Catalog] ✗ Duplicate actionType '${actionType}' found in ${exportName}`);
            console.error(`[Catalog]   Already defined by another action`);
            throw new Error(`Duplicate actionType '${actionType}'`);
          }

          // Calculate relative import path from the generated file location
          // Generated file: src/playbooks/registry/action-catalog.ts
          // Action files:   src/playbooks/actions/**/*-action.ts
          const relativeFromRegistry = path.relative(
            path.resolve('src/playbooks/registry'),
            filePath.replace('.ts', '')
          );

          // Track class info for import generation
          actionClasses.push({
            className: exportName,
            importPath: relativeFromRegistry
          });

          // Initialize metadata object with actionType and className
          const metadata: ActionMetadata = {
            actionType,
            className: exportName  // e.g., 'BashAction', 'GitHubIssueCreateAction'
          };

          // Create a temporary instance to extract instance properties
          // We need to provide a dummy repoRoot parameter for the constructor
          try {
            const instance = new exported('/tmp');

            // Extract dependencies if available
            if ('dependencies' in instance) {
              metadata.dependencies = instance.dependencies;
            }

            // Extract primaryProperty if available
            if ('primaryProperty' in instance) {
              metadata.primaryProperty = instance.primaryProperty;
            }
          } catch (err) {
            console.warn(`[Registry] ⚠ ${actionType}: Could not instantiate action to extract metadata: ${(err as Error).message}`);
          }

          // Generate config schema from TypeScript interface
          // Convention: {ActionClassName}Config (e.g., BashAction -> BashConfig)
          const configInterfaceName = `${exportName.replace(/Action$/, '')}Config`;

          try {
            const schema = TJS.generateSchema(program, configInterfaceName, settings);
            if (schema) {
              metadata.configSchema = schema;
              console.log(`[Catalog] ✓ ${actionType}: Generated schema for ${configInterfaceName}`);
            } else {
              console.log(`[Catalog] ℹ ${actionType}: No config interface ${configInterfaceName} found (this is OK for actions without config)`);
            }
          } catch (err) {
            console.log(`[Catalog] ℹ ${actionType}: Could not generate schema for ${configInterfaceName}: ${(err as Error).message}`);
          }

          // Add to catalog
          catalog[actionType] = metadata;

          console.log(`[Catalog] ✓ ${actionType}: Metadata extracted`);
        }
      }
    } catch (err) {
      console.error(`[Catalog] ✗ Failed to process ${filePath}:`, (err as Error).message);
      throw err; // Fail build on errors
    }
  }

  // Generate TypeScript file
  const output = testMode
    ? path.join('tests/fixtures', 'action-catalog.ts')
    : path.join('src/playbooks/registry', 'action-catalog.ts');

  // Ensure output directory exists
  await fs.mkdir(path.dirname(output), { recursive: true });

  // Generate import statements for all action classes
  const imports = actionClasses.map(
    ({ className, importPath }) => `import { ${className} } from '${importPath}';`
  ).join('\n');

  // Generate ACTION_CLASSES mapping
  const classMapEntries = actionClasses.map(
    ({ className }) => `  '${className}': ${className}`
  ).join(',\n');

  const content = `// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated by scripts/generate-action-registry.ts
//
// This file is automatically generated at build time from action implementations.
// To update metadata, modify the action class's static properties or config interfaces.

import type { ActionMetadata } from '../types/action-metadata';
import type { PlaybookAction } from '../types/action';

// Action class imports (auto-generated)
${imports}

/**
 * Action constructor type
 */
export type ActionConstructor<TConfig = unknown> = new (...args: any[]) => PlaybookAction<TConfig>;

/**
 * Auto-generated catalog of action metadata
 *
 * Maps action types (kebab-case) to their metadata including:
 * - dependencies: External CLI tools and environment variables required
 * - primaryProperty: Property name for YAML shorthand syntax
 * - configSchema: JSON Schema for action configuration validation
 *
 * Generated at build time by scanning action implementations.
 */
export const ACTION_CATALOG: Record<string, ActionMetadata> = ${JSON.stringify(catalog, null, 2)};

/**
 * Auto-generated map of className to action constructor
 *
 * Enables dynamic action instantiation based on className from ACTION_CATALOG.
 *
 * Generated at build time by scanning action implementations.
 */
export const ACTION_CLASSES: Record<string, ActionConstructor> = {
${classMapEntries}
};

// Legacy alias for backwards compatibility (deprecated)
/** @deprecated Use ACTION_CATALOG instead */
export const ACTION_REGISTRY = ACTION_CATALOG;
`;

  await fs.writeFile(output, content, 'utf-8');
  console.log(`[Catalog] Generated: ${output}`);
  console.log(`[Catalog] Total entries: ${Object.keys(catalog).length}`);
}

// Parse CLI arguments
const testMode = process.argv.includes('--test');

// Run generation
generateCatalog(testMode)
  .then(() => {
    console.log('[Catalog] Success!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Catalog] Failed:', err);
    process.exit(1);
  });
