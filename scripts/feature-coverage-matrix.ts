#!/usr/bin/env npx tsx
/**
 * Generate a feature-by-requirement-area coverage matrix report.
 *
 * Usage: npx tsx scripts/feature-coverage-matrix.ts [--format table|csv|markdown]
 */

import { runTraceabilityAnalysis } from '../src/traceability/index.js';
import type { TraceabilityReport } from '../src/traceability/types/index.js';

interface AreaMetrics {
  total: number;
  active: number;
  implemented: number;
  tested: number;
  planned: number; // Has task reference
  covered: number;
}

interface FeatureMetrics {
  areas: Map<string, AreaMetrics>;
  totals: AreaMetrics;
}

type OutputFormat = 'table' | 'csv' | 'markdown';

function parseArgs(): { format: OutputFormat } {
  const args = process.argv.slice(2);
  let format: OutputFormat = 'table';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--format' && args[i + 1]) {
      const f = args[i + 1].toLowerCase();
      if (f === 'table' || f === 'csv' || f === 'markdown') {
        format = f;
      }
      i++;
    }
  }

  return { format };
}

/**
 * Features excluded from traceability reporting.
 * @req FR:req-traceability/scan.feature-exclude.blueprint
 */
const EXCLUDED_FEATURES = ['blueprint'];

function extractFeature(specFile: string): string {
  const match = specFile.match(/\.xe\/features\/([^/]+)\//);
  return match ? match[1] : 'unknown';
}

function extractArea(reqId: string): string {
  // Format: FR:feature/path.to.requirement or FR:path.to.requirement
  const pathPart = reqId.includes('/') ? reqId.split('/')[1] : reqId.split(':')[1];
  const firstDot = pathPart.indexOf('.');
  return firstDot > 0 ? pathPart.substring(0, firstDot) : pathPart;
}

function buildMatrix(report: TraceabilityReport): Map<string, FeatureMetrics> {
  const matrix = new Map<string, FeatureMetrics>();

  // Build task-requirement mapping for "planned" status
  const taskReqSet = new Set<string>();
  for (const [, task] of report.tasks) {
    for (const req of task.requirements) {
      taskReqSet.add(req.qualified);
    }
  }

  // Process each requirement
  for (const [reqId, coverage] of report.requirements) {
    const feature = extractFeature(coverage.spec.file);

    // Skip excluded features (meta/process features like blueprint)
    if (EXCLUDED_FEATURES.includes(feature)) {
      continue;
    }

    const area = extractArea(reqId);

    if (!matrix.has(feature)) {
      matrix.set(feature, {
        areas: new Map(),
        totals: { total: 0, active: 0, implemented: 0, tested: 0, planned: 0, covered: 0 },
      });
    }

    const featureMetrics = matrix.get(feature)!;

    if (!featureMetrics.areas.has(area)) {
      featureMetrics.areas.set(area, {
        total: 0,
        active: 0,
        implemented: 0,
        tested: 0,
        planned: 0,
        covered: 0,
      });
    }

    const areaMetrics = featureMetrics.areas.get(area)!;

    // Update counts
    areaMetrics.total++;
    featureMetrics.totals.total++;

    const isActive = coverage.state === 'active';
    if (isActive) {
      areaMetrics.active++;
      featureMetrics.totals.active++;
    }

    if (coverage.implementations.length > 0) {
      areaMetrics.implemented++;
      featureMetrics.totals.implemented++;
    }

    if (coverage.tests.length > 0) {
      areaMetrics.tested++;
      featureMetrics.totals.tested++;
    }

    if (taskReqSet.has(reqId)) {
      areaMetrics.planned++;
      featureMetrics.totals.planned++;
    }

    // Only count coverage for active requirements to avoid >100% coverage
    if (isActive && coverage.coverageStatus !== 'missing') {
      areaMetrics.covered++;
      featureMetrics.totals.covered++;
    }
  }

  return matrix;
}

function percent(num: number, denom: number): string {
  if (denom === 0) return '-';
  return `${Math.round((num / denom) * 100)}%`;
}

function formatTable(matrix: Map<string, FeatureMetrics>): string {
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push('Feature Coverage Matrix');
  lines.push('=======================');
  lines.push('');
  lines.push('Legend: Plan% = task coverage, Impl% = code coverage, Test% = test coverage');
  lines.push('');

  // Sort features by requirement count (fewest first)
  const features = Array.from(matrix.keys()).sort((a, b) => {
    const aReqs = matrix.get(a)!.totals.active;
    const bReqs = matrix.get(b)!.totals.active;
    return aReqs - bReqs;
  });

  for (const feature of features) {
    const fm = matrix.get(feature)!;
    lines.push(`\n## ${feature}`);
    lines.push('-'.repeat(90));
    lines.push(
      'Area'.padEnd(25) +
        'Reqs'.padStart(5) +
        'Plan'.padStart(5) +
        'Plan%'.padStart(6) +
        'Impl'.padStart(5) +
        'Impl%'.padStart(6) +
        'Test'.padStart(5) +
        'Test%'.padStart(6)
    );
    lines.push('-'.repeat(90));

    // Sort areas alphabetically
    const areas = Array.from(fm.areas.keys()).sort();

    for (const area of areas) {
      const am = fm.areas.get(area)!;
      lines.push(
        area.padEnd(25) +
          String(am.active).padStart(5) +
          String(am.planned).padStart(5) +
          percent(am.planned, am.active).padStart(6) +
          String(am.implemented).padStart(5) +
          percent(am.implemented, am.active).padStart(6) +
          String(am.tested).padStart(5) +
          percent(am.tested, am.active).padStart(6)
      );
    }

    // Feature totals
    lines.push('-'.repeat(90));
    lines.push(
      'TOTAL'.padEnd(25) +
        String(fm.totals.active).padStart(5) +
        String(fm.totals.planned).padStart(5) +
        percent(fm.totals.planned, fm.totals.active).padStart(6) +
        String(fm.totals.implemented).padStart(5) +
        percent(fm.totals.implemented, fm.totals.active).padStart(6) +
        String(fm.totals.tested).padStart(5) +
        percent(fm.totals.tested, fm.totals.active).padStart(6)
    );
  }

  // Grand totals
  let grandTotal = { total: 0, active: 0, implemented: 0, tested: 0, planned: 0, covered: 0 };
  for (const fm of matrix.values()) {
    grandTotal.total += fm.totals.total;
    grandTotal.active += fm.totals.active;
    grandTotal.implemented += fm.totals.implemented;
    grandTotal.tested += fm.totals.tested;
    grandTotal.planned += fm.totals.planned;
    grandTotal.covered += fm.totals.covered;
  }

  lines.push('\n');
  lines.push('='.repeat(90));
  lines.push('GRAND TOTAL');
  lines.push('='.repeat(90));
  lines.push(
    'All Features'.padEnd(25) +
      String(grandTotal.active).padStart(5) +
      String(grandTotal.planned).padStart(5) +
      percent(grandTotal.planned, grandTotal.active).padStart(6) +
      String(grandTotal.implemented).padStart(5) +
      percent(grandTotal.implemented, grandTotal.active).padStart(6) +
      String(grandTotal.tested).padStart(5) +
      percent(grandTotal.tested, grandTotal.active).padStart(6)
  );
  lines.push('');

  return lines.join('\n');
}

function formatMarkdown(matrix: Map<string, FeatureMetrics>): string {
  const lines: string[] = [];

  lines.push('# Feature Coverage Matrix\n');

  // Summary table
  lines.push('## Summary by Feature\n');
  lines.push('| Feature | Total | Active | Planned | Implemented | Tested | Coverage |');
  lines.push('|---------|------:|-------:|--------:|------------:|-------:|---------:|');

  const features = Array.from(matrix.keys()).sort();
  let grandTotal = { total: 0, active: 0, implemented: 0, tested: 0, planned: 0, covered: 0 };

  for (const feature of features) {
    const fm = matrix.get(feature)!;
    grandTotal.total += fm.totals.total;
    grandTotal.active += fm.totals.active;
    grandTotal.implemented += fm.totals.implemented;
    grandTotal.tested += fm.totals.tested;
    grandTotal.planned += fm.totals.planned;
    grandTotal.covered += fm.totals.covered;

    lines.push(
      `| ${feature} | ${fm.totals.total} | ${fm.totals.active} | ${fm.totals.planned} | ${fm.totals.implemented} | ${fm.totals.tested} | ${percent(fm.totals.covered, fm.totals.active)} |`
    );
  }

  lines.push(
    `| **TOTAL** | **${grandTotal.total}** | **${grandTotal.active}** | **${grandTotal.planned}** | **${grandTotal.implemented}** | **${grandTotal.tested}** | **${percent(grandTotal.covered, grandTotal.active)}** |`
  );
  lines.push('');

  // Detailed breakdown per feature
  lines.push('## Detailed Breakdown\n');

  for (const feature of features) {
    const fm = matrix.get(feature)!;
    lines.push(`### ${feature}\n`);
    lines.push('| Area | Total | Active | Planned | Impl | Test | Cov% |');
    lines.push('|------|------:|-------:|--------:|-----:|-----:|-----:|');

    const areas = Array.from(fm.areas.keys()).sort();
    for (const area of areas) {
      const am = fm.areas.get(area)!;
      lines.push(
        `| ${area} | ${am.total} | ${am.active} | ${am.planned} | ${am.implemented} | ${am.tested} | ${percent(am.covered, am.active)} |`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatCsv(matrix: Map<string, FeatureMetrics>): string {
  const lines: string[] = [];

  lines.push('Feature,Area,Total,Active,Planned,Implemented,Tested,Covered,CoveragePct');

  const features = Array.from(matrix.keys()).sort();

  for (const feature of features) {
    const fm = matrix.get(feature)!;
    const areas = Array.from(fm.areas.keys()).sort();

    for (const area of areas) {
      const am = fm.areas.get(area)!;
      const covPct = am.active > 0 ? Math.round((am.covered / am.active) * 100) : 0;
      lines.push(
        `${feature},${area},${am.total},${am.active},${am.planned},${am.implemented},${am.tested},${am.covered},${covPct}`
      );
    }

    // Feature total row
    const totPct =
      fm.totals.active > 0 ? Math.round((fm.totals.covered / fm.totals.active) * 100) : 0;
    lines.push(
      `${feature},_TOTAL,${fm.totals.total},${fm.totals.active},${fm.totals.planned},${fm.totals.implemented},${fm.totals.tested},${fm.totals.covered},${totPct}`
    );
  }

  return lines.join('\n');
}

/**
 * @req FR:req-traceability/report.output
 */
async function main() {
  const { format } = parseArgs();

  const { report } = await runTraceabilityAnalysis({});

  const matrix = buildMatrix(report);

  switch (format) {
    case 'csv':
      console.log(formatCsv(matrix));
      break;
    case 'markdown':
      console.log(formatMarkdown(matrix));
      break;
    default:
      console.log(formatTable(matrix));
  }
}

main().catch((error) => {
  console.error('Error generating coverage matrix:', error);
  process.exit(1);
});
