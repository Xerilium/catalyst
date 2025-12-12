/**
 * Coverage analyzer for traceability reports.
 * @req FR:req-traceability/analysis.missing
 * @req FR:req-traceability/analysis.orphan
 * @req FR:req-traceability/analysis.deprecated
 * @req FR:req-traceability/analysis.coverage
 * @req FR:req-traceability/analysis.coverage.code
 * @req FR:req-traceability/analysis.coverage.tests
 * @req FR:req-traceability/analysis.coverage.tasks
 */

import type {
  RequirementDefinition,
  RequirementAnnotation,
  TaskReference,
  TraceabilityReport,
  RequirementCoverage,
  OrphanedAnnotation,
  CoverageStatus,
  CoverageSummary,
} from '../types/index.js';

/**
 * Analyzer that compares requirements against annotations and tasks.
 * @req FR:req-traceability/analysis.coverage
 */
export class CoverageAnalyzer {
  /**
   * Analyze coverage of requirements by annotations and tasks.
   * @req FR:req-traceability/analysis.coverage
   */
  analyze(
    requirements: RequirementDefinition[],
    annotations: RequirementAnnotation[],
    tasks: TaskReference[] = []
  ): TraceabilityReport {
    // Build maps for lookup
    const reqMap = this.buildRequirementMap(requirements);
    const annotationMap = this.buildAnnotationMap(annotations);
    const taskReqMap = this.buildTaskRequirementMap(tasks);

    // Analyze each requirement
    const coverageMap = new Map<string, RequirementCoverage>();
    for (const req of requirements) {
      const coverage = this.analyzeRequirement(
        req,
        annotationMap.get(req.id.qualified) || []
      );
      coverageMap.set(req.id.qualified, coverage);
    }

    // Find orphaned annotations
    const orphaned = this.findOrphanedAnnotations(annotations, reqMap);

    // Build task map
    const taskMap = new Map<string, TaskReference>();
    for (const task of tasks) {
      taskMap.set(task.taskId, task);
    }

    // Calculate summary
    const summary = this.calculateSummary(
      requirements,
      coverageMap,
      taskReqMap,
      tasks
    );

    return {
      metadata: {
        scanTime: new Date().toISOString(),
        filesScanned: 0, // Will be set by caller
        scanDurationMs: 0, // Will be set by caller
      },
      requirements: coverageMap,
      orphaned,
      tasks: taskMap,
      summary,
    };
  }

  /**
   * Build a map of requirement ID -> RequirementDefinition.
   */
  private buildRequirementMap(
    requirements: RequirementDefinition[]
  ): Map<string, RequirementDefinition> {
    const map = new Map<string, RequirementDefinition>();
    for (const req of requirements) {
      map.set(req.id.qualified, req);
    }
    return map;
  }

  /**
   * Build a map of requirement ID -> annotations[].
   */
  private buildAnnotationMap(
    annotations: RequirementAnnotation[]
  ): Map<string, RequirementAnnotation[]> {
    const map = new Map<string, RequirementAnnotation[]>();
    for (const ann of annotations) {
      const key = ann.id.qualified;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(ann);
    }
    return map;
  }

  /**
   * Build a map of requirement ID -> task IDs that reference it.
   * @req FR:req-traceability/analysis.coverage.tasks
   */
  private buildTaskRequirementMap(
    tasks: TaskReference[]
  ): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const task of tasks) {
      for (const req of task.requirements) {
        const key = req.qualified;
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(task.taskId);
      }
    }
    return map;
  }

  /**
   * Analyze a single requirement's coverage.
   * @req FR:req-traceability/analysis.coverage.code
   * @req FR:req-traceability/analysis.coverage.tests
   */
  private analyzeRequirement(
    req: RequirementDefinition,
    annotations: RequirementAnnotation[]
  ): RequirementCoverage {
    const implementations: Array<{
      file: string;
      line: number;
      partial: boolean;
    }> = [];
    const tests: Array<{ file: string; line: number }> = [];

    // Separate code and test annotations
    for (const ann of annotations) {
      if (ann.isTest) {
        tests.push({ file: ann.file, line: ann.line });
      } else {
        implementations.push({
          file: ann.file,
          line: ann.line,
          partial: ann.isPartial,
        });
      }
    }

    // Determine coverage status
    const status = this.determineCoverageStatus(req, implementations, tests);

    return {
      spec: {
        file: req.specFile,
        line: req.specLine,
        text: req.text,
      },
      state: req.state,
      implementations,
      tests,
      coverageStatus: status,
    };
  }

  /**
   * Determine the coverage status for a requirement.
   * @req FR:req-traceability/analysis.missing
   * @req FR:req-traceability/analysis.deprecated
   */
  private determineCoverageStatus(
    req: RequirementDefinition,
    implementations: Array<{ file: string; line: number; partial: boolean }>,
    tests: Array<{ file: string; line: number }>
  ): CoverageStatus {
    // Check state first
    if (req.state === 'deferred') {
      return 'deferred';
    }
    if (req.state === 'deprecated') {
      return 'deprecated';
    }

    // Check for tests (highest status)
    if (tests.length > 0) {
      return 'tested';
    }

    // Check for implementations
    if (implementations.length > 0) {
      const hasFullImplementation = implementations.some((impl) => !impl.partial);
      if (hasFullImplementation) {
        return 'implemented';
      }
      return 'implemented-partial';
    }

    // No coverage
    return 'missing';
  }

  /**
   * Find annotations that reference non-existent requirements.
   * @req FR:req-traceability/analysis.orphan
   */
  private findOrphanedAnnotations(
    annotations: RequirementAnnotation[],
    reqMap: Map<string, RequirementDefinition>
  ): OrphanedAnnotation[] {
    const orphanMap = new Map<string, string[]>();

    for (const ann of annotations) {
      if (!reqMap.has(ann.id.qualified)) {
        const key = ann.id.qualified;
        if (!orphanMap.has(key)) {
          orphanMap.set(key, []);
        }
        orphanMap.get(key)!.push(`${ann.file}:${ann.line}`);
      }
    }

    return Array.from(orphanMap.entries()).map(([id, locations]) => ({
      id,
      locations,
    }));
  }

  /**
   * Calculate summary statistics.
   * @req FR:req-traceability/analysis.coverage
   */
  private calculateSummary(
    requirements: RequirementDefinition[],
    coverageMap: Map<string, RequirementCoverage>,
    taskReqMap: Map<string, string[]>,
    tasks: TaskReference[]
  ): CoverageSummary {
    let total = 0;
    let active = 0;
    let implemented = 0;
    let tested = 0;
    let missing = 0;
    let deferred = 0;
    let deprecated = 0;
    let plannedCount = 0;

    for (const req of requirements) {
      total++;
      const coverage = coverageMap.get(req.id.qualified);
      if (!coverage) continue;

      switch (coverage.coverageStatus) {
        case 'tested':
          active++;
          implemented++;
          tested++;
          break;
        case 'implemented':
        case 'implemented-partial':
          active++;
          implemented++;
          break;
        case 'missing':
          active++;
          missing++;
          break;
        case 'deferred':
          deferred++;
          break;
        case 'deprecated':
          deprecated++;
          break;
      }

      // Check if requirement is referenced by any task
      if (taskReqMap.has(req.id.qualified)) {
        plannedCount++;
      }
    }

    // Count tasks without requirements
    const tasksWithoutRequirements = tasks.filter(
      (t) => t.requirements.length === 0
    ).length;

    // Calculate percentages (avoid division by zero)
    const implementationCoverage =
      active > 0 ? Math.round((implemented / active) * 100) : 0;
    const testCoverage =
      active > 0 ? Math.round((tested / active) * 100) : 0;
    const taskCoverage =
      active > 0 ? Math.round((plannedCount / active) * 100) : 0;

    return {
      total,
      active,
      implemented,
      tested,
      missing,
      deferred,
      deprecated,
      implementationCoverage,
      testCoverage,
      taskCoverage,
      tasksWithoutRequirements,
    };
  }
}
