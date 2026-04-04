/**
 * Convention enforcement tests for cross-feature dependency consistency.
 *
 * These tests run real dependency analysis against .xe/features/ and track
 * frontmatter validation warnings. As specs gain @req links, warning count
 * should decrease — this test catches regressions.
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
    it('should track unused-frontmatter warnings (specs missing @req links)', () => {
      const unused = report.validations.filter((v) => v.type === 'unused-frontmatter');

      if (unused.length > 0) {
        const summary = unused
          .slice(0, 10)
          .map((v) => `  ${v.featureId}: ${v.detail}`)
          .join('\n');
        const more = unused.length > 10
          ? `\n  ... and ${unused.length - 10} more`
          : '';

        // TODO: Currently has 35 violations from specs that list frontmatter
        // dependencies but haven't added @req FR:... links yet.
        // Uncomment the fail assertion as specs are updated.
        console.warn(
          `[WARN] ${unused.length} unused-frontmatter warnings:\n${summary}${more}`
        );
      }

      // Ratchet: warning count should only decrease over time.
      // Update this ceiling as specs gain @req links.
      expect(unused.length).toBeLessThanOrEqual(35);
    });

    it('should have zero missing-frontmatter warnings (specs with @req but missing frontmatter)', () => {
      const missing = report.validations.filter((v) => v.type === 'missing-frontmatter');

      if (missing.length > 0) {
        const summary = missing
          .map((v) => `  ${v.featureId}: ${v.detail}`)
          .join('\n');

        // missing-frontmatter is more serious — specs reference a feature
        // that isn't listed in their frontmatter dependencies.
        console.warn(
          `[WARN] ${missing.length} missing-frontmatter warnings:\n${summary}`
        );
      }

      // This should stay at zero — if a spec adds @req FR:x/... then
      // its frontmatter should list x in dependencies.
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
