/**
 * Unit tests for traceability mode configuration loading and resolution.
 *
 * @req FR:req-traceability/scan.traceability-mode.config
 * @req FR:req-traceability/scan.traceability-mode.config.input
 * @req FR:req-traceability/scan.traceability-mode.config.output
 * @req FR:req-traceability/scan.traceability-mode.precedence
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
  loadConfig,
  resolveTraceabilityMode,
} from '@traceability/config/traceability-config.js';
import type {
  TraceabilityModeConfig,
} from '@traceability/types/index.js';
import type { FeatureMetadata } from '@traceability/parsers/spec-parser.js';

describe('Traceability mode config', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'trace-config-'));
    await fs.mkdir(path.join(tempDir, '.xe', 'config'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // @req FR:req-traceability/scan.traceability-mode.config.input
  describe('loadConfig with traceability modes', () => {
    it('should load traceability default from catalyst.json', async () => {
      await fs.writeFile(
        path.join(tempDir, '.xe', 'config', 'catalyst.json'),
        JSON.stringify({
          traceability: {
            default: { code: true, test: true },
          },
        })
      );

      const config = await loadConfig(tempDir);
      expect(config.traceabilityModes?.default).toEqual({ code: true, test: true });
    });

    // @req FR:req-traceability/scan.traceability-mode.config.input
    it('should load per-feature traceability overrides', async () => {
      await fs.writeFile(
        path.join(tempDir, '.xe', 'config', 'catalyst.json'),
        JSON.stringify({
          traceability: {
            default: { code: true, test: true },
            features: {
              'playbook-demo': { code: false },
              auth: { code: true, test: true },
            },
          },
        })
      );

      const config = await loadConfig(tempDir);
      expect(config.traceabilityModes?.features?.['playbook-demo']).toEqual({ code: false });
      expect(config.traceabilityModes?.features?.auth).toEqual({ code: true, test: true });
    });

    // @req FR:req-traceability/scan.traceability-mode.config.output
    it('should return undefined traceabilityModes when not in config', async () => {
      await fs.writeFile(
        path.join(tempDir, '.xe', 'config', 'catalyst.json'),
        JSON.stringify({ traceability: {} })
      );

      const config = await loadConfig(tempDir);
      expect(config.traceabilityModes).toBeUndefined();
    });

    it('should return undefined traceabilityModes when no config file', async () => {
      const config = await loadConfig(tempDir);
      expect(config.traceabilityModes).toBeUndefined();
    });
  });

  // @req FR:req-traceability/scan.traceability-mode.precedence
  describe('resolveTraceabilityMode', () => {
    it('should return undefined for feature with no settings', () => {
      const result = resolveTraceabilityMode('some-feature');
      expect(result).toBeUndefined();
    });

    it('should use config default when no feature-specific settings exist', () => {
      const config: TraceabilityModeConfig = {
        default: { code: true, test: false },
      };
      const result = resolveTraceabilityMode('some-feature', undefined, config);
      expect(result).toEqual({ code: true, test: false });
    });

    it('should override config default with config feature settings', () => {
      const config: TraceabilityModeConfig = {
        default: { code: true, test: true },
        features: {
          'my-feature': { code: false },
        },
      };
      const result = resolveTraceabilityMode('my-feature', undefined, config);
      expect(result).toEqual({ code: false, test: true });
    });

    it('should override config with frontmatter', () => {
      const config: TraceabilityModeConfig = {
        default: { code: true, test: true },
        features: {
          'my-feature': { code: true, test: true },
        },
      };
      const frontmatter: FeatureMetadata = {
        traceability: { code: false },
      };
      const result = resolveTraceabilityMode('my-feature', frontmatter, config);
      expect(result).toEqual({ code: false, test: true });
    });

    it('should merge frontmatter with config default when no feature config', () => {
      const config: TraceabilityModeConfig = {
        default: { code: true, test: true },
      };
      const frontmatter: FeatureMetadata = {
        traceability: { test: false },
      };
      const result = resolveTraceabilityMode('my-feature', frontmatter, config);
      expect(result).toEqual({ code: true, test: false });
    });
  });
});
