/**
 * JSON report generator.
 */

import type { TraceabilityReport } from '../types/index.js';

/**
 * Generate a JSON report from traceability data.
 * @req FR:req-traceability/report.output.json
 * @req FR:req-traceability/report.content.spec-text
 * @req FR:req-traceability/report.content.metrics
 * @req FR:req-traceability/report.content.tasks
 * @req FR:req-traceability/priority.reporting
 */
export function generateJsonReport(report: TraceabilityReport): string {
  // Convert Maps to plain objects for JSON serialization
  const requirementsObj: Record<string, unknown> = {};
  for (const [key, value] of report.requirements.entries()) {
    requirementsObj[key] = value;
  }

  // Convert tasks Map, extracting just the qualified IDs for requirements
  const tasksObj: Record<string, unknown> = {};
  for (const [key, task] of report.tasks.entries()) {
    tasksObj[key] = {
      file: task.file,
      line: task.line,
      description: task.description,
      requirements: task.requirements.map((r) => r.qualified),
    };
  }

  const jsonOutput = {
    metadata: report.metadata,
    requirements: requirementsObj,
    orphaned: report.orphaned,
    tasks: tasksObj,
    summary: report.summary,
  };

  return JSON.stringify(jsonOutput, null, 2);
}
