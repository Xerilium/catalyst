/**
 * Terminal report generator.
 */

import type { TraceabilityReport, RequirementCoverage } from '../types/index.js';

/**
 * Generate a human-readable terminal report.
 * @req FR:req-traceability/report.output.terminal
 * @req FR:req-traceability/report.content.metrics
 * @req FR:req-traceability/report.content.tasks
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

  // Coverage metrics (ordered by workflow: plan → implement → test)
  lines.push('Coverage (of active requirements):');
  lines.push(`  Planned: ${countPlanned(report)} (${summary.taskCoverage}%)`);
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

  // Tasks without requirements
  if (summary.tasksWithoutRequirements > 0) {
    lines.push(`Tasks without requirements: ${summary.tasksWithoutRequirements}`);
    for (const [, task] of report.tasks) {
      if (task.requirements.length === 0) {
        lines.push(`  - ${task.taskId}: ${task.description} (${task.file}:${task.line})`);
      }
    }
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
 * Count requirements that have task coverage.
 */
function countPlanned(report: TraceabilityReport): number {
  const reqsWithTasks = new Set<string>();
  for (const [, task] of report.tasks) {
    for (const req of task.requirements) {
      reqsWithTasks.add(req.qualified);
    }
  }

  // Count only active leaf requirements with tasks (exclude parents)
  let count = 0;
  for (const [id, coverage] of report.requirements) {
    if (coverage.state === 'active' &&
        coverage.coverageStatus !== 'parent' &&
        reqsWithTasks.has(id)) {
      count++;
    }
  }
  return count;
}

/**
 * Get list of uncovered requirements (no annotations).
 */
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
