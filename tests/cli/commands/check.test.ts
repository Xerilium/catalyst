/**
 * Tests for the `catalyst check` command.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { checkCommand } from '../../../src/cli/commands/check';

const BAD_SPEC = [
  '---',
  'id: bad',
  'description: Short.',
  '---',
  '## Purpose',
  'x',
  '## Scenarios',
  '### FR:bad: Thing',
  '',
  'Developer needs to do a thing so that value follows.',
  '',
  '- **FR:bad.a** (P2): System MUST do a',
  '## Data Model',
  'None.',
  '## Architecture Constraints',
  'None.',
  '## External Dependencies',
  'None.',
].join('\n');

const GOOD_SPEC = BAD_SPEC.replace('System MUST', 'Command MUST').replace('id: bad', 'id: good');

describe('checkCommand', () => {
  let root: string;
  let cwd: string;
  let out: string[];
  let exit: jest.SpyInstance;

  const makeFeature = (id: string, content: string) => {
    const dir = path.join(root, '.xe', 'features', ...id.split('/'));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'spec.md'), content);
  };
  const writeConfig = (json: unknown) => {
    fs.mkdirSync(path.join(root, '.xe', 'config'), { recursive: true });
    fs.writeFileSync(path.join(root, '.xe', 'config', 'catalyst.json'), JSON.stringify(json));
  };
  const hasActor = () => out.some((l) => l.includes('spec.actor'));

  beforeEach(() => {
    cwd = process.cwd();
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'check-cmd-')));
    process.chdir(root);
    out = [];
    jest.spyOn(console, 'log').mockImplementation((...a) => void out.push(a.join(' ')));
    exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    makeFeature('bad', BAD_SPEC);
    makeFeature('nested/good', GOOD_SPEC);
  });
  afterEach(() => {
    process.chdir(cwd);
    jest.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  // @req FR:cli-check/check.execute
  // @req FR:cli-check/check.output
  it('prints one line per finding with file, line, severity, rule, text, then a summary', async () => {
    await checkCommand(undefined, {});
    const finding = out.find((l) => l.includes('spec.actor'));
    expect(finding).toMatch(/\.xe\/features\/bad\/spec\.md:12/);
    expect(finding).toContain('warning');
    expect(finding).toContain('System MUST do a');
    expect(out[out.length - 1]).toMatch(/1 warning/);
    expect(out.some((l) => l.includes('nested/good'))).toBe(false);
  });

  // @req FR:cli-check/check.exit
  it('exits 0 when every finding is a warning', async () => {
    await checkCommand(undefined, {});
    expect(exit).not.toHaveBeenCalled();
  });

  // @req FR:cli-check/check.exit
  // @req FR:cli-check/severity.input
  it('exits 1 when a finding has severity error', async () => {
    writeConfig({ check: { rules: { 'spec.actor': 'error' } } });
    await checkCommand(undefined, {});
    expect(exit).toHaveBeenCalledWith(1);
    expect(out.find((l) => l.includes('spec.actor'))).toContain('error');
  });

  // @req FR:cli-check/severity.disable
  it('skips a disabled rule', async () => {
    writeConfig({ check: { rules: { 'spec.actor': 'disable' } } });
    await checkCommand(undefined, {});
    expect(hasActor()).toBe(false);
  });

  // @req FR:cli-check/check.rules
  it('runs only the rules selected by --rules', async () => {
    await checkCommand(undefined, { rules: 'spec.refs,spec.opener' });
    expect(hasActor()).toBe(false);
    await checkCommand(undefined, { rules: 'spec.*' });
    expect(hasActor()).toBe(true);
  });

  // @req FR:cli-check/check.input
  it('limits documents to the feature filter (id, path, wildcard)', async () => {
    await checkCommand('nested/good', {});
    expect(hasActor()).toBe(false);
    out.length = 0;
    await checkCommand('.xe/features/bad/spec.md', {});
    expect(hasActor()).toBe(true);
    out.length = 0;
    await checkCommand('ba*', {});
    expect(hasActor()).toBe(true);
  });

  // @req FR:cli-check/check.quiet
  it('prints only error findings under --quiet', async () => {
    await checkCommand(undefined, { quiet: true });
    expect(out).toEqual([]);
    writeConfig({ check: { rules: { 'spec.actor': 'error' } } });
    await checkCommand(undefined, { quiet: true });
    expect(out.filter((l) => l.includes('spec.actor'))).toHaveLength(1);
  });

  // @req FR:cli-check/check.json
  // @req FR:cli-check/registry.output
  // @req FR:cli-check/$finding
  it('prints findings and a summary as JSON under --json', async () => {
    await checkCommand(undefined, { json: true });
    const parsed = JSON.parse(out.join('\n'));
    expect(parsed.summary).toEqual({ errors: 0, warnings: 1 });
    expect(parsed.findings[0]).toMatchObject({
      file: '.xe/features/bad/spec.md',
      line: 12,
      rule: 'spec.actor',
      severity: 'warning',
    });
  });

  // @req FR:cli-check/severity.invalid
  it('fails on an invalid severity in config', async () => {
    writeConfig({ check: { rules: { 'spec.actor': 'fatal' } } });
    await expect(checkCommand(undefined, {})).rejects.toMatchObject({ code: 'InvalidInput' });
  });
});
