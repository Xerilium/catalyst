/**
 * Unit tests for spec parser frontmatter extraction.
 *
 * @req FR:req-traceability/scan.traceability-mode.frontmatter
 * @req FR:req-traceability/scan.traceability-mode.frontmatter.input
 * @req FR:req-traceability/scan.traceability-mode.frontmatter.output
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { SpecParser } from '@traceability/parsers/spec-parser.js';

describe('SpecParser frontmatter', () => {
  let tempDir: string;
  let parser: SpecParser;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'spec-frontmatter-'));
    parser = new SpecParser();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function writeSpec(content: string): Promise<string> {
    const featureDir = path.join(tempDir, 'test-feature');
    await fs.mkdir(featureDir, { recursive: true });
    const specPath = path.join(featureDir, 'spec.md');
    await fs.writeFile(specPath, content);
    return specPath;
  }

  describe('parseFeatureMetadata', () => {
    // @req FR:req-traceability/scan.traceability-mode.frontmatter
    it('should parse traceability.code from frontmatter', async () => {
      const specPath = await writeSpec(
        '---\nid: test-feature\ntitle: Test\ntraceability:\n  code: false\n---\n\n# Feature\n'
      );
      const metadata = await parser.parseFeatureMetadata(specPath);
      expect(metadata.traceability?.code).toBe(false);
    });

    // @req FR:req-traceability/scan.traceability-mode.frontmatter
    it('should parse traceability.test from frontmatter', async () => {
      const specPath = await writeSpec(
        '---\nid: test-feature\ntitle: Test\ntraceability:\n  test: true\n---\n\n# Feature\n'
      );
      const metadata = await parser.parseFeatureMetadata(specPath);
      expect(metadata.traceability?.test).toBe(true);
    });

    // @req FR:req-traceability/scan.traceability-mode.frontmatter.input
    it('should parse both code and test', async () => {
      const specPath = await writeSpec(
        '---\nid: test-feature\ntraceability:\n  code: false\n  test: true\n---\n\n# Feature\n'
      );
      const metadata = await parser.parseFeatureMetadata(specPath);
      expect(metadata.traceability?.code).toBe(false);
      expect(metadata.traceability?.test).toBe(true);
    });

    it('should return undefined traceability when not present', async () => {
      const specPath = await writeSpec(
        '---\nid: test-feature\ntitle: Test Feature\ndependencies: []\n---\n\n# Feature\n'
      );
      const metadata = await parser.parseFeatureMetadata(specPath);
      expect(metadata.id).toBe('test-feature');
      expect(metadata.traceability).toBeUndefined();
    });

    it('should return empty metadata for file without frontmatter', async () => {
      const specPath = await writeSpec('# Feature\n\nSome content.\n');
      const metadata = await parser.parseFeatureMetadata(specPath);
      expect(metadata.traceability).toBeUndefined();
    });

    it('should handle malformed frontmatter gracefully', async () => {
      const specPath = await writeSpec('---\n: invalid yaml: [\n---\n\n# Feature\n');
      const metadata = await parser.parseFeatureMetadata(specPath);
      expect(metadata.traceability).toBeUndefined();
    });

    it('should extract id and title from frontmatter', async () => {
      const specPath = await writeSpec(
        '---\nid: my-feature\ntitle: My Feature\n---\n\n# Feature\n'
      );
      const metadata = await parser.parseFeatureMetadata(specPath);
      expect(metadata.id).toBe('my-feature');
      expect(metadata.title).toBe('My Feature');
    });

    // @req FR:req-traceability/scan.traceability-mode.frontmatter.input
    it('should ignore non-boolean traceability values', async () => {
      const specPath = await writeSpec(
        '---\nid: test-feature\ntraceability:\n  code: "yes"\n  test: 42\n---\n\n# Feature\n'
      );
      const metadata = await parser.parseFeatureMetadata(specPath);
      expect(metadata.traceability?.code).toBeUndefined();
      expect(metadata.traceability?.test).toBeUndefined();
    });

    it('should return empty metadata for non-existent file', async () => {
      const metadata = await parser.parseFeatureMetadata('/nonexistent/spec.md');
      expect(metadata.traceability).toBeUndefined();
    });
  });

  describe('parseDirectoryMetadata', () => {
    // @req FR:req-traceability/scan.traceability-mode.frontmatter
    it('should return map of all features with metadata', async () => {
      const feat1Dir = path.join(tempDir, 'feature-a');
      const feat2Dir = path.join(tempDir, 'feature-b');
      await fs.mkdir(feat1Dir, { recursive: true });
      await fs.mkdir(feat2Dir, { recursive: true });
      await fs.writeFile(
        path.join(feat1Dir, 'spec.md'),
        '---\nid: feature-a\ntraceability:\n  code: false\n---\n\n# Feature A\n'
      );
      await fs.writeFile(
        path.join(feat2Dir, 'spec.md'),
        '---\nid: feature-b\ntraceability:\n  test: true\n---\n\n# Feature B\n'
      );

      const metadataMap = await parser.parseDirectoryMetadata(tempDir);
      expect(metadataMap.size).toBe(2);
      expect(metadataMap.get('feature-a')?.traceability?.code).toBe(false);
      expect(metadataMap.get('feature-b')?.traceability?.test).toBe(true);
    });

    it('should return empty map for non-existent directory', async () => {
      const metadataMap = await parser.parseDirectoryMetadata('/nonexistent/');
      expect(metadataMap.size).toBe(0);
    });
  });
});
