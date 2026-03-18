/**
 * Action Catalog Convention Tests
 *
 * These tests enforce critical conventions for action implementations that enable
 * the action registry generator to correctly extract metadata at build time.
 *
 * @group unit
 * @group registry
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

describe('Action Catalog Conventions', () => {
  describe('primaryProperty declaration', () => {
    /**
     * CRITICAL REQUIREMENT: primaryProperty MUST be declared as `static readonly`
     *
     * WHY THIS MATTERS:
     * 1. The action registry generator (scripts/generate-action-registry.ts) runs at BUILD TIME
     * 2. It extracts metadata by importing action classes and reading their STATIC properties
     * 3. Instance properties (non-static) require instantiating the class to access them
     * 4. Some action classes have complex constructors that can't be safely instantiated at build time
     * 5. Static properties can be read directly from the class constructor without instantiation
     *
     * WHAT BREAKS IF NOT STATIC:
     * - The registry generator will miss the primaryProperty metadata
     * - Actions won't appear in the ACTION_CATALOG with primaryProperty defined
     * - The YAML transformer won't know how to map shorthand syntax to the correct property
     * - Users will have to use verbose object syntax instead of natural shorthand
     *
     * EXAMPLE:
     * ```typescript
     * // ❌ WRONG - Instance property (not accessible at build time)
     * export class FileExistsAction implements PlaybookAction<FileExistsConfig> {
     *   readonly primaryProperty = 'path';  // Will NOT be extracted!
     * }
     *
     * // ✅ CORRECT - Static property (accessible at build time)
     * export class FileExistsAction implements PlaybookAction<FileExistsConfig> {
     *   static readonly primaryProperty = 'path';  // Will be extracted!
     * }
     * ```
     *
     * YAML IMPACT:
     * When primaryProperty is correctly registered, users can write:
     *   - file-exists: package.json
     *
     * Instead of the verbose form:
     *   - file-exists:
     *       path: package.json
     */
    it('must be declared as static readonly (not instance readonly)', async () => {
      // Find all action files
      const actionFiles = await glob([
        'src/playbooks/actions/**/*-action.ts',
        'src/playbooks/engine/actions/*-action.ts'
      ], {
        absolute: true,
        nodir: true
      });

      const violations: Array<{ file: string; line: number; declaration: string }> = [];

      // Check each action file
      for (const filePath of actionFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        // Look for primaryProperty declarations
        lines.forEach((line, index) => {
          // Match any primaryProperty declaration
          const match = line.match(/^\s*(static\s+)?(readonly\s+)?primaryProperty\s*=/);

          if (match) {
            const hasStatic = match[1] !== undefined;
            const hasReadonly = match[2] !== undefined;

            // Violation if it's not "static readonly"
            if (!hasStatic || !hasReadonly) {
              violations.push({
                file: path.relative(process.cwd(), filePath),
                line: index + 1,
                declaration: line.trim()
              });
            }
          }
        });
      }

      // Report all violations with helpful context
      if (violations.length > 0) {
        const errorMessage = [
          '\n❌ Found primaryProperty declarations that are not "static readonly":',
          '',
          ...violations.map(v =>
            `  ${v.file}:${v.line}\n    ${v.declaration}`
          ),
          '',
          '🔧 FIX: Change to "static readonly primaryProperty = \'...\'"',
          '',
          '📖 WHY: The registry generator extracts metadata at BUILD TIME by reading',
          '   STATIC class properties. Instance properties require instantiation, which',
          '   is not reliable for all action classes. Without static declaration, the',
          '   primaryProperty will not be registered in ACTION_CATALOG, breaking the',
          '   natural shorthand YAML syntax that users expect.',
          '',
          '   See test documentation above for detailed explanation.',
          ''
        ].join('\n');

        throw new Error(errorMessage);
      }

      // If we get here, all primaryProperty declarations are correct
      expect(violations).toHaveLength(0);
    });

    /**
     * Verify that the pattern we're checking for is comprehensive
     */
    it('test validation: detects various incorrect patterns', () => {
      const testCases = [
        { code: '  primaryProperty = "path";', shouldFail: true },
        { code: '  readonly primaryProperty = "path";', shouldFail: true },
        { code: '  static primaryProperty = "path";', shouldFail: true },
        { code: '  static readonly primaryProperty = "path";', shouldFail: false },
        { code: '  static readonly primaryProperty = \'path\';', shouldFail: false },
        { code: 'static readonly primaryProperty = "path";', shouldFail: false },
      ];

      testCases.forEach(({ code, shouldFail }) => {
        const match = code.match(/^\s*(static\s+)?(readonly\s+)?primaryProperty\s*=/);

        if (match) {
          const hasStatic = match[1] !== undefined;
          const hasReadonly = match[2] !== undefined;
          const isValid = hasStatic && hasReadonly;

          expect(isValid).toBe(!shouldFail);
        } else {
          // If no match, the regex itself is broken
          throw new Error(`Pattern failed to match test case: ${code}`);
        }
      });
    });
  });

  describe('actionType declaration', () => {
    /**
     * REQUIREMENT: actionType MUST also be static readonly
     *
     * This is required for the same reasons as primaryProperty - the registry
     * generator needs to read it at build time without instantiation.
     */
    it('must be declared as static readonly', async () => {
      const actionFiles = await glob([
        'src/playbooks/actions/**/*-action.ts',
        'src/playbooks/engine/actions/*-action.ts'
      ], {
        absolute: true,
        nodir: true
      });

      const violations: Array<{ file: string; line: number; declaration: string }> = [];

      for (const filePath of actionFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          const match = line.match(/^\s*(static\s+)?(readonly\s+)?actionType\s*=/);

          if (match) {
            const hasStatic = match[1] !== undefined;
            const hasReadonly = match[2] !== undefined;

            if (!hasStatic || !hasReadonly) {
              violations.push({
                file: path.relative(process.cwd(), filePath),
                line: index + 1,
                declaration: line.trim()
              });
            }
          }
        });
      }

      if (violations.length > 0) {
        const errorMessage = [
          '\n❌ Found actionType declarations that are not "static readonly":',
          '',
          ...violations.map(v =>
            `  ${v.file}:${v.line}\n    ${v.declaration}`
          ),
          '',
          '🔧 FIX: Change to "static readonly actionType = \'...\'"',
          ''
        ].join('\n');

        throw new Error(errorMessage);
      }

      expect(violations).toHaveLength(0);
    });
  });
});
