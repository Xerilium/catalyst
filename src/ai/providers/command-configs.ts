/**
 * Static command configurations for AI providers
 *
 * This file contains command configuration data without importing full provider
 * implementations. This allows postinstall to generate commands without loading
 * provider dependencies that may have unresolved path aliases.
 */

import type { AIProviderCommandConfig } from '../types';

/**
 * Provider command configuration entry
 *
 * Contains the minimum information needed to generate command files
 * for a provider without instantiating the full provider class.
 */
export interface ProviderCommandEntry {
  /** Provider display name (used in command templates) */
  displayName: string;
  /** Command configuration */
  commands: AIProviderCommandConfig;
}

/**
 * Static registry of provider command configurations
 *
 * Only providers that support slash commands are included here.
 * This registry is kept in sync with provider implementations.
 *
 * @req FR:ai-provider/commands.discovery
 */
export const PROVIDER_COMMAND_CONFIGS: Record<string, ProviderCommandEntry> = {
  claude: {
    displayName: 'Claude',
    commands: {
      path: '.claude/commands',
      useNamespaces: true,
      separator: ':',
      useFrontMatter: true,
      extension: 'md'
    }
  },
  copilot: {
    displayName: 'Copilot',
    commands: {
      path: '.github/prompts',
      useNamespaces: false,
      separator: '.',
      useFrontMatter: false,
      extension: 'prompt.md'
    }
  },
  cursor: {
    displayName: 'Cursor',
    commands: {
      path: '.cursor/commands',
      useNamespaces: true,
      separator: '/',
      useFrontMatter: true,
      extension: 'md'
    }
  }
};
