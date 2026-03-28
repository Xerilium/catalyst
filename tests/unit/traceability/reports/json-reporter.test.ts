/**
 * Unit tests for JSON reporter.
 */

import { generateJsonReport } from '@traceability/reports/json-reporter.js';
import type {
  TraceabilityReport,
  RequirementCoverage,
} from '@traceability/types/index.js';

function createSampleReport(): TraceabilityReport {
  const requirements = new Map<string, RequirementCoverage>();
  requirements.set('FR:auth/session.expiry', {
    spec: {
      file: '.xe/features/auth/spec.md',
      line: 45,
      text: 'Sessions MUST automatically expire after 90 minutes',
    },
    priority: 'P3',
    state: 'active',
    implementations: [{ file: 'src/auth/session.ts', line: 42, partial: false }],
    tests: [{ file: 'tests/auth/session.test.ts', line: 15 }],
    coverageStatus: 'tested',
  });
  requirements.set('FR:auth/session.refresh', {
    spec: {
      file: '.xe/features/auth/spec.md',
      line: 50,
      text: 'Sessions MAY be refreshed',
    },
    priority: 'P3',
    state: 'deferred',
    implementations: [],
    tests: [],
    coverageStatus: 'deferred',
  });

  return {
    metadata: {
      scanTime: '2024-01-15T10:30:00Z',
      filesScanned: 142,
      scanDurationMs: 1234,
    },
    requirements,
    orphaned: [{ id: 'FR:old/removed.req', locations: ['src/legacy.ts:23'] }],
    fileLevelAnnotations: [
      { id: 'FR:auth/session.expiry', file: 'src/auth/index.ts', line: 1, isTest: false },
    ],
    testCoverageGaps: [
      {
        id: 'FR:auth/session.refresh',
        priority: 'P3' as const,
        severity: 'warning' as const,
        spec: { file: '.xe/features/auth/spec.md', line: 50, text: 'Sessions MAY be refreshed' },
      },
    ],
    codeCoverageGaps: [],
    summary: {
      total: 2,
      active: 1,
      implemented: 1,
      tested: 1,
      covered: 1,
      uncovered: 0,
      deferred: 1,
      deprecated: 0,
      exempt: 0,
      implementationCoverage: 100,
      testCoverage: 100,
      overallCoverage: 100,
      byPriority: { P1: 0, P2: 0, P3: 2, P4: 0, P5: 0 },
      coverageByPriority: { P1: 0, P2: 0, P3: 100, P4: 0, P5: 0 },
      coverageScore: 100,
      completenessScore: 100,
      priorityThreshold: 'P3',
    },
  };
}

/**
 * @req FR:req-traceability/report.output.json
 * @req FR:req-traceability/report.content.spec-text
 * @req FR:req-traceability/report.content.metrics
 */
describe('JSON Reporter', () => {
  // @req FR:req-traceability/report.output.json
  describe('generateJsonReport', () => {
    it('should generate valid JSON output', () => {
      const report = createSampleReport();
      const json = generateJsonReport(report);

      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include metadata fields', () => {
      const report = createSampleReport();
      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);

      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.scanTime).toBe('2024-01-15T10:30:00Z');
      expect(parsed.metadata.filesScanned).toBe(142);
      expect(parsed.metadata.scanDurationMs).toBe(1234);
    });

    // @req FR:req-traceability/report.content.spec-text
    it('should include requirement spec text', () => {
      const report = createSampleReport();
      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);

      expect(parsed.requirements['FR:auth/session.expiry']).toBeDefined();
      expect(parsed.requirements['FR:auth/session.expiry'].spec.text).toBe(
        'Sessions MUST automatically expire after 90 minutes'
      );
    });

    it('should include implementation and test locations', () => {
      const report = createSampleReport();
      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);

      const req = parsed.requirements['FR:auth/session.expiry'];
      expect(req.implementations).toHaveLength(1);
      expect(req.implementations[0].file).toBe('src/auth/session.ts');
      expect(req.tests).toHaveLength(1);
      expect(req.tests[0].file).toBe('tests/auth/session.test.ts');
    });

    it('should include coverage status for each requirement', () => {
      const report = createSampleReport();
      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);

      expect(parsed.requirements['FR:auth/session.expiry'].coverageStatus).toBe('tested');
      expect(parsed.requirements['FR:auth/session.refresh'].coverageStatus).toBe('deferred');
    });

    it('should include orphaned annotations', () => {
      const report = createSampleReport();
      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);

      expect(parsed.orphaned).toHaveLength(1);
      expect(parsed.orphaned[0].id).toBe('FR:old/removed.req');
      expect(parsed.orphaned[0].locations).toContain('src/legacy.ts:23');
    });

    // @req FR:req-traceability/report.content.metrics
    it('should include summary statistics', () => {
      const report = createSampleReport();
      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);

      expect(parsed.summary).toBeDefined();
      expect(parsed.summary.total).toBe(2);
      expect(parsed.summary.active).toBe(1);
      expect(parsed.summary.implemented).toBe(1);
      expect(parsed.summary.tested).toBe(1);
      expect(parsed.summary.implementationCoverage).toBe(100);
      expect(parsed.summary.testCoverage).toBe(100);
    });

    // @req FR:req-traceability/annotation.file-level-detection
    it('should include file-level annotations', () => {
      const report = createSampleReport();
      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);

      expect(parsed.fileLevelAnnotations).toHaveLength(1);
      expect(parsed.fileLevelAnnotations[0].id).toBe('FR:auth/session.expiry');
      expect(parsed.fileLevelAnnotations[0].file).toBe('src/auth/index.ts');
    });

    // @req FR:req-traceability/analysis.test-completeness
    it('should include test coverage gaps with severity', () => {
      const report = createSampleReport();
      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);

      expect(parsed.testCoverageGaps).toHaveLength(1);
      expect(parsed.testCoverageGaps[0].id).toBe('FR:auth/session.refresh');
      expect(parsed.testCoverageGaps[0].priority).toBe('P3');
      expect(parsed.testCoverageGaps[0].severity).toBe('warning');
    });

    // @req FR:req-traceability/scan.traceability-mode.disabled.output
    // @req FR:req-traceability/scan.traceability-mode.required.output
    it('should include code coverage gaps in JSON output', () => {
      const report = createSampleReport();
      report.codeCoverageGaps = [
        {
          id: 'FR:auth/session.expiry',
          priority: 'P3' as const,
          severity: 'error' as const,
          spec: { file: '.xe/features/auth/spec.md', line: 45, text: 'Sessions MUST expire' },
        },
      ];
      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);

      expect(parsed.codeCoverageGaps).toHaveLength(1);
      expect(parsed.codeCoverageGaps[0].id).toBe('FR:auth/session.expiry');
      expect(parsed.codeCoverageGaps[0].severity).toBe('error');
    });

    it('should include featureTraceabilityModes when present', () => {
      const report = createSampleReport();
      report.featureTraceabilityModes = new Map([
        ['playbook-demo', { code: 'disable' }],
        ['auth', { code: 'inherit', test: 'inherit' }],
      ]);
      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);

      expect(parsed.featureTraceabilityModes).toBeDefined();
      expect(parsed.featureTraceabilityModes['playbook-demo']).toEqual({ code: 'disable' });
      expect(parsed.featureTraceabilityModes.auth).toEqual({ code: 'inherit', test: 'inherit' });
    });

    it('should handle empty report', () => {
      const report: TraceabilityReport = {
        metadata: {
          scanTime: new Date().toISOString(),
          filesScanned: 0,
          scanDurationMs: 0,
        },
        requirements: new Map(),
        orphaned: [],
        fileLevelAnnotations: [],
        testCoverageGaps: [],
        codeCoverageGaps: [],
        summary: {
          total: 0,
          active: 0,
          implemented: 0,
          tested: 0,
          covered: 0,
          uncovered: 0,
          deferred: 0,
          deprecated: 0,
          exempt: 0,
          implementationCoverage: 0,
          testCoverage: 0,
          overallCoverage: 0,
          byPriority: { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0 },
          coverageByPriority: { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0 },
          coverageScore: 100,
          completenessScore: 100,
          priorityThreshold: 'P3',
        },
      };

      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);

      expect(parsed.requirements).toEqual({});
      expect(parsed.orphaned).toEqual([]);
    });
  });
});
