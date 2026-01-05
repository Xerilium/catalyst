/**
 * Unit tests for CoverageAnalyzer.
 */

import { CoverageAnalyzer } from '@traceability/analysis/coverage-analyzer.js';
import type {
  RequirementDefinition,
  RequirementAnnotation,
  TaskReference,
  RequirementId,
} from '@traceability/types/index.js';

// Helper to create a RequirementId
function makeReqId(type: 'FR' | 'NFR' | 'REQ', scope: string, path: string): RequirementId {
  return {
    type,
    scope,
    path,
    qualified: `${type}:${scope}/${path}`,
    short: `${type}:${path}`,
  };
}

// Helper to create a RequirementDefinition
function makeReq(
  type: 'FR' | 'NFR' | 'REQ',
  scope: string,
  path: string,
  state: 'active' | 'deferred' | 'deprecated' = 'active',
  deprecatedTarget?: string
): RequirementDefinition {
  return {
    id: makeReqId(type, scope, path),
    state,
    priority: 'P3', // Default priority
    text: `Requirement ${path}`,
    specFile: `.xe/features/${scope}/spec.md`,
    specLine: 10,
    deprecatedTarget,
  };
}

// Helper to create a RequirementAnnotation
function makeAnnotation(
  type: 'FR' | 'NFR' | 'REQ',
  scope: string,
  path: string,
  isTest = false,
  isPartial = false
): RequirementAnnotation {
  return {
    id: makeReqId(type, scope, path),
    file: isTest ? `tests/${scope}/${path}.test.ts` : `src/${scope}/${path}.ts`,
    line: 5,
    isPartial,
    isTest,
  };
}

// Helper to create a TaskReference
function makeTask(
  taskId: string,
  scope: string,
  reqPaths: string[]
): TaskReference {
  return {
    taskId,
    file: `.xe/features/${scope}/tasks.md`,
    line: 15,
    description: `Task ${taskId}`,
    requirements: reqPaths.map((p) => makeReqId('FR', scope, p)),
  };
}

/**
 * @req FR:req-traceability/analysis.missing
 * @req FR:req-traceability/analysis.orphan
 * @req FR:req-traceability/analysis.deprecated
 * @req FR:req-traceability/analysis.coverage
 * @req FR:req-traceability/analysis.coverage.code
 * @req FR:req-traceability/analysis.coverage.tests
 * @req FR:req-traceability/analysis.coverage.tasks
 */
describe('CoverageAnalyzer', () => {
  let analyzer: CoverageAnalyzer;

  beforeEach(() => {
    analyzer = new CoverageAnalyzer();
  });

  // @req FR:req-traceability/analysis.missing
  describe('missing requirements', () => {
    it('should detect requirement with no annotations as missing', () => {
      const requirements = [makeReq('FR', 'auth', 'session.expiry')];
      const annotations: RequirementAnnotation[] = [];

      const report = analyzer.analyze(requirements, annotations);

      const coverage = report.requirements.get('FR:auth/session.expiry');
      expect(coverage).toBeDefined();
      expect(coverage!.coverageStatus).toBe('missing');
    });

    it('should report uncovered count in summary', () => {
      const requirements = [
        makeReq('FR', 'auth', 'req1'),
        makeReq('FR', 'auth', 'req2'),
        makeReq('FR', 'auth', 'req3'),
      ];
      const annotations = [makeAnnotation('FR', 'auth', 'req1')];

      const report = analyzer.analyze(requirements, annotations);

      expect(report.summary.uncovered).toBe(2);
    });
  });

  // @req FR:req-traceability/analysis.coverage.code
  describe('implemented status', () => {
    it('should mark requirement as implemented when has code annotation', () => {
      const requirements = [makeReq('FR', 'auth', 'session.expiry')];
      const annotations = [makeAnnotation('FR', 'auth', 'session.expiry', false)];

      const report = analyzer.analyze(requirements, annotations);

      const coverage = report.requirements.get('FR:auth/session.expiry');
      expect(coverage!.coverageStatus).toBe('implemented');
      expect(coverage!.implementations).toHaveLength(1);
    });

    it('should mark as implemented-partial when only partial annotations', () => {
      const requirements = [makeReq('FR', 'auth', 'session.expiry')];
      const annotations = [
        makeAnnotation('FR', 'auth', 'session.expiry', false, true),
      ];

      const report = analyzer.analyze(requirements, annotations);

      const coverage = report.requirements.get('FR:auth/session.expiry');
      expect(coverage!.coverageStatus).toBe('implemented-partial');
    });

    it('should mark as implemented (not partial) when has mix of partial and full', () => {
      const requirements = [makeReq('FR', 'auth', 'session.expiry')];
      const annotations = [
        makeAnnotation('FR', 'auth', 'session.expiry', false, true),
        makeAnnotation('FR', 'auth', 'session.expiry', false, false),
      ];

      const report = analyzer.analyze(requirements, annotations);

      const coverage = report.requirements.get('FR:auth/session.expiry');
      expect(coverage!.coverageStatus).not.toBe('implemented-partial');
    });
  });

  // @req FR:req-traceability/analysis.coverage.tests
  describe('tested status', () => {
    it('should mark requirement as tested when has test annotation', () => {
      const requirements = [makeReq('FR', 'auth', 'session.expiry')];
      const annotations = [
        makeAnnotation('FR', 'auth', 'session.expiry', false), // code
        makeAnnotation('FR', 'auth', 'session.expiry', true), // test
      ];

      const report = analyzer.analyze(requirements, annotations);

      const coverage = report.requirements.get('FR:auth/session.expiry');
      expect(coverage!.coverageStatus).toBe('tested');
      expect(coverage!.tests).toHaveLength(1);
    });

    it('should mark as tested even with only test annotation (no code)', () => {
      const requirements = [makeReq('FR', 'auth', 'session.expiry')];
      const annotations = [makeAnnotation('FR', 'auth', 'session.expiry', true)];

      const report = analyzer.analyze(requirements, annotations);

      const coverage = report.requirements.get('FR:auth/session.expiry');
      expect(coverage!.coverageStatus).toBe('tested');
    });
  });

  describe('deferred status', () => {
    it('should mark deferred requirement as deferred regardless of annotations', () => {
      const requirements = [makeReq('FR', 'auth', 'oauth', 'deferred')];
      const annotations = [makeAnnotation('FR', 'auth', 'oauth', false)];

      const report = analyzer.analyze(requirements, annotations);

      const coverage = report.requirements.get('FR:auth/oauth');
      expect(coverage!.coverageStatus).toBe('deferred');
    });

    it('should exclude deferred from active count', () => {
      const requirements = [
        makeReq('FR', 'auth', 'req1', 'active'),
        makeReq('FR', 'auth', 'req2', 'deferred'),
      ];

      const report = analyzer.analyze(requirements, []);

      expect(report.summary.total).toBe(2);
      expect(report.summary.active).toBe(1);
      expect(report.summary.deferred).toBe(1);
    });
  });

  // @req FR:req-traceability/analysis.deprecated
  describe('deprecated status', () => {
    it('should mark deprecated requirement as deprecated', () => {
      const requirements = [
        makeReq('FR', 'auth', 'legacy', 'deprecated', 'FR:auth/session'),
      ];

      const report = analyzer.analyze(requirements, []);

      const coverage = report.requirements.get('FR:auth/legacy');
      expect(coverage!.coverageStatus).toBe('deprecated');
    });

    it('should exclude deprecated from active count', () => {
      const requirements = [
        makeReq('FR', 'auth', 'req1', 'active'),
        makeReq('FR', 'auth', 'legacy', 'deprecated'),
      ];

      const report = analyzer.analyze(requirements, []);

      expect(report.summary.active).toBe(1);
      expect(report.summary.deprecated).toBe(1);
    });
  });

  // @req FR:req-traceability/analysis.orphan
  describe('orphaned annotations', () => {
    it('should detect annotation referencing non-existent requirement', () => {
      const requirements = [makeReq('FR', 'auth', 'session.expiry')];
      const annotations = [
        makeAnnotation('FR', 'auth', 'session.expiry'),
        makeAnnotation('FR', 'auth', 'nonexistent.req'),
      ];

      const report = analyzer.analyze(requirements, annotations);

      expect(report.orphaned).toHaveLength(1);
      expect(report.orphaned[0].id).toBe('FR:auth/nonexistent.req');
      expect(report.orphaned[0].locations).toContain('src/auth/nonexistent.req.ts:5');
    });

    it('should group multiple locations for same orphaned ID', () => {
      const requirements: RequirementDefinition[] = [];
      const annotations = [
        { ...makeAnnotation('FR', 'auth', 'orphan'), file: 'src/a.ts', line: 1 },
        { ...makeAnnotation('FR', 'auth', 'orphan'), file: 'src/b.ts', line: 2 },
      ];

      const report = analyzer.analyze(requirements, annotations);

      expect(report.orphaned).toHaveLength(1);
      expect(report.orphaned[0].locations).toHaveLength(2);
    });
  });

  // @req FR:req-traceability/analysis.coverage.tasks
  describe('task coverage', () => {
    it('should track requirements referenced by tasks', () => {
      const requirements = [makeReq('FR', 'auth', 'session.expiry')];
      const annotations: RequirementAnnotation[] = [];
      const tasks = [makeTask('T001', 'auth', ['session.expiry'])];

      const report = analyzer.analyze(requirements, annotations, tasks);

      expect(report.tasks.size).toBe(1);
      // Task keys are prefixed with feature name: feature:taskId
      expect(report.tasks.get('auth:T001')).toBeDefined();
    });

    it('should calculate task coverage percentage', () => {
      const requirements = [
        makeReq('FR', 'auth', 'req1'),
        makeReq('FR', 'auth', 'req2'),
        makeReq('FR', 'auth', 'req3'),
        makeReq('FR', 'auth', 'req4'),
      ];
      const tasks = [
        makeTask('T001', 'auth', ['req1', 'req2']),
        makeTask('T002', 'auth', ['req3']),
      ];

      const report = analyzer.analyze(requirements, [], tasks);

      // 3 out of 4 requirements have task coverage
      expect(report.summary.taskCoverage).toBe(75);
    });

    it('should count tasks without requirements', () => {
      const requirements = [makeReq('FR', 'auth', 'req1')];
      const tasks: TaskReference[] = [
        makeTask('T001', 'auth', ['req1']),
        { ...makeTask('T002', 'auth', []), requirements: [] },
        { ...makeTask('T003', 'auth', []), requirements: [] },
      ];

      const report = analyzer.analyze(requirements, [], tasks);

      expect(report.summary.tasksWithoutRequirements).toBe(2);
    });
  });

  // @req FR:req-traceability/analysis.coverage
  describe('coverage percentage calculations', () => {
    it('should calculate implementation coverage correctly', () => {
      const requirements = [
        makeReq('FR', 'auth', 'req1'),
        makeReq('FR', 'auth', 'req2'),
        makeReq('FR', 'auth', 'req3'),
        makeReq('FR', 'auth', 'req4'),
        makeReq('FR', 'auth', 'deferred', 'deferred'),
      ];
      const annotations = [
        makeAnnotation('FR', 'auth', 'req1'),
        makeAnnotation('FR', 'auth', 'req2'),
        makeAnnotation('FR', 'auth', 'req3'),
      ];

      const report = analyzer.analyze(requirements, annotations);

      // 3 implemented out of 4 active = 75%
      expect(report.summary.implementationCoverage).toBe(75);
    });

    it('should calculate test coverage correctly', () => {
      const requirements = [
        makeReq('FR', 'auth', 'req1'),
        makeReq('FR', 'auth', 'req2'),
      ];
      const annotations = [
        makeAnnotation('FR', 'auth', 'req1', true), // test
      ];

      const report = analyzer.analyze(requirements, annotations);

      // 1 tested out of 2 active = 50%
      expect(report.summary.testCoverage).toBe(50);
    });

    it('should handle 0 active requirements', () => {
      const requirements = [makeReq('FR', 'auth', 'deferred', 'deferred')];

      const report = analyzer.analyze(requirements, []);

      expect(report.summary.implementationCoverage).toBe(0);
      expect(report.summary.testCoverage).toBe(0);
      expect(report.summary.taskCoverage).toBe(0);
    });

    it('should handle 100% coverage', () => {
      const requirements = [
        makeReq('FR', 'auth', 'req1'),
        makeReq('FR', 'auth', 'req2'),
      ];
      const annotations = [
        makeAnnotation('FR', 'auth', 'req1', false), // code annotation
        makeAnnotation('FR', 'auth', 'req1', true), // test annotation
        makeAnnotation('FR', 'auth', 'req2', false), // code annotation
        makeAnnotation('FR', 'auth', 'req2', true), // test annotation
      ];

      const report = analyzer.analyze(requirements, annotations);

      expect(report.summary.implementationCoverage).toBe(100);
      expect(report.summary.testCoverage).toBe(100);
    });
  });

  describe('summary statistics', () => {
    it('should calculate all summary fields correctly', () => {
      const requirements = [
        makeReq('FR', 'auth', 'implemented'),
        makeReq('FR', 'auth', 'tested'),
        makeReq('FR', 'auth', 'missing'),
        makeReq('FR', 'auth', 'deferred', 'deferred'),
        makeReq('FR', 'auth', 'deprecated', 'deprecated'),
      ];
      const annotations = [
        makeAnnotation('FR', 'auth', 'implemented', false),
        makeAnnotation('FR', 'auth', 'tested', false),
        makeAnnotation('FR', 'auth', 'tested', true),
      ];
      const tasks = [
        makeTask('T001', 'auth', ['implemented']),
        makeTask('T002', 'auth', ['tested']),
        { ...makeTask('T003', 'auth', []), requirements: [] },
      ];

      const report = analyzer.analyze(requirements, annotations, tasks);

      expect(report.summary.total).toBe(5);
      expect(report.summary.active).toBe(3);
      expect(report.summary.implemented).toBe(2); // implemented + tested
      expect(report.summary.tested).toBe(1);
      expect(report.summary.uncovered).toBe(1);
      expect(report.summary.deferred).toBe(1);
      expect(report.summary.deprecated).toBe(1);
      expect(report.summary.tasksWithoutRequirements).toBe(1);
    });
  });

  // @req FR:req-traceability/analysis.coverage.leaf-only
  describe('leaf-node-only coverage', () => {
    it('should exclude parent requirements from active count', () => {
      // Parent requirement has child requirements, should not count toward coverage
      const requirements = [
        makeReq('FR', 'auth', 'session'), // Parent (has children)
        makeReq('FR', 'auth', 'session.expiry'), // Child (leaf)
        makeReq('FR', 'auth', 'session.refresh'), // Child (leaf)
      ];
      const annotations = [
        makeAnnotation('FR', 'auth', 'session.expiry'),
        makeAnnotation('FR', 'auth', 'session.refresh'),
      ];

      const report = analyzer.analyze(requirements, annotations);

      // Only 2 leaf nodes count as active (parent excluded)
      expect(report.summary.active).toBe(2);
      expect(report.summary.implemented).toBe(2);
      expect(report.summary.implementationCoverage).toBe(100);
    });

    it('should not count parent requirement as missing even without annotations', () => {
      const requirements = [
        makeReq('FR', 'auth', 'session'), // Parent (no annotations but should not be missing)
        makeReq('FR', 'auth', 'session.expiry'), // Child with annotation
      ];
      const annotations = [makeAnnotation('FR', 'auth', 'session.expiry')];

      const report = analyzer.analyze(requirements, annotations);

      // Parent should not count as uncovered/missing
      expect(report.summary.uncovered).toBe(0);
      expect(report.summary.active).toBe(1); // Only leaf counts
    });

    it('should detect multi-level parent hierarchy', () => {
      // Three levels: grandparent > parent > child
      const requirements = [
        makeReq('FR', 'auth', 'session'), // Grandparent
        makeReq('FR', 'auth', 'session.tokens'), // Parent
        makeReq('FR', 'auth', 'session.tokens.access'), // Leaf
        makeReq('FR', 'auth', 'session.tokens.refresh'), // Leaf
      ];
      const annotations = [
        makeAnnotation('FR', 'auth', 'session.tokens.access'),
        makeAnnotation('FR', 'auth', 'session.tokens.refresh'),
      ];

      const report = analyzer.analyze(requirements, annotations);

      // Only 2 leaf nodes count as active
      expect(report.summary.active).toBe(2);
      expect(report.summary.implemented).toBe(2);
    });

    it('should still include parent in requirements map for navigation', () => {
      const requirements = [
        makeReq('FR', 'auth', 'session'),
        makeReq('FR', 'auth', 'session.expiry'),
      ];

      const report = analyzer.analyze(requirements, []);

      // Parent should still be in the requirements map
      expect(report.requirements.has('FR:auth/session')).toBe(true);
      expect(report.requirements.has('FR:auth/session.expiry')).toBe(true);
    });

    it('should handle requirements across different scopes independently', () => {
      // Parent/child in auth scope, leaf in other scope
      const requirements = [
        makeReq('FR', 'auth', 'session'), // Parent
        makeReq('FR', 'auth', 'session.expiry'), // Child
        makeReq('FR', 'other', 'session'), // Different scope, no children = leaf
      ];
      const annotations = [
        makeAnnotation('FR', 'auth', 'session.expiry'),
        makeAnnotation('FR', 'other', 'session'),
      ];

      const report = analyzer.analyze(requirements, annotations);

      // 2 leaf nodes: auth/session.expiry and other/session
      expect(report.summary.active).toBe(2);
      expect(report.summary.implemented).toBe(2);
    });

    it('should exclude parent requirements from total count', () => {
      const requirements = [
        makeReq('FR', 'auth', 'session'),
        makeReq('FR', 'auth', 'session.expiry'),
      ];

      const report = analyzer.analyze(requirements, []);

      // Total excludes parent requirements (only leaves count for metrics)
      expect(report.summary.total).toBe(1);
      expect(report.summary.active).toBe(1);
    });
  });
});
