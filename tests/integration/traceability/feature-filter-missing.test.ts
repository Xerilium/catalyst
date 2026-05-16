/**
 * Integration tests for runTraceabilityAnalysis when featureFilter references a non-existent feature.
 *
 * Regression coverage for the bug where a non-existent featureFilter caused an immediate throw
 * before annotation scanning, hiding stale @req references as orphans in the report.
 *
 * @req FR:req-traceability/analysis.orphan
 * @req FR:req-traceability/analysis.orphan.missing-feature
 * @req FR:req-traceability/analysis.orphan.rename-hint
 * @req FR:req-traceability/scan.feature-filter
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { runTraceabilityAnalysis } from '@traceability/runner.js';

describe('runTraceabilityAnalysis: missing feature directory', () => {
  let tempDir: string;
  let featuresDir: string;
  let srcDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'traceability-missing-feature-'));
    featuresDir = path.join(tempDir, '.xe', 'features');
    srcDir = path.join(tempDir, 'src');
    await fs.mkdir(featuresDir, { recursive: true });
    await fs.mkdir(srcDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // @req FR:req-traceability/analysis.orphan
  it('should surface stale @req annotations as orphans when the feature directory does not exist', async () => {
    // Create a different feature so the features dir is non-empty
    const activeFeatureDir = path.join(featuresDir, 'devops-deployment');
    await fs.mkdir(activeFeatureDir, { recursive: true });
    await fs.writeFile(
      path.join(activeFeatureDir, 'spec.md'),
      '- **FR:init.pwsh**: System MUST support PowerShell init script'
    );

    // Create a source file with annotations referencing the OLD (renamed) feature
    await fs.writeFile(
      path.join(srcDir, 'Init-Repo.ps1'),
      [
        '# @req FR:deployment/env.cicd',
        '# @req FR:deployment/init.pwsh',
        'function Initialize-Repo { }',
      ].join('\n')
    );

    // Run analysis filtering on the OLD feature name (directory does not exist)
    const result = await runTraceabilityAnalysis({
      xeRoot: path.join(tempDir, '.xe'),
      featureFilter: 'deployment',
      codePaths: [srcDir],
      testPaths: [],
      excludePatterns: [],
      respectGitignore: false,
    });

    // Should not throw — should return a report
    expect(result).toBeDefined();
    expect(result.report).toBeDefined();

    // Stale annotations must appear as orphaned (the feature no longer exists)
    expect(result.report.orphaned.length).toBeGreaterThanOrEqual(2);
    const orphanIds = result.report.orphaned.map(o => o.id);
    expect(orphanIds).toContain('FR:deployment/env.cicd');
    expect(orphanIds).toContain('FR:deployment/init.pwsh');

    // Summary message should suggest the rename candidate (matched by FR path fragment)
    // "devops-deployment" has FR:init.pwsh which matches the stale FR:deployment/init.pwsh path
    expect(result.summaryMessage).toMatch(/rename.*devops-deployment|devops-deployment.*rename/i);
  });

  // @req FR:req-traceability/analysis.orphan
  it('should return empty orphans when no annotations reference the missing feature', async () => {
    // Features dir exists but "old-feature" dir does not
    const activeFeatureDir = path.join(featuresDir, 'active-feature');
    await fs.mkdir(activeFeatureDir, { recursive: true });
    await fs.writeFile(
      path.join(activeFeatureDir, 'spec.md'),
      '- **FR:req1**: Active requirement'
    );

    // Source references only active-feature — no stale refs to old-feature
    await fs.writeFile(
      path.join(srcDir, 'code.ts'),
      '// @req FR:active-feature/req1\nfunction doWork() {}'
    );

    const result = await runTraceabilityAnalysis({
      xeRoot: path.join(tempDir, '.xe'),
      featureFilter: 'old-feature',
      codePaths: [srcDir],
      testPaths: [],
      excludePatterns: [],
      respectGitignore: false,
    });

    expect(result).toBeDefined();
    expect(result.report.orphaned).toHaveLength(0);
    expect(result.report.requirements.size).toBe(0);
  });

  // @req FR:req-traceability/scan.feature-filter
  it('should include available feature list in report metadata when feature dir is absent', async () => {
    const featureADir = path.join(featuresDir, 'feature-a');
    const featureBDir = path.join(featuresDir, 'feature-b');
    await fs.mkdir(featureADir, { recursive: true });
    await fs.mkdir(featureBDir, { recursive: true });
    await fs.writeFile(path.join(featureADir, 'spec.md'), '- **FR:req1**: Req');
    await fs.writeFile(path.join(featureBDir, 'spec.md'), '- **FR:req2**: Req');

    const result = await runTraceabilityAnalysis({
      xeRoot: path.join(tempDir, '.xe'),
      featureFilter: 'missing-feature',
      codePaths: [srcDir],
      testPaths: [],
      excludePatterns: [],
      respectGitignore: false,
    });

    // Report should note this feature has no requirements (it doesn't exist)
    expect(result.report.requirements.size).toBe(0);
    // Available features hint should be in the summary message
    expect(result.summaryMessage).toContain('feature-a');
    expect(result.summaryMessage).toContain('feature-b');
  });
});
