/**
 * Unit tests for dependency reporter.
 *
 * @req FR:req-traceability/deps.output
 * @req FR:req-traceability/deps.output.text
 * @req FR:req-traceability/deps.output.json
 * @req FR:req-traceability/deps.output.mermaid
 */

import {
  generateDependencyTextReport,
  generateDependencyJsonReport,
  generateDependencyMermaidReport,
} from '@traceability/reports/dependency-reporter.js';
import type { DependencyReport, FeatureDependencies } from '@traceability/types/dependency.js';

function makeReport(overrides: Partial<DependencyReport> = {}): DependencyReport {
  return {
    features: [],
    validations: [],
    graph: new Map(),
    reverseGraph: new Map(),
    ...overrides,
  };
}

function makeFeature(
  featureId: string,
  deps: Array<{ sourceFR: string; targetFeature: string; targetFR: string }>,
  frontmatterDeps: string[] = []
): FeatureDependencies {
  return {
    featureId,
    dependencies: deps.map((d) => ({
      sourceFeature: featureId,
      sourceFR: d.sourceFR,
      targetFeature: d.targetFeature,
      targetFR: d.targetFR,
      specFile: `.xe/features/${featureId}/spec.md`,
      specLine: 1,
    })),
    frontmatterDeps,
  };
}

// @req FR:req-traceability/deps.output.command
describe('DependencyReporter', () => {
  describe('generateDependencyTextReport', () => {
    // @req FR:req-traceability/deps.output.text
    it('should output feature header with summary stats', () => {
      const report = makeReport({
        features: [
          makeFeature('feature-a', [
            { sourceFR: 'FR:feature-a/use-b', targetFeature: 'feature-b', targetFR: 'core.api' },
            { sourceFR: 'FR:feature-a/use-c', targetFeature: 'feature-c', targetFR: 'util.helper' },
          ], ['feature-b', 'feature-c']),
        ],
        graph: new Map([['feature-a', ['feature-b', 'feature-c']]]),
      });

      const text = generateDependencyTextReport(report);
      expect(text).toContain('feature-a');
      // Stats: 2 features, 2 reqs
      expect(text).toContain('2 features');
      expect(text).toContain('2 reqs');
    });

    it('should show target features with arrow prefix', () => {
      const report = makeReport({
        features: [
          makeFeature('feature-a', [
            { sourceFR: 'FR:feature-a/use-b', targetFeature: 'feature-b', targetFR: 'core.api' },
          ], ['feature-b']),
        ],
        graph: new Map([['feature-a', ['feature-b']]]),
      });

      const text = generateDependencyTextReport(report);
      // Arrow and target feature name
      expect(text).toContain('→');
      expect(text).toContain('feature-b');
      // FR detail line
      expect(text).toContain('use-b');
      expect(text).toContain('core.api');
    });

    // @req FR:req-traceability/deps.scan.dedupe
    it('should deduplicate identical dependency links', () => {
      const report = makeReport({
        features: [
          makeFeature('feature-a', [
            { sourceFR: 'FR:feature-a/use-b', targetFeature: 'feature-b', targetFR: 'core.api' },
            { sourceFR: 'FR:feature-a/use-b', targetFeature: 'feature-b', targetFR: 'core.api' },
          ], ['feature-b']),
        ],
        graph: new Map([['feature-a', ['feature-b']]]),
      });

      const text = generateDependencyTextReport(report);
      // Should say 1 req, not 2
      expect(text).toContain('1 req');
      expect(text).not.toContain('2 reqs');
    });

    it('should show validation warnings', () => {
      const report = makeReport({
        features: [makeFeature('feature-a', [], ['unused-dep'])],
        validations: [{
          featureId: 'feature-a',
          type: 'unused-frontmatter',
          message: 'Frontmatter lists "unused-dep" but no @req links found',
          detail: 'unused-dep',
        }],
      });

      const text = generateDependencyTextReport(report);
      expect(text).toContain('unused-dep');
      expect(text).toContain('Warning');
    });

    it('should output "No dependencies found" for empty report', () => {
      const text = generateDependencyTextReport(makeReport());
      expect(text).toContain('No dependencies found');
    });

    // @req FR:req-traceability/deps.reverse
    it('should show reverse dependencies with left arrow', () => {
      const report = makeReport({
        features: [
          makeFeature('feature-a', [
            { sourceFR: 'FR:feature-a/use-b', targetFeature: 'feature-b', targetFR: 'core.api' },
          ], ['feature-b']),
          makeFeature('feature-b', [], []),
        ],
        graph: new Map([['feature-a', ['feature-b']]]),
        reverseGraph: new Map([['feature-b', ['feature-a']]]),
      });

      const text = generateDependencyTextReport(report, { reverse: true });
      expect(text).toContain('feature-b');
      expect(text).toContain('←');
      expect(text).toContain('feature-a');
      expect(text).toContain('1 dependent');
    });

    it('should filter to a single feature', () => {
      const report = makeReport({
        features: [
          makeFeature('feature-a', [
            { sourceFR: 'FR:feature-a/use-b', targetFeature: 'feature-b', targetFR: 'core.api' },
          ], ['feature-b']),
          makeFeature('feature-b', [
            { sourceFR: 'FR:feature-b/use-c', targetFeature: 'feature-c', targetFR: 'util' },
          ], ['feature-c']),
        ],
        graph: new Map([['feature-a', ['feature-b']], ['feature-b', ['feature-c']]]),
      });

      const text = generateDependencyTextReport(report, { feature: 'feature-a' });
      expect(text).toContain('feature-a');
      expect(text).toContain('feature-b');
      // feature-b's own dependencies should not appear in feature-a's report
      expect(text).not.toContain('feature-c');
    });

    it('should strip source feature scope from FR IDs', () => {
      const report = makeReport({
        features: [
          makeFeature('feature-a', [
            { sourceFR: 'FR:feature-a/spec.template', targetFeature: 'feature-b', targetFR: 'core.api' },
          ], ['feature-b']),
        ],
        graph: new Map([['feature-a', ['feature-b']]]),
      });

      const text = generateDependencyTextReport(report);
      // Should strip "feature-a/" scope but preserve FR: prefix
      expect(text).toMatch(/FR:spec\.template\s+→/);
      // Should NOT contain the full scoped source
      expect(text).not.toContain('FR:feature-a/spec.template');
      // Target still shows full path
      expect(text).toContain('core.api');
    });

    it('should show summary line at the bottom', () => {
      const report = makeReport({
        features: [
          makeFeature('feature-a', [
            { sourceFR: 'FR:feature-a/use-b', targetFeature: 'feature-b', targetFR: 'core.api' },
          ], ['feature-b']),
        ],
        graph: new Map([['feature-a', ['feature-b']]]),
      });

      const text = generateDependencyTextReport(report);
      expect(text).toContain('1 feature');
      expect(text).toContain('1 link');
    });

    it('should show warning count in summary when warnings exist', () => {
      const report = makeReport({
        features: [
          makeFeature('feature-a', [
            { sourceFR: 'FR:feature-a/use-b', targetFeature: 'feature-b', targetFR: 'core.api' },
          ], ['feature-b', 'unused']),
        ],
        graph: new Map([['feature-a', ['feature-b']]]),
        validations: [{
          featureId: 'feature-a',
          type: 'unused-frontmatter',
          message: 'Frontmatter lists "unused" but no @req links found',
          detail: 'unused',
        }],
      });

      const text = generateDependencyTextReport(report);
      expect(text).toContain('1 warning');
    });

    // @req FR:req-traceability/deps.filter
    it('should support wildcard feature filter with *', () => {
      const report = makeReport({
        features: [
          makeFeature('auth-context', [
            { sourceFR: 'FR:auth-context/login', targetFeature: 'user-store', targetFR: 'store.api' },
          ], ['user-store']),
          makeFeature('nav-context', [
            { sourceFR: 'FR:nav-context/route', targetFeature: 'router', targetFR: 'router.core' },
          ], ['router']),
          makeFeature('user-store', [], []),
        ],
        graph: new Map([['auth-context', ['user-store']], ['nav-context', ['router']]]),
      });

      const text = generateDependencyTextReport(report, { feature: '*-context' });
      expect(text).toContain('auth-context');
      expect(text).toContain('nav-context');
      expect(text).not.toMatch(/^user-store/m);
      // Summary should reflect 2 matched features
      expect(text).toContain('2 features');
    });

    // @req FR:req-traceability/deps.filter
    it('should support wildcard in reverse mode', () => {
      const report = makeReport({
        features: [],
        reverseGraph: new Map([
          ['auth-context', ['feature-a']],
          ['nav-context', ['feature-b']],
          ['user-store', ['feature-c']],
        ]),
      });

      const text = generateDependencyTextReport(report, { feature: '*-context', reverse: true });
      expect(text).toContain('auth-context');
      expect(text).toContain('nav-context');
      expect(text).not.toContain('user-store');
    });
  });

  describe('generateDependencyJsonReport', () => {
    // @req FR:req-traceability/deps.output.json
    it('should output valid JSON with features and validations', () => {
      const report = makeReport({
        features: [
          makeFeature('feature-a', [
            { sourceFR: 'FR:use-b', targetFeature: 'feature-b', targetFR: 'core.api' },
          ], ['feature-b']),
        ],
        graph: new Map([['feature-a', ['feature-b']]]),
        validations: [],
      });

      const json = generateDependencyJsonReport(report);
      const parsed = JSON.parse(json);
      expect(parsed.features).toHaveLength(1);
      expect(parsed.features[0].featureId).toBe('feature-a');
      expect(parsed.graph).toBeDefined();
      expect(parsed.graph['feature-a']).toEqual(['feature-b']);
    });

    // @req FR:req-traceability/deps.output.json
    it('should include reverse graph in JSON', () => {
      const report = makeReport({
        features: [],
        reverseGraph: new Map([['feature-b', ['feature-a']]]),
      });

      const json = generateDependencyJsonReport(report);
      const parsed = JSON.parse(json);
      expect(parsed.reverseGraph['feature-b']).toEqual(['feature-a']);
    });
  });

  describe('generateDependencyMermaidReport', () => {
    // @req FR:req-traceability/deps.output.mermaid
    it('should output valid Mermaid graph definition', () => {
      const report = makeReport({
        graph: new Map([
          ['feature-a', ['feature-b', 'feature-c']],
          ['feature-b', ['feature-c']],
        ]),
      });

      const mermaid = generateDependencyMermaidReport(report);
      expect(mermaid).toContain('graph LR');
      expect(mermaid).toContain('feature-a --> feature-b');
      expect(mermaid).toContain('feature-a --> feature-c');
      expect(mermaid).toContain('feature-b --> feature-c');
    });

    it('should output empty graph for no dependencies', () => {
      const mermaid = generateDependencyMermaidReport(makeReport());
      expect(mermaid).toContain('graph LR');
    });

    it('should filter to a single feature', () => {
      const report = makeReport({
        graph: new Map([
          ['feature-a', ['feature-b']],
          ['feature-c', ['feature-d']],
        ]),
      });

      const mermaid = generateDependencyMermaidReport(report, { feature: 'feature-a' });
      expect(mermaid).toContain('feature-a --> feature-b');
      expect(mermaid).not.toContain('feature-c');
    });

    // @req FR:req-traceability/deps.filter
    it('should support wildcard feature filter', () => {
      const report = makeReport({
        graph: new Map([
          ['auth-context', ['user-store']],
          ['nav-context', ['router']],
          ['user-store', ['db']],
        ]),
      });

      const mermaid = generateDependencyMermaidReport(report, { feature: '*-context' });
      expect(mermaid).toContain('auth-context --> user-store');
      expect(mermaid).toContain('nav-context --> router');
      expect(mermaid).not.toContain('user-store --> db');
    });
  });
});
