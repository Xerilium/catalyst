/**
 * Command generation utilities for AI providers
 *
 * Generates platform-specific command files from templates based on
 * provider command configurations. This enables Catalyst commands to be
 * available in each AI tool's native command/prompt interface.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  PROVIDER_COMMAND_CONFIGS,
  type ProviderCommandEntry
} from './providers/command-configs';

/**
 * Get all providers that have command configuration defined
 *
 * Returns entries from the static command config registry.
 * This avoids instantiating full provider classes during postinstall.
 *
 * @returns Array of provider command entries
 * @req FR:ai-provider/commands.generate
 * @req FR:ai-provider/commands.transform
 * @req FR:ai-provider/commands.discovery
 */
export function getProvidersWithCommands(): ProviderCommandEntry[] {
  return Object.values(PROVIDER_COMMAND_CONFIGS);
}

/**
 * Generate command files for all providers with command configuration
 *
 * Reads command templates from the specified templates directory and generates
 * platform-specific command files for each provider that has commands configured.
 *
 * @param projectRoot - Root directory of the target project
 * @param templatesDir - Directory containing command templates (defaults to package resources)
 * @req FR:ai-provider/commands.generate
 */
export function generateProviderCommands(
  projectRoot: string,
  templatesDir?: string
): void {
  // Default to package ai-config directory (promoted to dist root during build)
  const commandsDir = templatesDir || path.join(__dirname, '../ai-config/commands');

  // Read all command templates
  let commandFiles: string[] = [];
  try {
    commandFiles = fs
      .readdirSync(commandsDir)
      .filter((file) => file.endsWith('.md'));
  } catch (error) {
    console.error('Failed to read commands directory:', (error as Error).message);
    return;
  }

  // Get providers with command configuration
  const providers = getProvidersWithCommands();

  if (providers.length === 0) {
    console.log('No providers with command configuration found');
    return;
  }

  // Generate commands for each provider
  for (const provider of providers) {
    const { commands, displayName } = provider;

    for (const commandFile of commandFiles) {
      // Extract command name from filename (remove .md extension)
      const commandName = path.basename(commandFile, '.md');

      // Read command template
      const templatePath = path.join(commandsDir, commandFile);
      let content = '';
      try {
        content = fs.readFileSync(templatePath, 'utf8');
      } catch (error) {
        console.error(
          `Failed to read command template ${commandFile}:`,
          (error as Error).message
        );
        continue;
      }

      // Apply transformations
      content = transformCommandContent(content, commandName, provider);

      // Determine filename and path
      let fileName: string;
      if (commands.useNamespaces) {
        fileName = `catalyst/${commandName}.${commands.extension}`;
      } else {
        fileName = `catalyst.${commandName}.${commands.extension}`;
      }
      const targetPath = path.join(projectRoot, commands.path, fileName);

      try {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, content);
        console.log(`Generated ${displayName} command at ${targetPath}`);
      } catch (error) {
        console.error(
          `Failed to generate ${displayName} command:`,
          (error as Error).message
        );
      }
    }

    // Write .gitignore to prevent committing generated commands
    // @req FR:ai-provider/commands.generate
    writeCommandGitignore(projectRoot, provider);
  }
}

/**
 * Write .gitignore alongside generated commands to prevent committing them
 *
 * For folder-based providers (useNamespaces: true), writes a .gitignore containing
 * just `*` in the namespace subdirectory — everything is ignored and regenerated
 * by postinstall.
 *
 * For flat providers (useNamespaces: false), merges the Catalyst file pattern
 * into the provider directory's existing .gitignore, preserving non-Catalyst content.
 *
 * @param projectRoot - Root directory of the target project
 * @param provider - Provider with command configuration
 * @req FR:ai-provider/gitignore.folder
 * @req FR:ai-provider/gitignore.flat-new
 * @req FR:ai-provider/gitignore.flat-merge
 * @req FR:ai-provider/gitignore.header
 * @req FR:ai-provider/gitignore.idempotent
 */
export function writeCommandGitignore(
  projectRoot: string,
  provider: ProviderCommandEntry
): void {
  const { commands } = provider;

  if (commands.useNamespaces) {
    // Folder-based: write `*` into the catalyst/ subdirectory
    const gitignorePath = path.join(projectRoot, commands.path, 'catalyst/.gitignore');
    try {
      fs.mkdirSync(path.dirname(gitignorePath), { recursive: true });
      fs.writeFileSync(gitignorePath, '# Generated by Catalyst — do not edit manually\n*\n');
    } catch (error) {
      console.error(
        `Failed to write .gitignore for ${provider.displayName}:`,
        (error as Error).message
      );
    }
  } else {
    // Flat: merge catalyst pattern into provider directory .gitignore
    const gitignorePath = path.join(projectRoot, commands.path, '.gitignore');
    const pattern = `catalyst.*.${commands.extension}`;

    let existingContent = '';
    try {
      existingContent = fs.readFileSync(gitignorePath, 'utf8');
    } catch {
      // File doesn't exist yet — start fresh
    }

    // Only append if pattern isn't already present
    if (!existingContent.includes(pattern)) {
      const catalystSection = `\n# Generated by Catalyst — do not edit manually\n${pattern}\n`;
      const newContent = existingContent
        ? existingContent.replace(/\n?$/, '\n') + catalystSection
        : `# Generated by Catalyst — do not edit manually\n.gitignore\n${pattern}\n`;
      try {
        fs.mkdirSync(path.dirname(gitignorePath), { recursive: true });
        fs.writeFileSync(gitignorePath, newContent);
      } catch (error) {
        console.error(
          `Failed to write .gitignore for ${provider.displayName}:`,
          (error as Error).message
        );
      }
    }
  }
}

/**
 * Transform command content based on provider configuration
 *
 * Applies the following transformations:
 * - Remove front matter if useFrontMatter is false
 * - Replace namespace separator (: in templates) with provider's separator
 * - Replace namespace syntax with flat syntax if useNamespaces is false
 * - Replace $$AI_PLATFORM$$ placeholder with provider's displayName
 *
 * @param content - Original command template content
 * @param commandName - Name of the command (e.g., 'rollout', 'init')
 * @param provider - Provider with command configuration
 * @returns Transformed content
 * @req FR:ai-provider/commands.transform
 */
export function transformCommandContent(
  content: string,
  commandName: string,
  provider: ProviderCommandEntry
): string {
  const { commands, displayName } = provider;

  // Remove frontmatter if not used
  // @req FR:ai-provider/commands.transform
  if (!commands.useFrontMatter) {
    const frontMatterEnd = content.indexOf('---', 4);
    if (frontMatterEnd !== -1) {
      content = content.substring(frontMatterEnd + 3).trim();
    }
  }

  // Replace namespace separator (: in templates) with provider's separator
  // @req FR:ai-provider/commands.transform
  if (commands.separator !== ':') {
    content = content.replace(
      new RegExp(`/catalyst:`, 'g'),
      `/catalyst${commands.separator}`
    );
  }

  // Apply namespace transformation if useNamespaces is false
  // @req FR:ai-provider/commands.transform
  if (!commands.useNamespaces) {
    // Replace /catalyst:name with /catalyst.name (flat style)
    content = content.replace(
      new RegExp(`/catalyst${commands.separator}([a-z-]+)`, 'g'),
      '/catalyst.$1'
    );
  }

  // Replace AI platform placeholder with provider's displayName
  // @req FR:ai-provider/commands.transform
  content = content.replace(/\$\$AI_PLATFORM\$\$/g, displayName);

  return content;
}
