/**
 * Configuration loading for traceability scanner.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  type ScanOptions,
  type TraceabilityMode,
  type TraceabilityModeConfig,
  type TraceabilityModeValue,
  parseTraceabilityModeValue,
} from '../types/index.js';
import type { FeatureMetadata } from '../parsers/spec-parser.js';

/**
 * Threshold configuration for coverage checks.
 * @req FR:req-traceability/integration.thresholds
 */
export interface ThresholdConfig {
  /** Minimum implementation coverage percentage (0-100) */
  implementation?: number;
  /** Minimum test coverage percentage (0-100) */
  test?: number;
  /** Minimum task coverage percentage (0-100) */
  task?: number;
}

/**
 * Full traceability configuration.
 */
export interface TraceabilityConfig {
  /** Scan options */
  scan: ScanOptions;
  /** Coverage thresholds */
  thresholds: ThresholdConfig;
  /** Feature directories to scan */
  featureDirs: string[];
  /** Source directories to scan */
  srcDirs: string[];
  /**
   * Per-feature traceability mode settings from catalyst.json.
   * @req FR:req-traceability/scan.traceability-mode.config
   */
  traceabilityModes?: TraceabilityModeConfig;
}

/**
 * Default configuration values.
 * @req FR:req-traceability/scan.exclude
 */
const DEFAULT_CONFIG: TraceabilityConfig = {
  scan: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**',
    ],
    testDirs: ['tests/', '__tests__/', 'test/'],
    respectGitignore: true,
  },
  thresholds: {
    // Default: no thresholds (report only)
  },
  featureDirs: ['.xe/features/', '.xe/initiatives/'],
  srcDirs: ['src/'],
};

/**
 * Load traceability configuration from project.
 * @req FR:req-traceability/scan.exclude
 * @req FR:req-traceability/integration.thresholds
 */
export async function loadConfig(
  projectRoot: string
): Promise<TraceabilityConfig> {
  const configPath = path.join(projectRoot, '.xe', 'config', 'catalyst.json');

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const json = JSON.parse(content);

    // Merge with defaults
    const config = mergeConfig(DEFAULT_CONFIG, json.traceability || {});

    // Parse traceability mode settings
    // @req FR:req-traceability/scan.traceability-mode.config
    // @req FR:req-traceability/scan.traceability-mode.config.input
    const traceSection = json.traceability;
    if (traceSection) {
      const modes = parseTraceabilityModes(traceSection);
      if (modes) {
        config.traceabilityModes = modes;
      }
    }

    return config;
  } catch (error) {
    // Config doesn't exist or is invalid - use defaults
    return DEFAULT_CONFIG;
  }
}

/**
 * Merge user config with defaults.
 */
function mergeConfig(
  defaults: TraceabilityConfig,
  userConfig: Partial<TraceabilityConfig>
): TraceabilityConfig {
  return {
    scan: {
      exclude: userConfig.scan?.exclude || defaults.scan.exclude,
      testDirs: userConfig.scan?.testDirs || defaults.scan.testDirs,
      respectGitignore:
        userConfig.scan?.respectGitignore ?? defaults.scan.respectGitignore,
    },
    thresholds: {
      ...defaults.thresholds,
      ...userConfig.thresholds,
    },
    featureDirs: userConfig.featureDirs || defaults.featureDirs,
    srcDirs: userConfig.srcDirs || defaults.srcDirs,
  };
}

/**
 * Get default scan options.
 */
export function getDefaultScanOptions(): ScanOptions {
  return { ...DEFAULT_CONFIG.scan };
}

/**
 * Parse traceability mode settings from catalyst.json traceability section.
 * @req FR:req-traceability/scan.traceability-mode.config.input
 * @req FR:req-traceability/scan.traceability-mode.config.output
 */
function parseTraceabilityModes(
  traceSection: Record<string, unknown>
): TraceabilityModeConfig | undefined {
  const defaultMode = parseTraceabilityModeObj(traceSection.default);
  const featuresObj = traceSection.features;

  let features: Record<string, TraceabilityMode> | undefined;
  if (featuresObj && typeof featuresObj === 'object') {
    features = {};
    for (const [key, val] of Object.entries(featuresObj as Record<string, unknown>)) {
      const mode = parseTraceabilityModeObj(val);
      if (mode) {
        features[key] = mode;
      }
    }
    if (Object.keys(features).length === 0) {
      features = undefined;
    }
  }

  if (!defaultMode && !features) {
    return undefined;
  }

  const config: TraceabilityModeConfig = {};
  if (defaultMode) {config.default = defaultMode;}
  if (features) {config.features = features;}
  return config;
}

/**
 * Parse a single traceability mode object.
 */
function parseTraceabilityModeObj(obj: unknown): TraceabilityMode | undefined {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }

  const record = obj as Record<string, unknown>;
  const mode: TraceabilityMode = {};
  let hasField = false;

  const parsedCode = parseTraceabilityModeValue(record.code);
  if (parsedCode !== undefined) {
    mode.code = parsedCode;
    hasField = true;
  }
  const parsedTest = parseTraceabilityModeValue(record.test);
  if (parsedTest !== undefined) {
    mode.test = parsedTest;
    hasField = true;
  }

  return hasField ? mode : undefined;
}

/**
 * Apply a traceability mode layer value onto a current resolved value.
 *
 * - `'error'` or `'warning'`: explicit severity, overwrites parent
 * - `'inherit'`: enabled — inherit parent's severity if set, otherwise stay `'inherit'`
 * - `'disable'`: disabled, overwrites parent
 * - `undefined`: not set, keep parent value
 */
function applyTraceabilityLayer(
  current: TraceabilityModeValue | undefined,
  layer: TraceabilityModeValue | undefined
): TraceabilityModeValue | undefined {
  if (layer === undefined) {return current;}
  if (layer === 'error' || layer === 'warning') {return layer;}
  if (layer === 'inherit') {
    return (current === 'error' || current === 'warning') ? current : 'inherit';
  }
  // layer === 'disable': disabled overrides everything
  return 'disable';
}

/**
 * Post-process: resolve bare `'inherit'` (no parent set a severity) to system default.
 */
function finalizeTraceabilityValue(
  value: TraceabilityModeValue | undefined
): TraceabilityModeValue | undefined {
  return value === 'inherit' ? 'warning' : value;
}

/**
 * Test whether a config feature key (which may contain `*` wildcards) matches a feature ID.
 * @req FR:req-traceability/scan.traceability-mode.config.wildcard
 */
function matchesWildcard(pattern: string, featureId: string): boolean {
  const regexStr = '^' + pattern.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$';
  return new RegExp(regexStr).test(featureId);
}

/**
 * Resolve traceability mode for a specific feature using precedence chain:
 * spec.md frontmatter > catalyst.json exact feature match > wildcard matches (last wins) > catalyst.json default > system default
 *
 * After resolution, `'inherit'` is replaced by the inherited severity or `'warning'` (system default).
 * Consumers see only `'error'`, `'warning'`, `'disable'`, or `undefined` — never raw `'inherit'`.
 *
 * @req FR:req-traceability/scan.traceability-mode.precedence
 * @req FR:req-traceability/scan.traceability-mode.config.wildcard
 */
export function resolveTraceabilityMode(
  featureId: string,
  frontmatter?: FeatureMetadata,
  config?: TraceabilityModeConfig
): TraceabilityMode | undefined {
  const configDefault = config?.default;
  const configFeature = config?.features?.[featureId];
  const fmMode = frontmatter?.traceability;

  // Collect wildcard matches (last defined wins)
  const wildcardMatches: TraceabilityMode[] = [];
  if (config?.features) {
    for (const [key, mode] of Object.entries(config.features)) {
      if (key !== featureId && key.includes('*') && matchesWildcard(key, featureId)) {
        wildcardMatches.push(mode);
      }
    }
  }

  // If nothing is set anywhere, return undefined
  if (!configDefault && !configFeature && wildcardMatches.length === 0 && !fmMode) {
    return undefined;
  }

  // Layer: config default → wildcard matches (in order) → exact feature → frontmatter
  let code = applyTraceabilityLayer(undefined, configDefault?.code);
  let test = applyTraceabilityLayer(undefined, configDefault?.test);

  for (const wm of wildcardMatches) {
    code = applyTraceabilityLayer(code, wm.code);
    test = applyTraceabilityLayer(test, wm.test);
  }

  code = applyTraceabilityLayer(code, configFeature?.code);
  test = applyTraceabilityLayer(test, configFeature?.test);

  code = applyTraceabilityLayer(code, fmMode?.code);
  test = applyTraceabilityLayer(test, fmMode?.test);

  // Post-process: resolve bare `'inherit'` to system default severity
  code = finalizeTraceabilityValue(code);
  test = finalizeTraceabilityValue(test);

  const resolved: TraceabilityMode = {};
  if (code !== undefined) {resolved.code = code;}
  if (test !== undefined) {resolved.test = test;}

  return resolved;
}

/**
 * Check if coverage meets thresholds.
 * Returns array of threshold violations.
 * @req FR:req-traceability/integration.thresholds
 */
export function checkThresholds(
  implementationCoverage: number,
  testCoverage: number,
  taskCoverage: number,
  thresholds: ThresholdConfig
): string[] {
  const violations: string[] = [];

  if (
    thresholds.implementation !== undefined &&
    implementationCoverage < thresholds.implementation
  ) {
    violations.push(
      `Implementation coverage ${implementationCoverage}% is below threshold ${thresholds.implementation}%`
    );
  }

  if (
    thresholds.test !== undefined &&
    testCoverage < thresholds.test
  ) {
    violations.push(
      `Test coverage ${testCoverage}% is below threshold ${thresholds.test}%`
    );
  }

  if (
    thresholds.task !== undefined &&
    taskCoverage < thresholds.task
  ) {
    violations.push(
      `Task coverage ${taskCoverage}% is below threshold ${thresholds.task}%`
    );
  }

  return violations;
}
