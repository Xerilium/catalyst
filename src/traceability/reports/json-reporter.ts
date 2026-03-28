/**
 * JSON report generator.
 */

import type { TraceabilityReport } from '../types/index.js';

/**
 * Generate a JSON report from traceability data.
 * @req FR:req-traceability/report.output.json
 * @req FR:req-traceability/report.content.spec-text
 * @req FR:req-traceability/report.content.metrics
 * @req FR:req-traceability/priority.reporting
 */
export function generateJsonReport(report: TraceabilityReport): string {
  // Convert Maps to plain objects for JSON serialization
  const requirementsObj: Record<string, unknown> = {};
  for (const [key, value] of report.requirements.entries()) {
    requirementsObj[key] = value;
  }

  // Convert featureTraceabilityModes Map to object
  let featureTraceabilityModesObj: Record<string, unknown> | undefined;
  if (report.featureTraceabilityModes) {
    featureTraceabilityModesObj = {};
    for (const [key, value] of report.featureTraceabilityModes.entries()) {
      featureTraceabilityModesObj[key] = value;
    }
  }

  const jsonOutput = {
    metadata: report.metadata,
    requirements: requirementsObj,
    orphaned: report.orphaned,
    fileLevelAnnotations: report.fileLevelAnnotations,
    testCoverageGaps: report.testCoverageGaps,
    codeCoverageGaps: report.codeCoverageGaps,
    featureTraceabilityModes: featureTraceabilityModesObj,
    summary: report.summary,
  };

  return JSON.stringify(jsonOutput, null, 2);
}
