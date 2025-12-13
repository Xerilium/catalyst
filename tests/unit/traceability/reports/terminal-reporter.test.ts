/**
 * Unit tests for terminal reporter.
 * @req FR:req-traceability/report.output.terminal
 * @req FR:req-traceability/report.content.metrics
 * @req FR:req-traceability/report.content.tasks
 */

import { generateTerminalReport } from '@traceability/reports/terminal-reporter.js';
import type {
  TraceabilityReport,
  RequirementCoverage,
  TaskReference,
  RequirementId,
} from '@traceability/types/index.js';

function makeReqId(scope: string, path: string): RequirementId {
  return {
    type: 'FR',
    scope,
    path,
    qualified: `FR:${scope}/${path}`,
    short: `FR:${path}`,
  };
}

function createSampleReport(): TraceabilityReport {
  const requirements = new Map<string, RequirementCoverage>();
  requirements.set('FR:auth/session.expiry', {
    spec: {
      file: '.xe/features/auth/spec.md',
      line: 45,
      text: 'Sessions MUST expire after 90 minutes',
    },
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
    state: 'deferred',
    implementations: [],
    tests: [],
    coverageStatus: 'deferred',
  });

  const tasks = new Map<string, TaskReference>();
  tasks.set('T001', {
    taskId: 'T001',
    file: '.xe/features/auth/tasks.md',
    line: 10,
    description: 'Implement session expiry',
    requirements: [makeReqId('auth', 'session.expiry')],
  });
  tasks.set('T002', {
    taskId: 'T002',
    file: '.xe/features/auth/tasks.md',
    line: 20,
    description: 'Setup project',
    requirements: [],
  });

  return {
    metadata: {
      scanTime: '2024-01-15T10:30:00Z',
      filesScanned: 142,
      scanDurationMs: 1234,
    },
    requirements,
    orphaned: [{ id: 'FR:old/removed.req', locations: ['src/legacy.ts:23'] }],
    tasks,
    summary: {
      total: 3,
      active: 2,
      implemented: 1,
      tested: 1,
      missing: 1,
      deferred: 1,
      deprecated: 0,
      implementationCoverage: 50,
      testCoverage: 50,
      taskCoverage: 50,
      tasksWithoutRequirements: 1,
    },
  };
}

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

    // @req FR:req-traceability/report.content.tasks
    it('should list tasks without requirements', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report);

      expect(output).toContain('T002');
      expect(output).toContain('Setup project');
    });

    it('should display task coverage', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report);

      expect(output).toMatch(/[Pp]lanned|[Tt]ask/); // mentions planning/tasks
      expect(output).toContain('50%');
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
        tasks: new Map(),
        summary: {
          total: 0,
          active: 0,
          implemented: 0,
          tested: 0,
          missing: 0,
          deferred: 0,
          deprecated: 0,
          implementationCoverage: 0,
          testCoverage: 0,
          taskCoverage: 0,
          tasksWithoutRequirements: 0,
        },
      };

      const output = generateTerminalReport(report);

      expect(output).toContain('0');
      expect(output).not.toContain('undefined');
      expect(output).not.toContain('null');
    });

    it('should handle 100% coverage', () => {
      const requirements = new Map<string, RequirementCoverage>();
      requirements.set('FR:test/req', {
        spec: { file: 'spec.md', line: 1, text: 'Test' },
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
        tasks: new Map(),
        summary: {
          total: 1,
          active: 1,
          implemented: 1,
          tested: 1,
          missing: 0,
          deferred: 0,
          deprecated: 0,
          implementationCoverage: 100,
          testCoverage: 100,
          taskCoverage: 0,
          tasksWithoutRequirements: 0,
        },
      };

      const output = generateTerminalReport(report);

      expect(output).toContain('100%');
    });
  });
});
