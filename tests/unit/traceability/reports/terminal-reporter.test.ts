/**
 * Unit tests for terminal reporter.
 */

import { generateTerminalReport } from '@traceability/reports/terminal-reporter.js';
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
      text: 'Sessions MUST expire after 90 minutes',
    },
    priority: 'P3',
    state: 'active',
    implementations: [{ file: 'src/auth/session.ts', line: 42, partial: false }],
    tests: [{ file: 'tests/auth/session.test.ts', line: 15 }],
    coverageStatus: 'tested',
  });
  requirements.set('FR:auth/session.missing', {
    spec: {
      file: '.xe/features/auth/spec.md',
      line: 50,
      text: 'Missing requirement',
    },
    priority: 'P3',
    state: 'active',
    implementations: [],
    tests: [],
    coverageStatus: 'missing',
  });
  requirements.set('FR:auth/oauth', {
    spec: {
      file: '.xe/features/auth/spec.md',
      line: 55,
      text: 'OAuth integration',
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
        id: 'FR:auth/session.missing',
        priority: 'P3' as const,
        severity: 'warning' as const,
        spec: { file: '.xe/features/auth/spec.md', line: 50, text: 'Missing requirement' },
      },
    ],
    codeCoverageGaps: [],
    summary: {
      total: 3,
      active: 2,
      implemented: 1,
      tested: 1,
      covered: 1,
      uncovered: 1,
      deferred: 1,
      deprecated: 0,
      exempt: 0,
      implementationCoverage: 50,
      testCoverage: 50,
      overallCoverage: 50,
      byPriority: { P1: 0, P2: 0, P3: 3, P4: 0, P5: 0 },
      coverageByPriority: { P1: 0, P2: 0, P3: 50, P4: 0, P5: 0 },
      coverageScore: 50,
      completenessScore: 50,
      priorityThreshold: 'P3',
    },
  };
}

/**
 * @req FR:req-traceability/report.output.terminal
 * @req FR:req-traceability/report.content.metrics
 */
describe('Terminal Reporter', () => {
  // @req FR:req-traceability/report.output.terminal
  describe('generateTerminalReport', () => {
    it('should generate human-readable output', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report);

      expect(output).toContain('Requirement Traceability Report');
      expect(typeof output).toBe('string');
      expect(output.length).toBeGreaterThan(0);
    });

    // @req FR:req-traceability/report.content.metrics
    it('should display total and active requirement counts', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report);

      expect(output).toContain('3'); // total
      expect(output).toContain('2'); // active
      expect(output).toContain('deferred'); // mentions deferred
    });

    it('should display coverage percentages', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report);

      expect(output).toContain('50%'); // implementation and test coverage
    });

    it('should list missing requirements', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report);

      expect(output).toContain('FR:auth/session.missing');
      expect(output).toContain('.xe/features/auth/spec.md');
    });

    it('should list orphaned annotations', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report);

      expect(output).toContain('FR:old/removed.req');
      expect(output).toContain('src/legacy.ts:23');
    });

    it('should list deferred requirements', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report);

      expect(output).toContain('FR:auth/oauth');
    });

    it('should handle empty report gracefully', () => {
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

      const output = generateTerminalReport(report);

      expect(output).toContain('0');
      expect(output).not.toContain('undefined');
      expect(output).not.toContain('null');
    });

    // @req FR:req-traceability/annotation.file-level-detection
    it('should list file-level annotations', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report);

      expect(output).toContain('File-level annotations');
      expect(output).toContain('FR:auth/session.expiry');
      expect(output).toContain('src/auth/index.ts:1');
    });

    // @req FR:req-traceability/analysis.test-completeness
    it('should list test coverage gaps with severity', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report);

      expect(output).toContain('Test coverage gaps');
      expect(output).toContain('[WARN] [P3] FR:auth/session.missing');
    });

    // @req FR:req-traceability/scan.traceability-mode.required.output
    it('should display ERROR severity for required mode gaps', () => {
      const report = createSampleReport();
      report.testCoverageGaps = [
        {
          id: 'FR:auth/session.missing',
          priority: 'P3' as const,
          severity: 'error' as const,
          spec: { file: '.xe/features/auth/spec.md', line: 50, text: 'Missing requirement' },
        },
      ];
      report.codeCoverageGaps = [
        {
          id: 'FR:auth/session.missing',
          priority: 'P3' as const,
          severity: 'error' as const,
          spec: { file: '.xe/features/auth/spec.md', line: 50, text: 'Missing requirement' },
        },
      ];
      const output = generateTerminalReport(report);

      expect(output).toContain('[ERROR] [P3] FR:auth/session.missing');
      expect(output).toContain('Code coverage gaps');
    });

    // @req FR:req-traceability/scan.traceability-mode.disabled.output
    it('should not display code coverage gaps section when empty', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report);

      expect(output).not.toContain('Code coverage gaps');
    });

    it('should handle 100% coverage', () => {
      const requirements = new Map<string, RequirementCoverage>();
      requirements.set('FR:test/req', {
        spec: { file: 'spec.md', line: 1, text: 'Test' },
        priority: 'P3',
        state: 'active',
        implementations: [{ file: 'src/test.ts', line: 1, partial: false }],
        tests: [{ file: 'tests/test.ts', line: 1 }],
        coverageStatus: 'tested',
      });

      const report: TraceabilityReport = {
        metadata: {
          scanTime: new Date().toISOString(),
          filesScanned: 10,
          scanDurationMs: 100,
        },
        requirements,
        orphaned: [],
        fileLevelAnnotations: [],
        testCoverageGaps: [],
        codeCoverageGaps: [],
        summary: {
          total: 1,
          active: 1,
          implemented: 1,
          tested: 1,
          covered: 1,
          uncovered: 0,
          deferred: 0,
          deprecated: 0,
          exempt: 0,
          implementationCoverage: 100,
          testCoverage: 100,
          overallCoverage: 100,
          byPriority: { P1: 0, P2: 0, P3: 1, P4: 0, P5: 0 },
          coverageByPriority: { P1: 0, P2: 0, P3: 100, P4: 0, P5: 0 },
          coverageScore: 100,
          completenessScore: 100,
          priorityThreshold: 'P3',
        },
      };

      const output = generateTerminalReport(report);

      expect(output).toContain('100%');
    });
  });
});
