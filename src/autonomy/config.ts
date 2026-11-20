/**
 * Read and validate the `autonomy` key of `.xe/config/catalyst.json`.
 * Fails closed: anything but a valid config with `enabled: true` is off.
 * @req FR:autonomy/config.@json
 * @req FR:autonomy/config.input
 * @req FR:autonomy/config.repo-only
 */

import type { AutonomyConfig, Budget } from './types';

/** @req FR:autonomy/escalate.sensitive-paths */
export const DEFAULT_SENSITIVE_PATHS = [
  // @req FR:autonomy/escalate.sensitive-paths.config
  '.xe/config/**',
  '.github/workflows/**',
  '**/CODEOWNERS',
  '**/.env*',
  '**/*.pem',
  '**/*.key',
  '**/*secret*',
  '**/*credential*',
  '**/auth/**',
  '**/security/**',
];

/** @req FR:autonomy/escalate.contract-paths */
export const DEFAULT_CONTRACT_PATHS = [
  '.xe/features/blueprint.md',
  '.xe/product.md',
  '.xe/architecture.md',
  '.xe/engineering.md',
];

export const DEFAULT_BUDGET: Budget = { loopRounds: 5, minutes: 120, tokens: 2_000_000, prsPerDay: 10 };

export const DEFAULT_ESCALATE = { maxChangedLines: 600, maxChangedFiles: 30, maxLoopFailures: 2 };

type IntSpec = { key: string; field: string; min: number; max: number };

const BUDGET_KEYS: IntSpec[] = [
  { key: 'loop-rounds', field: 'loopRounds', min: 1, max: 20 },
  { key: 'minutes', field: 'minutes', min: 1, max: 1440 },
  { key: 'tokens', field: 'tokens', min: 1, max: 100_000_000 },
  { key: 'prs-per-day', field: 'prsPerDay', min: 1, max: 1000 },
];

const ESCALATE_INTS: IntSpec[] = [
  { key: 'max-changed-lines', field: 'maxChangedLines', min: 1, max: 100_000 },
  { key: 'max-changed-files', field: 'maxChangedFiles', min: 1, max: 10_000 },
  { key: 'max-loop-failures', field: 'maxLoopFailures', min: 1, max: 20 },
];

const ESCALATE_LISTS = ['paths', 'contract-paths'];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function checkInts(obj: Record<string, unknown>, specs: IntSpec[], at: string, problems: string[]): void {
  for (const { key, min, max } of specs) {
    if (!(key in obj)) {continue;}
    const v = obj[key];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
      problems.push(`${at}.${key}: must be a whole number from ${min} to ${max}`);
    }
  }
}

function checkKeys(obj: Record<string, unknown>, allowed: string[], at: string, problems: string[]): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {problems.push(`${at}.${key}: unknown key`);}
  }
}

/**
 * Problems in an `autonomy` value, each prefixed with its JSON path; empty when valid.
 * @req FR:autonomy/config.invalid.problems
 * @req FR:autonomy/config.invalid.unknown
 * @req FR:autonomy/config.invalid.range
 */
export function validateAutonomy(raw: unknown): string[] {
  const problems: string[] = [];
  if (!isObject(raw)) {
    return ['autonomy: must be an object'];
  }
  checkKeys(raw, ['enabled', 'budget', 'escalate'], 'autonomy', problems);
  if ('enabled' in raw && typeof raw.enabled !== 'boolean') {
    problems.push('autonomy.enabled: must be true or false');
  }
  if ('budget' in raw) {
    if (!isObject(raw.budget)) {
      problems.push('autonomy.budget: must be an object');
    } else {
      checkKeys(raw.budget, BUDGET_KEYS.map((s) => s.key), 'autonomy.budget', problems);
      checkInts(raw.budget, BUDGET_KEYS, 'autonomy.budget', problems);
    }
  }
  if ('escalate' in raw) {
    if (!isObject(raw.escalate)) {
      problems.push('autonomy.escalate: must be an object');
    } else {
      const esc = raw.escalate;
      checkKeys(esc, [...ESCALATE_LISTS, ...ESCALATE_INTS.map((s) => s.key)], 'autonomy.escalate', problems);
      for (const key of ESCALATE_LISTS) {
        if (key in esc && !(Array.isArray(esc[key]) && (esc[key] as unknown[]).every((p) => typeof p === 'string' && p))) {
          problems.push(`autonomy.escalate.${key}: must be a list of path globs`);
        }
      }
      checkInts(esc, ESCALATE_INTS, 'autonomy.escalate', problems);
    }
  }
  return problems;
}

const disabled = (): AutonomyConfig => ({
  enabled: false,
  budget: { ...DEFAULT_BUDGET },
  escalate: {
    paths: [...DEFAULT_SENSITIVE_PATHS],
    contractPaths: [...DEFAULT_CONTRACT_PATHS],
    ...DEFAULT_ESCALATE,
  },
});

/**
 * Resolve the config from the text of `.xe/config/catalyst.json`.
 * @req FR:autonomy/config.default
 * @req FR:autonomy/config.explicit
 * @req FR:autonomy/config.defaults
 * @req FR:autonomy/config.extend
 * @req FR:autonomy/config.invalid
 */
export function readAutonomyConfig(text: string | undefined): { config: AutonomyConfig; problems: string[] } {
  const config = disabled();
  if (!text?.trim()) {return { config, problems: [] };}
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { config, problems: [`catalyst.json: not valid JSON (${(e as Error).message})`] };
  }
  if (!isObject(json) || !('autonomy' in json)) {return { config, problems: [] };}
  const raw = json.autonomy;
  const problems = validateAutonomy(raw);
  if (problems.length > 0 || !isObject(raw)) {return { config, problems };}

  const budget = isObject(raw.budget) ? raw.budget : {};
  for (const { key, field } of BUDGET_KEYS) {
    if (key in budget) {(config.budget as unknown as Record<string, number>)[field] = budget[key] as number;}
  }
  const esc = isObject(raw.escalate) ? raw.escalate : {};
  for (const { key, field } of ESCALATE_INTS) {
    if (key in esc) {(config.escalate as unknown as Record<string, number>)[field] = esc[key] as number;}
  }
  config.escalate.paths.push(...((esc.paths as string[] | undefined) ?? []));
  config.escalate.contractPaths.push(...((esc['contract-paths'] as string[] | undefined) ?? []));
  config.enabled = raw.enabled === true;
  return { config, problems };
}
