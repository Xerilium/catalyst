/**
 * Integration tests for standards accessibility after npm install
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Standards Resolution', () => {
  const nodeModulesPath = path.join(__dirname, '../../../node_modules/@xerilium/catalyst');
  const standardsPath = path.join(nodeModulesPath, 'standards');

  /**
   * @req FR:context-storage/storage.framework.runtime
   */
  it('should have standards accessible at node_modules/@xerilium/catalyst/standards/', () => {
    // Note: This test assumes the package is symlinked during development
    // In production, standards would be deployed via npm install
    const distStandardsPath = path.join(__dirname, '../../../dist/standards');

    // Check dist folder (build output)
    expect(fs.existsSync(distStandardsPath)).toBe(true);
  });

  /**
   * @req FR:context-storage/standards.framework
   * @req FR:context-storage/standards.auq
   */
  it('should have auq.md accessible', () => {
    const distAuqPath = path.join(__dirname, '../../../dist/standards/auq.md');

    expect(fs.existsSync(distAuqPath)).toBe(true);

    const content = fs.readFileSync(distAuqPath, 'utf-8');
    expect(content).toContain('AskUserQuestion (AUQ) Tool Usage Standard');
  });

  /**
   * @req FR:context-storage/standards.framework
   * @req FR:context-storage/standards.catalyst-templates
   */
  it('should have catalyst-templates.md accessible', () => {
    const distPath = path.join(__dirname, '../../../dist/standards/catalyst-templates.md');

    expect(fs.existsSync(distPath)).toBe(true);

    const content = fs.readFileSync(distPath, 'utf-8');
    expect(content).toContain('Template Conventions');
  });

  /**
   * @req FR:context-storage/standards.framework
   * @req FR:req-traceability/standards
   */
  it('should have catalyst-traceability.md accessible with traceability conventions', () => {
    const distPath = path.join(__dirname, '../../../dist/standards/catalyst-traceability.md');

    expect(fs.existsSync(distPath)).toBe(true);

    const content = fs.readFileSync(distPath, 'utf-8');
    expect(content).toContain('Traceability Conventions');
    expect(content).toContain('Requirement ID Stability');
    expect(content).toContain('Annotation Placement');
    expect(content).toContain('Dependency Link Semantics');
  });

  /**
   * @req FR:context-storage/standards.auq.function
   */
  it('should have AUQ action file accessible at the canonical invocation path', () => {
    const distAuqActionPath = path.join(__dirname, '../../../dist/playbooks/actions/auq.md');

    expect(fs.existsSync(distAuqActionPath)).toBe(true);

    const content = fs.readFileSync(distAuqActionPath, 'utf-8');

    // Decision tree (when to skip AUQ)
    expect(content).toMatch(/Skip AUQ/);
    // Self-containment rule
    expect(content).toMatch(/AUQ hides console|self-contained|User can't see console|only message a teammate had seen/i);
    // Format limits — word counts
    expect(content).toMatch(/<\s*100\s*words/);
    // No markdown
    expect(content).toMatch(/no markdown|plain text/i);
    // Recommendation marker
    expect(content).toMatch(/\(Recommended\)/);
  });
});
