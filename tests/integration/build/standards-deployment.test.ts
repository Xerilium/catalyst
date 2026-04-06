/**
 * Integration tests for standards deployment during build process
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Standards Deployment', () => {
  const distPath = path.join(__dirname, '../../../dist');
  const standardsPath = path.join(distPath, 'standards');

  beforeAll(() => {
    // Run build process
    execSync('npm run build', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '../../..'),
    });
  });

  /**
   * @req FR:context-storage/storage.framework.runtime
   */
  it('should copy standards folder to dist/standards/ during build', () => {
    expect(fs.existsSync(standardsPath)).toBe(true);
    expect(fs.statSync(standardsPath).isDirectory()).toBe(true);
  });

  /**
   * @req FR:context-storage/standards.framework
   */
  it('should deploy auq.md to dist/standards/', () => {
    const auqPath = path.join(standardsPath, 'auq.md');
    expect(fs.existsSync(auqPath)).toBe(true);

    const content = fs.readFileSync(auqPath, 'utf-8');
    expect(content).toContain('AskUserQuestion (AUQ) Tool Usage Standard');
  });

  /**
   * @req FR:context-storage/standards.catalyst-templates
   */
  it('should deploy catalyst-templates.md to dist/standards/', () => {
    const templatesPath = path.join(standardsPath, 'catalyst-templates.md');
    expect(fs.existsSync(templatesPath)).toBe(true);

    const content = fs.readFileSync(templatesPath, 'utf-8');
    expect(content).toContain('Template Conventions');
  });

  /**
   * @req FR:req-traceability/standards
   */
  it('should deploy catalyst-traceability.md to dist/standards/', () => {
    const traceabilityPath = path.join(standardsPath, 'catalyst-traceability.md');
    expect(fs.existsSync(traceabilityPath)).toBe(true);

    const content = fs.readFileSync(traceabilityPath, 'utf-8');
    expect(content).toContain('Traceability Conventions');
  });

  // @req FR:context-storage/storage.framework.deployment
  it('should include standards in package.json files array', () => {
    const packageJsonPath = path.join(__dirname, '../../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    expect(packageJson.files).toContain('standards');
  });

  /**
   * @req FR:context-storage/storage.framework.deployment
   */
  it('should deploy standards folder through build pipeline to dist/', () => {
    // Verify build process copied standards to dist/ (not nested under resources/)
    expect(fs.existsSync(standardsPath)).toBe(true);
    expect(fs.statSync(standardsPath).isDirectory()).toBe(true);

    // Verify all standards files are deployed
    const auqPath = path.join(standardsPath, 'auq.md');
    const templatesPath = path.join(standardsPath, 'catalyst-templates.md');
    const traceabilityPath2 = path.join(standardsPath, 'catalyst-traceability.md');

    expect(fs.existsSync(auqPath)).toBe(true);
    expect(fs.existsSync(templatesPath)).toBe(true);
    expect(fs.existsSync(traceabilityPath2)).toBe(true);

    // Verify postinstall script is configured for npm deployment
    const packageJsonPath = path.join(__dirname, '../../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    expect(packageJson.scripts.postinstall).toBeDefined();
    expect(packageJson.scripts.postinstall).toContain('postinstall');
  });
});
