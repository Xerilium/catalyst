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
            default: { code: 'inherit', test: 'inherit' },
          },
        })
      );

      const config = await loadConfig(tempDir);
      expect(config.traceabilityModes?.default).toEqual({ code: 'inherit', test: 'inherit' });
    });

    // @req FR:req-traceability/scan.traceability-mode.config.input
    it('should load per-feature traceability overrides', async () => {
      await fs.writeFile(
        path.join(tempDir, '.xe', 'config', 'catalyst.json'),
        JSON.stringify({
          traceability: {
            default: { code: 'inherit', test: 'inherit' },
            features: {
              'playbook-demo': { code: 'disable' },
              auth: { code: 'inherit', test: 'inherit' },
            },
          },
        })
      );

      const config = await loadConfig(tempDir);
      expect(config.traceabilityModes?.features?.['playbook-demo']).toEqual({ code: 'disable' });
      expect(config.traceabilityModes?.features?.auth).toEqual({ code: 'inherit', test: 'inherit' });
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

    // @req FR:req-traceability/scan.traceability-mode.config.input
    it('should load severity values from catalyst.json', async () => {
      await fs.writeFile(
        path.join(tempDir, '.xe', 'config', 'catalyst.json'),
        JSON.stringify({
          traceability: {
            default: { code: 'error', test: 'warning' },
            features: {
              'strict-feature': { code: 'error', test: 'error' },
            },
          },
        })
      );

      const config = await loadConfig(tempDir);
      expect(config.traceabilityModes?.default).toEqual({ code: 'error', test: 'warning' });
      expect(config.traceabilityModes?.features?.['strict-feature']).toEqual({ code: 'error', test: 'error' });
    });

    it('should reject invalid string values in config', async () => {
      await fs.writeFile(
        path.join(tempDir, '.xe', 'config', 'catalyst.json'),
        JSON.stringify({
          traceability: {
            default: { code: 'yes', test: 'info' },
          },
        })
      );

      const config = await loadConfig(tempDir);
      expect(config.traceabilityModes).toBeUndefined();
    });

    it('should reject boolean values in config', async () => {
      await fs.writeFile(
        path.join(tempDir, '.xe', 'config', 'catalyst.json'),
        JSON.stringify({
          traceability: {
            default: { code: true, test: false },
          },
        })
      );

      const config = await loadConfig(tempDir);
      expect(config.traceabilityModes).toBeUndefined();
    });

    // @req FR:req-traceability/scan.traceability-mode.config.wildcard
    it('should load wildcard feature keys from config', async () => {
      await fs.writeFile(
        path.join(tempDir, '.xe', 'config', 'catalyst.json'),
        JSON.stringify({
          traceability: {
            features: {
              '*-context': { code: 'disable' },
            },
          },
        })
      );

      const config = await loadConfig(tempDir);
      expect(config.traceabilityModes?.features?.['*-context']).toEqual({ code: 'disable' });
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
        default: { code: 'inherit', test: 'disable' },
      };
      const result = resolveTraceabilityMode('some-feature', undefined, config);
      // 'inherit' resolves to system default 'warning' since no parent sets severity
      expect(result).toEqual({ code: 'warning', test: 'disable' });
    });

    it('should override config default with config feature settings', () => {
      const config: TraceabilityModeConfig = {
        default: { code: 'inherit', test: 'inherit' },
        features: {
          'my-feature': { code: 'disable' },
        },
      };
      const result = resolveTraceabilityMode('my-feature', undefined, config);
      expect(result).toEqual({ code: 'disable', test: 'warning' });
    });

    it('should override config with frontmatter', () => {
      const config: TraceabilityModeConfig = {
        default: { code: 'inherit', test: 'inherit' },
        features: {
          'my-feature': { code: 'inherit', test: 'inherit' },
        },
      };
      const frontmatter: FeatureMetadata = {
        traceability: { code: 'disable' },
      };
      const result = resolveTraceabilityMode('my-feature', frontmatter, config);
      expect(result).toEqual({ code: 'disable', test: 'warning' });
    });

    it('should merge frontmatter with config default when no feature config', () => {
      const config: TraceabilityModeConfig = {
        default: { code: 'inherit', test: 'inherit' },
      };
      const frontmatter: FeatureMetadata = {
        traceability: { test: 'disable' },
      };
      const result = resolveTraceabilityMode('my-feature', frontmatter, config);
      expect(result).toEqual({ code: 'warning', test: 'disable' });
    });

    // @req FR:req-traceability/scan.traceability-mode.precedence
    it('should inherit parent severity when child says inherit', () => {
      const config: TraceabilityModeConfig = {
        default: { code: 'error' },
      };
      const frontmatter: FeatureMetadata = {
        traceability: { code: 'inherit' },
      };
      const result = resolveTraceabilityMode('my-feature', frontmatter, config);
      expect(result).toEqual({ code: 'error' });
    });

    it('should allow child to override parent severity', () => {
      const config: TraceabilityModeConfig = {
        default: { code: 'error' },
      };
      const frontmatter: FeatureMetadata = {
        traceability: { code: 'warning' },
      };
      const result = resolveTraceabilityMode('my-feature', frontmatter, config);
      expect(result).toEqual({ code: 'warning' });
    });

    it('should resolve inherit to system default warning when no parent sets severity', () => {
      const frontmatter: FeatureMetadata = {
        traceability: { code: 'inherit' },
      };
      const result = resolveTraceabilityMode('my-feature', frontmatter);
      expect(result).toEqual({ code: 'warning' });
    });

    it('should inherit severity through multiple layers', () => {
      const config: TraceabilityModeConfig = {
        default: { code: 'error', test: 'warning' },
        features: {
          'my-feature': { code: 'inherit' },
        },
      };
      const frontmatter: FeatureMetadata = {
        traceability: { code: 'inherit' },
      };
      const result = resolveTraceabilityMode('my-feature', frontmatter, config);
      // code: 'inherit' inherits 'error' from default through feature layer
      // test: 'warning' from default, no override
      expect(result).toEqual({ code: 'error', test: 'warning' });
    });

    it('should resolve severity values from config', () => {
      const config: TraceabilityModeConfig = {
        default: { code: 'warning', test: 'error' },
      };
      const result = resolveTraceabilityMode('some-feature', undefined, config);
      expect(result).toEqual({ code: 'warning', test: 'error' });
    });

    it('should allow disable to override parent severity', () => {
      const config: TraceabilityModeConfig = {
        default: { code: 'error' },
      };
      const frontmatter: FeatureMetadata = {
        traceability: { code: 'disable' },
      };
      const result = resolveTraceabilityMode('my-feature', frontmatter, config);
      expect(result).toEqual({ code: 'disable' });
    });

    // @req FR:req-traceability/scan.traceability-mode.config.wildcard
    it('should match wildcard feature keys', () => {
      const config: TraceabilityModeConfig = {
        features: {
          '*-context': { code: 'disable', test: 'disable' },
        },
      };
      const result = resolveTraceabilityMode('feature-context', undefined, config);
      expect(result).toEqual({ code: 'disable', test: 'disable' });
    });

    // @req FR:req-traceability/scan.traceability-mode.config.wildcard
    it('should prefer exact match over wildcard', () => {
      const config: TraceabilityModeConfig = {
        features: {
          '*-context': { code: 'disable' },
          'feature-context': { code: 'error' },
        },
      };
      const result = resolveTraceabilityMode('feature-context', undefined, config);
      expect(result).toEqual({ code: 'error' });
    });

    // @req FR:req-traceability/scan.traceability-mode.config.wildcard
    it('should use last matching wildcard when multiple match', () => {
      const config: TraceabilityModeConfig = {
        features: {
          '*-context': { code: 'disable' },
          'feature-*': { code: 'error' },
        },
      };
      const result = resolveTraceabilityMode('feature-context', undefined, config);
      // 'feature-*' is defined after '*-context', so it wins
      expect(result).toEqual({ code: 'error' });
    });

    // @req FR:req-traceability/scan.traceability-mode.config.wildcard
    it('should not match wildcard for non-matching feature', () => {
      const config: TraceabilityModeConfig = {
        features: {
          '*-context': { code: 'disable' },
        },
      };
      const result = resolveTraceabilityMode('auth', undefined, config);
      expect(result).toBeUndefined();
    });

    // @req FR:req-traceability/scan.traceability-mode.config.wildcard
    // @req FR:req-traceability/scan.traceability-mode.precedence
    it('should layer wildcard between default and exact match', () => {
      const config: TraceabilityModeConfig = {
        default: { code: 'error', test: 'error' },
        features: {
          '*-context': { code: 'disable' },
          'feature-context': { test: 'warning' },
        },
      };
      const result = resolveTraceabilityMode('feature-context', undefined, config);
      // default: code=error, test=error
      // wildcard *-context: code=disable (overrides default)
      // exact feature-context: test=warning (overrides default)
      // But exact match also applies code from wildcard since exact doesn't set code
      expect(result).toEqual({ code: 'disable', test: 'warning' });
    });
  });
});
