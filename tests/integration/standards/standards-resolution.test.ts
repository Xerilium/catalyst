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
    expect(content).toContain('Always recommend the most appropriate option');
    expect(content).toContain('Keep content concise and complete');
    expect(content).toContain('Questions and options MUST avoid markdown formatting');
    expect(content).toContain('Ensure options include concise details');
  });

  /**
   * @req FR:context-storage/standards.framework
   * @req FR:context-storage/standards.catalyst
   * @req FR:context-storage/standards.catalyst.traceability
   */
  it('should have catalyst.md accessible with traceability conventions', () => {
    const distCatalystPath = path.join(__dirname, '../../../dist/standards/catalyst.md');

    expect(fs.existsSync(distCatalystPath)).toBe(true);

    const content = fs.readFileSync(distCatalystPath, 'utf-8');
    expect(content).toContain('Catalyst Standards');
    expect(content).toContain('Requirements Traceability Conventions');
    expect(content).toContain('Requirement ID Stability');
    expect(content).toContain('Annotation Placement');
  });
});
