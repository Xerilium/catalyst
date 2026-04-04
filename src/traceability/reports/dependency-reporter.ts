/**
 * Reporters for cross-feature dependency analysis.
 *
 * Supports three output formats:
 * - Text: Human-readable terminal output with color
 * - JSON: Machine-readable structured data
 * - Mermaid: Graph visualization definition
 *
 * @req FR:req-traceability/deps.output
 */

import pc from 'picocolors';
import type { DependencyReport, SpecDependency } from '../types/dependency.js';

/** Options for dependency report output. */
export interface DependencyReportOptions {
  /** Show reverse dependencies instead of forward */
  reverse?: boolean;
  /** Filter to a single feature */
  feature?: string;
}

/**
 * Generate human-readable text report of dependency analysis.
 * @req FR:req-traceability/deps.output.text
 */
export function generateDependencyTextReport(
  report: DependencyReport,
  options?: DependencyReportOptions
): string {
  if (options?.reverse) {
    return generateReverseTextReport(report, options);
  }

  const lines: string[] = [];

  // Filter features if requested (supports wildcards like *-context)
  const features = options?.feature
    ? filterByFeature(report.features, options.feature, (f) => f.featureId)
    : report.features;

  // Filter to features with dependencies
  const withDeps = features.filter((f) => f.dependencies.length > 0);

  // Validation warnings (checked before early return so they always appear)
  const featureValidations = options?.feature
    ? filterByFeature(report.validations, options.feature, (v) => v.featureId)
    : report.validations;

  if (withDeps.length === 0 && featureValidations.length === 0) {
    lines.push('No dependencies found.');
    return lines.join('\n');
  }

  let totalLinks = 0;
  let totalTargets = 0;

  for (const feature of withDeps) {
    // Count unique target features and unique requirement links
    const targetFeatures = new Set(feature.dependencies.map((d) => d.targetFeature));
    const uniqueLinks = deduplicateDeps(feature.dependencies);
    totalLinks += uniqueLinks.length;
    totalTargets += targetFeatures.size;

    // Header: feature name + summary stats
    const stats = pc.dim(`🔗 ${targetFeatures.size} feature${targetFeatures.size !== 1 ? 's' : ''} · ${uniqueLinks.length} req${uniqueLinks.length !== 1 ? 's' : ''}`);
    lines.push(`${pc.bold(feature.featureId)}  ${stats}`);
    lines.push(pc.dim('─'.repeat(50)));

    // Group deduplicated dependencies by target feature
    const byTarget = new Map<string, Array<{ sourceFR: string; targetFR: string }>>();
    for (const dep of uniqueLinks) {
      const existing = byTarget.get(dep.targetFeature) ?? [];
      existing.push({ sourceFR: dep.sourceFR, targetFR: dep.targetFR });
      byTarget.set(dep.targetFeature, existing);
    }

    // Parse all source FRs for alignment calculation
    const parsedSources = uniqueLinks.map((d) => parseSourceFR(d.sourceFR, feature.featureId));
    const maxVisibleLen = Math.max(...parsedSources.map((s) => s.prefix.length + s.path.length));

    for (const [targetFeature, deps] of byTarget) {
      lines.push('');
      lines.push(`${pc.cyan('→')} ${pc.cyan(targetFeature)}`);

      for (const dep of deps) {
        const { prefix, path } = parseSourceFR(dep.sourceFR, feature.featureId);
        const visibleLen = prefix.length + path.length;
        const padding = ' '.repeat(maxVisibleLen - visibleLen);
        const styledSource = prefix ? pc.dim(prefix) + path : path;
        lines.push(`  ${styledSource}${padding} ${pc.dim('→')} ${pc.dim('FR:' + targetFeature + '/')}${dep.targetFR}`);
      }
    }

    lines.push('');
  }

  if (featureValidations.length > 0) {
    lines.push(pc.yellow('Warnings'));
    lines.push(pc.dim('─'.repeat(50)));
    for (const v of featureValidations) {
      lines.push(`  ${pc.yellow('⚠')} ${v.featureId}: ${v.message}`);
    }
    lines.push('');
  }

  // Summary
  const warningCount = featureValidations.length;
  const healthSymbol = warningCount === 0 ? pc.green('✓') : pc.yellow('⚠');
  const summaryParts = [
    `${withDeps.length} feature${withDeps.length !== 1 ? 's' : ''}`,
    `${totalLinks} link${totalLinks !== 1 ? 's' : ''}`,
  ];
  if (warningCount > 0) {
    summaryParts.push(pc.yellow(`${warningCount} warning${warningCount !== 1 ? 's' : ''}`));
  }
  lines.push(`${healthSymbol} ${summaryParts.join(pc.dim('  ·  '))}`);
  lines.push('');

  return lines.join('\n').trimEnd();
}

/**
 * Generate reverse dependency text report.
 * @req FR:req-traceability/deps.reverse
 */
function generateReverseTextReport(
  report: DependencyReport,
  options?: DependencyReportOptions
): string {
  const lines: string[] = [];
  const reverseGraph = report.reverseGraph;

  // Filter reverse graph entries by feature pattern (supports wildcards)
  const entries = options?.feature
    ? [...reverseGraph.entries()].filter(([f]) => matchesFeatureFilter(f, options.feature!))
    : [...reverseGraph.entries()];

  if (entries.length === 0) {
    const label = options?.feature ?? 'Any feature';
    lines.push(`${label} has no reverse dependencies.`);
    return lines.join('\n');
  }

  for (const [feature, dependents] of entries) {
    const stats = pc.dim(`🔗 ${dependents.length} dependent${dependents.length !== 1 ? 's' : ''}`);
    lines.push(`${pc.bold(feature)}  ${stats}`);
    lines.push(pc.dim('─'.repeat(50)));
    lines.push('');
    for (const dep of dependents) {
      lines.push(`${pc.cyan('←')} ${pc.cyan(dep)}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Parse a source FR ID into its display-ready parts.
 * Strips the feature scope but preserves the FR/NFR type prefix.
 * Returns { prefix, path } where prefix is "FR:" or "NFR:" or "",
 * and path is the requirement path without feature scope.
 */
function parseSourceFR(frId: string, featureId: string): { prefix: string; path: string } {
  // Try scoped prefixes first: FR:{feature}/ or NFR:{feature}/
  for (const type of ['NFR', 'FR']) {
    const scoped = `${type}:${featureId}/`;
    if (frId.startsWith(scoped)) {
      return { prefix: `${type}:`, path: frId.slice(scoped.length) };
    }
  }
  // Bare prefix without feature scope
  if (frId.startsWith('NFR:')) return { prefix: 'NFR:', path: frId.slice(4) };
  if (frId.startsWith('FR:')) return { prefix: 'FR:', path: frId.slice(3) };
  return { prefix: '', path: frId };
}

/**
 * Test whether a feature ID matches a filter pattern.
 * Supports `*` wildcards (e.g., `*-context` matches `feature-context`).
 * A plain string without wildcards requires an exact match.
 * @req FR:req-traceability/deps.filter
 */
function matchesFeatureFilter(featureId: string, pattern: string): boolean {
  if (!pattern.includes('*')) return featureId === pattern;
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp('^' + escaped.replace(/\*/g, '.*') + '$');
  return regex.test(featureId);
}

/**
 * Filter an array of items by feature ID using a pattern that may contain wildcards.
 * @req FR:req-traceability/deps.filter
 */
function filterByFeature<T>(items: T[], pattern: string, getId: (item: T) => string): T[] {
  return items.filter((item) => matchesFeatureFilter(getId(item), pattern));
}

/**
 * Deduplicate dependency links by unique (sourceFR, targetFeature, targetFR) tuple.
 * @req FR:req-traceability/deps.scan.dedupe
 */
function deduplicateDeps(deps: SpecDependency[]): SpecDependency[] {
  const seen = new Set<string>();
  const result: SpecDependency[] = [];
  for (const dep of deps) {
    const key = `${dep.sourceFR}|${dep.targetFeature}|${dep.targetFR}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(dep);
    }
  }
  return result;
}

/**
 * Generate JSON report of dependency analysis.
 * @req FR:req-traceability/deps.output.json
 */
export function generateDependencyJsonReport(report: DependencyReport): string {
  const output = {
    features: report.features.map((f) => ({
      featureId: f.featureId,
      frontmatterDeps: f.frontmatterDeps,
      dependencies: f.dependencies.map((d) => ({
        sourceFR: d.sourceFR,
        targetFeature: d.targetFeature,
        targetFR: d.targetFR,
        specFile: d.specFile,
        specLine: d.specLine,
      })),
    })),
    validations: report.validations,
    graph: Object.fromEntries(report.graph),
    reverseGraph: Object.fromEntries(report.reverseGraph),
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Generate Mermaid graph definition for dependency visualization.
 * @req FR:req-traceability/deps.output.mermaid
 */
export function generateDependencyMermaidReport(
  report: DependencyReport,
  options?: DependencyReportOptions
): string {
  const lines: string[] = ['graph LR'];

  const graph = report.graph;

  for (const [source, targets] of graph) {
    if (options?.feature && !matchesFeatureFilter(source, options.feature)) {
      continue;
    }

    for (const target of targets) {
      lines.push(`  ${source} --> ${target}`);
    }
  }

  return lines.join('\n');
}
