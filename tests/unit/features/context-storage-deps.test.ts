/**
 * Unit tests for context-storage dependent feature traceability
 * Verifies that all features depending on context-storage have proper dependency declarations
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

describe('Context Storage Dependencies', () => {
  const featuresPath = path.join(__dirname, '../../../.xe/features');

  const expectedDependentFeatures = [
    'product-context',
    'engineering-context',
    'feature-workflow',
    'playbook-definition',
    'catalyst-cli',
    'feature-context',
    'req-traceability',
  ];

  /**
   * @req FR:context-storage/templates.framework
   * @req FR:context-storage/standards.framework
   * @req FR:context-storage/playbooks.framework
   */
  it.each(expectedDependentFeatures)(
    'should have context-storage in %s dependencies',
    (featureId) => {
      const specPath = path.join(featuresPath, featureId, 'spec.md');
      expect(fs.existsSync(specPath)).toBe(true);

      const content = fs.readFileSync(specPath, 'utf-8');

      // Extract frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      expect(frontmatterMatch).toBeTruthy();

      const frontmatter = yaml.parse(frontmatterMatch![1]);
      expect(frontmatter.dependencies).toBeDefined();
      expect(frontmatter.dependencies).toContain('context-storage');
    }
  );

  /**
   * @req FR:context-storage/templates.framework
   */
  it('should have @req annotations in features that reference templates', () => {
    const templateFeatures = [
      'product-context',
      'engineering-context',
      'feature-context',
    ];

    templateFeatures.forEach((featureId) => {
      const specPath = path.join(featuresPath, featureId, 'spec.md');
      const content = fs.readFileSync(specPath, 'utf-8');

      expect(content).toContain('@req FR:context-storage/templates.framework');
    });
  });

  /**
   * @req FR:context-storage/playbooks.framework
   */
  it('should have @req annotations in features that reference playbooks', () => {
    const playbookFeatures = ['feature-workflow'];

    playbookFeatures.forEach((featureId) => {
      const specPath = path.join(featuresPath, featureId, 'spec.md');
      const content = fs.readFileSync(specPath, 'utf-8');

      expect(content).toContain('@req FR:context-storage/playbooks.framework');
    });
  });

  /**
   * @req FR:context-storage/storage.framework
   * @req FR:context-storage/storage.project
   */
  it('should have @req annotations in features that reference storage infrastructure', () => {
    const storageFeatures = ['playbook-definition', 'catalyst-cli'];

    storageFeatures.forEach((featureId) => {
      const specPath = path.join(featuresPath, featureId, 'spec.md');
      const content = fs.readFileSync(specPath, 'utf-8');

      const hasFramework = content.includes('@req FR:context-storage/storage.framework');
      const hasProject = content.includes('@req FR:context-storage/storage.project');

      expect(hasFramework || hasProject).toBe(true);
    });
  });
});
