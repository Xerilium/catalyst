/**
 * Configuration loading for traceability scanner.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ScanOptions, TraceabilityMode, TraceabilityModeConfig } from '../types/index.js';
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
 * Parse a single traceability mode object with boolean validation.
 */
function parseTraceabilityModeObj(obj: unknown): TraceabilityMode | undefined {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }

  const record = obj as Record<string, unknown>;
  const mode: TraceabilityMode = {};
  let hasField = false;

  if (typeof record.code === 'boolean') {
    mode.code = record.code;
    hasField = true;
  }
  if (typeof record.test === 'boolean') {
    mode.test = record.test;
    hasField = true;
  }

  return hasField ? mode : undefined;
}

/**
 * Resolve traceability mode for a specific feature using precedence chain:
 * spec.md frontmatter > catalyst.json features.{id} > catalyst.json default > system default (undefined)
 *
 * @req FR:req-traceability/scan.traceability-mode.precedence
 */
export function resolveTraceabilityMode(
  featureId: string,
  frontmatter?: FeatureMetadata,
  config?: TraceabilityModeConfig
): TraceabilityMode | undefined {
  // Start with config default
  const configDefault = config?.default;
  const configFeature = config?.features?.[featureId];
  const fmMode = frontmatter?.traceability;

  // If nothing is set anywhere, return undefined
  if (!configDefault && !configFeature && !fmMode) {
    return undefined;
  }

  // Layer: config default → config feature → frontmatter
  const resolved: TraceabilityMode = {};

  // Config default layer
  if (configDefault?.code !== undefined) {resolved.code = configDefault.code;}
  if (configDefault?.test !== undefined) {resolved.test = configDefault.test;}

  // Config feature layer (overrides default)
  if (configFeature?.code !== undefined) {resolved.code = configFeature.code;}
  if (configFeature?.test !== undefined) {resolved.test = configFeature.test;}

  // Frontmatter layer (overrides config)
  if (fmMode?.code !== undefined) {resolved.code = fmMode.code;}
  if (fmMode?.test !== undefined) {resolved.test = fmMode.test;}

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
