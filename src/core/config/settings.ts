/**
 * Settings catalog and lookup: every setting Catalyst reads from
 * `.xe/config/catalyst.json` or a `CATALYST_*` environment variable.
 * @module core/config/settings
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { CatalystError } from '../errors';

/** Repo config file, relative to the project root */
// @req FR:config-settings/file.@json
export const CONFIG_PATH = '.xe/config/catalyst.json';

/** Parsed `.xe/config/catalyst.json` */
// @req FR:config-settings/$config
export type CatalystConfig = Record<string, unknown>;

type TypeName = 'string' | 'boolean' | 'number' | 'string[]' | 'object';

/** One catalog entry */
// @req FR:config-settings/$setting
// @req FR:config-settings/catalog.schema
export interface SettingDefinition<T> {
  key: string;
  source: 'file' | 'env';
  type: TypeName;
  default: T;
  description: string;
}

/** The value type of each setting */
export interface SettingTypes {
  'check.rules': Record<string, string>;
  'labels.style': string;
  'labels.names': Record<string, string>;
  'pull-requests.long-lived-branches': string[];
  'pull-requests.reconcile.skip-checks': string[];
  'pull-requests.merge.never': string[];
  'pull-requests.merge.approval-waiver-days': Record<string, unknown>;
  'pull-requests.merge.strict-check': boolean;
  'traceability.default': Record<string, unknown>;
  'traceability.features': Record<string, unknown>;
  'traceability.paths.code': string[];
  'traceability.paths.test': string[];
  'traceability.paths.exclude': string[];
  'traceability.gitignore': boolean;
  'traceability.thresholds': Record<string, unknown>;
  'traceability.featureDirs': string[];
  CATALYST_ACP_COMMAND: string;
  CATALYST_CHECKS_TOKEN: string;
  CATALYST_DIAGNOSTICS: boolean;
}

export type SettingKey = keyof SettingTypes;

const file = <K extends SettingKey>(key: K, type: TypeName, def: SettingTypes[K], description: string) =>
  ({ key, source: 'file', type, default: def, description }) as SettingDefinition<SettingTypes[K]>;
const env = <K extends SettingKey>(key: K, type: TypeName, def: SettingTypes[K], description: string) =>
  ({ key, source: 'env', type, default: def, description }) as SettingDefinition<SettingTypes[K]>;

/**
 * The catalog: the only code definition of setting keys, types, and defaults.
 * @req FR:config-settings/catalog.complete
 * @req FR:config-settings/catalog.file
 * @req FR:config-settings/catalog.env
 */
export const SETTINGS: { [K in SettingKey]: SettingDefinition<SettingTypes[K]> } = {
  // @req FR:config-settings/catalog.file.check-rules
  'check.rules': file('check.rules', 'object', {}, 'Rule ID or {namespace}.* to error, warning, or disable'),
  // @req FR:config-settings/catalog.file.labels-style
  'labels.style': file('labels.style', 'string', '', 'Label naming style: key-value, simple, or custom; empty uses the standard names'),
  // @req FR:config-settings/catalog.file.labels-names
  'labels.names': file('labels.names', 'object', {}, "Label ID to the repository's label name"),
  // @req FR:config-settings/catalog.file.long-lived-branches
  'pull-requests.long-lived-branches': file('pull-requests.long-lived-branches', 'string[]', [], 'Branches never deleted or retargeted; read from the base branch'),
  // @req FR:config-settings/catalog.file.skip-checks
  'pull-requests.reconcile.skip-checks': file('pull-requests.reconcile.skip-checks', 'string[]', [], 'Check names reconcile ignores; read from the base branch'),
  // @req FR:config-settings/catalog.file.merge-never
  'pull-requests.merge.never': file('pull-requests.merge.never', 'string[]', [], 'owner/repo patterns Autopilot never merges; read from the base branch'),
  // @req FR:config-settings/catalog.file.merge-waiver-days
  'pull-requests.merge.approval-waiver-days': file('pull-requests.merge.approval-waiver-days', 'object', {}, 'owner/repo pattern to days of inactivity that waive code-owner sign-off; read from the base branch'),
  // @req FR:config-settings/catalog.file.merge-strict-check
  'pull-requests.merge.strict-check': file('pull-requests.merge.strict-check', 'boolean', false, 'Fail the Catalyst check gate on a warning; read from the base branch'),
  // @req FR:config-settings/catalog.file.traceability-default
  'traceability.default': file('traceability.default', 'object', {}, 'Project code and test traceability modes'),
  // @req FR:config-settings/catalog.file.traceability-features
  'traceability.features': file('traceability.features', 'object', {}, 'Feature ID or * pattern to code and test traceability modes'),
  // @req FR:config-settings/catalog.file.traceability-code
  'traceability.paths.code': file('traceability.paths.code', 'string[]', ['src/'], 'Source paths to scan'),
  // @req FR:config-settings/catalog.file.traceability-test
  'traceability.paths.test': file('traceability.paths.test', 'string[]', ['tests/', '__tests__/', 'test/', '**/*.test.*', '**/*.spec.*'], 'Test paths to scan'),
  // @req FR:config-settings/catalog.file.traceability-exclude
  'traceability.paths.exclude': file('traceability.paths.exclude', 'string[]', ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**', '**/coverage/**'], 'Paths to skip'),
  // @req FR:config-settings/catalog.file.traceability-gitignore
  'traceability.gitignore': file('traceability.gitignore', 'boolean', true, 'Skip paths that .gitignore ignores'),
  // @req FR:config-settings/catalog.file.traceability-thresholds
  'traceability.thresholds': file('traceability.thresholds', 'object', {}, 'Minimum implementation and test coverage, 0-100'),
  // @req FR:config-settings/catalog.file.traceability-feature-dirs
  'traceability.featureDirs': file('traceability.featureDirs', 'string[]', ['.xe/features/', '.xe/initiatives/'], 'Folders that hold feature specs'),
  // @req FR:config-settings/catalog.env.acp-command
  CATALYST_ACP_COMMAND: env('CATALYST_ACP_COMMAND', 'string', '', 'Command that starts an ACP agent'),
  // @req FR:config-settings/catalog.env.checks-token
  CATALYST_CHECKS_TOKEN: env('CATALYST_CHECKS_TOKEN', 'string', '', 'GitHub token for check runs'),
  // @req FR:config-settings/catalog.env.diagnostics
  CATALYST_DIAGNOSTICS: env('CATALYST_DIAGNOSTICS', 'boolean', false, 'Show framework logs'),
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const invalid = (detail: string) =>
  new CatalystError(
    `${CONFIG_PATH} is not a JSON object: ${detail}`,
    'ConfigInvalid',
    `Fix ${CONFIG_PATH} so it holds one JSON object`
  );

/**
 * Parse config text. Missing or blank text is an empty config.
 * @req FR:config-settings/file.input
 * @req FR:config-settings/file.missing
 * @req FR:config-settings/file.invalid
 * @req FR:config-settings/file.output
 */
export function parseConfig(text: string | undefined): CatalystConfig {
  if (!text?.trim()) {return {};}
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw invalid((e as Error).message);
  }
  if (!isObject(json)) {throw invalid(`found ${Array.isArray(json) ? 'an array' : String(json === null ? 'null' : typeof json)}`);}
  return json;
}

/**
 * Read and parse `.xe/config/catalyst.json` from the working tree.
 * @req FR:config-settings/file.@json
 * @req FR:config-settings/file.missing
 */
export async function readConfig(projectRoot: string): Promise<CatalystConfig> {
  let text: string;
  try {
    text = await fs.readFile(path.join(projectRoot, CONFIG_PATH), 'utf-8');
  } catch {
    return {};
  }
  return parseConfig(text);
}

const matches = (value: unknown, type: TypeName): boolean => {
  switch (type) {
    case 'string[]':
      return Array.isArray(value);
    case 'object':
      return isObject(value);
    default:
      return typeof value === type;
  }
};

const clone = <T>(value: T): T => (typeof value === 'object' && value !== null ? structuredClone(value) : value);

/** The raw value at a dotted path, or undefined */
const at = (config: CatalystConfig, key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => (isObject(node) ? node[part] : undefined), config);

/**
 * Look up a setting: the set value when its type matches, else the catalog default.
 * File settings come from `config`; environment settings come from `env`.
 * @req FR:config-settings/lookup.@function
 * @req FR:config-settings/lookup.input
 * @req FR:config-settings/lookup.output
 */
export function getSetting<K extends SettingKey>(
  key: K,
  config: CatalystConfig = {},
  env: NodeJS.ProcessEnv = process.env
): SettingTypes[K] {
  // @req FR:config-settings/lookup.unknown
  if (!Object.prototype.hasOwnProperty.call(SETTINGS, key)) {
    throw new CatalystError(
      `Unknown Catalyst setting "${String(key)}"`,
      'InvalidInput',
      'Use a key from the settings catalog in src/core/config/settings.ts'
    );
  }
  const def = SETTINGS[key] as SettingDefinition<SettingTypes[K]>;
  let value: unknown;
  if (def.source === 'env') {
    // @req FR:config-settings/env.@env
    // @req FR:config-settings/env.empty
    const raw = env[key];
    // @req FR:config-settings/env.boolean
    // @req FR:config-settings/env.boolean.other
    value = raw ? (def.type === 'boolean' ? raw === '1' || raw === 'true' : raw) : undefined;
  } else {
    value = at(config, key);
  }
  // @req FR:config-settings/lookup.value
  if (value !== undefined && matches(value, def.type)) {
    // @req FR:config-settings/lookup.value.strings
    return (def.type === 'string[]' ? (value as unknown[]).filter((v) => typeof v === 'string') : value) as SettingTypes[K];
  }
  // @req FR:config-settings/lookup.default
  // @req FR:config-settings/lookup.default.mismatch
  // @req FR:config-settings/lookup.default.copy
  return clone(def.default);
}
