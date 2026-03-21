/**
 * Unit tests for coverage analyzer — file-level annotations and test coverage gaps.
 * @req FR:req-traceability/annotation.file-level-detection
 * @req FR:req-traceability/analysis.test-completeness
 */

import { CoverageAnalyzer } from '@traceability/analysis/coverage-analyzer.js';
import type {
  RequirementDefinition,
  RequirementAnnotation,
  RequirementPriority,
  RequirementState,
  RequirementId,
} from '@traceability/types/index.js';

/** Helper: create a RequirementId */
function makeId(
  type: 'FR' | 'NFR' = 'FR',
  scope = 'test-feature',
  path = 'req.one'
): RequirementId {
  return {
    type,
    scope,
    path,
    qualified: `${type}:${scope}/${path}`,
    short: `${type}:${path}`,
  };
}

/** Helper: create a RequirementDefinition */
function makeReq(
  path: string,
  opts: {
    priority?: RequirementPriority;
    state?: RequirementState;
    scope?: string;
    type?: 'FR' | 'NFR';
  } = {}
): RequirementDefinition {
  const { priority = 'P3', state = 'active', scope = 'test-feature', type = 'FR' } = opts;
  const id = makeId(type, scope, path);
  return {
    id,
    state,
    priority,
    text: `Requirement ${path}`,
    specFile: '.xe/features/test-feature/spec.md',
    specLine: 10,
  };
}

/** Helper: create a RequirementAnnotation */
function makeAnnotation(
  path: string,
  opts: {
    isTest?: boolean;
    isFileLevel?: boolean;
    isPartial?: boolean;
    file?: string;
    scope?: string;
    type?: 'FR' | 'NFR';
  } = {}
): RequirementAnnotation {
  const {
    isTest = false,
    isFileLevel = false,
    isPartial = false,
    file = isTest ? 'tests/thing.test.ts' : 'src/thing.ts',
    scope = 'test-feature',
    type = 'FR',
  } = opts;
  return {
    id: makeId(type, scope, path),
    file,
    line: 5,
    isPartial,
    isTest,
    isFileLevel,
  };
}

describe('CoverageAnalyzer', () => {
  const analyzer = new CoverageAnalyzer();

  // @req FR:req-traceability/annotation.file-level-detection
  describe('file-level annotations', () => {
    it('should include file-level annotations in report.fileLevelAnnotations', () => {
      const reqs = [makeReq('req.one')];
      const annotations = [
        makeAnnotation('req.one', { isFileLevel: true, file: 'src/index.ts' }),
      ];

      const report = analyzer.analyze(reqs, annotations);

      expect(report.fileLevelAnnotations).toHaveLength(1);
      expect(report.fileLevelAnnotations[0]).toEqual({
        id: 'FR:test-feature/req.one',
        file: 'src/index.ts',
        line: 5,
        isTest: false,
      });
    });

    it('should NOT include non-file-level annotations', () => {
      const reqs = [makeReq('req.one')];
      const annotations = [
        makeAnnotation('req.one', { isFileLevel: false, file: 'src/thing.ts' }),
      ];

      const report = analyzer.analyze(reqs, annotations);

      expect(report.fileLevelAnnotations).toHaveLength(0);
    });

    it('should include file-level test annotations', () => {
      const reqs = [makeReq('req.one')];
      const annotations = [
        makeAnnotation('req.one', { isFileLevel: true, isTest: true }),
      ];

      const report = analyzer.analyze(reqs, annotations);

      expect(report.fileLevelAnnotations).toHaveLength(1);
      expect(report.fileLevelAnnotations[0].isTest).toBe(true);
    });

    it('should include multiple file-level annotations from different files', () => {
      const reqs = [makeReq('req.one'), makeReq('req.two')];
      const annotations = [
        makeAnnotation('req.one', { isFileLevel: true, file: 'src/a.ts' }),
        makeAnnotation('req.two', { isFileLevel: true, file: 'src/b.ts' }),
        makeAnnotation('req.one', { isFileLevel: false, file: 'src/c.ts' }),
      ];

      const report = analyzer.analyze(reqs, annotations);

      expect(report.fileLevelAnnotations).toHaveLength(2);
      expect(report.fileLevelAnnotations.map(a => a.file).sort()).toEqual([
        'src/a.ts',
        'src/b.ts',
      ]);
    });
  });

  // @req FR:req-traceability/analysis.test-completeness
  describe('test coverage gaps', () => {
    it('should report active P1 leaf without test as a gap', () => {
      const reqs = [makeReq('critical', { priority: 'P1' })];
      const annotations: RequirementAnnotation[] = [];

      const report = analyzer.analyze(reqs, annotations);

      expect(report.testCoverageGaps).toHaveLength(1);
      expect(report.testCoverageGaps[0].id).toBe('FR:test-feature/critical');
      expect(report.testCoverageGaps[0].priority).toBe('P1');
    });

    it('should report active P2 leaf without test as a gap', () => {
      const reqs = [makeReq('important', { priority: 'P2' })];
      const annotations: RequirementAnnotation[] = [];

      const report = analyzer.analyze(reqs, annotations);

      expect(report.testCoverageGaps).toHaveLength(1);
      expect(report.testCoverageGaps[0].priority).toBe('P2');
    });

    it('should report active P3 leaf without test as a gap', () => {
      const reqs = [makeReq('standard', { priority: 'P3' })];
      const annotations: RequirementAnnotation[] = [];

      const report = analyzer.analyze(reqs, annotations);

      expect(report.testCoverageGaps).toHaveLength(1);
    });

    it('should NOT report P4 without test as a gap', () => {
      const reqs = [makeReq('minor', { priority: 'P4' })];
      const annotations: RequirementAnnotation[] = [];

      const report = analyzer.analyze(reqs, annotations);

      expect(report.testCoverageGaps).toHaveLength(0);
    });

    it('should NOT report P5 without test as a gap', () => {
      const reqs = [makeReq('info', { priority: 'P5' })];
      const annotations: RequirementAnnotation[] = [];

      const report = analyzer.analyze(reqs, annotations);

      expect(report.testCoverageGaps).toHaveLength(0);
    });

    it('should NOT report deferred requirement as a gap', () => {
      const reqs = [makeReq('deferred-req', { priority: 'P1', state: 'deferred' })];
      const annotations: RequirementAnnotation[] = [];

      const report = analyzer.analyze(reqs, annotations);

      expect(report.testCoverageGaps).toHaveLength(0);
    });

    it('should NOT report exempt requirement as a gap', () => {
      const reqs = [makeReq('exempt-req', { priority: 'P1', state: 'exempt' })];
      const annotations: RequirementAnnotation[] = [];

      const report = analyzer.analyze(reqs, annotations);

      expect(report.testCoverageGaps).toHaveLength(0);
    });

    it('should NOT report deprecated requirement as a gap', () => {
      const reqs = [makeReq('deprecated-req', { priority: 'P2', state: 'deprecated' })];
      const annotations: RequirementAnnotation[] = [];

      const report = analyzer.analyze(reqs, annotations);

      expect(report.testCoverageGaps).toHaveLength(0);
    });

    it('should NOT report parent requirement as a gap', () => {
      const reqs = [
        makeReq('parent', { priority: 'P1' }),
        makeReq('parent.child', { priority: 'P1' }),
      ];
      const annotations: RequirementAnnotation[] = [];

      const report = analyzer.analyze(reqs, annotations);

      // Only the child should be in gaps, not the parent
      expect(report.testCoverageGaps).toHaveLength(1);
      expect(report.testCoverageGaps[0].id).toBe('FR:test-feature/parent.child');
    });

    it('should NOT report requirement with test annotation as a gap', () => {
      const reqs = [makeReq('tested', { priority: 'P1' })];
      const annotations = [makeAnnotation('tested', { isTest: true })];

      const report = analyzer.analyze(reqs, annotations);

      expect(report.testCoverageGaps).toHaveLength(0);
    });

    it('should report requirement with only code annotation (no test) as a gap', () => {
      const reqs = [makeReq('code-only', { priority: 'P1' })];
      const annotations = [makeAnnotation('code-only', { isTest: false })];

      const report = analyzer.analyze(reqs, annotations);

      expect(report.testCoverageGaps).toHaveLength(1);
      expect(report.testCoverageGaps[0].id).toBe('FR:test-feature/code-only');
    });

    it('should include spec info in gap entries', () => {
      const reqs = [makeReq('with-spec', { priority: 'P2' })];
      const annotations: RequirementAnnotation[] = [];

      const report = analyzer.analyze(reqs, annotations);

      expect(report.testCoverageGaps).toHaveLength(1);
      expect(report.testCoverageGaps[0].spec).toEqual({
        file: '.xe/features/test-feature/spec.md',
        line: 10,
        text: 'Requirement with-spec',
      });
    });
  });

  describe('report includes new fields', () => {
    it('should always have fileLevelAnnotations and testCoverageGaps arrays', () => {
      const report = analyzer.analyze([], []);

      expect(report.fileLevelAnnotations).toEqual([]);
      expect(report.testCoverageGaps).toEqual([]);
    });
  });
});
