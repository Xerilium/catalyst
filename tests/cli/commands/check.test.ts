/**
 * Tests for the `catalyst check` spec lint command.
 *
 * @req FR:cli-engine/check.@cli
 * @req FR:cli-engine/check.input
 * @req FR:cli-engine/check.actor
 * @req FR:cli-engine/check.inline-ref
 * @req FR:cli-engine/check.instructions
 * @req FR:cli-engine/check.placeholder
 * @req FR:cli-engine/check.output
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { checkSpec, checkCommand } from '../../../src/cli/commands/check';

const CLEAN = `---
id: demo
title: Demo
description: Demo feature
dependencies: []
---

# Feature: Demo

### FR:run: Run

Developer needs to run so that work happens.

- **FR:run.execute** (P1): Command MUST run the thing
  - Uses \`FR:example\` in code spans without complaint
    > - @req FR:other/thing
- ~~**FR:run.old**~~: [deprecated: FR:run.execute] Old behavior
`;

const rules = (content: string) => checkSpec(content, 'spec.md').map(i => i.rule);

describe('checkSpec', () => {
  it('passes a clean spec', () => {
    expect(checkSpec(CLEAN, 'spec.md')).toEqual([]);
  });

  it('flags generic System actor', () => {
    const issues = checkSpec(CLEAN.replace('Command MUST', 'System MUST'), 'spec.md');
    expect(issues).toEqual([expect.objectContaining({ rule: 'actor', line: 14 })]);
  });

  it('flags inline FR refs on the FR line and its sub-bullets', () => {
    expect(rules(CLEAN.replace('run the thing', 'run the thing per FR:cli.global'))).toEqual(['inline-ref']);
    expect(rules(CLEAN.replace('Uses `FR:example`', 'Uses FR:example'))).toEqual(['inline-ref']);
  });

  it('flags leftover [INSTRUCTIONS]', () => {
    expect(rules(CLEAN + '\n> [INSTRUCTIONS]\n> Do things\n')).toEqual(['instructions']);
  });

  it('flags unfilled placeholders in body and frontmatter', () => {
    expect(rules(CLEAN.replace('# Feature: Demo', '# Feature: {feature-name}'))).toEqual(['placeholder']);
    expect(rules(CLEAN.replace('title: Demo', 'title: [feature-name]'))).toEqual(['placeholder']);
  });

  it('allows inline YAML arrays in frontmatter', () => {
    expect(rules(CLEAN.replace('dependencies: []', 'dependencies: [context-storage]'))).toEqual([]);
  });

  it('ignores fenced code blocks', () => {
    expect(rules(CLEAN + '\n```\n- **FR:x.y** (P1): System MUST {actor}\n```\n')).toEqual([]);
  });
});

describe('checkCommand', () => {
  let tmpDir: string;
  let exitSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalyst-check-'));
    fs.mkdirSync(path.join(tmpDir, '.xe', 'features', 'good'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.xe', 'features', 'bad'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.xe', 'features', 'good', 'spec.md'), CLEAN);
    fs.writeFileSync(
      path.join(tmpDir, '.xe', 'features', 'bad', 'spec.md'),
      CLEAN.replace('Command MUST', 'System MUST')
    );
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    exitSpy.mockRestore();
    logSpy.mockRestore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 0 for a clean feature', async () => {
    await checkCommand('good');
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('reports file:line [rule] and exits 1 across all specs', async () => {
    await checkCommand(undefined);
    const out = logSpy.mock.calls.map(c => c[0]).join('\n');
    expect(out).toMatch(/bad[\\/]spec\.md:14 .*\[actor\]/);
    expect(out).toMatch(/1 issue in 2 specs/);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('emits JSON when requested', async () => {
    await checkCommand('bad', { json: true });
    const parsed = JSON.parse(logSpy.mock.calls[0][0]);
    expect(parsed.issues[0].rule).toBe('actor');
  });
});
