/**
 * Terminal report generator.
 * @req FR:req-traceability/report.output.terminal
 * @req FR:req-traceability/report.content.metrics
 * @req FR:req-traceability/report.content.tasks
 */

import type { TraceabilityReport, RequirementCoverage } from '../types/index.js';

/**
 * Generate a human-readable terminal report.
 * @req FR:req-traceability/report.output.terminal
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
    `Total requirements: ${summary.total} (${summary.active} active, ${summary.deferred} deferred, ${summary.deprecated} deprecated)`
  );
  lines.push('');

  // Coverage metrics
  lines.push('Coverage (of active requirements):');
  lines.push(`  Implemented: ${summary.implemented} (${summary.implementationCoverage}%)`);
  lines.push(`  Tested: ${summary.tested} (${summary.testCoverage}%)`);
  lines.push(`  Planned: ${countPlanned(report)} (${summary.taskCoverage}%)`);
  lines.push(`  Missing: ${summary.missing}`);
  lines.push('');

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

  // Missing requirements (gaps)
  const missingReqs = getMissingRequirements(report);
  if (missingReqs.length > 0) {
    lines.push('Missing requirements (gaps):');
    for (const [id, coverage] of missingReqs) {
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

  // Count only active requirements with tasks
  let count = 0;
  for (const [id, coverage] of report.requirements) {
    if (coverage.state === 'active' && reqsWithTasks.has(id)) {
      count++;
    }
  }
  return count;
}

/**
 * Get list of missing requirements.
 */
function getMissingRequirements(
  report: TraceabilityReport
): Array<[string, RequirementCoverage]> {
  const missing: Array<[string, RequirementCoverage]> = [];
  for (const [id, coverage] of report.requirements) {
    if (coverage.coverageStatus === 'missing') {
      missing.push([id, coverage]);
    }
  }
  return missing;
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
