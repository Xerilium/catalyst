#!/usr/bin/env tsx

/**
 * Inject feedback playbook reference into all generated Catalyst commands
 *
 * Runs post-build after command generation. Inserts a preamble (track quality
 * throughout session) and appends a trigger (execute feedback playbook at end)
 * into every generated command file for all supported AI providers.
 *
 * @req FR:feedback-loop/inject.script
 * @req FR:feedback-loop/inject.all-providers
 * @req FR:feedback-loop/inject.source-safe
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  PROVIDER_COMMAND_CONFIGS,
  type ProviderCommandEntry,
} from '../src/ai/providers/command-configs';

/**
 * Get the feedback playbook path with provider-appropriate conventions
 *
 * Copilot's transform replaces `/catalyst/` with `/catalyst.` in paths,
 * so the feedback path must match that convention for consistency.
 *
 * @req FR:feedback-loop/inject.provider-conventions
 */
export function getPlaybookPath(provider: ProviderCommandEntry): string {
  const basePath = 'node_modules/@xerilium/catalyst/playbooks/invoke-retrospective.md';
  // Copilot uses flat naming — its generated files have /catalyst.playbooks/ not /catalyst/playbooks/
  if (!provider.commands.useNamespaces && provider.commands.separator === '.') {
    return basePath.replace('catalyst/', 'catalyst.');
  }
  return basePath;
}

/**
 * Build the preamble HTML comment inserted near the top of commands
 *
 * Instructs the AI to track workflow quality throughout the session.
 *
 * @req FR:feedback-loop/inject.preamble
 */
export function buildPreamble(): string {
  return [
    '<!-- [Catalyst Feedback] Track workflow quality throughout this session. -->',
    '<!-- Observe: user friction, instruction adherence, phase effectiveness, token efficiency, AUQ quality, artifact completeness. -->',
    '<!-- [AUQ] Before every AskUserQuestion: Is it necessary? Self-contained? Under 100 words? Actionable options? One recommended? -->',
  ].join('\n');
}

/**
 * Build the feedback trigger block appended at the bottom of commands
 *
 * @req FR:feedback-loop/inject.trigger
 * @req FR:feedback-loop/inject.provider-conventions
 */
export function buildTrigger(provider: ProviderCommandEntry): string {
  const feedbackPath = getPlaybookPath(provider);
  return [
    '',
    '---',
    '',
    '## After completing all steps above',
    '',
    `Execute @${feedbackPath}`,
    '',
  ].join('\n');
}

/**
 * Insert the preamble at the correct position in the command content
 *
 * For providers with frontmatter: insert after the closing `---`
 * For providers without frontmatter: insert at the very top
 *
 * @req FR:feedback-loop/inject.preamble
 * @req FR:feedback-loop/inject.provider-conventions
 */
export function insertPreamble(
  content: string,
  provider: ProviderCommandEntry
): string {
  const preamble = buildPreamble();

  if (provider.commands.useFrontMatter) {
    // Insert after closing --- of frontmatter
    const firstDash = content.indexOf('---');
    if (firstDash !== -1) {
      const secondDash = content.indexOf('---', firstDash + 3);
      if (secondDash !== -1) {
        const insertPoint = secondDash + 3;
        return content.slice(0, insertPoint) + '\n' + preamble + '\n' + content.slice(insertPoint);
      }
    }
  }

  // No frontmatter or frontmatter not found: insert at top
  return preamble + '\n' + content;
}

/**
 * Discover command files for a given provider
 *
 * @req FR:feedback-loop/inject.all-providers
 */
function discoverFiles(
  projectRoot: string,
  provider: ProviderCommandEntry
): string[] {
  const commandsDir = path.join(projectRoot, provider.commands.path);
  const ext = '.' + provider.commands.extension;

  if (provider.commands.useNamespaces) {
    const nsDir = path.join(commandsDir, 'catalyst');
    if (!fs.existsSync(nsDir)) return [];
    return fs
      .readdirSync(nsDir)
      .filter((f: string) => f.endsWith(ext))
      .map((f: string) => path.join(nsDir, f));
  } else {
    if (!fs.existsSync(commandsDir)) return [];
    return fs
      .readdirSync(commandsDir)
      .filter((f: string) => f.startsWith('catalyst.') && f.endsWith(ext))
      .map((f: string) => path.join(commandsDir, f));
  }
}

/**
 * Inject feedback preamble and trigger into all generated command files
 *
 * @req FR:feedback-loop/inject.script
 * @req FR:feedback-loop/inject.all-providers
 * @req FR:feedback-loop/inject.source-safe
 */
export function injectFeedback(projectRoot: string): void {
  const providers = Object.values(PROVIDER_COMMAND_CONFIGS);

  for (const provider of providers) {
    const files = discoverFiles(projectRoot, provider);

    for (const filePath of files) {
      let content = fs.readFileSync(filePath, 'utf8');

      // Insert preamble near top
      content = insertPreamble(content, provider);

      // Append trigger at bottom
      content += buildTrigger(provider);

      fs.writeFileSync(filePath, content);
      console.log(`  Injected feedback: ${filePath}`);
    }
  }
}

// Execute when run directly
if (require.main === module) {
  const projectRoot = path.resolve(__dirname, '..');
  console.log('Injecting feedback into generated commands...');
  injectFeedback(projectRoot);
  console.log('Feedback injection complete.');
}
