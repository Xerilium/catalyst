#!/usr/bin/env tsx

/**
 * Inject the feedback playbook into every skill of the self-hosted plugin
 *
 * Runs during local builds after the plugin is self-hosted at
 * `.claude/skills/catalyst/`. Inserts a preamble (track quality throughout the
 * session) after each skill's frontmatter and appends a trigger (execute the
 * feedback playbook at the end). Never touches skill templates or the
 * packaged plugin.
 *
 * @req FR:feedback-loop/inject.script
 * @req FR:feedback-loop/inject.plugin-skills
 * @req FR:feedback-loop/inject.source-safe
 */

import * as fs from 'fs';
import * as path from 'path';

/** Skills of the self-hosted plugin, relative to the project root */
export const SELF_HOSTED_SKILLS_DIR = '.claude/skills/catalyst/skills';

export const FEEDBACK_PLAYBOOK = 'node_modules/@xerilium/catalyst/playbooks/invoke-retrospective.md';

/**
 * Build the preamble HTML comment inserted after the frontmatter
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
 * Build the feedback trigger block appended at the bottom of skills
 *
 * @req FR:feedback-loop/inject.trigger
 */
export function buildTrigger(): string {
  return ['', '---', '', '## After completing all steps above', '', `Execute @${FEEDBACK_PLAYBOOK}`, ''].join('\n');
}

/**
 * Insert the preamble right after the frontmatter (or at the top without one)
 *
 * @req FR:feedback-loop/inject.preamble
 */
export function insertPreamble(content: string): string {
  const preamble = buildPreamble();
  if (content.startsWith('---\n')) {
    const end = content.indexOf('\n---\n', 3);
    if (end !== -1) {
      const insertAt = end + '\n---\n'.length;
      return `${content.slice(0, insertAt)}${preamble}\n${content.slice(insertAt)}`;
    }
  }
  return `${preamble}\n${content}`;
}

/**
 * Inject feedback into every self-hosted skill.
 *
 * @returns Sorted paths of the skill files that were updated
 * @req FR:feedback-loop/inject.script
 * @req FR:feedback-loop/inject.plugin-skills
 * @req FR:feedback-loop/inject.source-safe
 */
export function injectFeedback(projectRoot: string): string[] {
  const skillsDir = path.join(projectRoot, SELF_HOSTED_SKILLS_DIR);
  if (!fs.existsSync(skillsDir)) return [];

  const files = fs
    .readdirSync(skillsDir)
    .map((name) => path.join(skillsDir, name, 'SKILL.md'))
    .filter((file) => fs.existsSync(file))
    .sort();

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, insertPreamble(content).replace(/\n*$/, '\n') + buildTrigger());
  }
  return files;
}

// Execute when run directly
if (require.main === module) {
  const projectRoot = path.resolve(__dirname, '..');
  console.log('Injecting feedback into self-hosted plugin skills...');
  const files = injectFeedback(projectRoot);
  console.log(`Feedback injected into ${files.length} skills.`);
}
