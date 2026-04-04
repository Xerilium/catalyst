/**
 * Analyzer for cross-feature dependency graphs.
 *
 * Takes parsed dependency data from DependencyScanner and:
 * - Builds forward and reverse dependency graphs
 * - Cross-references blockquote @req links with frontmatter dependencies
 * - Produces validation warnings for inconsistencies
 *
 * @req FR:req-traceability/deps.frontmatter-validation
 * @req FR:req-traceability/deps.scan
 */

import type {
  FeatureDependencies,
  DependencyReport,
  DependencyValidation,
} from '../types/dependency.js';

/**
 * Analyzes cross-feature dependency data to build graphs and validate consistency.
 * @req FR:req-traceability/deps.frontmatter-validation
 */
export class DependencyAnalyzer {
  /**
   * Analyze dependency data and produce a complete report.
   * @req FR:req-traceability/deps.scan
   * @req FR:req-traceability/deps.frontmatter-validation
   */
  analyze(features: FeatureDependencies[]): DependencyReport {
    const graph = this.buildGraph(features);
    const reverseGraph = this.buildReverseGraph(graph);
    const validations = this.validateFrontmatter(features);

    return {
      features,
      validations,
      graph,
      reverseGraph,
    };
  }

  /**
   * Build forward dependency graph: feature → [features it depends on].
   * Deduplicates target features via Set collection.
   * @req FR:req-traceability/deps.scan.dedupe
   */
  private buildGraph(features: FeatureDependencies[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const feature of features) {
      const targetFeatures = new Set<string>();
      for (const dep of feature.dependencies) {
        targetFeatures.add(dep.targetFeature);
      }

      if (targetFeatures.size > 0) {
        graph.set(feature.featureId, [...targetFeatures]);
      }
    }

    return graph;
  }

  /**
   * Build reverse dependency graph: feature → [features that depend on it].
   * @req FR:req-traceability/deps.reverse
   */
  private buildReverseGraph(graph: Map<string, string[]>): Map<string, string[]> {
    const reverse = new Map<string, string[]>();

    for (const [source, targets] of graph) {
      for (const target of targets) {
        const existing = reverse.get(target) ?? [];
        existing.push(source);
        reverse.set(target, existing);
      }
    }

    return reverse;
  }

  /**
   * Cross-reference blockquote @req links with frontmatter dependencies.
   * @req FR:req-traceability/deps.frontmatter-validation
   * @req FR:req-traceability/deps.frontmatter-validation.enforcement
   */
  private validateFrontmatter(features: FeatureDependencies[]): DependencyValidation[] {
    const validations: DependencyValidation[] = [];

    for (const feature of features) {
      // Collect unique target features from @req links
      const linkedFeatures = new Set<string>();
      for (const dep of feature.dependencies) {
        linkedFeatures.add(dep.targetFeature);
      }

      const frontmatterSet = new Set(feature.frontmatterDeps);

      // Check for @req links without frontmatter entry
      for (const linked of linkedFeatures) {
        if (!frontmatterSet.has(linked)) {
          validations.push({
            featureId: feature.featureId,
            type: 'missing-frontmatter',
            message: `Spec contains @req FR:${linked}/... but frontmatter does not list "${linked}" in dependencies`,
            detail: linked,
          });
        }
      }

      // Check for frontmatter entries without @req links
      for (const declared of feature.frontmatterDeps) {
        if (!linkedFeatures.has(declared)) {
          validations.push({
            featureId: feature.featureId,
            type: 'unused-frontmatter',
            message: `Frontmatter lists "${declared}" in dependencies but no @req FR:${declared}/... found in spec`,
            detail: declared,
          });
        }
      }
    }

    return validations;
  }
}
