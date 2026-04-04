/**
 * Unit tests for terminal reporter.
 * @req FR:req-traceability/report.output.terminal
 * @req FR:req-traceability/report.content.metrics
 */

import {
  generateTerminalReport,
  formatFeatureSummaryLine,
  formatFeatureDetail,
  formatFeatureSummary,
  renderProgressBar,
  stripFeaturePrefix,
  truncateList,
} from '@traceability/reports/terminal-reporter.js';
import type {
  TraceabilityReport,
  RequirementCoverage,
} from '@traceability/types/index.js';

// Disable colors for deterministic test output
beforeAll(() => {
  process.env.NO_COLOR = '1';
});

afterAll(() => {
  delete process.env.NO_COLOR;
});

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

function createCleanReport(): TraceabilityReport {
  const requirements = new Map<string, RequirementCoverage>();
  requirements.set('FR:test/req', {
    spec: { file: 'spec.md', line: 1, text: 'Test' },
    priority: 'P3',
    state: 'active',
    implementations: [{ file: 'src/test.ts', line: 1, partial: false }],
    tests: [{ file: 'tests/test.ts', line: 1 }],
    coverageStatus: 'tested',
  });

  return {
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
}

function createEmptyReport(): TraceabilityReport {
  return {
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
}

describe('Terminal Reporter', () => {
  // ── Pure helpers ─────────────────────────────────────────

  // @req FR:req-traceability/report.output.terminal
  describe('renderProgressBar', () => {
    it('should render full bar at 100%', () => {
      expect(renderProgressBar(100)).toBe('████████████████');
    });

    it('should render empty bar at 0%', () => {
      expect(renderProgressBar(0)).toBe('░░░░░░░░░░░░░░░░');
    });

    it('should render half bar at 50%', () => {
      const bar = renderProgressBar(50);
      expect(bar).toBe('████████░░░░░░░░');
    });

    it('should clamp to 0-100 range', () => {
      expect(renderProgressBar(-10)).toBe('░░░░░░░░░░░░░░░░');
      expect(renderProgressBar(200)).toBe('████████████████');
    });

    it('should support custom width', () => {
      expect(renderProgressBar(50, 8)).toBe('████░░░░');
    });
  });

  // @req FR:req-traceability/report.output.terminal
  describe('stripFeaturePrefix', () => {
    it('should strip matching feature prefix', () => {
      expect(stripFeaturePrefix('FR:req-traceability/report.output', 'req-traceability'))
        .toBe('report.output');
    });

    it('should return full ID when no feature name', () => {
      expect(stripFeaturePrefix('FR:req-traceability/report.output'))
        .toBe('FR:req-traceability/report.output');
    });

    it('should return full ID when prefix does not match', () => {
      expect(stripFeaturePrefix('FR:other/report.output', 'req-traceability'))
        .toBe('FR:other/report.output');
    });
  });

  // @req FR:req-traceability/report.output.terminal
  describe('truncateList', () => {
    it('should return all items when count is within limit', () => {
      const items = ['a', 'b', 'c'];
      expect(truncateList(items, 5)).toEqual(['a', 'b', 'c']);
    });

    it('should truncate and add fold message when over limit', () => {
      const items = Array.from({ length: 10 }, (_, i) => `item-${i}`);
      const result = truncateList(items, 5);
      expect(result).toHaveLength(6); // 5 items + fold message
      expect(result[5]).toContain('... and 5 more');
      expect(result[5]).toContain('--verbose');
    });

    it('should return all items in verbose mode', () => {
      const items = Array.from({ length: 10 }, (_, i) => `item-${i}`);
      expect(truncateList(items, 5, true)).toEqual(items);
    });
  });

  // ── Layer 1: Feature Summary Line ───────────────────────

  // @req FR:req-traceability/report.output.terminal
  // @req FR:req-traceability/report.content.metrics
  describe('formatFeatureSummaryLine', () => {
    it('should show checkmark for healthy feature', () => {
      const report = createCleanReport();
      const line = formatFeatureSummaryLine(report, 'test-feature');
      expect(line).toContain('✓');
      expect(line).toContain('test-feature');
      expect(line).toContain('100%');
      expect(line).toContain('████████████████');
    });

    it('should show X for feature with gaps', () => {
      const report = createSampleReport();
      const line = formatFeatureSummaryLine(report, 'auth');
      expect(line).toContain('✗');
      expect(line).toContain('auth');
      expect(line).toContain('50%');
      expect(line).toContain('1 gaps');
      expect(line).toContain('1 test gaps');
    });

    it('should show active requirement count', () => {
      const report = createSampleReport();
      const line = formatFeatureSummaryLine(report, 'auth');
      expect(line).toContain('2 reqs');
    });

    it('should not show issue counts for healthy features', () => {
      const report = createCleanReport();
      const line = formatFeatureSummaryLine(report, 'test');
      expect(line).not.toContain('gaps');
    });
  });

  // ── Layer 2: Feature Detail ─────────────────────────────

  // @req FR:req-traceability/report.output.terminal
  describe('formatFeatureDetail', () => {
    it('should return empty string for healthy feature', () => {
      const report = createCleanReport();
      expect(formatFeatureDetail(report, 'test')).toBe('');
    });

    it('should show feature name header and separator', () => {
      const report = createSampleReport();
      const detail = formatFeatureDetail(report, 'auth');
      expect(detail).toContain('auth');
      expect(detail).toContain('─');
    });

    // @req FR:req-traceability/priority.reporting
    it('should show coverage by priority', () => {
      const report = createSampleReport();
      const detail = formatFeatureDetail(report, 'auth');
      expect(detail).toContain('Coverage by priority');
      expect(detail).toContain('P3');
      expect(detail).toContain('50%');
    });

    // @req FR:req-traceability/analysis.test-completeness
    it('should show test coverage gaps with severity', () => {
      const report = createSampleReport();
      const detail = formatFeatureDetail(report, 'auth');
      expect(detail).toContain('Test gaps (1)');
      expect(detail).toContain('[WARN]');
      expect(detail).toContain('[P3]');
      // Feature prefix stripped: FR:auth/session.missing → session.missing
      expect(detail).toContain('session.missing');
    });

    // @req FR:req-traceability/scan.traceability-mode.required.output
    it('should display ERROR severity for required mode gaps', () => {
      const report = createSampleReport();
      report.testCoverageGaps = [{
        id: 'FR:auth/session.missing',
        priority: 'P3' as const,
        severity: 'error' as const,
        spec: { file: '.xe/features/auth/spec.md', line: 50, text: 'Missing requirement' },
      }];
      report.codeCoverageGaps = [{
        id: 'FR:auth/session.missing',
        priority: 'P3' as const,
        severity: 'error' as const,
        spec: { file: '.xe/features/auth/spec.md', line: 50, text: 'Missing requirement' },
      }];
      const detail = formatFeatureDetail(report, 'auth');
      expect(detail).toContain('[ERROR]');
      expect(detail).toContain('Code gaps');
    });

    // @req FR:req-traceability/scan.traceability-mode.disabled.output
    it('should not display code coverage gaps section when empty', () => {
      const report = createSampleReport();
      const detail = formatFeatureDetail(report, 'auth');
      expect(detail).not.toContain('Code gaps');
    });

    it('should show orphaned annotations', () => {
      const report = createSampleReport();
      const detail = formatFeatureDetail(report, 'auth');
      expect(detail).toContain('Orphaned (1)');
      expect(detail).toContain('FR:old/removed.req');
      expect(detail).toContain('1 locations');
    });

    // @req FR:req-traceability/annotation.file-level-detection
    it('should collapse file-level annotations by default', () => {
      const report = createSampleReport();
      const detail = formatFeatureDetail(report, 'auth');
      expect(detail).toContain('File-level annotations (1)');
      expect(detail).toContain('use --verbose to list');
    });

    it('should expand file-level annotations in verbose mode', () => {
      const report = createSampleReport();
      const detail = formatFeatureDetail(report, 'auth', { verbose: true });
      expect(detail).toContain('File-level annotations (1)');
      expect(detail).toContain('src/auth/index.ts:1');
      expect(detail).not.toContain('use --verbose');
    });

    it('should show uncovered requirements', () => {
      const report = createSampleReport();
      const detail = formatFeatureDetail(report, 'auth');
      expect(detail).toContain('Uncovered (1)');
      // Feature prefix stripped: FR:auth/session.missing → session.missing
      expect(detail).toContain('session.missing');
    });

    it('should show deferred requirements', () => {
      const report = createSampleReport();
      const detail = formatFeatureDetail(report, 'auth');
      expect(detail).toContain('Deferred (1)');
      // Feature prefix stripped: FR:auth/oauth → oauth
      expect(detail).toContain('oauth');
    });

    it('should strip feature prefix when featureName matches', () => {
      const report = createSampleReport();
      // Replace IDs to match feature prefix pattern
      report.testCoverageGaps = [{
        id: 'FR:auth/session.missing',
        priority: 'P3' as const,
        severity: 'warning' as const,
        spec: { file: '.xe/features/auth/spec.md', line: 50, text: 'Missing' },
      }];
      const detail = formatFeatureDetail(report, 'auth');
      // With featureName='auth', 'FR:auth/session.missing' should become 'session.missing'
      expect(detail).toContain('session.missing');
    });

    it('should truncate long gap lists by default', () => {
      const report = createSampleReport();
      report.testCoverageGaps = Array.from({ length: 10 }, (_, i) => ({
        id: `FR:auth/gap.${i}`,
        priority: 'P3' as const,
        severity: 'warning' as const,
        spec: { file: 'spec.md', line: i + 1, text: `Gap ${i}` },
      }));
      const detail = formatFeatureDetail(report, 'auth');
      expect(detail).toContain('... and 5 more');
    });
  });

  // ── Layer 3: Aggregate Summary ──────────────────────────

  // @req FR:req-traceability/report.output.terminal
  // @req FR:req-traceability/report.content.metrics
  // @req FR:req-traceability/report.content.scores.coverage
  // @req FR:req-traceability/report.content.scores.completeness
  describe('formatFeatureSummary', () => {
    it('should display feature name and scores with bar', () => {
      const report = createSampleReport();
      const summary = formatFeatureSummary(report, 'auth');
      expect(summary).toContain('auth');
      expect(summary).toContain('50% coverage');
      expect(summary).toContain('50% completeness');
      // Should include progress bars
      expect(summary).toMatch(/[█░]/);
    });

    it('should display requirement count with deferred', () => {
      const report = createSampleReport();
      const summary = formatFeatureSummary(report, 'auth');
      expect(summary).toContain('2 requirements');
      expect(summary).toContain('1 deferred');
    });

    it('should display code and test percentages', () => {
      const report = createSampleReport();
      const summary = formatFeatureSummary(report, 'auth');
      expect(summary).toContain('50% coverage');
      expect(summary).toContain('50% code');
      expect(summary).toContain('50% test');
    });

    it('should display gap counts', () => {
      const report = createSampleReport();
      const summary = formatFeatureSummary(report, 'auth');
      expect(summary).toContain('1 uncovered');
      expect(summary).toContain('1 gaps');
      expect(summary).toContain('1 orphaned');
    });

    it('should display scan metadata', () => {
      const report = createSampleReport();
      const summary = formatFeatureSummary(report, 'auth');
      expect(summary).toContain('Scanned 142 files in 1.2s');
    });

    it('should handle zero deferred/deprecated gracefully', () => {
      const report = createCleanReport();
      const summary = formatFeatureSummary(report, 'test');
      expect(summary).not.toContain('deferred');
      expect(summary).not.toContain('deprecated');
    });

    // @req FR:req-traceability/scan.traceability-mode.disabled.terminal
    it('should show "(disabled)" for disabled traceability types', () => {
      const report = createCleanReport();
      report.featureTraceabilityModes = new Map([
        ['test', { code: 'disable' as const }],
      ]);
      const summary = formatFeatureSummary(report, 'test');
      expect(summary).toContain('code');
      expect(summary).toContain('(disabled)');
    });

    it('should show "All features" when no feature name', () => {
      const report = createSampleReport();
      const summary = formatFeatureSummary(report);
      expect(summary).toContain('All features');
      expect(summary).toContain('50% coverage');
      expect(summary).not.toContain('auth');
    });
  });

  // ── Backward-compatible wrapper ─────────────────────────

  // @req FR:req-traceability/report.output.terminal
  describe('generateTerminalReport', () => {
    it('should generate human-readable output', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report);
      expect(typeof output).toBe('string');
      expect(output.length).toBeGreaterThan(0);
    });

    // @req FR:req-traceability/report.content.metrics
    it('should display requirement counts', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report);
      expect(output).toContain('2 requirements');
      expect(output).toContain('deferred');
    });

    it('should display coverage percentages', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report);
      expect(output).toContain('50%');
    });

    it('should list missing requirements', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report);
      // Feature name derived from report → prefix stripped: FR:auth/session.missing → session.missing
      expect(output).toContain('session.missing');
      expect(output).toContain('.xe/features/auth/spec.md');
    });

    it('should list orphaned annotations', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report);
      expect(output).toContain('FR:old/removed.req');
    });

    it('should list deferred requirements', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report);
      // Feature name derived from report → prefix stripped: FR:auth/oauth → oauth
      expect(output).toContain('oauth');
    });

    it('should handle empty report gracefully', () => {
      const report = createEmptyReport();
      const output = generateTerminalReport(report);
      expect(output).toContain('0');
      expect(output).not.toContain('undefined');
      expect(output).not.toContain('null');
    });

    // @req FR:req-traceability/report.output.terminal
    it('should display detail sections before summary', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report);

      // Detail sections should appear before the summary metrics
      const orphanedIndex = output.indexOf('Orphaned');
      // "Scanned" is unique to the summary section (Layer 3)
      const scannedIndex = output.indexOf('Scanned');
      // "completeness" is unique to the summary section (Layer 3)
      const completenessIndex = output.indexOf('completeness');

      expect(orphanedIndex).toBeGreaterThan(-1);
      expect(scannedIndex).toBeGreaterThan(-1);
      expect(completenessIndex).toBeGreaterThan(-1);
      // Detail (Orphaned) before summary (completeness, Scanned)
      expect(orphanedIndex).toBeLessThan(completenessIndex);
      expect(completenessIndex).toBeLessThan(scannedIndex);
    });

    it('should handle 100% coverage', () => {
      const report = createCleanReport();
      const output = generateTerminalReport(report);
      expect(output).toContain('100%');
    });

    it('should pass verbose option through', () => {
      const report = createSampleReport();
      const verbose = generateTerminalReport(report, { verbose: true });
      const normal = generateTerminalReport(report);
      // Verbose should show file-level annotation detail
      expect(verbose).toContain('src/auth/index.ts:1');
      expect(normal).toContain('use --verbose to list');
    });

    it('should pass featureName option through', () => {
      const report = createSampleReport();
      const output = generateTerminalReport(report, { featureName: 'auth' });
      // Summary should contain the feature name
      expect(output).toContain('auth');
    });
  });
});
