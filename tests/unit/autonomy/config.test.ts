/**
 * Tests for the autonomy config reader and validator.
 */

import {
  DEFAULT_BUDGET,
  DEFAULT_CONTRACT_PATHS,
  DEFAULT_ESCALATE,
  DEFAULT_SENSITIVE_PATHS,
  readAutonomyConfig,
  validateAutonomy,
} from '../../../src/autonomy/config';

const text = (autonomy: unknown): string => JSON.stringify({ labels: { style: 'key-value' }, autonomy });

describe('readAutonomyConfig', () => {
  // @req FR:autonomy/config.@json
  // @req FR:autonomy/config.input
  it('reads the autonomy key from the catalyst.json text', () => {
    const { config } = readAutonomyConfig(text({ enabled: true }));
    expect(config.enabled).toBe(true);
  });

  // @req FR:autonomy/config.default
  it('is off when the file or the key is missing', () => {
    expect(readAutonomyConfig(undefined).config.enabled).toBe(false);
    expect(readAutonomyConfig('').config.enabled).toBe(false);
    expect(readAutonomyConfig('{}').config.enabled).toBe(false);
    expect(readAutonomyConfig('{}').problems).toEqual([]);
  });

  // @req FR:autonomy/config.explicit
  it('is off unless enabled is JSON true', () => {
    for (const enabled of ['true', 1, 'yes', null]) {
      expect(readAutonomyConfig(text({ enabled })).config.enabled).toBe(false);
    }
    expect(readAutonomyConfig(text({})).config.enabled).toBe(false);
  });

  // @req FR:autonomy/config.repo-only
  it('ignores environment variables', () => {
    process.env.CATALYST_AUTONOMY = 'true';
    try {
      expect(readAutonomyConfig('{}').config.enabled).toBe(false);
    } finally {
      delete process.env.CATALYST_AUTONOMY;
    }
  });

  // @req FR:autonomy/config.defaults
  // @req FR:autonomy/$autonomy-config
  it('fills missing budget and escalation settings from defaults', () => {
    const { config } = readAutonomyConfig(text({ enabled: true, budget: { minutes: 30 } }));
    expect(config.budget).toEqual({ ...DEFAULT_BUDGET, minutes: 30 });
    expect(config.escalate.maxChangedLines).toBe(DEFAULT_ESCALATE.maxChangedLines);
    expect(config.escalate.maxChangedFiles).toBe(DEFAULT_ESCALATE.maxChangedFiles);
    expect(config.escalate.maxLoopFailures).toBe(DEFAULT_ESCALATE.maxLoopFailures);
    expect(DEFAULT_BUDGET).toEqual({ loopRounds: 5, minutes: 120, tokens: 2000000, prsPerDay: 10 });
  });

  // @req FR:autonomy/config.extend
  it('adds configured paths to the defaults', () => {
    const { config } = readAutonomyConfig(
      text({ enabled: true, escalate: { paths: ['infra/**'], 'contract-paths': ['docs/api.md'] } })
    );
    expect(config.escalate.paths).toEqual([...DEFAULT_SENSITIVE_PATHS, 'infra/**']);
    expect(config.escalate.contractPaths).toEqual([...DEFAULT_CONTRACT_PATHS, 'docs/api.md']);
    expect(DEFAULT_SENSITIVE_PATHS).toContain('.xe/config/**');
  });

  // @req FR:autonomy/config.invalid
  // @req NFR:autonomy/safety.fail-closed
  it('is off when the config is invalid', () => {
    const bad = readAutonomyConfig(text({ enabled: true, budget: { minutes: 0 } }));
    expect(bad.config.enabled).toBe(false);
    expect(bad.problems.length).toBeGreaterThan(0);
    const json = readAutonomyConfig('{ not json');
    expect(json.config.enabled).toBe(false);
    expect(json.problems[0]).toMatch(/JSON/);
  });
});

describe('validateAutonomy', () => {
  // @req FR:autonomy/config.invalid.problems
  it('names each problem with its JSON path', () => {
    const problems = validateAutonomy({ enabled: 'yes', budget: { tokens: -1 }, escalate: { paths: 'x' } });
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^autonomy\.enabled: /),
        expect.stringMatching(/^autonomy\.budget\.tokens: /),
        expect.stringMatching(/^autonomy\.escalate\.paths: /),
      ])
    );
  });

  // @req FR:autonomy/config.invalid.unknown
  it('flags unknown keys', () => {
    expect(validateAutonomy({ enabled: true, merge: true })).toEqual([expect.stringMatching(/^autonomy\.merge: unknown key/)]);
    expect(validateAutonomy({ budget: { hours: 1 } })).toEqual([expect.stringMatching(/^autonomy\.budget\.hours: unknown key/)]);
    expect(validateAutonomy({ escalate: { never: [] } })).toEqual([
      expect.stringMatching(/^autonomy\.escalate\.never: unknown key/),
    ]);
  });

  // @req FR:autonomy/config.invalid.range
  it('flags budgets and thresholds outside their range or not whole numbers', () => {
    expect(validateAutonomy({ budget: { 'loop-rounds': 21 } })).toHaveLength(1);
    expect(validateAutonomy({ budget: { minutes: 1.5 } })).toHaveLength(1);
    expect(validateAutonomy({ budget: { 'prs-per-day': 0 } })).toHaveLength(1);
    expect(validateAutonomy({ escalate: { 'max-changed-lines': '600' } })).toHaveLength(1);
    expect(validateAutonomy({ escalate: { 'max-loop-failures': 21 } })).toHaveLength(1);
    expect(validateAutonomy({ budget: { 'loop-rounds': 20, minutes: 1440 }, escalate: { 'max-changed-files': 1 } })).toEqual([]);
  });

  it('flags an autonomy value that is not an object', () => {
    expect(validateAutonomy(true)).toEqual([expect.stringMatching(/^autonomy: /)]);
    expect(validateAutonomy({ escalate: { paths: [1] } })).toEqual([expect.stringMatching(/^autonomy\.escalate\.paths: /)]);
  });
});
