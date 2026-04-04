/**
 * Terminal report generator with premium visual design.
 *
 * Three-layer composable architecture:
 * - Layer 1: Feature summary line (one-liner with progress bar)
 * - Layer 2: Feature detail (gaps, orphans, priority breakdown)
 * - Layer 3: Aggregate summary (bottom, always visible)
 *
 * @req FR:req-traceability/report.output.terminal
 * @req FR:req-traceability/report.content.metrics
 * @req FR:req-traceability/priority.reporting
 */

import pc from 'picocolors';
import type { TraceabilityReport, RequirementCoverage } from '../types/index.js';

/**
 * Options for terminal report formatting.
 * @req FR:req-traceability/report.output.terminal
 */
export interface TerminalReportOptions {
  /** Show full lists instead of truncated (--verbose) */
  verbose?: boolean;
  /** Feature name for scope-stripping and summary labeling */
  featureName?: string;
}

// ── Pure helpers ──────────────────────────────────────────────

/**
 * Render a visual progress bar using block characters.
 * @req FR:req-traceability/report.output.terminal
 */
export function renderProgressBar(percent: number, width: number = 16): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/**
 * Render a multi-color segmented progress bar.
 * Green = full coverage (both code + test), dim green = partial (one of code/test), dim red = uncovered.
 * @req FR:req-traceability/report.output.terminal
 */
export function renderSegmentedBar(
  greenPercent: number,
  partialPercent: number,
  _redPercent: number,
  width: number = 16
): string {
  const greenChars = Math.round((Math.max(0, greenPercent) / 100) * width);
  const partialChars = Math.round((Math.max(0, partialPercent) / 100) * width);
  // Red fills the remainder to ensure bar is always exactly `width` chars
  const redChars = width - greenChars - partialChars;
  return pc.green('█'.repeat(greenChars))
    + pc.dim(pc.green('█'.repeat(partialChars)))
    + pc.dim(pc.red('░'.repeat(Math.max(0, redChars))));
}

/**
 * Strip the feature scope prefix from a requirement ID.
 * e.g., "FR:req-traceability/annotation.multi-line" → "annotation.multi-line"
 * @req FR:req-traceability/report.output.terminal
 */
export function stripFeaturePrefix(id: string, featureName?: string): string {
  if (!featureName) return id;
  const prefix = `FR:${featureName}/`;
  return id.startsWith(prefix) ? id.slice(prefix.length) : id;
}

/**
 * Truncate a list of items, appending a fold message if truncated.
 * @req FR:req-traceability/report.output.terminal
 */
export function truncateList(
  items: string[],
  maxItems: number = 5,
  verbose: boolean = false
): string[] {
  if (verbose || items.length <= maxItems) return items;
  const shown = items.slice(0, maxItems);
  const remaining = items.length - maxItems;
  shown.push(pc.dim(`    ... and ${remaining} more (use --verbose for full list)`));
  return shown;
}

// ── Color helpers ─────────────────────────────────────────────

/**
 * Get the status color function based on coverage percentage.
 * Green >= 90%, Yellow 50-89%, Red < 50%.
 */
function getBarColor(percent: number): (text: string) => string {
  if (percent >= 90) return pc.green;
  if (percent >= 50) return pc.yellow;
  return pc.red;
}

// ── Layer 1: Feature Summary Line ─────────────────────────────

/**
 * Format a single feature summary line with status symbol, progress bar, and issue counts.
 *
 * Example output:
 *   ✓ feature-context       27 reqs   100%  ████████████████
 *   ✗ req-traceability      55 reqs    96%  ███████████████░  2 gaps  6 code gaps  21 test gaps
 *
 * @req FR:req-traceability/report.output.terminal
 * @req FR:req-traceability/report.content.metrics
 */
export function formatFeatureSummaryLine(
  report: TraceabilityReport,
  featureName: string,
  nameWidth: number = 24,
  _options?: TerminalReportOptions
): string {
  const { summary } = report;
  const hasGaps = summary.uncovered > 0 ||
    report.codeCoverageGaps.length > 0 ||
    report.testCoverageGaps.length > 0;

  const symbol = hasGaps ? pc.red('✗') : pc.green('✓');
  const paddedName = pc.bold(featureName.padEnd(nameWidth));
  const reqCount = `${summary.active} reqs`.padStart(8);
  const pct = `${summary.coverageScore}%`.padStart(5);
  const barColor = getBarColor(summary.coverageScore);
  const bar = barColor(renderProgressBar(summary.coverageScore));

  // Issue counts — only non-zero, inline
  const issues: string[] = [];
  if (summary.uncovered > 0) issues.push(`${summary.uncovered} gaps`);
  if (report.codeCoverageGaps.length > 0) issues.push(`${report.codeCoverageGaps.length} code gaps`);
  if (report.testCoverageGaps.length > 0) issues.push(`${report.testCoverageGaps.length} test gaps`);
  const issueSuffix = issues.length > 0 ? '  ' + pc.dim(issues.join('  ')) : '';

  return `  ${symbol} ${paddedName}  ${reqCount}  ${pct}  ${bar}${issueSuffix}`;
}

// ── Layer 2: Feature Detail ───────────────────────────────────

/**
 * Format feature detail section showing gaps, orphans, and priority breakdown.
 * Returns empty string for healthy features (no issues).
 *
 * @req FR:req-traceability/report.output.terminal
 * @req FR:req-traceability/report.content.metrics
 * @req FR:req-traceability/priority.reporting
 * @req FR:req-traceability/annotation.file-level-detection
 * @req FR:req-traceability/scan.traceability-mode.disabled.output
 * @req FR:req-traceability/scan.traceability-mode.required.output
 * @req FR:req-traceability/analysis.test-completeness
 */
export function formatFeatureDetail(
  report: TraceabilityReport,
  featureName: string,
  options?: TerminalReportOptions
): string {
  const verbose = options?.verbose ?? false;
  const { summary } = report;

  // Healthy features earn their silence
  const hasIssues = summary.uncovered > 0 ||
    report.codeCoverageGaps.length > 0 ||
    report.testCoverageGaps.length > 0 ||
    report.orphaned.length > 0;
  if (!hasIssues) return '';

  const lines: string[] = [];
  const separator = pc.dim('─'.repeat(61));

  // Header
  const headerLabel = featureName || 'All features';
  lines.push(`  ${pc.bold(headerLabel)}`);
  lines.push(`  ${separator}`);

  // Code coverage gaps
  // @req FR:req-traceability/scan.traceability-mode.disabled.output
  // @req FR:req-traceability/scan.traceability-mode.required.output
  if (report.codeCoverageGaps.length > 0) {
    lines.push(`  Code gaps (${report.codeCoverageGaps.length}):`);
    const gapLines = report.codeCoverageGaps
      .sort((a, b) => a.priority.localeCompare(b.priority) || a.severity.localeCompare(b.severity))
      .map(gap => {
        const sevTag = gap.severity === 'error' ? pc.red('[ERROR]') : pc.yellow('[WARN]');
        const stripped = stripFeaturePrefix(gap.id, featureName);
        const specRef = pc.dim(`${gap.spec.file}:${gap.spec.line}`);
        return `    ${sevTag} [${gap.priority}] ${stripped}  ${specRef}`;
      });
    lines.push(...truncateList(gapLines, 5, verbose));
    lines.push('');
  }

  // Test coverage gaps
  // @req FR:req-traceability/analysis.test-completeness
  // @req FR:req-traceability/scan.traceability-mode.disabled.output
  // @req FR:req-traceability/scan.traceability-mode.required.output
  if (report.testCoverageGaps.length > 0) {
    lines.push(`  Test gaps (${report.testCoverageGaps.length}):`);
    const gapLines = report.testCoverageGaps
      .sort((a, b) => a.priority.localeCompare(b.priority) || a.severity.localeCompare(b.severity))
      .map(gap => {
        const sevTag = gap.severity === 'error' ? pc.red('[ERROR]') : pc.yellow('[WARN]');
        const stripped = stripFeaturePrefix(gap.id, featureName);
        const specRef = pc.dim(`${gap.spec.file}:${gap.spec.line}`);
        return `    ${sevTag} [${gap.priority}] ${stripped}  ${specRef}`;
      });
    lines.push(...truncateList(gapLines, 5, verbose));
    lines.push('');
  }

  // Orphaned annotations
  if (report.orphaned.length > 0) {
    lines.push(`  Orphaned (${report.orphaned.length}):`);
    const orphanLines = report.orphaned.map(orphan => {
      const stripped = stripFeaturePrefix(orphan.id, featureName);
      return `    ${pc.red('✗')} ${stripped}  ${pc.dim(`${orphan.locations.length} locations`)}`;
    });
    lines.push(...truncateList(orphanLines, 5, verbose));
    lines.push('');
  }

  // File-level annotations — collapsed by default
  // @req FR:req-traceability/annotation.file-level-detection
  // @req FR:req-traceability/analysis.convention-tests.no-file-level
  if (report.fileLevelAnnotations.length > 0) {
    if (verbose) {
      lines.push(`  File-level annotations (${report.fileLevelAnnotations.length}):`);
      for (const ann of report.fileLevelAnnotations) {
        const stripped = stripFeaturePrefix(ann.id, featureName);
        lines.push(`    ${stripped}  ${pc.dim(`${ann.file}:${ann.line}`)}${ann.isTest ? pc.dim(' [test]') : ''}`);
      }
    } else {
      lines.push(`  ${pc.dim(`File-level annotations (${report.fileLevelAnnotations.length}):  use --verbose to list`)}`);
    }
    lines.push('');
  }

  // Uncovered requirements (gaps)
  // @req FR:req-traceability/analysis.coverage.leaf-only
  const uncoveredReqs = getUncoveredRequirements(report);
  if (uncoveredReqs.length > 0) {
    lines.push(`  Uncovered (${uncoveredReqs.length}):`);
    const uncoveredLines = uncoveredReqs.map(([id, coverage]) => {
      const stripped = stripFeaturePrefix(id, featureName);
      return `    ${pc.red('✗')} ${stripped}  ${pc.dim(`${coverage.spec.file}:${coverage.spec.line}`)}`;
    });
    lines.push(...truncateList(uncoveredLines, 5, verbose));
    lines.push('');
  }

  // Deferred requirements
  const deferredReqs = getDeferredRequirements(report);
  if (deferredReqs.length > 0) {
    lines.push(`  Deferred (${deferredReqs.length}):`);
    const deferredLines = deferredReqs.map(([id, coverage]) => {
      const stripped = stripFeaturePrefix(id, featureName);
      return `    ${pc.dim('○')} ${stripped}  ${pc.dim(`${coverage.spec.file}:${coverage.spec.line}`)}`;
    });
    lines.push(...truncateList(deferredLines, 5, verbose));
    lines.push('');
  }

  // Exempt requirements
  const exemptReqs = getExemptRequirements(report);
  if (exemptReqs.length > 0) {
    lines.push(`  Exempt (${exemptReqs.length}):`);
    const exemptLines = exemptReqs.map(([id, coverage]) => {
      const stripped = stripFeaturePrefix(id, featureName);
      return `    ${pc.dim('○')} ${stripped}  ${pc.dim(`${coverage.spec.file}:${coverage.spec.line}`)}`;
    });
    lines.push(...truncateList(exemptLines, 5, verbose));
    lines.push('');
  }

  // Coverage by priority — visual diagnostic at bottom of detail, just above summary
  if (summary.byPriority) {
    lines.push('  Coverage by priority:');
    const priorities = ['P1', 'P2', 'P3', 'P4', 'P5'] as const;
    for (const pri of priorities) {
      const count = summary.byPriority[pri];
      const coverage = summary.coverageByPriority[pri];
      if (count > 0) {
        const barColor = getBarColor(coverage);
        const bar = barColor(renderProgressBar(coverage));
        lines.push(`    ${pri}  ${bar}  ${String(coverage).padStart(3)}%  (${count} reqs)`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ── Layer 3: Aggregate Summary ────────────────────────────────

/**
 * Format the aggregate summary section (bottom of report).
 *
 * Layout (compact spacing, bar left-aligned with %, requirements right-aligned with bar):
 *   ────────────────────────────────────────────────────────────
 *   req-traceability                        96% completeness
 *
 *   96% coverage              55 requirements ·   5 deferred
 *   96% █████████████████████████████████████░ ·   3 deprecated
 *   85% code →   6 gaps ·   2 uncovered
 *   65% test →  18 gaps ·   2 orphaned
 *
 *   Scanned 36 files in 0.1s
 *
 * @req FR:req-traceability/report.output.terminal
 * @req FR:req-traceability/report.content.metrics
 * @req FR:req-traceability/report.content.scores.coverage
 * @req FR:req-traceability/report.content.scores.completeness
 */
export function formatFeatureSummary(
  report: TraceabilityReport,
  featureName?: string,
  _options?: TerminalReportOptions
): string {
  const { summary, metadata } = report;
  const lines: string[] = [];
  const separator = pc.dim('─'.repeat(60));
  const lineWidth = 60;

  lines.push(`  ${separator}`);

  // Row 1: Feature name (left) + completeness (right, dim)
  let headerLabel: string;
  if (featureName) {
    headerLabel = pc.bold(featureName);
  } else {
    const scopes = new Set<string>();
    for (const id of report.requirements.keys()) {
      const match = id.match(/^[A-Z]+:([^/]+)\//);
      if (match) scopes.add(match[1]);
    }
    headerLabel = scopes.size > 0
      ? `${pc.bold('All features')} ${pc.dim(`(${scopes.size})`)}`
      : pc.bold('All features');
  }
  const headerVisible = featureName
    ? featureName
    : (report.requirements.size > 0 ? `All features (${new Set(Array.from(report.requirements.keys()).map(id => { const m = id.match(/^[A-Z]+:([^/]+)\//); return m?.[1]; }).filter(Boolean)).size})` : 'All features');
  const compText = `${summary.completenessScore}% completeness`;
  const headerPad = Math.max(0, lineWidth - headerVisible.length - compText.length);
  lines.push(`  ${headerLabel}${' '.repeat(headerPad)}${pc.dim(compText)}`);
  lines.push('');

  // Compute bar segments
  const both = summary.implemented + summary.tested - summary.covered;
  const partial = summary.covered - both;
  const greenPct = summary.active > 0 ? (both / summary.active) * 100 : 0;
  const partialPct = summary.active > 0 ? (partial / summary.active) * 100 : 0;
  const redPct = summary.active > 0 ? (summary.uncovered / summary.active) * 100 : 0;

  const barWidth = 37;
  const pctColWidth = 4; // "NNN%" - supports 1-3 digit percentages

  // Row 2: "NN% coverage" + padding + "XXX requirements" (total width = barWidth + 1) + deferred
  const covPct = `${summary.coverageScore}%`.padStart(pctColWidth);
  const covLabel = `${covPct} coverage `;
  const reqText = `${summary.active} requirements`;
  // Total width of "NNN% coverage ... XXX requirements" should equal barWidth + 1
  const reqPad = barWidth + 1 - covLabel.length - reqText.length;
  const deferredNum = summary.deferred > 0 ? String(summary.deferred) : '';
  const deferredText = deferredNum ? `   ${pc.dim('·')}   ${pc.dim(deferredNum)} ${pc.dim('deferred')}` : '';
  lines.push(`  ${covLabel}${' '.repeat(Math.max(0, reqPad))}${reqText}${deferredText}`);

  // Row 3: Bar (same width as row 2, left-aligned with space before bar) + deprecated
  const covBar = renderSegmentedBar(greenPct, partialPct, redPct, barWidth);
  const deprecatedNum = summary.deprecated > 0 ? String(summary.deprecated) : '';
  const deprecatedText = deprecatedNum ? `   ${pc.dim('·')}   ${pc.dim(deprecatedNum)} ${pc.dim('deprecated')}` : '';
  lines.push(`   ${covBar}${deprecatedText}`);

  // Resolve traceability mode for this feature (if single-feature report)
  // @req FR:req-traceability/scan.traceability-mode.disabled.terminal
  const featureMode = featureName
    ? report.featureTraceabilityModes?.get(featureName)
    : undefined;
  const codeDisabled = featureMode?.code === 'disable';
  const testDisabled = featureMode?.test === 'disable';

  // Row 4: Code % → gaps + uncovered (append "(disabled)" when code traceability is off)
  {
    const codePctRaw = `${summary.implementationCoverage}%`.padStart(pctColWidth);
    const codePct = codeDisabled ? pc.dim(codePctRaw) : codePctRaw;
    const codeGaps = report.codeCoverageGaps.length;
    const codeArrow = codeGaps > 0 ? pc.dim('→') : ' ';
    const codeGapNum = codeGaps > 0 ? String(codeGaps) : '';
    const codeGapText = codeGapNum ? ` ${codeGapNum} ${pc.dim('gaps')}` : '';
    const uncoveredNum = summary.uncovered > 0 ? String(summary.uncovered) : '';
    const uncoveredText = uncoveredNum ? `  ${pc.dim('·')}  ${pc.dim(uncoveredNum)} ${pc.dim('uncovered')}` : '';
    const codeLabel = codeDisabled ? pc.dim('code') : 'code';
    const disabledTag = codeDisabled ? ` ${pc.dim('(disabled)')}` : '';
    lines.push(`  ${codePct} ${codeLabel}${disabledTag} ${codeArrow}${codeGapText}${uncoveredText}`);
  }

  // Row 5: Test % → gaps + orphaned (append "(disabled)" when test traceability is off)
  {
    const testPctRaw = `${summary.testCoverage}%`.padStart(pctColWidth);
    const testPct = testDisabled ? pc.dim(testPctRaw) : testPctRaw;
    const testGaps = report.testCoverageGaps.length;
    const testArrow = testGaps > 0 ? pc.dim('→') : ' ';
    const testGapNum = testGaps > 0 ? String(testGaps) : '';
    const testGapText = testGapNum ? ` ${testGapNum} ${pc.dim('gaps')}` : '';
    const orphanedNum = report.orphaned.length > 0 ? String(report.orphaned.length) : '';
    const orphanedText = orphanedNum ? `  ${pc.dim('·')}  ${pc.dim(orphanedNum)} ${pc.dim('orphaned')}` : '';
    const testLabel = testDisabled ? pc.dim('test') : 'test';
    const disabledTag = testDisabled ? ` ${pc.dim('(disabled)')}` : '';
    lines.push(`  ${testPct} ${testLabel}${disabledTag} ${testArrow}${testGapText}${orphanedText}`);
  }

  lines.push('');

  // Scan metadata
  const durationSec = (metadata.scanDurationMs / 1000).toFixed(1);
  lines.push(`  ${pc.dim(`Scanned ${metadata.filesScanned} files in ${durationSec}s`)}`);

  return lines.join('\n');
}

// ── Backward-compatible wrapper ───────────────────────────────

/**
 * Generate a human-readable terminal report.
 * Composes the three-layer design: detail (if issues exist) + summary.
 *
 * @req FR:req-traceability/report.output.terminal
 * @req FR:req-traceability/report.content.metrics
 * @req FR:req-traceability/priority.reporting
 */
export function generateTerminalReport(
  report: TraceabilityReport,
  options?: TerminalReportOptions
): string {
  const featureName = options?.featureName;
  const parts: string[] = [];

  // Derive feature name from requirement IDs when called without explicit name
  // (e.g., integration tests that don't pass featureName through options).
  // Returns undefined for multi-feature reports (global run).
  const resolvedName = featureName ?? deriveFeatureName(report);

  // Layer 2: Feature detail (only for features with issues)
  // For global runs, pass empty string so detail still renders but no scope-stripping
  const detail = formatFeatureDetail(
    report,
    resolvedName ?? '',
    { ...options, featureName: resolvedName }
  );
  if (detail) {
    parts.push(detail);
  }

  // Layer 3: Aggregate summary (always)
  parts.push(formatFeatureSummary(report, resolvedName, options));

  return parts.join('\n');
}

// ── Internal helpers ──────────────────────────────────────────

/**
 * Derive feature name from the report's requirement IDs.
 * Returns the scope only when all requirements belong to the same feature.
 * For multi-feature reports (global run), returns undefined.
 */
function deriveFeatureName(report: TraceabilityReport): string | undefined {
  let featureName: string | undefined;
  for (const id of report.requirements.keys()) {
    const match = id.match(/^[A-Z]+:([^/]+)\//);
    if (!match) continue;
    if (!featureName) {
      featureName = match[1];
    } else if (featureName !== match[1]) {
      return undefined; // Multiple features — don't pick one
    }
  }
  return featureName;
}

/**
 * Get list of uncovered requirements (leaf nodes only).
 * @req FR:req-traceability/analysis.coverage.leaf-only
 * @req FR:req-traceability/report.output.terminal
 */
function getUncoveredRequirements(
  report: TraceabilityReport
): Array<[string, RequirementCoverage]> {
  const uncovered: Array<[string, RequirementCoverage]> = [];
  const allIds = Array.from(report.requirements.keys());

  for (const [id, coverage] of report.requirements) {
    if (coverage.coverageStatus === 'parent') continue;

    const isParent = allIds.some(otherId =>
      otherId !== id && otherId.startsWith(id + '.')
    );
    if (isParent) continue;

    // @req FR:req-traceability/scan.traceability-mode.disabled.output
    if (report.featureTraceabilityModes) {
      const scopeMatch = id.match(/^[A-Z]+:([^/]+)\//);
      if (scopeMatch) {
        const mode = report.featureTraceabilityModes.get(scopeMatch[1]);
        if (mode?.code === 'disable' && mode?.test === 'disable') {
          continue;
        }
      }
    }

    if (coverage.coverageStatus === 'missing') {
      uncovered.push([id, coverage]);
    }
  }
  return uncovered;
}

/**
 * Get list of deferred requirements.
 */
function getDeferredRequirements(
  report: TraceabilityReport
): Array<[string, RequirementCoverage]> {
  const deferred: Array<[string, RequirementCoverage]> = [];
  for (const [id, coverage] of report.requirements) {
    if (coverage.coverageStatus === 'deferred') {
      deferred.push([id, coverage]);
    }
  }
  return deferred;
}

/**
 * Get list of exempt requirements (human conventions).
 */
function getExemptRequirements(
  report: TraceabilityReport
): Array<[string, RequirementCoverage]> {
  const exempt: Array<[string, RequirementCoverage]> = [];
  for (const [id, coverage] of report.requirements) {
    if (coverage.coverageStatus === 'exempt') {
      exempt.push([id, coverage]);
    }
  }
  return exempt;
}
