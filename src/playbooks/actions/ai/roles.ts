/**
 * Role mapping for AI system prompts
 *
 * Maps known role names to their corresponding system prompt text.
 * Unknown roles are used directly as system prompts.
 */

/**
 * Known role name to system prompt mappings
 *
 * Keys are lowercase for case-insensitive matching.
 *
 * @req FR:playbook-actions-ai/ai-prompt.role.name
 */
const ROLE_MAPPINGS: Record<string, string> = {
  'product manager':
    'You are a strategic Product Manager. You define product requirements with precision, prioritize features based on business value and user impact, and ensure every decision aligns with measurable business goals. You think in terms of outcomes, not outputs.',

  engineer:
    'You are an expert Software Engineer. You implement features with clean, maintainable code following established patterns and best practices. You prioritize correctness, performance, and technical quality. You write code that other engineers can understand and extend.',

  architect:
    'You are a seasoned Software Architect. You design systems for scalability, maintainability, and long-term evolution. You make technical decisions with full awareness of trade-offs and ensure architectural consistency across the codebase.'
};

/**
 * Resolve role to system prompt text
 *
 * Algorithm:
 * 1. If role is empty/undefined, use playbookOwner as the effective role
 * 2. If effectiveRole matches a known role name (case-insensitive), return mapped system prompt
 * 3. Otherwise, use effectiveRole directly as the system prompt (custom role)
 *
 * @param role - Role from action config (role name, custom prompt, or empty)
 * @param playbookOwner - Playbook owner property used as default when role is empty
 * @returns System prompt text for the AI
 *
 * @example
 * ```typescript
 * // Known role name
 * resolveSystemPrompt('Engineer', 'Product Manager');
 * // → "You are an expert Software Engineer..."
 *
 * // Case-insensitive matching
 * resolveSystemPrompt('product manager', 'Engineer');
 * // → "You are a strategic Product Manager..."
 *
 * // Custom role (not a known name)
 * resolveSystemPrompt('You are a security expert.', 'Engineer');
 * // → "You are a security expert."
 *
 * // Empty role defaults to owner
 * resolveSystemPrompt('', 'Architect');
 * // → "You are a seasoned Software Architect..."
 *
 * // Undefined role defaults to owner
 * resolveSystemPrompt(undefined, 'Engineer');
 * // → "You are an expert Software Engineer..."
 * ```
 *
 * @req FR:playbook-actions-ai/ai-prompt.role
 * @req FR:playbook-actions-ai/ai-prompt.role.name
 * @req FR:playbook-actions-ai/ai-prompt.role.custom
 * @req FR:playbook-actions-ai/ai-prompt.role.default
 */
export function resolveSystemPrompt(
  role: string | undefined,
  playbookOwner: string
): string {
  // @req FR:playbook-actions-ai/ai-prompt.role.default
  const effectiveRole = role?.trim() || playbookOwner;

  // @req FR:playbook-actions-ai/ai-prompt.role.name
  const normalizedRole = effectiveRole.toLowerCase();
  const mappedPrompt = ROLE_MAPPINGS[normalizedRole];
  if (mappedPrompt) {
    return mappedPrompt;
  }

  // @req FR:playbook-actions-ai/ai-prompt.role.custom
  return effectiveRole;
}

/**
 * Get list of known role names
 *
 * @returns Array of recognized role names (title case)
 */
export function getKnownRoles(): string[] {
  return ['Product Manager', 'Engineer', 'Architect'];
}
