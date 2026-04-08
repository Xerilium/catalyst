/**
 * Convention enforcement tests for cross-feature dependency consistency.
 *
 * These tests run real dependency analysis against .xe/features/ and enforce
 * zero frontmatter validation errors. Any spec with frontmatter dependencies
 * must have matching @req links, and vice versa.
 *
 * @req FR:req-traceability/deps.frontmatter-validation
 * @req FR:req-traceability/deps.frontmatter-validation.enforcement
 * @req FR:req-traceability/deps.no-coverage
 */

import { runDependencyAnalysis } from '@traceability/runner.js';
import type { DependencyReport } from '@traceability/types/dependency.js';

describe('Dependency enforcement', () => {
  let report: DependencyReport;

  beforeAll(async () => {
    report = await runDependencyAnalysis();
  }, 30000);

  // @req FR:req-traceability/deps.frontmatter-validation
  // @req FR:req-traceability/deps.frontmatter-validation.enforcement
  describe('Frontmatter consistency', () => {
    it('should have zero unused-frontmatter errors (deps listed but no @req links)', () => {
      const unused = report.validations.filter((v) => v.type === 'unused-frontmatter');

      if (unused.length > 0) {
        const summary = unused
          .slice(0, 10)
          .map((v) => `  ${v.featureId}: ${v.detail}`)
          .join('\n');
        const more = unused.length > 10
          ? `\n  ... and ${unused.length - 10} more`
          : '';

        // Log details before failing so the developer knows exactly what to fix
        console.error(
          `${unused.length} unused-frontmatter errors:\n${summary}${more}`
        );
      }

      expect(unused.length).toBe(0);
    });

    it('should have zero missing-frontmatter errors (@req links without frontmatter entry)', () => {
      const missing = report.validations.filter((v) => v.type === 'missing-frontmatter');

      if (missing.length > 0) {
        const summary = missing
          .map((v) => `  ${v.featureId}: ${v.detail}`)
          .join('\n');

        console.error(
          `${missing.length} missing-frontmatter errors:\n${summary}`
        );
      }

      expect(missing.length).toBe(0);
    });
  });

  describe('Dependency graph integrity', () => {
    it('should have features with declared dependencies', () => {
      const withDeps = report.features.filter((f) => f.dependencies.length > 0);
      // At least some features should have dependency links
      expect(withDeps.length).toBeGreaterThan(0);
    });

    it('should build forward and reverse graphs', () => {
      expect(report.graph.size).toBeGreaterThan(0);
      expect(report.reverseGraph.size).toBeGreaterThan(0);
    });
  });
});
