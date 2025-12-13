/**
 * Integration test for full traceability scan workflow.
 * @req FR:req-traceability/scan.code
 * @req FR:req-traceability/scan.tests
 * @req FR:req-traceability/scan.tasks
 * @req FR:req-traceability/report.output
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SpecParser } from '@traceability/parsers/spec-parser.js';
import { AnnotationScanner } from '@traceability/parsers/annotation-scanner.js';
import { TaskParser } from '@traceability/parsers/task-parser.js';
import { CoverageAnalyzer } from '@traceability/analysis/coverage-analyzer.js';
import { generateJsonReport } from '@traceability/reports/json-reporter.js';
import { generateTerminalReport } from '@traceability/reports/terminal-reporter.js';

describe('Full Scan Workflow', () => {
  let tempDir: string;
  let featuresDir: string;
  let srcDir: string;
  let testsDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'traceability-integration-'));
    featuresDir = path.join(tempDir, '.xe', 'features');
    srcDir = path.join(tempDir, 'src');
    testsDir = path.join(tempDir, 'tests');

    // Create directory structure
    await fs.mkdir(featuresDir, { recursive: true });
    await fs.mkdir(srcDir, { recursive: true });
    await fs.mkdir(testsDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // @req FR:req-traceability/scan.code
  // @req FR:req-traceability/scan.tests
  // @req FR:req-traceability/scan.tasks
  it('should perform end-to-end scan: parse specs → scan code → parse tasks → analyze → report', async () => {
    // Create feature spec
    const authFeatureDir = path.join(featuresDir, 'auth');
    await fs.mkdir(authFeatureDir, { recursive: true });

    const specContent = `# Auth Feature Spec

## Requirements

- **FR:session.expiry**: Sessions MUST expire after 90 minutes
- **FR:session.validation**: Sessions MUST be validated on each request
- **FR:oauth**: [deferred] OAuth integration for third-party login
`;
    await fs.writeFile(path.join(authFeatureDir, 'spec.md'), specContent);

    // Create tasks.md
    const tasksContent = `# Tasks

- [ ] T001: Implement session expiry
  - @req FR:session.expiry
  - @req FR:session.validation

- [ ] T002: Setup project structure
  - Create directories
`;
    await fs.writeFile(path.join(authFeatureDir, 'tasks.md'), tasksContent);

    // Create source file with annotations
    const authSrcDir = path.join(srcDir, 'auth');
    await fs.mkdir(authSrcDir, { recursive: true });

    const sourceContent = `// @req FR:auth/session.expiry
// @req FR:auth/session.validation
export function validateSession(token: string): boolean {
  const maxAge = 90 * 60 * 1000;
  // Implementation
  return true;
}
`;
    await fs.writeFile(path.join(authSrcDir, 'session.ts'), sourceContent);

    // Create test file with annotations
    const authTestDir = path.join(testsDir, 'auth');
    await fs.mkdir(authTestDir, { recursive: true });

    const testContent = `import { describe, it, expect } from 'vitest';

describe('Session validation', () => {
  // @req FR:auth/session.expiry
  it('should reject expired sessions', () => {
    expect(true).toBe(true);
  });
});
`;
    await fs.writeFile(path.join(authTestDir, 'session.test.ts'), testContent);

    // Run full scan workflow
    const specParser = new SpecParser();
    const requirements = await specParser.parseDirectory(featuresDir);

    const scanner = new AnnotationScanner();
    const srcAnnotations = await scanner.scanDirectory(srcDir, {
      exclude: [],
      testDirs: [],
      respectGitignore: false,
    });
    const testAnnotations = await scanner.scanDirectory(testsDir, {
      exclude: [],
      testDirs: [testsDir],
      respectGitignore: false,
    });
    const annotations = [...srcAnnotations, ...testAnnotations];

    const taskParser = new TaskParser();
    const tasks = await taskParser.parseDirectory(featuresDir);

    const analyzer = new CoverageAnalyzer();
    const report = analyzer.analyze(requirements, annotations, tasks);

    // Verify requirements parsed correctly
    expect(requirements).toHaveLength(3);
    expect(requirements.map((r) => r.id.path).sort()).toEqual([
      'oauth',
      'session.expiry',
      'session.validation',
    ]);

    // Verify annotations found
    expect(annotations.length).toBeGreaterThanOrEqual(3);

    // Verify tasks parsed
    expect(tasks).toHaveLength(2);
    expect(tasks[0].taskId).toBe('T001');
    expect(tasks[0].requirements).toHaveLength(2);
    expect(tasks[1].requirements).toHaveLength(0);

    // Verify report accuracy
    expect(report.summary.total).toBe(3);
    expect(report.summary.active).toBe(2);
    expect(report.summary.deferred).toBe(1);
    expect(report.summary.implemented).toBeGreaterThanOrEqual(1);
    expect(report.summary.tested).toBeGreaterThanOrEqual(1);
    expect(report.summary.tasksWithoutRequirements).toBe(1);

    // Verify coverage status
    const expiryReq = report.requirements.get('FR:auth/session.expiry');
    expect(expiryReq).toBeDefined();
    expect(expiryReq!.coverageStatus).toBe('tested');

    const oauthReq = report.requirements.get('FR:auth/oauth');
    expect(oauthReq).toBeDefined();
    expect(oauthReq!.coverageStatus).toBe('deferred');
  });

  // @req FR:req-traceability/report.output
  it('should generate valid JSON and terminal reports', async () => {
    // Minimal setup
    const featureDir = path.join(featuresDir, 'minimal');
    await fs.mkdir(featureDir, { recursive: true });
    await fs.writeFile(
      path.join(featureDir, 'spec.md'),
      '- **FR:test.req**: Test requirement'
    );
    await fs.writeFile(
      path.join(srcDir, 'test.ts'),
      '// @req FR:minimal/test.req\nfunction test() {}'
    );

    const specParser = new SpecParser();
    const scanner = new AnnotationScanner();
    const analyzer = new CoverageAnalyzer();

    const requirements = await specParser.parseDirectory(featuresDir);
    const annotations = await scanner.scanDirectory(srcDir, {
      exclude: [],
      testDirs: [],
      respectGitignore: false,
    });
    const report = analyzer.analyze(requirements, annotations);

    // Generate reports
    const jsonReport = generateJsonReport(report);
    const terminalReport = generateTerminalReport(report);

    // Verify JSON is valid
    const parsed = JSON.parse(jsonReport);
    expect(parsed.metadata).toBeDefined();
    expect(parsed.requirements).toBeDefined();
    expect(parsed.summary).toBeDefined();

    // Verify terminal output is readable
    expect(terminalReport).toContain('Requirement Traceability Report');
    expect(terminalReport.length).toBeGreaterThan(100);
  });

  it('should detect orphaned annotations', async () => {
    // Create source with annotation for non-existent requirement
    await fs.writeFile(
      path.join(srcDir, 'orphan.ts'),
      '// @req FR:nonexistent/orphan.req\nfunction orphan() {}'
    );

    const specParser = new SpecParser();
    const scanner = new AnnotationScanner();
    const analyzer = new CoverageAnalyzer();

    const requirements = await specParser.parseDirectory(featuresDir);
    const annotations = await scanner.scanDirectory(srcDir, {
      exclude: [],
      testDirs: [],
      respectGitignore: false,
    });
    const report = analyzer.analyze(requirements, annotations);

    expect(report.orphaned.length).toBeGreaterThanOrEqual(1);
    expect(report.orphaned.some((o) => o.id.includes('orphan.req'))).toBe(true);
  });

  it('should handle multi-feature scan', async () => {
    // Create multiple features
    const feature1Dir = path.join(featuresDir, 'feature-a');
    const feature2Dir = path.join(featuresDir, 'feature-b');
    await fs.mkdir(feature1Dir, { recursive: true });
    await fs.mkdir(feature2Dir, { recursive: true });

    await fs.writeFile(
      path.join(feature1Dir, 'spec.md'),
      '- **FR:req1**: Feature A requirement'
    );
    await fs.writeFile(
      path.join(feature2Dir, 'spec.md'),
      '- **FR:req2**: Feature B requirement\n- **NFR:perf**: Performance requirement'
    );
    await fs.writeFile(
      path.join(feature1Dir, 'tasks.md'),
      '- [ ] T001: Task for A\n  - @req FR:req1'
    );
    await fs.writeFile(
      path.join(feature2Dir, 'tasks.md'),
      '- [ ] T002: Task for B\n  - @req FR:req2'
    );

    await fs.writeFile(
      path.join(srcDir, 'a.ts'),
      '// @req FR:feature-a/req1\nfunction a() {}'
    );
    await fs.writeFile(
      path.join(srcDir, 'b.ts'),
      '// @req FR:feature-b/req2\nfunction b() {}'
    );

    const specParser = new SpecParser();
    const scanner = new AnnotationScanner();
    const taskParser = new TaskParser();
    const analyzer = new CoverageAnalyzer();

    const requirements = await specParser.parseDirectory(featuresDir);
    const annotations = await scanner.scanDirectory(srcDir, {
      exclude: [],
      testDirs: [],
      respectGitignore: false,
    });
    const tasks = await taskParser.parseDirectory(featuresDir);
    const report = analyzer.analyze(requirements, annotations, tasks);

    expect(requirements).toHaveLength(3);
    expect(tasks).toHaveLength(2);
    expect(report.summary.implemented).toBe(2);
    expect(report.summary.missing).toBe(1); // NFR:perf has no annotation
  });
});
