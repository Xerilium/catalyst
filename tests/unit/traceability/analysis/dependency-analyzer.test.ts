/**
 * Unit tests for dependency analyzer.
 *
 * @req FR:req-traceability/deps.frontmatter-validation
 * @req FR:req-traceability/deps.scan
 */

import { DependencyAnalyzer } from '@traceability/analysis/dependency-analyzer.js';
import type { FeatureDependencies } from '@traceability/types/dependency.js';

describe('DependencyAnalyzer', () => {
  let analyzer: DependencyAnalyzer;

  beforeEach(() => {
    analyzer = new DependencyAnalyzer();
  });

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

  describe('graph building', () => {
    // @req FR:req-traceability/deps.scan
    it('should build forward dependency graph from spec dependencies', () => {
      const features = [
        makeFeature('feature-a', [
          { sourceFR: 'FR:use-b', targetFeature: 'feature-b', targetFR: 'core.api' },
          { sourceFR: 'FR:use-c', targetFeature: 'feature-c', targetFR: 'util.helper' },
        ], ['feature-b', 'feature-c']),
        makeFeature('feature-b', [], []),
        makeFeature('feature-c', [], []),
      ];

      const report = analyzer.analyze(features);
      expect(report.graph.get('feature-a')).toEqual(['feature-b', 'feature-c']);
      expect(report.graph.has('feature-b')).toBe(false);
      expect(report.graph.has('feature-c')).toBe(false);
    });

    // @req FR:req-traceability/deps.reverse
    it('should build reverse dependency graph', () => {
      const features = [
        makeFeature('feature-a', [
          { sourceFR: 'FR:use-b', targetFeature: 'feature-b', targetFR: 'core.api' },
        ], ['feature-b']),
        makeFeature('feature-b', [
          { sourceFR: 'FR:use-c', targetFeature: 'feature-c', targetFR: 'helper' },
        ], ['feature-c']),
        makeFeature('feature-c', [], []),
      ];

      const report = analyzer.analyze(features);
      expect(report.reverseGraph.get('feature-b')).toEqual(['feature-a']);
      expect(report.reverseGraph.get('feature-c')).toEqual(['feature-b']);
      expect(report.reverseGraph.has('feature-a')).toBe(false);
    });

    // @req FR:req-traceability/deps.scan.dedupe
    it('should deduplicate features in graph entries', () => {
      const features = [
        makeFeature('feature-a', [
          { sourceFR: 'FR:first', targetFeature: 'feature-b', targetFR: 'api.one' },
          { sourceFR: 'FR:second', targetFeature: 'feature-b', targetFR: 'api.two' },
        ], ['feature-b']),
      ];

      const report = analyzer.analyze(features);
      expect(report.graph.get('feature-a')).toEqual(['feature-b']);
    });
  });

  describe('frontmatter validation', () => {
    // @req FR:req-traceability/deps.frontmatter-validation
    it('should warn when spec has @req link but frontmatter does not list feature', () => {
      const features = [
        makeFeature('feature-a', [
          { sourceFR: 'FR:use-b', targetFeature: 'feature-b', targetFR: 'core.api' },
        ], []), // frontmatter missing feature-b
      ];

      const report = analyzer.analyze(features);
      expect(report.validations).toHaveLength(1);
      expect(report.validations[0]).toMatchObject({
        featureId: 'feature-a',
        type: 'missing-frontmatter',
      });
      expect(report.validations[0].detail).toContain('feature-b');
    });

    // @req FR:req-traceability/deps.frontmatter-validation
    it('should warn when frontmatter lists feature but no @req links exist', () => {
      const features = [
        makeFeature('feature-a', [], ['feature-b']), // frontmatter lists feature-b but no @req links
      ];

      const report = analyzer.analyze(features);
      expect(report.validations).toHaveLength(1);
      expect(report.validations[0]).toMatchObject({
        featureId: 'feature-a',
        type: 'unused-frontmatter',
      });
      expect(report.validations[0].detail).toContain('feature-b');
    });

    it('should not warn when frontmatter and @req links are consistent', () => {
      const features = [
        makeFeature('feature-a', [
          { sourceFR: 'FR:use-b', targetFeature: 'feature-b', targetFR: 'core.api' },
        ], ['feature-b']),
      ];

      const report = analyzer.analyze(features);
      expect(report.validations).toHaveLength(0);
    });

    it('should produce both warning types for the same feature', () => {
      const features = [
        makeFeature('feature-a', [
          { sourceFR: 'FR:use-c', targetFeature: 'feature-c', targetFR: 'some.path' },
        ], ['feature-b']), // frontmatter lists B (unused), links to C (missing from frontmatter)
      ];

      const report = analyzer.analyze(features);
      expect(report.validations).toHaveLength(2);
      const types = report.validations.map(v => v.type).sort();
      expect(types).toEqual(['missing-frontmatter', 'unused-frontmatter']);
    });
  });

  describe('empty input', () => {
    it('should handle empty feature list', () => {
      const report = analyzer.analyze([]);
      expect(report.features).toEqual([]);
      expect(report.validations).toEqual([]);
      expect(report.graph.size).toBe(0);
      expect(report.reverseGraph.size).toBe(0);
    });

    it('should handle features with no dependencies', () => {
      const features = [
        makeFeature('standalone', [], []),
      ];

      const report = analyzer.analyze(features);
      expect(report.validations).toEqual([]);
      expect(report.graph.size).toBe(0);
    });
  });
});
