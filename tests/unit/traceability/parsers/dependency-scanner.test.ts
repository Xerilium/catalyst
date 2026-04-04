/**
 * Unit tests for dependency scanner.
 *
 * @req FR:req-traceability/deps.scan
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { DependencyScanner } from '@traceability/parsers/dependency-scanner.js';

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
  });
});
