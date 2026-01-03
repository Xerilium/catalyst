/**
 * Configuration loading for traceability scanner.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ScanOptions } from '../types/index.js';

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
    return mergeConfig(DEFAULT_CONFIG, json.traceability || {});
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
