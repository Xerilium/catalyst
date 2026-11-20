/**
 * Tests for the settings catalog and lookup.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CatalystError } from '../../../../src/core/errors';
import {
  CONFIG_PATH,
  SETTINGS,
  getSetting,
  parseConfig,
  readConfig,
  type SettingKey,
} from '../../../../src/core/config';

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return e instanceof CatalystError ? e.code : 'not-catalyst-error';
  }
  return undefined;
};

describe('repo config file', () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'config-settings-'));
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  const write = (text: string) => {
    fs.mkdirSync(path.join(root, '.xe', 'config'), { recursive: true });
    fs.writeFileSync(path.join(root, CONFIG_PATH), text);
  };

  // @req FR:config-settings/file.@json
  // @req FR:config-settings/file.output
  // @req FR:config-settings/$config
  it('reads .xe/config/catalyst.json at the project root', async () => {
    expect(CONFIG_PATH).toBe('.xe/config/catalyst.json');
    write('{ "check": { "rules": { "spec.actor": "error" } } }');
    expect(await readConfig(root)).toEqual({ check: { rules: { 'spec.actor': 'error' } } });
  });

  // @req FR:config-settings/file.input
  it('names a setting by the dotted path to its value', () => {
    const config = parseConfig('{ "pull-requests": { "merge": { "never": ["a/b"] } } }');
    expect(getSetting('pull-requests.merge.never', config)).toEqual(['a/b']);
  });

  // @req FR:config-settings/file.missing
  it('treats a missing or blank file as no settings', async () => {
    expect(await readConfig(root)).toEqual({});
    write('  \n');
    expect(await readConfig(root)).toEqual({});
    expect(parseConfig(undefined)).toEqual({});
    expect(parseConfig('')).toEqual({});
  });

  // @req FR:config-settings/file.missing
  it('surfaces read errors other than a missing file', async () => {
    fs.mkdirSync(path.join(root, CONFIG_PATH), { recursive: true });
    await expect(readConfig(root)).rejects.toBeDefined();
  });

  // @req FR:config-settings/file.invalid
  it('fails with ConfigInvalid when the text is not a JSON object', async () => {
    expect(codeOf(() => parseConfig('{ nope'))).toBe('ConfigInvalid');
    expect(codeOf(() => parseConfig('[1, 2]'))).toBe('ConfigInvalid');
    expect(codeOf(() => parseConfig('"text"'))).toBe('ConfigInvalid');
    expect(codeOf(() => parseConfig('null'))).toBe('ConfigInvalid');
    write('{ nope');
    await expect(readConfig(root)).rejects.toMatchObject({ code: 'ConfigInvalid' });
  });
});

describe('environment settings', () => {
  // @req FR:config-settings/env.@env
  it('reads CATALYST_* variables from the environment', () => {
    expect(getSetting('CATALYST_ACP_COMMAND', {}, { CATALYST_ACP_COMMAND: 'gemini --experimental-acp' })).toBe(
      'gemini --experimental-acp'
    );
  });

  // @req FR:config-settings/env.@env
  it('reads the process environment by default', () => {
    const before = process.env.CATALYST_CHECKS_TOKEN;
    process.env.CATALYST_CHECKS_TOKEN = 'tok';
    try {
      expect(getSetting('CATALYST_CHECKS_TOKEN')).toBe('tok');
    } finally {
      if (before === undefined) {delete process.env.CATALYST_CHECKS_TOKEN;} else {process.env.CATALYST_CHECKS_TOKEN = before;}
    }
  });

  // @req FR:config-settings/env.boolean
  it('reads 1 or true as true', () => {
    expect(getSetting('CATALYST_DIAGNOSTICS', {}, { CATALYST_DIAGNOSTICS: '1' })).toBe(true);
    expect(getSetting('CATALYST_DIAGNOSTICS', {}, { CATALYST_DIAGNOSTICS: 'true' })).toBe(true);
  });

  // @req FR:config-settings/env.boolean.other
  it('reads any other value as false', () => {
    expect(getSetting('CATALYST_DIAGNOSTICS', {}, { CATALYST_DIAGNOSTICS: 'yes' })).toBe(false);
    expect(getSetting('CATALYST_DIAGNOSTICS', {}, { CATALYST_DIAGNOSTICS: '0' })).toBe(false);
  });

  // @req FR:config-settings/env.empty
  it('treats an empty variable as not set', () => {
    expect(getSetting('CATALYST_ACP_COMMAND', {}, { CATALYST_ACP_COMMAND: '' })).toBe('');
    expect(getSetting('CATALYST_DIAGNOSTICS', {}, { CATALYST_DIAGNOSTICS: '' })).toBe(false);
  });

  // @req FR:config-settings/env.@env
  it('never reads an environment setting from the config file', () => {
    expect(getSetting('CATALYST_ACP_COMMAND', { CATALYST_ACP_COMMAND: 'x' }, {})).toBe('');
  });
});

describe('getSetting', () => {
  // @req FR:config-settings/lookup.@function
  // @req FR:config-settings/lookup.input
  it('defaults to no file settings and the process environment', () => {
    expect(getSetting('check.rules')).toEqual({});
  });

  // @req FR:config-settings/lookup.unknown
  it('fails with InvalidInput for a key not in the catalog', () => {
    expect(codeOf(() => getSetting('no.such.key' as SettingKey, {}))).toBe('InvalidInput');
  });

  // @req FR:config-settings/lookup.value
  // @req FR:config-settings/lookup.output
  it('returns the set value when its type matches', () => {
    const config = parseConfig(
      JSON.stringify({
        labels: { style: 'simple' },
        'pull-requests': { merge: { 'strict-check': true, 'approval-waiver-days': { 'a/*': 3 } } },
        traceability: { paths: { code: ['lib/'] }, gitignore: false },
      })
    );
    expect(getSetting('labels.style', config)).toBe('simple');
    expect(getSetting('pull-requests.merge.strict-check', config)).toBe(true);
    expect(getSetting('pull-requests.merge.approval-waiver-days', config)).toEqual({ 'a/*': 3 });
    expect(getSetting('traceability.paths.code', config)).toEqual(['lib/']);
    expect(getSetting('traceability.gitignore', config)).toBe(false);
  });

  // @req FR:config-settings/lookup.value.strings
  it('keeps only the strings in a string[] value', () => {
    expect(getSetting('pull-requests.merge.never', { 'pull-requests': { merge: { never: [1, 'a/b', null] } } })).toEqual(['a/b']);
  });

  // @req FR:config-settings/lookup.value.copy
  it('returns a new copy of a set object value', () => {
    const config = { labels: { names: { wip: 'WIP' } } };
    const names = getSetting('labels.names', config);
    names.wip = 'changed';
    expect(getSetting('labels.names', config)).toEqual({ wip: 'WIP' });
  });

  // @req FR:config-settings/lookup.default
  it('returns the catalog default when not set', () => {
    expect(getSetting('pull-requests.merge.strict-check', {})).toBe(false);
    expect(getSetting('traceability.gitignore', { traceability: {} })).toBe(true);
    expect(getSetting('traceability.paths.code', { traceability: { paths: null } })).toEqual(['src/']);
  });

  // @req FR:config-settings/lookup.default.mismatch
  it('returns the default when the set value has a different type', () => {
    expect(getSetting('pull-requests.merge.strict-check', { 'pull-requests': { merge: { 'strict-check': 'true' } } })).toBe(false);
    expect(getSetting('pull-requests.merge.never', { 'pull-requests': { merge: { never: 'a/b' } } })).toEqual([]);
    expect(getSetting('check.rules', { check: { rules: ['x'] } })).toEqual({});
    expect(getSetting('labels.style', { labels: { style: 2 } })).toBe('');
  });

  // @req FR:config-settings/lookup.default.copy
  it('returns a new copy of an array or object default', () => {
    const a = getSetting('traceability.paths.code', {});
    a.push('mutated/');
    expect(getSetting('traceability.paths.code', {})).toEqual(['src/']);
    expect(getSetting('check.rules', {})).not.toBe(getSetting('check.rules', {}));
  });
});

describe('settings catalog', () => {
  const entry = (key: SettingKey) => SETTINGS[key];

  // @req FR:config-settings/catalog.schema
  // @req FR:config-settings/$setting
  it('gives every entry a key, source, type, default of that type, and description', () => {
    for (const [key, def] of Object.entries(SETTINGS)) {
      expect(def.key).toBe(key);
      expect(['file', 'env']).toContain(def.source);
      expect(['string', 'boolean', 'string[]', 'object']).toContain(def.type);
      expect(def.description.length).toBeGreaterThan(0);
      const d = def.default as unknown;
      const ok =
        def.type === 'string[]' ? Array.isArray(d) && d.every((v) => typeof v === 'string')
        : def.type === 'object' ? typeof d === 'object' && d !== null && !Array.isArray(d)
        : typeof d === def.type;
      expect(ok).toBe(true);
    }
  });

  // @req FR:config-settings/catalog.complete
  // @req FR:config-settings/catalog.file
  // @req FR:config-settings/catalog.env
  it('lists exactly the supported settings', () => {
    expect(Object.keys(SETTINGS).sort()).toEqual(
      [
        'CATALYST_ACP_COMMAND',
        'CATALYST_CHECKS_TOKEN',
        'CATALYST_DIAGNOSTICS',
        'check.rules',
        'labels.names',
        'labels.style',
        'pull-requests.long-lived-branches',
        'pull-requests.merge.approval-waiver-days',
        'pull-requests.merge.never',
        'pull-requests.merge.strict-check',
        'pull-requests.reconcile.skip-checks',
        'traceability.default',
        'traceability.featureDirs',
        'traceability.features',
        'traceability.gitignore',
        'traceability.paths.code',
        'traceability.paths.exclude',
        'traceability.paths.test',
        'traceability.thresholds',
      ].sort()
    );
    for (const [key, def] of Object.entries(SETTINGS)) {
      expect(def.source).toBe(key.startsWith('CATALYST_') ? 'env' : 'file');
    }
  });

  // @req FR:config-settings/catalog.complete
  it('covers every CATALYST_* variable that source code reads', () => {
    const src = path.join(__dirname, '../../../../src');
    const found = new Set<string>();
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {walk(p);} else if (p.endsWith('.ts')) {
          for (const m of fs.readFileSync(p, 'utf-8').matchAll(/\b(CATALYST_[A-Z_]+)\b/g)) {
            found.add(m[1]);
          }
        }
      }
    };
    walk(src);
    // GitHub-only settings: the PR workflow reads them, so they sit outside the lookup
    const githubOnly = ['CATALYST_TOKEN', 'CATALYST_RUNS_ON'];
    for (const name of found) {
      if (!githubOnly.includes(name)) {expect(Object.keys(SETTINGS)).toContain(name);}
    }
  });

  // @req FR:config-settings/catalog.github
  it('leaves GitHub repository settings to the PR workflow', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '../../../../src/resources/templates/workflows/catalyst-pr.yml'),
      'utf-8'
    );
    expect(workflow).toContain('secrets.CATALYST_TOKEN');
    expect(workflow).toContain(`vars.CATALYST_RUNS_ON || '"ubuntu-latest"'`);
    expect(Object.keys(SETTINGS)).not.toContain('CATALYST_TOKEN');
    expect(Object.keys(SETTINGS)).not.toContain('CATALYST_RUNS_ON');
  });

  const expectEntry = (key: SettingKey, type: string, def: unknown) => {
    expect(entry(key).type).toBe(type);
    expect(entry(key).default).toEqual(def);
    expect(getSetting(key, {}, {})).toEqual(def);
  };

  // @req FR:config-settings/catalog.file.check-rules
  it('catalog.file.check-rules: check.rules', () => expectEntry('check.rules', 'object', {}));

  // @req FR:config-settings/catalog.file.labels-style
  it('catalog.file.labels-style: labels.style', () => expectEntry('labels.style', 'string', ''));

  // @req FR:config-settings/catalog.file.labels-names
  it('catalog.file.labels-names: labels.names', () => expectEntry('labels.names', 'object', {}));

  // @req FR:config-settings/catalog.file.long-lived-branches
  it('catalog.file.long-lived-branches: pull-requests.long-lived-branches', () => expectEntry('pull-requests.long-lived-branches', 'string[]', []));

  // @req FR:config-settings/catalog.file.skip-checks
  it('catalog.file.skip-checks: pull-requests.reconcile.skip-checks', () => expectEntry('pull-requests.reconcile.skip-checks', 'string[]', []));

  // @req FR:config-settings/catalog.file.merge-never
  it('catalog.file.merge-never: pull-requests.merge.never', () => expectEntry('pull-requests.merge.never', 'string[]', []));

  // @req FR:config-settings/catalog.file.merge-waiver-days
  it('catalog.file.merge-waiver-days: pull-requests.merge.approval-waiver-days', () => expectEntry('pull-requests.merge.approval-waiver-days', 'object', {}));

  // @req FR:config-settings/catalog.file.merge-strict-check
  it('catalog.file.merge-strict-check: pull-requests.merge.strict-check', () => expectEntry('pull-requests.merge.strict-check', 'boolean', false));

  // @req FR:config-settings/catalog.file.traceability-default
  it('catalog.file.traceability-default: traceability.default', () => expectEntry('traceability.default', 'object', {}));

  // @req FR:config-settings/catalog.file.traceability-features
  it('catalog.file.traceability-features: traceability.features', () => expectEntry('traceability.features', 'object', {}));

  // @req FR:config-settings/catalog.file.traceability-code
  it('catalog.file.traceability-code: traceability.paths.code', () => expectEntry('traceability.paths.code', 'string[]', ['src/']));

  // @req FR:config-settings/catalog.file.traceability-test
  it('catalog.file.traceability-test: traceability.paths.test', () => expectEntry('traceability.paths.test', 'string[]', ['tests/', '__tests__/', 'test/', '**/*.test.*', '**/*.spec.*']));

  // @req FR:config-settings/catalog.file.traceability-exclude
  it('catalog.file.traceability-exclude: traceability.paths.exclude', () => expectEntry('traceability.paths.exclude', 'string[]', ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**', '**/coverage/**']));

  // @req FR:config-settings/catalog.file.traceability-gitignore
  it('catalog.file.traceability-gitignore: traceability.gitignore', () => expectEntry('traceability.gitignore', 'boolean', true));

  // @req FR:config-settings/catalog.file.traceability-thresholds
  it('catalog.file.traceability-thresholds: traceability.thresholds', () => expectEntry('traceability.thresholds', 'object', {}));

  // @req FR:config-settings/catalog.file.traceability-feature-dirs
  it('catalog.file.traceability-feature-dirs: traceability.featureDirs', () => expectEntry('traceability.featureDirs', 'string[]', ['.xe/features/', '.xe/initiatives/']));

  // @req FR:config-settings/catalog.env.acp-command
  it('catalog.env.acp-command: CATALYST_ACP_COMMAND', () => expectEntry('CATALYST_ACP_COMMAND', 'string', ''));

  // @req FR:config-settings/catalog.env.checks-token
  it('catalog.env.checks-token: CATALYST_CHECKS_TOKEN', () => expectEntry('CATALYST_CHECKS_TOKEN', 'string', ''));

  // @req FR:config-settings/catalog.env.diagnostics
  it('catalog.env.diagnostics: CATALYST_DIAGNOSTICS', () => expectEntry('CATALYST_DIAGNOSTICS', 'boolean', false));
});
