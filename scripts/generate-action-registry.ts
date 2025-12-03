#!/usr/bin/env tsx

/**
 * Build script: Generate action registry from action implementations
 *
 * Scans all action files in src/playbooks/scripts/playbooks/actions/
 * and extracts metadata (dependencies, primaryProperty, configSchema) to
 * generate registry TypeScript file.
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
import type { ActionMetadata } from '../src/playbooks/scripts/playbooks/types';

interface RegistryEntry {
  [actionType: string]: ActionMetadata;
}

async function generateRegistry(testMode = false): Promise<void> {
  console.log(`[Registry] ${testMode ? 'Test mode' : 'Production mode'}`);

  // Determine scan path
  const baseDir = testMode
    ? 'tests/fixtures/actions'
    : 'src/playbooks/scripts/playbooks/actions';

  // Find all *-action.ts files
  const pattern = path.join(baseDir, '**/*-action.ts');
  console.log(`[Registry] Scanning: ${pattern}`);

  const actionFiles = await glob(pattern, {
    absolute: true,
    nodir: true
  });

  console.log(`[Registry] Found ${actionFiles.length} action files`);

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
  const typesFiles = await glob('src/playbooks/scripts/playbooks/actions/**/*.ts', {
    absolute: true,
    nodir: true
  });

  const program = TJS.getProgramFromFiles(
    typesFiles,
    compilerOptions
  );

  const registry: RegistryEntry = {};

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
            console.log(`[Registry] ⏭  ${exportName}: Skipping abstract base class`);
            continue;
          }

          // Extract actionType from static property (REQUIRED)
          if (!('actionType' in exported) || typeof exported.actionType !== 'string') {
            const filename = path.basename(filePath, '.ts');
            console.error(`[Registry] ✗ ${exportName} in ${filename}: Missing required static property 'actionType'`);
            console.error(`[Registry]   Add: static readonly actionType = 'your-action-name';`);
            throw new Error(`Action ${exportName} missing required static readonly actionType property`);
          }

          const actionType = exported.actionType as string;

          // Validate actionType format (kebab-case)
          if (!/^[a-z][a-z0-9-]*$/.test(actionType)) {
            console.error(`[Registry] ✗ ${exportName}: actionType '${actionType}' must be kebab-case`);
            throw new Error(`Invalid actionType '${actionType}': must be kebab-case (lowercase letters, numbers, hyphens)`);
          }

          // Check for duplicate actionType
          if (registry[actionType]) {
            console.error(`[Registry] ✗ Duplicate actionType '${actionType}' found in ${exportName}`);
            console.error(`[Registry]   Already defined by another action`);
            throw new Error(`Duplicate actionType '${actionType}'`);
          }

          // Initialize metadata object with actionType
          const metadata: ActionMetadata = {
            actionType
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
              console.log(`[Registry] ✓ ${actionType}: Generated schema for ${configInterfaceName}`);
            } else {
              console.log(`[Registry] ℹ ${actionType}: No config interface ${configInterfaceName} found (this is OK for actions without config)`);
            }
          } catch (err) {
            console.log(`[Registry] ℹ ${actionType}: Could not generate schema for ${configInterfaceName}: ${(err as Error).message}`);
          }

          // Add to registry
          registry[actionType] = metadata;

          console.log(`[Registry] ✓ ${actionType}: Metadata extracted`);
        }
      }
    } catch (err) {
      console.error(`[Registry] ✗ Failed to process ${filePath}:`, (err as Error).message);
      throw err; // Fail build on errors
    }
  }

  // Generate TypeScript file
  const output = testMode
    ? path.join('tests/fixtures', 'action-registry.ts')
    : path.join('src/playbooks/scripts/playbooks/registry', 'action-registry.ts');

  // Ensure output directory exists
  await fs.mkdir(path.dirname(output), { recursive: true });

  const content = `// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated by scripts/generate-action-registry.ts
//
// This file is automatically generated at build time from action implementations.
// To update metadata, modify the action class's static properties or config interfaces.

import type { ActionMetadata } from '../types/action-metadata';

/**
 * Auto-generated registry of action metadata
 *
 * Maps action types (kebab-case) to their metadata including:
 * - dependencies: External CLI tools and environment variables required
 * - primaryProperty: Property name for YAML shorthand syntax
 * - configSchema: JSON Schema for action configuration validation
 *
 * Generated at build time by scanning action implementations.
 */
export const ACTION_REGISTRY: Record<string, ActionMetadata> = ${JSON.stringify(registry, null, 2)};
`;

  await fs.writeFile(output, content, 'utf-8');
  console.log(`[Registry] Generated: ${output}`);
  console.log(`[Registry] Total entries: ${Object.keys(registry).length}`);
}

// Parse CLI arguments
const testMode = process.argv.includes('--test');

// Run generation
generateRegistry(testMode)
  .then(() => {
    console.log('[Registry] Success!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Registry] Failed:', err);
    process.exit(1);
  });
