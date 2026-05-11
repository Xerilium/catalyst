/**
 * Tests for the `catalyst index` command.
 *
 * @req FR:cli-engine/index.execute
 * @req FR:cli-engine/index.graceful
 * @req FR:cli-engine/index.gitignore
 * @req FR:cli-engine/index.summary
 * @req FR:cli-engine/index.quiet
 * @req FR:feature-context/index.@file
 * @req FR:feature-context/index.generated
 * @req FR:feature-context/index.content
 * @req FR:feature-context/index.generated-marker
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { indexCommand } from '../../../src/cli/commands/index';

function makeFeature(
  root: string,
  id: string,
  frontmatter: Record<string, string>
): void {
  const featureDir = path.join(root, '.xe', 'features', id);
  fs.mkdirSync(featureDir, { recursive: true });
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  fs.writeFileSync(
    path.join(featureDir, 'spec.md'),
    `---\n${fm}\n---\n\n## Purpose\n\nExample.\n`
  );
}

async function runIndexIn(
  cwd: string,
  options: { quiet?: boolean } = {}
): Promise<{ stdout: string }> {
  const originalCwd = process.cwd();
  const originalLog = console.log;
  const captured: string[] = [];
  console.log = (...args: unknown[]) => {
    captured.push(args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
  };
  process.chdir(cwd);
  try {
    await indexCommand(options);
  } finally {
    process.chdir(originalCwd);
    console.log = originalLog;
  }
  return { stdout: captured.join('\n') };
}

describe('catalyst index command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalyst-index-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // @req FR:cli-engine/index.execute
  // @req FR:feature-context/index.@file
  it('writes the index to .xe/features/README.md', async () => {
    makeFeature(tmpDir, 'alpha', { id: 'alpha', title: 'Alpha', description: 'First' });
    await runIndexIn(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, '.xe/features/README.md'))).toBe(true);
  });

  // @req FR:feature-context/index.generated
  it('is idempotent — running twice produces no diff', async () => {
    makeFeature(tmpDir, 'alpha', { id: 'alpha', title: 'Alpha', description: 'First' });
    makeFeature(tmpDir, 'beta', { id: 'beta', title: 'Beta', description: 'Second' });

    await runIndexIn(tmpDir);
    const first = fs.readFileSync(path.join(tmpDir, '.xe/features/README.md'), 'utf-8');
    await runIndexIn(tmpDir);
    const second = fs.readFileSync(path.join(tmpDir, '.xe/features/README.md'), 'utf-8');

    expect(second).toBe(first);
  });

  // @req FR:feature-context/index.content
  it('includes id, title, and description ordered alphabetically by id', async () => {
    makeFeature(tmpDir, 'zeta', { id: 'zeta', title: 'Zeta', description: 'Last' });
    makeFeature(tmpDir, 'alpha', { id: 'alpha', title: 'Alpha', description: 'First' });
    makeFeature(tmpDir, 'mid', { id: 'mid', title: 'Mid', description: 'Middle' });

    await runIndexIn(tmpDir);
    const output = fs.readFileSync(path.join(tmpDir, '.xe/features/README.md'), 'utf-8');

    const alphaIdx = output.indexOf('alpha');
    const midIdx = output.indexOf('mid');
    const zetaIdx = output.indexOf('zeta');

    expect(alphaIdx).toBeGreaterThan(-1);
    expect(midIdx).toBeGreaterThan(alphaIdx);
    expect(zetaIdx).toBeGreaterThan(midIdx);

    expect(output).toContain('Alpha');
    expect(output).toContain('First');
  });

  // @req FR:feature-context/index.generated-marker
  it('includes an auto-generated marker at the top of the file', async () => {
    makeFeature(tmpDir, 'alpha', { id: 'alpha', title: 'Alpha', description: 'First' });
    await runIndexIn(tmpDir);
    const output = fs.readFileSync(path.join(tmpDir, '.xe/features/README.md'), 'utf-8');
    const head = output.slice(0, 300);
    expect(head).toMatch(/AUTO-GENERATED/i);
  });

  // @req FR:cli-engine/index.graceful
  describe('graceful degradation on missing description', () => {
    it('does not throw when a spec is missing description', async () => {
      makeFeature(tmpDir, 'complete', { id: 'complete', title: 'Complete', description: 'Has it' });
      makeFeature(tmpDir, 'incomplete', { id: 'incomplete', title: 'Incomplete' });

      await expect(runIndexIn(tmpDir)).resolves.not.toThrow();
    });

    it('renders the placeholder for features lacking description', async () => {
      makeFeature(tmpDir, 'incomplete', { id: 'incomplete', title: 'Incomplete' });
      await runIndexIn(tmpDir);
      const output = fs.readFileSync(path.join(tmpDir, '.xe/features/README.md'), 'utf-8');
      expect(output).toMatch(/⚠️/);
    });
  });

  // @req FR:cli-engine/index.gitignore
  describe('.xe/features/.gitignore management', () => {
    const readGitignore = (root: string): string =>
      fs.readFileSync(path.join(root, '.xe/features/.gitignore'), 'utf-8');

    it('creates .gitignore with README.md AND .gitignore entries when missing', async () => {
      makeFeature(tmpDir, 'alpha', { id: 'alpha', title: 'Alpha', description: 'First' });
      expect(fs.existsSync(path.join(tmpDir, '.xe/features/.gitignore'))).toBe(false);

      await runIndexIn(tmpDir);

      expect(fs.existsSync(path.join(tmpDir, '.xe/features/.gitignore'))).toBe(true);
      const contents = readGitignore(tmpDir);
      expect(contents).toMatch(/^README\.md$/m);
      // When we create the gitignore, it should self-ignore (it's a generated artifact too)
      expect(contents).toMatch(/^\.gitignore$/m);
    });

    it('appends README.md to existing .gitignore without self-adding .gitignore', async () => {
      makeFeature(tmpDir, 'alpha', { id: 'alpha', title: 'Alpha', description: 'First' });
      const gitignorePath = path.join(tmpDir, '.xe/features/.gitignore');
      fs.writeFileSync(gitignorePath, '*.tmp\n');

      await runIndexIn(tmpDir);

      const contents = readGitignore(tmpDir);
      expect(contents).toMatch(/^\*\.tmp$/m);
      expect(contents).toMatch(/^README\.md$/m);
      // Must NOT self-add .gitignore to an existing file (user may have their own rules to commit)
      expect(contents).not.toMatch(/^\.gitignore$/m);
    });

    it('is a no-op when .gitignore already contains README.md', async () => {
      makeFeature(tmpDir, 'alpha', { id: 'alpha', title: 'Alpha', description: 'First' });
      const gitignorePath = path.join(tmpDir, '.xe/features/.gitignore');
      fs.writeFileSync(gitignorePath, 'README.md\n*.tmp\n');
      const before = fs.readFileSync(gitignorePath, 'utf-8');

      await runIndexIn(tmpDir);
      const after = fs.readFileSync(gitignorePath, 'utf-8');

      expect(after).toBe(before);
    });
  });

  // @req FR:cli-engine/index.summary
  describe('summary output', () => {
    it('prints a summary block with path and features count on first generation', async () => {
      makeFeature(tmpDir, 'alpha', { id: 'alpha', title: 'Alpha', description: 'First' });
      makeFeature(tmpDir, 'beta', { id: 'beta', title: 'Beta', description: 'Second' });

      const { stdout } = await runIndexIn(tmpDir);

      expect(stdout).toMatch(/Generated/);
      expect(stdout).toMatch(/README\.md/);
      expect(stdout).toMatch(/2 features/);
    });

    it('distinguishes "Generated" from "Up to date" on idempotent re-run', async () => {
      makeFeature(tmpDir, 'alpha', { id: 'alpha', title: 'Alpha', description: 'First' });

      const first = await runIndexIn(tmpDir);
      const second = await runIndexIn(tmpDir);

      expect(first.stdout).toMatch(/Generated/);
      expect(second.stdout).toMatch(/Up to date/);
    });

    it('reports warnings count when features are missing description', async () => {
      makeFeature(tmpDir, 'complete', { id: 'complete', title: 'Complete', description: 'Has it' });
      makeFeature(tmpDir, 'incomplete', { id: 'incomplete', title: 'Incomplete' });

      const { stdout } = await runIndexIn(tmpDir);

      expect(stdout).toMatch(/1 missing description/);
    });

    it('does not report warnings count when all features have description', async () => {
      makeFeature(tmpDir, 'alpha', { id: 'alpha', title: 'Alpha', description: 'First' });

      const { stdout } = await runIndexIn(tmpDir);

      expect(stdout).not.toMatch(/missing description/);
    });

    it('singularizes "1 feature" and "1 missing description"', async () => {
      makeFeature(tmpDir, 'alpha', { id: 'alpha', title: 'Alpha' }); // missing description

      const { stdout } = await runIndexIn(tmpDir);

      expect(stdout).toMatch(/1 feature\b/);
      expect(stdout).toMatch(/1 missing description\b/);
      expect(stdout).not.toMatch(/1 features/);
      expect(stdout).not.toMatch(/1 missing descriptions/);
    });

    it('includes elapsed time in seconds', async () => {
      makeFeature(tmpDir, 'alpha', { id: 'alpha', title: 'Alpha', description: 'First' });

      const { stdout } = await runIndexIn(tmpDir);

      expect(stdout).toMatch(/\d+\.\d{2}s/);
    });
  });

  // @req FR:cli-engine/index.quiet
  describe('--quiet flag', () => {
    it('suppresses the summary line when quiet is set', async () => {
      makeFeature(tmpDir, 'alpha', { id: 'alpha', title: 'Alpha', description: 'First' });

      const { stdout } = await runIndexIn(tmpDir, { quiet: true });

      expect(stdout).not.toMatch(/catalyst index:/);
      expect(stdout).toBe('');
    });

    it('still generates the README when quiet', async () => {
      makeFeature(tmpDir, 'alpha', { id: 'alpha', title: 'Alpha', description: 'First' });

      await runIndexIn(tmpDir, { quiet: true });

      const readmePath = path.join(tmpDir, '.xe/features/README.md');
      expect(fs.existsSync(readmePath)).toBe(true);
      expect(fs.readFileSync(readmePath, 'utf-8')).toMatch(/Alpha/);
    });

    it('still manages .gitignore when quiet', async () => {
      makeFeature(tmpDir, 'alpha', { id: 'alpha', title: 'Alpha', description: 'First' });

      await runIndexIn(tmpDir, { quiet: true });

      const gitignorePath = path.join(tmpDir, '.xe/features/.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);
      expect(fs.readFileSync(gitignorePath, 'utf-8')).toMatch(/^README\.md$/m);
    });
  });
});
