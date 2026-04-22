/**
 * Tests for the `catalyst index` command.
 *
 * @req FR:catalyst-cli/index.execute
 * @req FR:catalyst-cli/index.graceful
 * @req FR:catalyst-cli/index.gitignore
 * @req FR:feature-context/index.location
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

async function runIndexIn(cwd: string): Promise<void> {
  const originalCwd = process.cwd();
  process.chdir(cwd);
  try {
    await indexCommand();
  } finally {
    process.chdir(originalCwd);
  }
}

describe('catalyst index command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalyst-index-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // @req FR:catalyst-cli/index.execute
  // @req FR:feature-context/index.location
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

  // @req FR:catalyst-cli/index.graceful
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

  // @req FR:catalyst-cli/index.gitignore
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
});
