/**
 * Unit tests for JSON reporter.
 * @req FR:req-traceability/report.output.json
 * @req FR:req-traceability/report.content.spec-text
 * @req FR:req-traceability/report.content.metrics
 * @req FR:req-traceability/report.content.tasks
 */

import { describe, it, expect } from 'vitest';
import { generateJsonReport } from '../../../../src/traceability/reports/json-reporter.js';
import type {
  TraceabilityReport,
  RequirementCoverage,
  TaskReference,
  RequirementId,
} from '../../../../src/traceability/types/index.js';

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
      text: 'Sessions MUST automatically expire after 90 minutes',
    },
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
      total: 2,
      active: 1,
      implemented: 1,
      tested: 1,
      missing: 0,
      deferred: 1,
      deprecated: 0,
      implementationCoverage: 100,
      testCoverage: 100,
      taskCoverage: 100,
      tasksWithoutRequirements: 0,
    },
  };
}

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

    // @req FR:req-traceability/report.content.tasks
    it('should include task mapping', () => {
      const report = createSampleReport();
      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);

      expect(parsed.tasks).toBeDefined();
      expect(parsed.tasks['T001']).toBeDefined();
      expect(parsed.tasks['T001'].description).toBe('Implement session expiry');
      expect(parsed.tasks['T001'].requirements).toContain('FR:auth/session.expiry');
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
      expect(parsed.summary.taskCoverage).toBe(100);
      expect(parsed.summary.tasksWithoutRequirements).toBe(0);
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

      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);

      expect(parsed.requirements).toEqual({});
      expect(parsed.orphaned).toEqual([]);
      expect(parsed.tasks).toEqual({});
    });
  });
});
