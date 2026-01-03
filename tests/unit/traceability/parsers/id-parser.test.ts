/**
 * Unit tests for RequirementId parsing.
 */

import {
  parseRequirementId,
  parseShortFormId,
  parseQualifiedId,
  buildQualifiedId,
  isValidRequirementId,
} from '@traceability/parsers/id-parser.js';

/**
 * @req FR:req-traceability/id.format
 * @req FR:req-traceability/id.format.short
 * @req FR:req-traceability/id.format.full
 */
describe('RequirementId Parser', () => {
  // @req FR:req-traceability/id.format.short
  describe('parseShortFormId', () => {
    it('should parse valid short-form FR ID', () => {
      const result = parseShortFormId('FR:auth.session');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('FR');
      expect(result!.path).toBe('auth.session');
      expect(result!.scope).toBe('');
      expect(result!.short).toBe('FR:auth.session');
    });

    it('should parse valid short-form NFR ID', () => {
      const result = parseShortFormId('NFR:perf.scan-time');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('NFR');
      expect(result!.path).toBe('perf.scan-time');
    });

    it('should parse valid short-form REQ ID', () => {
      const result = parseShortFormId('REQ:general.setup');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('REQ');
      expect(result!.path).toBe('general.setup');
    });

    it('should parse single segment path', () => {
      const result = parseShortFormId('FR:auth');
      expect(result).not.toBeNull();
      expect(result!.path).toBe('auth');
    });

    it('should parse path with numeric segments', () => {
      const result = parseShortFormId('FR:v2.api.endpoint');
      expect(result).not.toBeNull();
      expect(result!.path).toBe('v2.api.endpoint');
    });

    it('should parse maximum depth (5 levels)', () => {
      const result = parseShortFormId('FR:a.b.c.d.e');
      expect(result).not.toBeNull();
      expect(result!.path).toBe('a.b.c.d.e');
    });

    it('should reject path deeper than 5 levels', () => {
      const result = parseShortFormId('FR:a.b.c.d.e.f');
      expect(result).toBeNull();
    });

    it('should reject missing type prefix', () => {
      const result = parseShortFormId('auth.session');
      expect(result).toBeNull();
    });

    it('should reject invalid type prefix', () => {
      const result = parseShortFormId('INVALID:auth.session');
      expect(result).toBeNull();
    });

    it('should reject invalid characters in path', () => {
      const result = parseShortFormId('FR:auth/session');
      expect(result).toBeNull();
    });

    it('should reject empty path', () => {
      const result = parseShortFormId('FR:');
      expect(result).toBeNull();
    });

    it('should reject path starting with dot', () => {
      const result = parseShortFormId('FR:.auth');
      expect(result).toBeNull();
    });

    it('should reject path ending with dot', () => {
      const result = parseShortFormId('FR:auth.');
      expect(result).toBeNull();
    });

    it('should reject consecutive dots', () => {
      const result = parseShortFormId('FR:auth..session');
      expect(result).toBeNull();
    });
  });

  // @req FR:req-traceability/id.format.full
  describe('parseQualifiedId', () => {
    it('should parse valid qualified FR ID', () => {
      const result = parseQualifiedId('FR:auth/session.expiry');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('FR');
      expect(result!.scope).toBe('auth');
      expect(result!.path).toBe('session.expiry');
      expect(result!.qualified).toBe('FR:auth/session.expiry');
      expect(result!.short).toBe('FR:session.expiry');
    });

    it('should parse qualified ID with hyphenated scope', () => {
      const result = parseQualifiedId('FR:my-feature/path.to.req');
      expect(result).not.toBeNull();
      expect(result!.scope).toBe('my-feature');
      expect(result!.path).toBe('path.to.req');
    });

    it('should parse qualified NFR ID', () => {
      const result = parseQualifiedId('NFR:performance/memory.usage');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('NFR');
      expect(result!.scope).toBe('performance');
    });

    it('should parse qualified REQ ID', () => {
      const result = parseQualifiedId('REQ:general/setup.config');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('REQ');
    });

    it('should reject qualified ID without slash', () => {
      const result = parseQualifiedId('FR:auth.session');
      expect(result).toBeNull();
    });

    it('should reject invalid scope characters', () => {
      const result = parseQualifiedId('FR:auth_scope/session');
      expect(result).toBeNull();
    });

    it('should reject empty scope', () => {
      const result = parseQualifiedId('FR:/session.expiry');
      expect(result).toBeNull();
    });

    it('should reject empty path after scope', () => {
      const result = parseQualifiedId('FR:auth/');
      expect(result).toBeNull();
    });
  });

  // @req FR:req-traceability/id.format
  describe('parseRequirementId', () => {
    it('should auto-detect and parse short-form ID', () => {
      const result = parseRequirementId('FR:auth.session');
      expect(result).not.toBeNull();
      expect(result!.scope).toBe('');
    });

    it('should auto-detect and parse qualified ID', () => {
      const result = parseRequirementId('FR:auth/session.expiry');
      expect(result).not.toBeNull();
      expect(result!.scope).toBe('auth');
    });

    it('should return null for invalid ID', () => {
      const result = parseRequirementId('invalid');
      expect(result).toBeNull();
    });
  });

  describe('buildQualifiedId', () => {
    it('should build qualified ID from short-form and scope', () => {
      const shortForm = parseShortFormId('FR:session.expiry')!;
      const qualified = buildQualifiedId(shortForm, 'auth');
      expect(qualified.qualified).toBe('FR:auth/session.expiry');
      expect(qualified.scope).toBe('auth');
      expect(qualified.short).toBe('FR:session.expiry');
    });

    it('should preserve existing scope if already set', () => {
      const existing = parseQualifiedId('FR:existing/path.to.req')!;
      const qualified = buildQualifiedId(existing, 'new-scope');
      expect(qualified.scope).toBe('existing');
      expect(qualified.qualified).toBe('FR:existing/path.to.req');
    });
  });

  describe('isValidRequirementId', () => {
    it('should return true for valid short-form ID', () => {
      expect(isValidRequirementId('FR:auth.session')).toBe(true);
    });

    it('should return true for valid qualified ID', () => {
      expect(isValidRequirementId('FR:auth/session.expiry')).toBe(true);
    });

    it('should return false for invalid ID', () => {
      expect(isValidRequirementId('invalid')).toBe(false);
      expect(isValidRequirementId('')).toBe(false);
      expect(isValidRequirementId('FR:')).toBe(false);
    });
  });
});
