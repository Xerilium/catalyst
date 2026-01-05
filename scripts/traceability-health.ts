#!/usr/bin/env npx tsx
/**
 * Traceability health check - measures project health based on traceability metrics.
 *
 * Health criteria:
 * 1. 100% planned (all active requirements have task references)
 * 2. 100% covered (all active requirements have code or test annotations)
 * 3. 0 file-level requirement links (all annotations on specific constructs)
 *
 * Usage: npx tsx scripts/traceability-health.ts [--verbose]
 */

import * as fs from 'fs';
import * as path from 'path';
import { runTraceabilityAnalysis } from '../src/traceability/index.js';

interface DenseAnnotation {
  file: string;
  line: number;
  construct: string;
  count: number;
}

interface HealthResult {
  planned: { percentage: number; missing: string[] };
  covered: { percentage: number; missing: string[] };
  fileLevelAnnotations: { count: number; files: string[] };
  denseAnnotations: DenseAnnotation[]; // Constructs with >10 @req (code smell warning)
  score: number; // 0-100 health score
  isHealthy: boolean;
}

/**
 * Features excluded from health reporting.
 * - blueprint: meta-level process documentation, not code deliverables
 * - catalyst-cli: in-progress feature
 * - playbook-engine: in-progress feature
 * @req FR:req-traceability/scan.feature-exclude.blueprint
 */
const EXCLUDED_FEATURES = ['blueprint', 'catalyst-cli', 'playbook-engine'];

function extractFeature(specFile: string): string {
  const match = specFile.match(/\.xe\/features\/([^/]+)\//);
  return match ? match[1] : 'unknown';
}

/**
 * Detect file-level @req annotations (floating annotations not attached to code).
 *
 * A file-level @req is one where:
 * 1. It's in a JSDoc comment at the top of the file (first JSDoc before any code)
 * 2. OR it's a floating JSDoc followed only by single-line comments (not code)
 *
 * We specifically look for:
 * - File header JSDoc with @req (before imports/code)
 * - JSDoc with @req followed by `// comment` lines and no code
 */
function findFileLevelAnnotations(dirs: string[]): string[] {
  const fileLevelFiles: string[] = [];

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, dist, and test fixtures
        if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'fixtures') {
          scanDir(fullPath);
        }
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        // Check 1: File header JSDoc with @req that's NOT attached to a construct
        // A file header JSDoc is one that appears BEFORE any imports AND is followed by
        // imports (not a code construct). If the JSDoc is followed by export/class/etc,
        // it's attached to that construct and not a file-level annotation.
        let inFirstJsDoc = false;
        let firstJsDocHasReq = false;
        let firstJsDocEndLine = -1;
        let sawImportBeforeJsDoc = false;

        for (let i = 0; i < Math.min(lines.length, 50); i++) {
          const line = lines[i].trim();

          // Skip shebangs and empty lines at the start
          if (line.startsWith('#!') || line === '') continue;

          // If we hit import/export before any JSDoc, there's no file header to check
          if (!inFirstJsDoc && !sawImportBeforeJsDoc && firstJsDocEndLine === -1) {
            if (line.startsWith('import ') || line.startsWith('export ')) {
              sawImportBeforeJsDoc = true;
              break; // No file header JSDoc
            }
          }

          // Track first JSDoc (only if we haven't seen imports yet)
          if (!sawImportBeforeJsDoc && firstJsDocEndLine === -1 && line.startsWith('/**')) {
            inFirstJsDoc = true;
          }

          if (inFirstJsDoc && line.includes('@req ')) {
            firstJsDocHasReq = true;
          }

          if (inFirstJsDoc && line.endsWith('*/')) {
            inFirstJsDoc = false;
            firstJsDocEndLine = i;
            // Don't break - continue to check what follows
          }

          // After JSDoc ends, check what follows
          if (firstJsDocEndLine !== -1 && !inFirstJsDoc && i > firstJsDocEndLine) {
            // Skip empty lines between JSDoc and next content
            if (line === '') continue;

            // If followed by export/class/interface/function/const/async, it's attached
            if (
              line.startsWith('export ') ||
              line.startsWith('class ') ||
              line.startsWith('interface ') ||
              line.startsWith('function ') ||
              line.startsWith('async function ') ||
              line.startsWith('const ') ||
              line.startsWith('type ') ||
              line.startsWith('enum ')
            ) {
              // JSDoc is attached to a construct, not file-level
              firstJsDocHasReq = false;
            }
            break;
          }
        }

        if (firstJsDocHasReq && !sawImportBeforeJsDoc) {
          fileLevelFiles.push(fullPath);
          continue; // Already flagged, skip to next file
        }

        // Check 2: Floating JSDoc with @req followed only by // comments (not code)
        let inJsDoc = false;
        let jsDocHasReq = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          if (line.startsWith('/**')) {
            inJsDoc = true;
            jsDocHasReq = false;
          }

          if (inJsDoc && line.includes('@req ')) {
            jsDocHasReq = true;
          }

          if (inJsDoc && line.endsWith('*/')) {
            inJsDoc = false;

            if (jsDocHasReq) {
              // Check what follows: if only // comments and empty lines (no code), it's floating
              // A JSDoc followed by another JSDoc is still attached (stacked JSDoc on same construct)
              let isFloating = false;
              let foundCodeOrJsDoc = false;

              for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
                const nextLine = lines[j].trim();
                if (nextLine === '') continue; // Empty lines - keep looking
                if (nextLine.startsWith('//')) {
                  // Single-line comment - if this is the ONLY non-empty content, it's floating
                  isFloating = true;
                  continue;
                }
                if (nextLine.startsWith('/**')) {
                  // Another JSDoc - this JSDoc is stacked, not floating
                  foundCodeOrJsDoc = true;
                  break;
                }

                // Hit actual code - this JSDoc is attached
                foundCodeOrJsDoc = true;
                isFloating = false;
                break;
              }

              // Only flag if we found // comments but no code or JSDoc
              if (isFloating && !foundCodeOrJsDoc) {
                fileLevelFiles.push(fullPath);
                break; // Only report file once
              }
            }
          }
        }
      }
    }
  }

  for (const dir of dirs) {
    scanDir(dir);
  }

  return [...new Set(fileLevelFiles)]; // Deduplicate
}

/**
 * Find constructs with too many @req annotations (code smell).
 * Threshold: >10 annotations on a single class/function/interface.
 */
function findDenseAnnotations(dirs: string[]): DenseAnnotation[] {
  const results: DenseAnnotation[] = [];
  const THRESHOLD = 10;

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'fixtures') {
          scanDir(fullPath);
        }
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        // Track JSDoc blocks and their @req counts
        let inJsDoc = false;
        let jsDocStartLine = 0;
        let reqCount = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          if (line.startsWith('/**')) {
            inJsDoc = true;
            jsDocStartLine = i;
            reqCount = 0;
          }

          if (inJsDoc && line.includes('@req ')) {
            reqCount++;
          }

          if (inJsDoc && line.endsWith('*/')) {
            inJsDoc = false;

            // Check if next non-empty line is a construct
            if (reqCount > THRESHOLD) {
              for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                const nextLine = lines[j].trim();
                if (nextLine === '') continue;

                // Extract construct name
                const classMatch = nextLine.match(/^(?:export\s+)?class\s+(\w+)/);
                const funcMatch = nextLine.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
                const interfaceMatch = nextLine.match(/^(?:export\s+)?interface\s+(\w+)/);
                const constMatch = nextLine.match(/^(?:export\s+)?const\s+(\w+)/);

                const match = classMatch || funcMatch || interfaceMatch || constMatch;
                if (match) {
                  results.push({
                    file: fullPath,
                    line: jsDocStartLine + 1, // 1-indexed
                    construct: match[1],
                    count: reqCount,
                  });
                }
                break;
              }
            }
          }
        }
      }
    }
  }

  for (const dir of dirs) {
    scanDir(dir);
  }

  return results.sort((a, b) => b.count - a.count); // Sort by count descending
}

/**
 * @req FR:req-traceability/report.output
 */
async function checkHealth(_verbose: boolean): Promise<HealthResult> {
  const { report } = await runTraceabilityAnalysis({});

  // Build task-requirement mapping
  const taskReqSet = new Set<string>();
  for (const [, task] of report.tasks) {
    for (const req of task.requirements) {
      taskReqSet.add(req.qualified);
    }
  }

  // Calculate planned and covered for active requirements (excluding blueprint)
  const plannedMissing: string[] = [];
  const coveredMissing: string[] = [];
  let activeCount = 0;
  let plannedCount = 0;
  let coveredCount = 0;

  for (const [reqId, coverage] of report.requirements) {
    const feature = extractFeature(coverage.spec.file);

    // Skip excluded features
    if (EXCLUDED_FEATURES.includes(feature)) {
      continue;
    }

    if (coverage.state !== 'active') {
      continue;
    }

    // Skip parent requirements (they have children, leaf-only coverage)
    if (coverage.coverageStatus === 'parent') {
      continue;
    }

    activeCount++;

    if (taskReqSet.has(reqId)) {
      plannedCount++;
    } else {
      plannedMissing.push(`${reqId} (${coverage.spec.file}:${coverage.spec.line})`);
    }

    if (coverage.coverageStatus !== 'missing') {
      coveredCount++;
    } else {
      coveredMissing.push(`${reqId} (${coverage.spec.file}:${coverage.spec.line})`);
    }
  }

  // Find file-level annotations
  const fileLevelFiles = findFileLevelAnnotations(['src', 'tests', 'scripts']);

  // Find dense annotations (code smell warning)
  const denseAnnotations = findDenseAnnotations(['src', 'tests', 'scripts']);

  const plannedPct = activeCount > 0 ? Math.round((plannedCount / activeCount) * 100) : 100;
  const coveredPct = activeCount > 0 ? Math.round((coveredCount / activeCount) * 100) : 100;

  // Calculate health score: weighted average of planned, covered, and file-level annotations
  // Planned: 33%, Covered: 34%, File-level: 33% (0 = 100%, any = 0%)
  const fileLevelScore = fileLevelFiles.length === 0 ? 100 : Math.max(0, 100 - fileLevelFiles.length * 2);
  const score = Math.round((plannedPct * 0.33) + (coveredPct * 0.34) + (fileLevelScore * 0.33));

  const isHealthy = plannedPct === 100 && coveredPct === 100 && fileLevelFiles.length === 0;

  return {
    planned: { percentage: plannedPct, missing: plannedMissing },
    covered: { percentage: coveredPct, missing: coveredMissing },
    fileLevelAnnotations: { count: fileLevelFiles.length, files: fileLevelFiles },
    denseAnnotations,
    score,
    isHealthy,
  };
}

async function main() {
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

  console.log('Traceability Health Check');
  console.log('=========================\n');

  const result = await checkHealth(verbose);

  // Planned status
  const plannedIcon = result.planned.percentage === 100 ? '✓' : '✗';
  console.log(`${plannedIcon} Planned: ${result.planned.percentage}%`);
  if (verbose && result.planned.missing.length > 0) {
    console.log('  Missing task references:');
    for (const req of result.planned.missing.slice(0, 10)) {
      console.log(`    - ${req}`);
    }
    if (result.planned.missing.length > 10) {
      console.log(`    ... and ${result.planned.missing.length - 10} more`);
    }
  }

  // Covered status
  const coveredIcon = result.covered.percentage === 100 ? '✓' : '✗';
  console.log(`${coveredIcon} Covered: ${result.covered.percentage}%`);
  if (verbose && result.covered.missing.length > 0) {
    console.log('  Missing coverage:');
    for (const req of result.covered.missing.slice(0, 10)) {
      console.log(`    - ${req}`);
    }
    if (result.covered.missing.length > 10) {
      console.log(`    ... and ${result.covered.missing.length - 10} more`);
    }
  }

  // File-level annotations
  const fileLevelIcon = result.fileLevelAnnotations.count === 0 ? '✓' : '✗';
  console.log(`${fileLevelIcon} File-level @req: ${result.fileLevelAnnotations.count}`);
  if (verbose && result.fileLevelAnnotations.files.length > 0) {
    console.log('  Files with file-level annotations:');
    for (const file of result.fileLevelAnnotations.files.slice(0, 10)) {
      console.log(`    - ${file}`);
    }
    if (result.fileLevelAnnotations.files.length > 10) {
      console.log(`    ... and ${result.fileLevelAnnotations.files.length - 10} more`);
    }
  }

  // Dense annotations warning (code smell, doesn't affect score)
  if (result.denseAnnotations.length > 0) {
    console.log(`⚠ Dense @req (>10): ${result.denseAnnotations.length} constructs`);
    if (verbose) {
      console.log('  Constructs with many annotations (possible code smell):');
      for (const dense of result.denseAnnotations.slice(0, 5)) {
        console.log(`    - ${dense.construct} (${dense.count} @req) in ${dense.file}:${dense.line}`);
      }
      if (result.denseAnnotations.length > 5) {
        console.log(`    ... and ${result.denseAnnotations.length - 5} more`);
      }
    }
  }

  console.log('');
  console.log(`Health Score: ${result.score}/100`);
  console.log('');
  if (result.isHealthy) {
    console.log('🎉 Traceability health: PASSING');
    process.exit(0);
  } else {
    console.log('⚠️  Traceability health: NEEDS WORK');
    if (!verbose) {
      console.log('   Run with --verbose for details');
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error checking traceability health:', error);
  process.exit(1);
});
