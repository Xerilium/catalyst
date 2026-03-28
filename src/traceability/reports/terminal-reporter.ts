/**
 * Terminal report generator.
 */

import type { TraceabilityReport, RequirementCoverage } from '../types/index.js';

/**
 * Generate a human-readable terminal report.
 * @req FR:req-traceability/report.output.terminal
 * @req FR:req-traceability/report.content.metrics
 * @req FR:req-traceability/priority.reporting
 */
export function generateTerminalReport(report: TraceabilityReport): string {
  const lines: string[] = [];
  const { summary } = report;

  // Header
  lines.push('Requirement Traceability Report');
  lines.push('================================');
  lines.push('');

  // Overview
  lines.push(
    `Total requirements: ${summary.total} (${summary.active} active, ${summary.deferred} deferred, ${summary.exempt} exempt, ${summary.deprecated} deprecated)`
  );
  lines.push('');

  // Scores
  // @req FR:req-traceability/report.content.scores.coverage
  // @req FR:req-traceability/report.content.scores.completeness
  lines.push(`Coverage: ${summary.coverageScore}% (${summary.completenessScore}% complete)`);
  lines.push('');

  // Coverage metrics
  lines.push('Coverage (of active requirements):');
  lines.push(`  Implemented: ${summary.implemented} (${summary.implementationCoverage}%)`);
  lines.push(`  Tested: ${summary.tested} (${summary.testCoverage}%)`);
  lines.push(`  Covered: ${summary.covered} (${summary.overallCoverage}%)`);
  lines.push(`  Uncovered: ${summary.uncovered}`);
  lines.push('');

  // Priority breakdown
  if (summary.byPriority) {
    lines.push('Coverage by priority:');
    const priorities = ['P1', 'P2', 'P3', 'P4', 'P5'] as const;
    for (const pri of priorities) {
      const count = summary.byPriority[pri];
      const coverage = summary.coverageByPriority[pri];
      if (count > 0) {
        lines.push(`  ${pri}: ${coverage}% (${count} requirements)`);
      }
    }
    lines.push('');
  }

  // File-level annotations (cop-outs)
  // @req FR:req-traceability/annotation.file-level-detection
  if (report.fileLevelAnnotations.length > 0) {
    lines.push(`File-level annotations (should be on functions/classes): ${report.fileLevelAnnotations.length}`);
    for (const ann of report.fileLevelAnnotations) {
      lines.push(`  - ${ann.id} (${ann.file}:${ann.line})${ann.isTest ? ' [test]' : ''}`);
    }
    lines.push('');
  }

  // Code coverage gaps (active P1-P3 without code @req)
  // @req FR:req-traceability/scan.traceability-mode.disabled.output
  // @req FR:req-traceability/scan.traceability-mode.required.output
  if (report.codeCoverageGaps.length > 0) {
    lines.push(`Code coverage gaps (P1-P3 without code @req): ${report.codeCoverageGaps.length}`);
    for (const gap of report.codeCoverageGaps) {
      const severityTag = gap.severity === 'error' ? '[ERROR]' : '[WARN]';
      lines.push(`  - ${severityTag} [${gap.priority}] ${gap.id} (${gap.spec.file}:${gap.spec.line})`);
    }
    lines.push('');
  }

  // Test coverage gaps (active P1-P3 without test @req)
  // @req FR:req-traceability/analysis.test-completeness
  // @req FR:req-traceability/scan.traceability-mode.disabled.output
  // @req FR:req-traceability/scan.traceability-mode.required.output
  if (report.testCoverageGaps.length > 0) {
    lines.push(`Test coverage gaps (P1-P3 without test @req): ${report.testCoverageGaps.length}`);
    for (const gap of report.testCoverageGaps) {
      const severityTag = gap.severity === 'error' ? '[ERROR]' : '[WARN]';
      lines.push(`  - ${severityTag} [${gap.priority}] ${gap.id} (${gap.spec.file}:${gap.spec.line})`);
    }
    lines.push('');
  }

  // Orphaned annotations
  if (report.orphaned.length > 0) {
    lines.push(`Orphaned annotations: ${report.orphaned.length}`);
    for (const orphan of report.orphaned) {
      lines.push(`  - ${orphan.id}`);
      for (const loc of orphan.locations) {
        lines.push(`    at ${loc}`);
      }
    }
    lines.push('');
  } else {
    lines.push('Orphaned annotations: 0');
    lines.push('');
  }

  // Uncovered requirements (gaps)
  const uncoveredReqs = getUncoveredRequirements(report);
  if (uncoveredReqs.length > 0) {
    lines.push('Uncovered requirements (gaps):');
    for (const [id, coverage] of uncoveredReqs) {
      lines.push(`  - ${id} (${coverage.spec.file}:${coverage.spec.line})`);
    }
    lines.push('');
  }

  // Deferred requirements
  const deferredReqs = getDeferredRequirements(report);
  if (deferredReqs.length > 0) {
    lines.push('Deferred requirements:');
    for (const [id, coverage] of deferredReqs) {
      lines.push(`  - ${id} (${coverage.spec.file}:${coverage.spec.line})`);
    }
    lines.push('');
  }

  // Exempt requirements (human conventions)
  const exemptReqs = getExemptRequirements(report);
  if (exemptReqs.length > 0) {
    lines.push('Exempt requirements (human conventions):');
    for (const [id, coverage] of exemptReqs) {
      lines.push(`  - ${id} (${coverage.spec.file}:${coverage.spec.line})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get list of uncovered requirements (leaf nodes only).
 * @req FR:req-traceability/analysis.coverage.leaf-only
 * @req FR:req-traceability/report.output.terminal
 */
function getUncoveredRequirements(
  report: TraceabilityReport
): Array<[string, RequirementCoverage]> {
  const uncovered: Array<[string, RequirementCoverage]> = [];

  // Build set of all requirement IDs for parent detection
  const allIds = Array.from(report.requirements.keys());

  for (const [id, coverage] of report.requirements) {
    // Skip parent requirements - they don't contribute to coverage
    if (coverage.coverageStatus === 'parent') {
      continue;
    }

    // Skip if this requirement is a parent of another requirement in the report
    // (handles case where children were filtered out by priority but parent wasn't marked)
    const isParent = allIds.some(otherId =>
      otherId !== id &&
      otherId.startsWith(id + '.')
    );
    if (isParent) {
      continue;
    }

    // Skip requirements from features where both code and test traceability are disabled
    // @req FR:req-traceability/scan.traceability-mode.disabled.output
    if (report.featureTraceabilityModes) {
      const scopeMatch = id.match(/^[A-Z]+:([^/]+)\//);
      if (scopeMatch) {
        const mode = report.featureTraceabilityModes.get(scopeMatch[1]);
        if (mode?.code === 'disable' && mode?.test === 'disable') {
          continue;
        }
      }
    }

    // Include leaf nodes with no coverage
    if (coverage.coverageStatus === 'missing') {
      uncovered.push([id, coverage]);
    }
  }
  return uncovered;
}

/**
 * Get list of deferred requirements.
 */
function getDeferredRequirements(
  report: TraceabilityReport
): Array<[string, RequirementCoverage]> {
  const deferred: Array<[string, RequirementCoverage]> = [];
  for (const [id, coverage] of report.requirements) {
    if (coverage.coverageStatus === 'deferred') {
      deferred.push([id, coverage]);
    }
  }
  return deferred;
}

/**
 * Get list of exempt requirements (human conventions).
 */
function getExemptRequirements(
  report: TraceabilityReport
): Array<[string, RequirementCoverage]> {
  const exempt: Array<[string, RequirementCoverage]> = [];
  for (const [id, coverage] of report.requirements) {
    if (coverage.coverageStatus === 'exempt') {
      exempt.push([id, coverage]);
    }
  }
  return exempt;
}
