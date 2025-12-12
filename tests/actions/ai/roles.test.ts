/**
 * Tests for role mapping
 *
 * @req FR:playbook-actions-ai/ai-prompt.role
 */

import { resolveSystemPrompt, getKnownRoles } from '../../../src/playbooks/scripts/playbooks/actions/ai/roles';

// @req FR:playbook-actions-ai/ai-prompt.role
describe('resolveSystemPrompt', () => {
  // @req FR:playbook-actions-ai/ai-prompt.role.name
  describe('known role names', () => {
    it('should map "Product Manager" to system prompt', () => {
      const result = resolveSystemPrompt('Product Manager', 'Engineer');
      expect(result).toContain('strategic Product Manager');
      expect(result).toContain('outcomes, not outputs');
    });

    it('should map "Engineer" to system prompt', () => {
      const result = resolveSystemPrompt('Engineer', 'Product Manager');
      expect(result).toContain('expert Software Engineer');
      expect(result).toContain('clean, maintainable code');
    });

    it('should map "Architect" to system prompt', () => {
      const result = resolveSystemPrompt('Architect', 'Engineer');
      expect(result).toContain('seasoned Software Architect');
      expect(result).toContain('scalability, maintainability');
    });
  });

  // @req FR:playbook-actions-ai/ai-prompt.role.name
  describe('case-insensitive matching', () => {
    it('should match "product manager" (lowercase)', () => {
      const result = resolveSystemPrompt('product manager', 'Engineer');
      expect(result).toContain('strategic Product Manager');
    });

    it('should match "ENGINEER" (uppercase)', () => {
      const result = resolveSystemPrompt('ENGINEER', 'Product Manager');
      expect(result).toContain('expert Software Engineer');
    });

    it('should match "architect" (lowercase)', () => {
      const result = resolveSystemPrompt('architect', 'Engineer');
      expect(result).toContain('seasoned Software Architect');
    });

    it('should match "Product manager" (mixed case)', () => {
      const result = resolveSystemPrompt('Product manager', 'Engineer');
      expect(result).toContain('strategic Product Manager');
    });
  });

  // @req FR:playbook-actions-ai/ai-prompt.role.custom
  describe('custom roles', () => {
    it('should use non-matching role directly as system prompt', () => {
      const customRole = 'You are a security expert specializing in OWASP.';
      const result = resolveSystemPrompt(customRole, 'Engineer');
      expect(result).toBe(customRole);
    });

    it('should use custom role with "You are" phrasing directly', () => {
      const customRole = 'You are a TypeScript expert.';
      const result = resolveSystemPrompt(customRole, 'Engineer');
      expect(result).toBe(customRole);
    });

    it('should use custom role without standard phrasing', () => {
      const customRole = 'Act as a senior developer reviewing code.';
      const result = resolveSystemPrompt(customRole, 'Engineer');
      expect(result).toBe(customRole);
    });
  });

  // @req FR:playbook-actions-ai/ai-prompt.role.default
  describe('default from playbook owner', () => {
    it('should default to playbook owner when role is empty string', () => {
      const result = resolveSystemPrompt('', 'Architect');
      expect(result).toContain('seasoned Software Architect');
    });

    it('should default to playbook owner when role is undefined', () => {
      const result = resolveSystemPrompt(undefined, 'Engineer');
      expect(result).toContain('expert Software Engineer');
    });

    it('should default to playbook owner when role is whitespace only', () => {
      const result = resolveSystemPrompt('   ', 'Product Manager');
      expect(result).toContain('strategic Product Manager');
    });

    it('should use owner directly if owner is not a known role', () => {
      const customOwner = 'You are a custom owner role.';
      const result = resolveSystemPrompt(undefined, customOwner);
      expect(result).toBe(customOwner);
    });
  });
});

describe('getKnownRoles', () => {
  it('should return array of known role names', () => {
    const roles = getKnownRoles();
    expect(roles).toContain('Product Manager');
    expect(roles).toContain('Engineer');
    expect(roles).toContain('Architect');
  });

  it('should return exactly 3 roles', () => {
    const roles = getKnownRoles();
    expect(roles).toHaveLength(3);
  });
});
