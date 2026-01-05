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
 * - classType: Direct reference to the action class constructor
 * - nestedStepProperties: Auto-derived from config interfaces at build time
 *
 * Uses typescript-json-schema to generate JSON schemas from config interfaces.
 * Uses TypeScript compiler API to detect PlaybookStep[] properties.
 *
 * Usage: tsx scripts/generate-action-registry.ts [--test]
 *   --test: Generate registry from test fixtures instead
 *
 * @req FR:playbook-definition/catalog.generation
 * @req FR:playbook-definition/catalog.extract-dependencies
 * @req FR:playbook-definition/catalog.extract-classname
 * @req FR:playbook-definition/catalog.extract-actiontype
 * @req FR:playbook-definition/catalog.extract-primaryproperty
 * @req FR:playbook-definition/catalog.generate-schema
 * @req FR:playbook-definition/catalog.internal
 * @req FR:playbook-definition/catalog.build-integration
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import * as ts from 'typescript';
import * as TJS from 'typescript-json-schema';
import type { ActionMetadata } from '../src/playbooks/types/action-metadata';
import type { PlaybookActionDependencies } from '../src/playbooks/types/dependencies';

interface CatalogEntry {
  [actionType: string]: ActionMetadata;
}

interface ActionClassInfo {
  className: string;
  importPath: string;  // Relative path for import statement
}

/**
 * Find properties typed as PlaybookStep[] in a config interface using TypeScript compiler
 *
 * @param configInterfaceName - Name of the config interface (e.g., 'IfConfig')
 * @param tsProgram - TypeScript program with type information
 * @returns Array of property names that are PlaybookStep[] typed
 */
function findNestedStepProperties(
  configInterfaceName: string,
  tsProgram: ts.Program
): string[] {
  const nestedProps: string[] = [];

  // Search all source files for the interface
  for (const sourceFile of tsProgram.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;

    ts.forEachChild(sourceFile, function visit(node) {
      // Find interface declarations matching our config name
      if (ts.isInterfaceDeclaration(node) && node.name.text === configInterfaceName) {
        // Check each property in the interface
        for (const member of node.members) {
          if (ts.isPropertySignature(member) && member.name && member.type) {
            const propName = member.name.getText(sourceFile);

            // Check if the type is PlaybookStep[]
            if (ts.isArrayTypeNode(member.type)) {
              const elementType = member.type.elementType;
              if (ts.isTypeReferenceNode(elementType)) {
                const typeName = elementType.typeName.getText(sourceFile);
                if (typeName === 'PlaybookStep') {
                  nestedProps.push(propName);
                }
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    });
  }

  return nestedProps;
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

  // Create TypeScript program with proper path resolution for type analysis
  const configFile = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');
  const tsConfigContent = configFile ? ts.readConfigFile(configFile, ts.sys.readFile) : undefined;
  const parsedConfig = tsConfigContent
    ? ts.parseJsonConfigFileContent(tsConfigContent.config, ts.sys, process.cwd())
    : undefined;

  const tsProgram = ts.createProgram(typesFiles, parsedConfig?.options ?? {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    strict: true
  });

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
          // Different actions have different constructor signatures:
          // - Simple actions: new Action(repoRoot: string)
          // - PlaybookActionWithSteps: new Action(stepExecutor: StepExecutor)
          let instance: Record<string, unknown> | null = null;

          // Try standard constructor first (string parameter)
          try {
            instance = new exported('/tmp');
          } catch {
            // If that fails, try with a mock StepExecutor (for PlaybookActionWithSteps)
            try {
              const mockStepExecutor = {
                executeSteps: async () => [],
                getCallStack: () => []
              };
              instance = new exported(mockStepExecutor);
            } catch (err) {
              console.warn(`[Catalog] ⚠ ${actionType}: Could not instantiate action to extract metadata: ${(err as Error).message}`);
            }
          }

          if (instance) {
            // Extract dependencies if available
            if (instance.dependencies !== undefined) {
              metadata.dependencies = instance.dependencies as PlaybookActionDependencies;
            }

            // Extract primaryProperty if available
            if (instance.primaryProperty !== undefined) {
              metadata.primaryProperty = instance.primaryProperty as string;
            }

            // Extract isolated if available (for actions with nested steps)
            if (typeof instance.isolated === 'boolean') {
              metadata.isolated = instance.isolated;
            }
          }

          // Generate config schema from TypeScript interface
          // Convention: {ActionClassName}Config (e.g., BashAction -> BashConfig)
          const configInterfaceName = `${exportName.replace(/Action$/, '')}Config`;

          // Auto-derive nestedStepProperties from config interface (PlaybookStep[] typed properties)
          const nestedStepProps = findNestedStepProperties(configInterfaceName, tsProgram);
          if (nestedStepProps.length > 0) {
            metadata.nestedStepProperties = nestedStepProps;
            console.log(`[Catalog] ✓ ${actionType}: Found nested step properties: ${nestedStepProps.join(', ')}`);
          }

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

  // Build action catalog entries that combine metadata with class constructors
  // Format: 'action-type': { ...metadata, classType: ActualClassName }
  const catalogEntries = Object.entries(catalog).map(([actionType, metadata]) => {
    const classInfo = actionClasses.find(c => c.className === metadata.className);
    const metadataJson = JSON.stringify(metadata, null, 2).split('\n').map((line, i) => i === 0 ? line : '    ' + line).join('\n');
    return `  '${actionType}': {
    ...${metadataJson},
    classType: ${classInfo?.className || 'undefined'}
  }`;
  }).join(',\n');

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
 * Combined action catalog entry with metadata and class constructor
 */
export interface ActionCatalogEntry extends ActionMetadata {
  /** Action class constructor for instantiation */
  classType: ActionConstructor;
}

/**
 * Auto-generated catalog of action metadata and class constructors
 *
 * Maps action types (kebab-case) to their complete entry including:
 * - All ActionMetadata properties (actionType, className, primaryProperty, etc.)
 * - classType: Direct reference to the action class constructor
 *
 * Generated at build time by scanning action implementations.
 */
export const ACTION_CATALOG: Record<string, ActionCatalogEntry> = {
${catalogEntries}
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
