/**
 * Tests for config check rules and config document loading.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadConfig } from '../../../src/check/documents';
import { getRule } from '../../../src/check/registry';
import { runChecks } from '../../../src/check/runner';

const doc = (content: string) => ({ path: '.xe/config/catalyst.json', content });

describe('config rules', () => {
  const autonomy = getRule('config.autonomy')!;

  // @req FR:cli-check/config.autonomy
  it('flags each autonomy config problem', () => {
    const findings = autonomy.check(doc(JSON.stringify({ autonomy: { enabled: 'yes', bogus: 1 } }, null, 2)));
    expect(findings.map((f) => f.text).sort()).toEqual([
      expect.stringMatching(/autonomy\.bogus/),
      expect.stringMatching(/autonomy\.enabled/),
    ]);
    expect(autonomy.check(doc(JSON.stringify({ autonomy: { enabled: true } })))).toEqual([]);
    expect(autonomy.check(doc('{}'))).toEqual([]);
  });

  // @req FR:cli-check/config.autonomy.line
  it('reports the line of the autonomy key', () => {
    const content = '{\n  "labels": {},\n  "autonomy": { "enabled": 1 }\n}\n';
    expect(autonomy.check(doc(content))[0].line).toBe(3);
  });

  // @req FR:cli-check/config.autonomy.json
  it('skips a config file that is not valid JSON', () => {
    expect(autonomy.check(doc('{ nope'))).toEqual([]);
  });
});

describe('loadConfig', () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-config-'));
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  // @req FR:cli-check/config.input
  it('loads the config when it exists, and only without a feature filter', async () => {
    expect(loadConfig(root)).toEqual([]);
    fs.mkdirSync(path.join(root, '.xe', 'config'), { recursive: true });
    fs.writeFileSync(path.join(root, '.xe', 'config', 'catalyst.json'), JSON.stringify({ autonomy: { enabled: 2 } }));
    expect(loadConfig(root)).toEqual([{ path: '.xe/config/catalyst.json', content: expect.any(String) }]);
    const all = await runChecks({ root, patterns: ['config.*'] });
    expect(all.findings.map((f) => f.rule)).toEqual(['config.autonomy']);
    const scoped = await runChecks({ root, feature: 'x', patterns: ['config.*'] });
    expect(scoped.findings).toEqual([]);
  });
});
