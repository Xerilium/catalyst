/**
 * Unit tests for CoverageAnalyzer.
 * @req FR:req-traceability/analysis.missing
 * @req FR:req-traceability/analysis.orphan
 * @req FR:req-traceability/analysis.deprecated
 * @req FR:req-traceability/analysis.coverage
 * @req FR:req-traceability/analysis.coverage.code
 * @req FR:req-traceability/analysis.coverage.tests
 * @req FR:req-traceability/analysis.coverage.tasks
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

    it('should report missing count in summary', () => {
      const requirements = [
        makeReq('FR', 'auth', 'req1'),
        makeReq('FR', 'auth', 'req2'),
        makeReq('FR', 'auth', 'req3'),
      ];
      const annotations = [makeAnnotation('FR', 'auth', 'req1')];

      const report = analyzer.analyze(requirements, annotations);

      expect(report.summary.missing).toBe(2);
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
      expect(report.tasks.get('T001')).toBeDefined();
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
        makeAnnotation('FR', 'auth', 'req1', true),
        makeAnnotation('FR', 'auth', 'req2', true),
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
      expect(report.summary.missing).toBe(1);
      expect(report.summary.deferred).toBe(1);
      expect(report.summary.deprecated).toBe(1);
      expect(report.summary.tasksWithoutRequirements).toBe(1);
    });
  });
});
