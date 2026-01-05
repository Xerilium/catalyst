/**
 * Coverage analyzer for traceability reports.
 */

import type {
  RequirementDefinition,
  RequirementAnnotation,
  RequirementPriority,
  TaskReference,
  TraceabilityReport,
  RequirementCoverage,
  OrphanedAnnotation,
  CoverageStatus,
  CoverageSummary,
  PriorityCounts,
} from '../types/index.js';

/**
 * Analyzer that compares requirements against annotations and tasks.
 * @req FR:req-traceability/analysis.missing
 * @req FR:req-traceability/analysis.orphan
 * @req FR:req-traceability/analysis.deprecated
 * @req FR:req-traceability/analysis.coverage
 * @req FR:req-traceability/analysis.coverage.code
 * @req FR:req-traceability/analysis.coverage.tests
 * @req FR:req-traceability/analysis.coverage.tasks
 * @req FR:req-traceability/analysis.coverage.leaf-only
 * @req FR:req-traceability/priority.reporting
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
    const parentSet = this.buildParentSet(requirements);

    // Analyze each requirement
    const coverageMap = new Map<string, RequirementCoverage>();
    for (const req of requirements) {
      const coverage = this.analyzeRequirement(
        req,
        annotationMap.get(req.id.qualified) || []
      );
      // Mark parent requirements with 'parent' status
      if (parentSet.has(req.id.qualified)) {
        coverage.coverageStatus = 'parent';
      }
      coverageMap.set(req.id.qualified, coverage);
    }

    // Find orphaned annotations
    const orphaned = this.findOrphanedAnnotations(annotations, reqMap);

    // Build task map - key by feature:taskId to avoid collisions across features
    const taskMap = new Map<string, TaskReference>();
    for (const task of tasks) {
      // Extract feature from file path (e.g., ".xe/features/playbook-definition/tasks.md" -> "playbook-definition")
      const featureMatch = task.file.match(/\.xe\/features\/([^/]+)\//);
      const feature = featureMatch ? featureMatch[1] : 'unknown';
      const key = `${feature}:${task.taskId}`;
      taskMap.set(key, task);
    }

    // Calculate summary (excluding parent requirements from coverage metrics)
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
   * Build a set of parent requirement IDs (requirements that have children).
   * Parent requirements are excluded from coverage metrics.
   * @req FR:req-traceability/analysis.coverage.leaf-only
   */
  private buildParentSet(requirements: RequirementDefinition[]): Set<string> {
    const parentSet = new Set<string>();

    // For each requirement, check if any other requirement's path starts with this one + "."
    for (const req of requirements) {
      const reqType = req.id.type;
      const reqScope = req.id.scope;
      const reqPath = req.id.path;

      for (const other of requirements) {
        // Must be same type, same scope, and path must start with our path + "."
        if (
          other.id.type === reqType &&
          other.id.scope === reqScope &&
          other.id.path !== reqPath &&
          other.id.path.startsWith(reqPath + '.')
        ) {
          parentSet.add(req.id.qualified);
          break; // Found at least one child, no need to check more
        }
      }
    }

    return parentSet;
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
      priority: req.priority,
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
    if (req.state === 'exempt') {
      return 'exempt';
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
   * @req FR:req-traceability/analysis.coverage.leaf-only
   * @req FR:req-traceability/priority.reporting
   */
  private calculateSummary(
    requirements: RequirementDefinition[],
    coverageMap: Map<string, RequirementCoverage>,
    taskReqMap: Map<string, string[]>,
    tasks: TaskReference[]
  ): CoverageSummary {
    let total = 0;
    let active = 0;
    let implemented = 0; // Has code annotations
    let tested = 0; // Has test annotations
    let covered = 0; // Has any annotation (code OR test)
    let uncovered = 0; // No annotations at all
    let deferred = 0;
    let deprecated = 0;
    let exempt = 0;
    let plannedCount = 0;

    // Track counts by priority
    const byPriority: PriorityCounts = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0 };
    const coveredByPriority: PriorityCounts = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0 };

    for (const req of requirements) {
      const coverage = coverageMap.get(req.id.qualified);
      if (!coverage) continue;

      // Skip parent requirements from coverage metrics (leaf-only)
      if (coverage.coverageStatus === 'parent') continue;

      total++;

      // Track priority counts for active requirements
      const priority = req.priority;
      const isActive = coverage.coverageStatus !== 'deferred' && coverage.coverageStatus !== 'deprecated' && coverage.coverageStatus !== 'exempt';

      if (isActive) {
        active++;
        byPriority[priority]++;

        // Count implemented (has code annotations) - independent of tests
        const hasCodeAnnotations = coverage.implementations.length > 0;
        if (hasCodeAnnotations) {
          implemented++;
        }

        // Count tested (has test annotations) - independent of code
        const hasTestAnnotations = coverage.tests.length > 0;
        if (hasTestAnnotations) {
          tested++;
        }

        // Count covered (has ANY annotation) - union
        if (hasCodeAnnotations || hasTestAnnotations) {
          covered++;
          coveredByPriority[priority]++;
        } else {
          uncovered++;
        }
      } else if (coverage.coverageStatus === 'deferred') {
        deferred++;
      } else if (coverage.coverageStatus === 'deprecated') {
        deprecated++;
      } else if (coverage.coverageStatus === 'exempt') {
        exempt++;
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
    const overallCoverage =
      active > 0 ? Math.round((covered / active) * 100) : 0;
    const taskCoverage =
      active > 0 ? Math.round((plannedCount / active) * 100) : 0;

    // Calculate coverage percentage by priority (based on overall coverage)
    const coverageByPriority: PriorityCounts = {
      P1: byPriority.P1 > 0 ? Math.round((coveredByPriority.P1 / byPriority.P1) * 100) : 0,
      P2: byPriority.P2 > 0 ? Math.round((coveredByPriority.P2 / byPriority.P2) * 100) : 0,
      P3: byPriority.P3 > 0 ? Math.round((coveredByPriority.P3 / byPriority.P3) * 100) : 0,
      P4: byPriority.P4 > 0 ? Math.round((coveredByPriority.P4 / byPriority.P4) * 100) : 0,
      P5: byPriority.P5 > 0 ? Math.round((coveredByPriority.P5 / byPriority.P5) * 100) : 0,
    };

    // Calculate coverage and completeness scores
    // @req FR:req-traceability/report.content.scores.coverage
    // @req FR:req-traceability/report.content.scores.completeness
    const priorityThreshold: RequirementPriority = 'P3'; // TODO: Read from engineering.md
    const { coverageScore, completenessScore } = this.calculateScores(
      byPriority,
      coveredByPriority,
      priorityThreshold
    );

    return {
      total,
      active,
      implemented,
      tested,
      covered,
      uncovered,
      deferred,
      deprecated,
      exempt,
      implementationCoverage,
      testCoverage,
      overallCoverage,
      taskCoverage,
      tasksWithoutRequirements,
      byPriority,
      coverageByPriority,
      coverageScore,
      completenessScore,
      priorityThreshold,
    };
  }

  /**
   * Calculate coverage and completeness scores.
   * @req FR:req-traceability/report.content.scores.coverage
   * @req FR:req-traceability/report.content.scores.completeness
   */
  private calculateScores(
    byPriority: PriorityCounts,
    coveredByPriority: PriorityCounts,
    threshold: RequirementPriority
  ): { coverageScore: number; completenessScore: number } {
    const priorities: RequirementPriority[] = ['P1', 'P2', 'P3', 'P4', 'P5'];
    const thresholdIndex = priorities.indexOf(threshold);

    // Full weights by position: P1=5, P2=4, P3=3, P4=2, P5=1
    const fullWeights: Record<RequirementPriority, number> = {
      P1: 5, P2: 4, P3: 3, P4: 2, P5: 1
    };

    // Coverage score: % of requirements within threshold that are covered
    let withinThresholdTotal = 0;
    let withinThresholdCovered = 0;
    for (let i = 0; i <= thresholdIndex; i++) {
      const pri = priorities[i];
      withinThresholdTotal += byPriority[pri];
      withinThresholdCovered += coveredByPriority[pri];
    }
    const coverageScore = withinThresholdTotal > 0
      ? Math.round((withinThresholdCovered / withinThresholdTotal) * 100)
      : 100; // If no requirements within threshold, consider it 100%

    // Completeness score: weighted coverage across all priorities
    // Within threshold: full weight, Beyond threshold: half weight
    let totalWeight = 0;
    let coveredWeight = 0;
    for (let i = 0; i < priorities.length; i++) {
      const pri = priorities[i];
      const count = byPriority[pri];
      const coveredCount = coveredByPriority[pri];
      const isWithinThreshold = i <= thresholdIndex;

      // Weight per requirement at this priority
      const weight = isWithinThreshold
        ? fullWeights[pri]
        : fullWeights[pri] / 2; // Half weight beyond threshold

      totalWeight += count * weight;
      coveredWeight += coveredCount * weight;
    }
    const completenessScore = totalWeight > 0
      ? Math.round((coveredWeight / totalWeight) * 100)
      : 100; // If no requirements, consider it 100%

    return { coverageScore, completenessScore };
  }
}
