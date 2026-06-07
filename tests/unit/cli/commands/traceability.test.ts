/**
 * Unit tests for traceability command argument parsing
 * @req FR:cli-engine/traceability.execute
 * @req FR:cli-engine/traceability.priority
 */

import { parseFeatureArgument, validatePriority, resolveFeatureFilters } from '../../../../src/cli/commands/traceability';
import { CatalystError } from '../../../../src/core/errors';
import * as fs from 'fs';

describe('traceability command', () => {
  describe('parseFeatureArgument', () => {
    // @req FR:cli-engine/traceability.execute
    it('should return undefined for undefined input', () => {
      expect(parseFeatureArgument(undefined)).toBeUndefined();
    });

    // @req FR:cli-engine/traceability.execute
    it('should return feature ID as-is when no path separators', () => {
      expect(parseFeatureArgument('ai-provider')).toBe('ai-provider');
    });

    // @req FR:cli-engine/traceability.execute
    it('should extract feature ID from .xe/features/ path', () => {
      expect(parseFeatureArgument('.xe/features/ai-provider')).toBe('ai-provider');
    });

    // @req FR:cli-engine/traceability.execute
    it('should extract feature ID from full spec.md path', () => {
      expect(parseFeatureArgument('.xe/features/ai-provider/spec.md')).toBe('ai-provider');
    });

    // @req FR:cli-engine/traceability.execute
    it('should handle paths with trailing slashes', () => {
      expect(parseFeatureArgument('.xe/features/ai-provider/')).toBe('ai-provider');
    });

    // @req FR:cli-engine/traceability.execute
    it('should handle absolute paths', () => {
      expect(parseFeatureArgument('/Users/dev/project/.xe/features/my-feature/spec.md')).toBe('my-feature');
    });

    // @req FR:cli-engine/traceability.execute
    // @req FR:feature-context/spec.@file.nesting
    it('should preserve nested feature IDs (plain)', () => {
      expect(parseFeatureArgument('client/activity')).toBe('client/activity');
    });

    // @req FR:feature-context/spec.@file.nesting
    it('should extract nested feature ID from .xe/features/ path', () => {
      expect(parseFeatureArgument('.xe/features/client/activity')).toBe('client/activity');
    });

    // @req FR:feature-context/spec.@file.nesting
    it('should extract nested feature ID from full spec.md path', () => {
      expect(parseFeatureArgument('.xe/features/client/activity/spec.md')).toBe('client/activity');
    });

    // @req FR:feature-context/spec.@file.nesting
    it('should extract nested feature ID from absolute path with spec.md', () => {
      expect(parseFeatureArgument('/Users/dev/project/.xe/features/portal/shell/spec.md')).toBe('portal/shell');
    });
  });

  describe('validatePriority', () => {
    // @req FR:cli-engine/traceability.priority
    it('should accept valid priorities P1-P5', () => {
      expect(validatePriority('P1')).toBe('P1');
      expect(validatePriority('P2')).toBe('P2');
      expect(validatePriority('P3')).toBe('P3');
      expect(validatePriority('P4')).toBe('P4');
      expect(validatePriority('P5')).toBe('P5');
    });

    // @req FR:cli-engine/traceability.priority
    it('should accept lowercase priorities and normalize to uppercase', () => {
      expect(validatePriority('p1')).toBe('P1');
      expect(validatePriority('p3')).toBe('P3');
      expect(validatePriority('p5')).toBe('P5');
    });

    // @req FR:cli-engine/traceability.priority
    it('should throw InvalidPriority for invalid values', () => {
      expect(() => validatePriority('P0')).toThrow(CatalystError);
      expect(() => validatePriority('P6')).toThrow(CatalystError);
      expect(() => validatePriority('S1')).toThrow(CatalystError);
      expect(() => validatePriority('invalid')).toThrow(CatalystError);
    });

    // @req FR:cli-engine/traceability.priority
    it('should throw with InvalidPriority error code', () => {
      try {
        validatePriority('P0');
        fail('Expected to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(CatalystError);
        expect((error as CatalystError).code).toBe('InvalidPriority');
        expect((error as CatalystError).guidance).toContain('P1');
      }
    });
  });

  // @req FR:req-traceability/scan.feature-filter
  describe('resolveFeatureFilters', () => {
    // @req FR:cli-engine/traceability.execute
    it('should return undefined for undefined input', () => {
      expect(resolveFeatureFilters(undefined)).toBeUndefined();
    });

    // @req FR:cli-engine/traceability.execute
    it('should return single-element array for exact ID without wildcard', () => {
      expect(resolveFeatureFilters('error-handling')).toEqual(['error-handling']);
    });

    // @req FR:cli-engine/traceability.execute
    it('should resolve wildcard pattern against features directory', () => {
      // Use the real .xe/features directory
      const result = resolveFeatureFilters('ai-provider*', '.xe/features');
      expect(result).toBeDefined();
      expect(result!.length).toBeGreaterThan(1);
      expect(result).toContain('ai-provider');
      expect(result).toContain('ai-provider-claude');
      // Should be sorted
      expect(result).toEqual([...result!].sort());
    });

    // @req FR:cli-engine/traceability.execute
    it('should support ? single-character wildcard', () => {
      const result = resolveFeatureFilters('loggin?', '.xe/features');
      expect(result).toEqual(['logging']);
    });

    // @req FR:cli-engine/traceability.execute
    it('should throw when no features match wildcard pattern', () => {
      expect(() => resolveFeatureFilters('nonexistent*', '.xe/features')).toThrow(CatalystError);
      try {
        resolveFeatureFilters('nonexistent*', '.xe/features');
        fail('Expected to throw');
      } catch (error) {
        expect((error as CatalystError).code).toBe('TraceabilityAnalysisFailed');
        expect((error as CatalystError).message).toContain('No features matching pattern');
      }
    });

    // @req FR:cli-engine/traceability.execute
    it('should return pattern as-is when features directory does not exist', () => {
      const result = resolveFeatureFilters('test*', '/nonexistent/path');
      expect(result).toEqual(['test*']);
    });

    // @req FR:feature-context/spec.@file.nesting
    it('should match nested feature IDs via wildcard', () => {
      const tmpDir = fs.mkdtempSync(require('os').tmpdir() + '/cat-trace-resolve-');
      try {
        fs.mkdirSync(`${tmpDir}/client/activity`, { recursive: true });
        fs.writeFileSync(`${tmpDir}/client/activity/spec.md`, '');
        fs.mkdirSync(`${tmpDir}/client/profile`, { recursive: true });
        fs.writeFileSync(`${tmpDir}/client/profile/spec.md`, '');
        fs.mkdirSync(`${tmpDir}/flat`, { recursive: true });
        fs.writeFileSync(`${tmpDir}/flat/spec.md`, '');

        const result = resolveFeatureFilters('client/*', tmpDir);
        expect(result).toEqual(['client/activity', 'client/profile']);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    // @req FR:feature-context/spec.@file.nesting
    it('should return single-element array for exact nested ID without wildcard', () => {
      expect(resolveFeatureFilters('client/activity')).toEqual(['client/activity']);
    });
  });
});
