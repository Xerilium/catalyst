/**
 * Requirement ID parser.
 * @req FR:req-traceability/id.format
 * @req FR:req-traceability/id.format.short
 * @req FR:req-traceability/id.format.full
 */

import type { RequirementId, RequirementType } from '../types/index.js';

// Valid requirement types
const VALID_TYPES: RequirementType[] = ['FR', 'NFR', 'REQ'];

// Maximum path depth (5 levels)
const MAX_PATH_DEPTH = 5;

/**
 * Regex for short-form ID: FR:path.to.req
 * @req FR:req-traceability/id.format.short
 */
const SHORT_FORM_PATTERN = /^(FR|NFR|REQ):([a-z0-9][a-z0-9.-]*)$/;

/**
 * Regex for qualified ID: `FR:{feature}/path.to.req`
 * @req FR:req-traceability/id.format.full
 */
const QUALIFIED_PATTERN = /^(FR|NFR|REQ):([a-z0-9][a-z0-9-]*)\/([a-z0-9][a-z0-9.-]*)$/;

/**
 * Validates that a path doesn't have invalid patterns.
 */
function isValidPath(path: string): boolean {
  // Check for empty path
  if (!path || path.length === 0) {
    return false;
  }

  // Check for consecutive dots
  if (path.includes('..')) {
    return false;
  }

  // Check for leading/trailing dots
  if (path.startsWith('.') || path.endsWith('.')) {
    return false;
  }

  // Check depth
  const depth = path.split('.').length;
  if (depth > MAX_PATH_DEPTH) {
    return false;
  }

  return true;
}

/**
 * Parse a short-form requirement ID (e.g., "FR:auth.session").
 * Returns null if the ID is invalid.
 * @req FR:req-traceability/id.format.short
 */
export function parseShortFormId(idString: string): RequirementId | null {
  const match = idString.match(SHORT_FORM_PATTERN);
  if (!match) {
    return null;
  }

  const [, typeStr, path] = match;
  const type = typeStr as RequirementType;

  if (!VALID_TYPES.includes(type)) {
    return null;
  }

  if (!isValidPath(path)) {
    return null;
  }

  return {
    type,
    scope: '',
    path,
    qualified: '', // Will be set when scope is known
    short: `${type}:${path}`,
  };
}

/**
 * Parse a qualified requirement ID (e.g., "FR:auth/session.expiry").
 * Returns null if the ID is invalid.
 * @req FR:req-traceability/id.format.full
 */
export function parseQualifiedId(idString: string): RequirementId | null {
  const match = idString.match(QUALIFIED_PATTERN);
  if (!match) {
    return null;
  }

  const [, typeStr, scope, path] = match;
  const type = typeStr as RequirementType;

  if (!VALID_TYPES.includes(type)) {
    return null;
  }

  if (!isValidPath(path)) {
    return null;
  }

  return {
    type,
    scope,
    path,
    qualified: `${type}:${scope}/${path}`,
    short: `${type}:${path}`,
  };
}

/**
 * Parse any valid requirement ID (auto-detect format).
 * Returns null if the ID is invalid.
 * @req FR:req-traceability/id.format
 */
export function parseRequirementId(idString: string): RequirementId | null {
  // Try qualified first (more specific)
  const qualified = parseQualifiedId(idString);
  if (qualified) {
    return qualified;
  }

  // Fall back to short-form
  return parseShortFormId(idString);
}

/**
 * Build a qualified ID from a short-form ID and scope.
 * If the ID already has a scope, returns it unchanged.
 * @req FR:req-traceability/id.format
 */
export function buildQualifiedId(id: RequirementId, scope: string): RequirementId {
  if (id.scope) {
    // Already has scope, return as-is
    return id;
  }

  return {
    ...id,
    scope,
    qualified: `${id.type}:${scope}/${id.path}`,
  };
}

/**
 * Check if a string is a valid requirement ID.
 * @req FR:req-traceability/id.format
 */
export function isValidRequirementId(idString: string): boolean {
  return parseRequirementId(idString) !== null;
}
