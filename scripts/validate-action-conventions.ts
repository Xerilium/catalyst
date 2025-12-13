#!/usr/bin/env tsx

/**
 * Validation script: Enforce action naming conventions
 *
 * Validates that:
 * 1. All classes implementing PlaybookAction are in files ending with -action.ts
 * 2. All action classes have static readonly actionType property
 *
 * This prevents accidental violations of the naming convention.
 */

import * as fs from 'fs/promises';
import { glob } from 'glob';
import * as path from 'path';

interface Violation {
  file: string;
  className: string;
  issue: string;
}

async function validateActionConventions(): Promise<void> {
  console.log('[Validation] Checking action naming conventions...');

  const violations: Violation[] = [];

  // Find all TypeScript files in actions directory
  const allFiles = await glob('src/playbooks/actions/**/*.ts', {
    absolute: true,
    nodir: true
  });

  for (const filePath of allFiles) {
    const filename = path.basename(filePath);
    const isActionFile = filename.endsWith('-action.ts');

    // Skip type definition files, error files, base classes
    if (filename.endsWith('.d.ts') ||
        filename.includes('types.ts') ||
        filename.includes('errors.ts') ||
        filename.includes('base.ts')) {
      continue;
    }

    const content = await fs.readFile(filePath, 'utf-8');

    // Check if file contains a class implementing PlaybookAction
    const implementsPlaybookAction = /class\s+(\w+)\s+(?:extends\s+\w+\s+)?implements\s+PlaybookAction/.test(content) ||
                                     /class\s+(\w+)\s+implements\s+PlaybookAction/.test(content);

    if (implementsPlaybookAction && !isActionFile) {
      const match = content.match(/class\s+(\w+)\s+(?:.*?)implements\s+PlaybookAction/);
      const className = match?.[1] || 'Unknown';

      violations.push({
        file: path.relative(process.cwd(), filePath),
        className,
        issue: `Class implementing PlaybookAction must be in a file ending with -action.ts`
      });
    }

    // Check if action file has actionType property
    if (isActionFile && implementsPlaybookAction) {
      if (!content.includes('static readonly actionType')) {
        const match = content.match(/class\s+(\w+)/);
        const className = match?.[1] || 'Unknown';

        violations.push({
          file: path.relative(process.cwd(), filePath),
          className,
          issue: `Action class must have 'static readonly actionType' property`
        });
      }
    }
  }

  // Report violations
  if (violations.length > 0) {
    console.error('\n[Validation] ✗ Found action convention violations:\n');

    for (const violation of violations) {
      console.error(`  ✗ ${violation.file}`);
      console.error(`    Class: ${violation.className}`);
      console.error(`    Issue: ${violation.issue}\n`);
    }

    console.error(`[Validation] Total violations: ${violations.length}`);
    process.exit(1);
  }

  console.log(`[Validation] ✓ All action conventions validated successfully`);
}

// Run validation
validateActionConventions()
  .catch((err) => {
    console.error('[Validation] Failed:', err);
    process.exit(1);
  });
