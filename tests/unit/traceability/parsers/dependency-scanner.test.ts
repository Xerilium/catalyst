/**
 * Unit tests for dependency scanner.
 *
 * @req FR:req-traceability/deps.scan
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { DependencyScanner } from '@traceability/parsers/dependency-scanner.js';
import { DependencyAnalyzer } from '@traceability/analysis/dependency-analyzer.js';

describe('DependencyScanner', () => {
  let tempDir: string;
  let scanner: DependencyScanner;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dep-scanner-'));
    scanner = new DependencyScanner();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function writeSpec(featureId: string, content: string): Promise<string> {
    const featureDir = path.join(tempDir, featureId);
    await fs.mkdir(featureDir, { recursive: true });
    const specPath = path.join(featureDir, 'spec.md');
    await fs.writeFile(specPath, content);
    return specPath;
  }

  describe('scanFile', () => {
    // @req FR:req-traceability/deps.scan
    it('should extract blockquote @req dependency links', async () => {
      const specPath = await writeSpec('feature-context', [
        '---',
        'id: feature-context',
        'dependencies:',
        '  - product-context',
        '---',
        '',
        '# Feature',
        '',
        '- **FR:spec.scenarios.personas** (P2): Scenarios MUST reference personas',
        '  > - @req FR:product-context/product.personas',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps).toHaveLength(1);
      expect(deps[0]).toMatchObject({
        sourceFeature: 'feature-context',
        sourceFR: 'FR:spec.scenarios.personas',
        targetFeature: 'product-context',
        targetType: 'FR',
        targetFR: 'product.personas',
        specFile: specPath,
      });
    });

    // @req FR:req-traceability/deps.scan
    it('should handle blockquote without bullet prefix', async () => {
      const specPath = await writeSpec('feature-context', [
        '- **FR:spec.constraints** (P2): Architecture constraints',
        '  > @req FR:engineering-context/arch.patterns',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps).toHaveLength(1);
      expect(deps[0]).toMatchObject({
        sourceFR: 'FR:spec.constraints',
        targetFeature: 'engineering-context',
        targetFR: 'arch.patterns',
      });
    });

    // @req FR:req-traceability/deps.scan
    it('should track multiple dependencies under one FR', async () => {
      const specPath = await writeSpec('my-feature', [
        '- **FR:core.auth** (P1): Authentication system',
        '  > - @req FR:auth-provider/auth.session',
        '  > - @req FR:auth-provider/auth.tokens',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps).toHaveLength(2);
      expect(deps[0].targetFR).toBe('auth.session');
      expect(deps[1].targetFR).toBe('auth.tokens');
    });

    // @req FR:req-traceability/deps.scan
    it('should track dependencies across multiple FRs', async () => {
      const specPath = await writeSpec('my-feature', [
        '- **FR:first** (P2): First requirement',
        '  > - @req FR:dep-a/some.path',
        '',
        '- **FR:second** (P2): Second requirement',
        '  > - @req FR:dep-b/other.path',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps).toHaveLength(2);
      expect(deps[0].sourceFR).toBe('FR:first');
      expect(deps[1].sourceFR).toBe('FR:second');
    });

    // @req FR:req-traceability/deps.scan
    it('should handle heading-style FRs', async () => {
      const specPath = await writeSpec('my-feature', [
        '### FR:deps (P5): Cross-Feature Dependency Tracking',
        '',
        '- **FR:deps.scan** (P2): System MUST scan specs',
        '  > - @req FR:other/scan.patterns',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps).toHaveLength(1);
      expect(deps[0].sourceFR).toBe('FR:deps.scan');
    });

    it('should return empty array for spec without dependencies', async () => {
      const specPath = await writeSpec('no-deps', [
        '---',
        'id: no-deps',
        '---',
        '',
        '- **FR:simple** (P2): A simple requirement',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps).toHaveLength(0);
    });

    it('should return empty array for non-existent file', async () => {
      const deps = await scanner.scanFile('/nonexistent/spec.md');
      expect(deps).toHaveLength(0);
    });

    it('should ignore @req annotations that are not in blockquotes', async () => {
      const specPath = await writeSpec('my-feature', [
        '- **FR:impl** (P2): Some requirement',
        '  - @req FR:other/not.blockquote',
        '  Some text with @req FR:other/inline.text',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps).toHaveLength(0);
    });

    // @req FR:req-traceability/id.format.interface
    it('should track interface FR with @ sigil as parent context', async () => {
      const specPath = await writeSpec('feature-context', [
        '- **FR:design-decisions.@markdown** (P3): Interface FR',
        '  > - @req FR:context-storage/templates.framework',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps).toHaveLength(1);
      expect(deps[0]).toMatchObject({
        sourceFeature: 'feature-context',
        sourceFR: 'FR:design-decisions.@markdown',
        targetFeature: 'context-storage',
        targetFR: 'templates.framework',
      });
    });

    // @req FR:req-traceability/deps.scan.blockquote
    // @req FR:req-traceability/id.format
    it('should keep the full namespaced feature id for a blockquote @req target', async () => {
      const specPath = await writeSpec('reporting', [
        '- **FR:summary** (P2): Summaries',
        '  > - @req FR:finops/allocation/strategy.hierarchies',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps).toHaveLength(1);
      expect(deps[0]).toMatchObject({
        targetFeature: 'finops/allocation',
        targetFR: 'strategy.hierarchies',
      });
    });

    // @req FR:req-traceability/deps.scan.blockquote
    // @req FR:req-traceability/id.format
    it('should split namespaced target at the last slash for a dot-less FR path', async () => {
      const specPath = await writeSpec('reporting', [
        '- **FR:summary** (P2): Summaries',
        '  > - @req FR:finops/allocation/overview',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps).toHaveLength(1);
      expect(deps[0]).toMatchObject({
        targetFeature: 'finops/allocation',
        targetFR: 'overview',
      });
    });

    // @req FR:req-traceability/deps.scan.inline
    // @req FR:req-traceability/id.format
    it('should keep the full namespaced feature id for an inline @req target', async () => {
      const specPath = await writeSpec('reporting', [
        '- **FR:summary** (P2): Summaries',
        '  - Rolls up (@req FR:finops/allocation/strategy.hierarchies)',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps).toHaveLength(1);
      expect(deps[0]).toMatchObject({
        targetFeature: 'finops/allocation',
        targetFR: 'strategy.hierarchies',
      });
    });

    // @req FR:req-traceability/deps.scan.inline
    it('should extract inline @req references from FR description text', async () => {
      const specPath = await writeSpec('order-feature', [
        '- **FR:$order** (P1): **`Order`**',
        '  - `Payment` (@req FR:payments/$payment-method)',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps).toHaveLength(1);
      expect(deps[0]).toMatchObject({
        sourceFeature: 'order-feature',
        sourceFR: 'FR:$order',
        targetFeature: 'payments',
        targetFR: '$payment-method',
      });
    });

    // @req FR:req-traceability/deps.scan.inline
    it('should not generate cross-feature edge for short-form inline reference', async () => {
      const specPath = await writeSpec('order-feature', [
        '- **FR:checkout** (P2): Checkout flow',
        '  - Uses (@req FR:$order) within the same feature',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      // Short-form inline reference (no scope) is same-feature, not a cross-feature dep
      expect(deps).toHaveLength(0);
    });

    // @req FR:req-traceability/id.format.interface
    // @req FR:req-traceability/deps.scan.blockquote
    // @req FR:req-traceability/deps.scan.inline
    it('should extract @req references targeting interface FRs with @ sigil', async () => {
      const specPath = await writeSpec('caller', [
        '- **FR:invoke** (P2): Invoke remote feature',
        '  - Top-level interface dep: (@req FR:remote/@cli)',
        '  - Nested interface dep: (@req FR:remote/index.@cli)',
        '  > - @req FR:remote/design-decisions.@markdown',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      const targets = deps.map((d) => `${d.targetFeature}/${d.targetFR}`).sort();
      expect(targets).toEqual([
        'remote/@cli',
        'remote/design-decisions.@markdown',
        'remote/index.@cli',
      ]);
    });

    // @req FR:req-traceability/deps.scan.inline
    it('should not misread currency strings as inline @req references', async () => {
      const specPath = await writeSpec('billing', [
        '- **FR:pricing** (P2): Pricing rules',
        '  - Minimum charge: $5.00',
        '  - Discount applied at $10.00 threshold',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps).toHaveLength(0);
    });

    // @req FR:req-traceability/deps.scan.blockquote
    // @req FR:req-traceability/deps.scan.inline
    it('should extract both blockquote and inline forms from same spec', async () => {
      const specPath = await writeSpec('order-feature', [
        '- **FR:$order** (P1): **`Order`**',
        '  - `Payment` (@req FR:payments/$payment-method)',
        '  > - @req FR:catalog/product.id',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps).toHaveLength(2);
      const targets = deps.map((d) => `${d.targetFeature}/${d.targetFR}`).sort();
      expect(targets).toEqual([
        'catalog/product.id',
        'payments/$payment-method',
      ]);
    });

    it('should ignore inline @req references inside single-backtick code spans', async () => {
      const specPath = await writeSpec('order-feature', [
        '- **FR:real** (P2): Real requirement',
        '  - Real dep: (@req FR:catalog/product.id)',
        '  - Example shown inline: `(@req FR:payments/$payment-method)` is illustration',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps).toHaveLength(1);
      expect(deps[0].targetFeature).toBe('catalog');
    });

    it('should ignore @req references inside fenced code blocks', async () => {
      const specPath = await writeSpec('order-feature', [
        '- **FR:real** (P2): Real requirement',
        '  > - @req FR:catalog/product.id',
        '',
        '## Examples',
        '',
        '```markdown',
        '- **FR:$example** (P1): Example entity',
        '  - `Payment` (@req FR:payments/$payment-method)',
        '  > - @req FR:other/example.dep',
        '```',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps).toHaveLength(1);
      expect(deps[0]).toMatchObject({
        sourceFR: 'FR:real',
        targetFeature: 'catalog',
        targetFR: 'product.id',
      });
    });

    // @req FR:req-traceability/deps.scan.blockquote
    it('should extract blockquote @req NFR dependency links', async () => {
      const specPath = await writeSpec('feature-workflow', [
        '- **FR:workflow.distilled-writing** (P1): Action playbooks MUST follow distilled-writing rule',
        '  > - @req NFR:workflow-context/authoring.distilled-writing',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps).toHaveLength(1);
      expect(deps[0]).toMatchObject({
        sourceFeature: 'feature-workflow',
        sourceFR: 'FR:workflow.distilled-writing',
        targetFeature: 'workflow-context',
        targetType: 'NFR',
        targetFR: 'authoring.distilled-writing',
      });
    });

    // @req FR:req-traceability/deps.scan.blockquote
    it('should extract blockquote @req REQ dependency links', async () => {
      const specPath = await writeSpec('downstream', [
        '- **FR:integration** (P2): Integration requirement',
        '  > - @req REQ:upstream/policy.compliance',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps).toHaveLength(1);
      expect(deps[0]).toMatchObject({
        targetFeature: 'upstream',
        targetType: 'REQ',
        targetFR: 'policy.compliance',
      });
    });

    // @req FR:req-traceability/deps.scan.inline
    it('should extract inline @req NFR and REQ references', async () => {
      const specPath = await writeSpec('caller', [
        '- **FR:wide-scope** (P2): References across types',
        '  - Perf hook (@req NFR:perf/budget.frame-time)',
        '  - Compliance hook (@req REQ:legal/audit.trail)',
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      const typedTargets = deps
        .map((d) => `${d.targetType}:${d.targetFeature}/${d.targetFR}`)
        .sort();
      expect(typedTargets).toEqual([
        'NFR:perf/budget.frame-time',
        'REQ:legal/audit.trail',
      ]);
    });

    it('should record correct line numbers', async () => {
      const specPath = await writeSpec('my-feature', [
        '# Feature',           // line 1
        '',                     // line 2
        '- **FR:first** (P2): First', // line 3
        '  > - @req FR:dep/a.b', // line 4
        '',                     // line 5
        '- **FR:second** (P2): Second', // line 6
        '  > - @req FR:dep/c.d', // line 7
      ].join('\n'));

      const deps = await scanner.scanFile(specPath);
      expect(deps[0].specLine).toBe(4);
      expect(deps[1].specLine).toBe(7);
    });
  });

  describe('scanDirectory', () => {
    // @req FR:req-traceability/deps.scan
    it('should scan all features in a directory', async () => {
      await writeSpec('feature-a', [
        '---',
        'id: feature-a',
        'dependencies:',
        '  - feature-b',
        '---',
        '',
        '- **FR:use-b** (P2): Uses feature B',
        '  > - @req FR:feature-b/core.api',
      ].join('\n'));

      await writeSpec('feature-b', [
        '---',
        'id: feature-b',
        'dependencies: []',
        '---',
        '',
        '- **FR:core.api** (P2): Core API',
      ].join('\n'));

      const features = await scanner.scanDirectory(tempDir);
      expect(features).toHaveLength(2);

      const featureA = features.find(f => f.featureId === 'feature-a');
      expect(featureA).toBeDefined();
      expect(featureA!.dependencies).toHaveLength(1);
      expect(featureA!.frontmatterDeps).toEqual(['feature-b']);

      const featureB = features.find(f => f.featureId === 'feature-b');
      expect(featureB).toBeDefined();
      expect(featureB!.dependencies).toHaveLength(0);
      expect(featureB!.frontmatterDeps).toEqual([]);
    });

    it('should return empty array for non-existent directory', async () => {
      const features = await scanner.scanDirectory('/nonexistent/');
      expect(features).toEqual([]);
    });

    // @req FR:req-traceability/deps.scan
    it('should skip features without spec.md', async () => {
      await fs.mkdir(path.join(tempDir, 'no-spec'), { recursive: true });
      await writeSpec('has-spec', [
        '---',
        'id: has-spec',
        '---',
        '',
        '- **FR:basic** (P2): Basic req',
      ].join('\n'));

      const features = await scanner.scanDirectory(tempDir);
      expect(features).toHaveLength(1);
      expect(features[0].featureId).toBe('has-spec');
    });

    it('should handle features with no frontmatter dependencies', async () => {
      await writeSpec('minimal', [
        '---',
        'id: minimal',
        '---',
        '',
        '- **FR:basic** (P2): Basic req',
        '  > - @req FR:other/some.path',
      ].join('\n'));

      const features = await scanner.scanDirectory(tempDir);
      expect(features).toHaveLength(1);
      expect(features[0].frontmatterDeps).toEqual([]);
      expect(features[0].dependencies).toHaveLength(1);
    });

    // @req FR:feature-context/spec.@file.nesting
    // @req FR:req-traceability/deps.scan
    it('should recurse into nested feature folders and key features by full nested id', async () => {
      // Use writeSpec with a nested id; mkdir recursive handles slashes via path.join only if we replicate
      const nestedDir = path.join(tempDir, 'portal', 'shell');
      await fs.mkdir(nestedDir, { recursive: true });
      await fs.writeFile(path.join(nestedDir, 'spec.md'), [
        '---',
        'id: portal/shell',
        'dependencies:',
        '  - flat-dep',
        '---',
        '',
        '- **FR:render** (P2): Render',
        '  > - @req FR:flat-dep/api.surface',
      ].join('\n'));

      await writeSpec('flat-dep', [
        '---',
        'id: flat-dep',
        '---',
        '',
        '- **FR:api.surface** (P2): Surface',
      ].join('\n'));

      const features = await scanner.scanDirectory(tempDir);

      expect(features).toHaveLength(2);
      const portalShell = features.find(f => f.featureId === 'portal/shell');
      expect(portalShell).toBeDefined();
      expect(portalShell!.frontmatterDeps).toEqual(['flat-dep']);
      expect(portalShell!.dependencies).toHaveLength(1);
      // sourceFeature on the dependency must carry the full nested id, not the basename.
      expect(portalShell!.dependencies[0].sourceFeature).toBe('portal/shell');
    });

    // @req FR:feature-context/spec.@file.nesting
    // @req FR:req-traceability/deps.scan
    it('should key dependencies by the full nested source id when the target is also namespaced', async () => {
      const nestedDir = path.join(tempDir, 'finops', 'reporting');
      await fs.mkdir(nestedDir, { recursive: true });
      await fs.writeFile(path.join(nestedDir, 'spec.md'), [
        '---',
        'id: finops/reporting',
        'dependencies:',
        '  - finops/allocation',
        '---',
        '',
        '- **FR:summary** (P2): Roll-up summaries',
        '  > - @req FR:finops/allocation/strategy.hierarchies',
      ].join('\n'));

      const features = await scanner.scanDirectory(tempDir);
      const reporting = features.find(f => f.featureId === 'finops/reporting');
      expect(reporting).toBeDefined();
      expect(reporting!.dependencies).toHaveLength(1);
      expect(reporting!.dependencies[0]).toMatchObject({
        sourceFeature: 'finops/reporting',
        targetFeature: 'finops/allocation',
        targetFR: 'strategy.hierarchies',
      });
    });

    // @req FR:req-traceability/deps.frontmatter-validation
    // @req FR:feature-context/spec.@file.nesting
    it('should not emit false frontmatter warnings for a namespaced source and target', async () => {
      const nestedDir = path.join(tempDir, 'finops', 'reporting');
      await fs.mkdir(nestedDir, { recursive: true });
      await fs.writeFile(path.join(nestedDir, 'spec.md'), [
        '---',
        'id: finops/reporting',
        'dependencies:',
        '  - finops/allocation',
        '---',
        '',
        '- **FR:summary** (P2): Roll-up summaries',
        '  > - @req FR:finops/allocation/strategy.hierarchies',
      ].join('\n'));

      const features = await scanner.scanDirectory(tempDir);
      const report = new DependencyAnalyzer().analyze(features);
      const reportingWarnings = report.validations.filter(
        (v) => v.featureId === 'finops/reporting',
      );
      expect(reportingWarnings).toEqual([]);
    });
  });
});
