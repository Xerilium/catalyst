#!/usr/bin/env tsx

/**
 * Generate the Catalyst AI plugin from skill templates.
 *
 * Writes into the package directory (dist/ during build):
 * - Claude Code plugin at the package root: `.claude-plugin/plugin.json`,
 *   `skills/{name}/SKILL.md`, `hooks/hooks.json`
 * - Agent Plugins 1.0.0 package at `agent-plugin/`: `plugin.json`,
 *   `skills/catalyst-{name}/SKILL.md`
 *
 * Usage:
 *   tsx scripts/generate-plugin.ts              # generate into dist/
 *   tsx scripts/generate-plugin.ts --self-host  # copy installed plugin to .claude/skills/catalyst/
 *
 * @req AC:ai-plugin/single-source
 */

import * as fs from 'fs';
import * as path from 'path';

export const PLUGIN_NAME = 'catalyst';
export const PORTABLE_DIR = 'agent-plugin';
export const PORTABLE_PREFIX = 'catalyst-';
export const AGENT_PLUGINS_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';
export const PACKAGE_NAME = '@xerilium/catalyst';
export const BOOTSTRAP_SCRIPT = 'ai/plugin/bootstrap.js';
export const CLAUDE_BOOTSTRAP_COMMAND = 'node "${CLAUDE_PLUGIN_ROOT}/' + BOOTSTRAP_SCRIPT + '"';
export const PORTABLE_BOOTSTRAP_COMMAND = `npx -y -p ${PACKAGE_NAME} catalyst-bootstrap`;

const AI_PLATFORM_TOKEN = '$$AI_PLATFORM$$';
const CLAUDE_FRONTMATTER = ['name', 'description', 'argument-hint', 'allowed-tools'];
const PORTABLE_PLATFORM = `your AI platform's name (e.g., "Copilot", "Cursor", "Codex")`;

export interface PackageMeta {
  name: string;
  version: string;
  description?: string;
  author?: string | { name?: string; email?: string; url?: string };
  homepage?: string;
  repository?: string | { type?: string; url?: string };
  license?: string;
  keywords?: string[];
}

export interface Frontmatter {
  /** Raw values keyed by field, in file order; continuation lines joined with `\n` */
  fields: Map<string, string>;
  body: string;
}

type Target = 'claude' | 'portable';

/** Literal (non-pattern) replace-all. */
const replaceAll = (text: string, find: string, replacement: string): string => text.split(find).join(replacement);

/**
 * Parse simple `key: value` frontmatter without YAML coercion, so values like
 * `argument-hint: [issue]` stay strings.
 */
export function parseFrontmatter(content: string): Frontmatter {
  const fields = new Map<string, string>();
  if (!content.startsWith('---\n')) return { fields, body: content };
  const end = content.indexOf('\n---\n', 3);
  if (end === -1) return { fields, body: content };

  let current: string | undefined;
  for (const line of content.slice(4, end).split('\n')) {
    const match = /^([A-Za-z][\w-]*):\s?(.*)$/.exec(line);
    if (match) {
      current = match[1];
      fields.set(current, match[2]);
    } else if (current && /^\s/.test(line)) {
      fields.set(current, `${fields.get(current)}\n${line}`);
    }
  }
  return { fields, body: content.slice(end + 5) };
}

function unquote(value: string): string {
  const v = value.trim();
  return v.startsWith('"') && v.endsWith('"') ? (JSON.parse(v) as string) : v;
}

function yamlString(value: string): string {
  return /^[A-Za-z0-9(][^\n]*$/.test(value) && !/:\s|\s#/.test(value) ? value : JSON.stringify(value);
}

/** Split a tool list on top-level commas (commas inside `Bash(...)` are kept). */
function splitTools(tools: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let item = '';
  for (const ch of tools) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      items.push(item.trim());
      item = '';
    } else {
      item += ch;
    }
  }
  if (item.trim()) items.push(item.trim());
  return items;
}

/** @req FR:ai-plugin/skills.ensure */
function usesPackage(template: string): boolean {
  return template.includes(PACKAGE_NAME);
}

/**
 * @req FR:ai-plugin/skills.ensure.claude
 * @req FR:ai-plugin/skills.ensure.portable
 */
function packageCheck(target: Target): string {
  const command = target === 'claude' ? CLAUDE_BOOTSTRAP_COMMAND : PORTABLE_BOOTSTRAP_COMMAND;
  return `> **Setup**: If \`node_modules/${PACKAGE_NAME}/package.json\` doesn't exist, run \`${command}\` before continuing.`;
}

/**
 * @req FR:ai-plugin/skills.transform
 * @req FR:ai-plugin/skills.transform.platform-claude
 * @req FR:ai-plugin/skills.transform.platform-portable
 */
function transformBody(body: string, target: Target): string {
  if (target === 'claude') return replaceAll(body, AI_PLATFORM_TOKEN, 'Claude');
  let result = replaceAll(body, '/catalyst:', `/${PORTABLE_PREFIX}`);
  result = replaceAll(result, `"${AI_PLATFORM_TOKEN}"`, PORTABLE_PLATFORM);
  return replaceAll(result, AI_PLATFORM_TOKEN, "your AI platform's name");
}

/**
 * Render one skill for a target platform.
 *
 * @req FR:ai-plugin/skills.frontmatter
 * @req FR:ai-plugin/skills.frontmatter.claude
 * @req FR:ai-plugin/skills.frontmatter.portable
 * @req FR:ai-plugin/skills.ensure
 * @req FR:ai-plugin/skills.ensure.allowed-tools
 */
export function renderSkill(name: string, template: string, target: Target): string {
  const { fields, body } = parseFrontmatter(template);
  const needsCheck = usesPackage(template);
  const description = unquote(fields.get('description') ?? '');

  const lines: string[] = [];
  if (target === 'claude') {
    lines.push(`name: ${name}`, `description: ${yamlString(description)}`);
    for (const key of CLAUDE_FRONTMATTER.slice(2)) {
      let value = fields.get(key);
      if (value === undefined) continue;
      if (key === 'allowed-tools' && needsCheck && !splitTools(value).includes('Bash')) {
        value = `${value}, Bash(${CLAUDE_BOOTSTRAP_COMMAND})`;
      }
      // Hints like `[pr-number] [max-rounds]` aren't valid unquoted YAML
      lines.push(`${key}: ${key === 'argument-hint' ? yamlString(unquote(value)) : value}`);
    }
  } else {
    lines.push(`name: ${PORTABLE_PREFIX}${name}`, `description: ${yamlString(description)}`);
  }

  const content = transformBody(body.replace(/^\n+/, ''), target);
  const sections = needsCheck ? [packageCheck(target), content] : [content];
  return `---\n${lines.join('\n')}\n---\n\n${sections.join('\n\n')}`;
}

function parseAuthor(author: PackageMeta['author']): { name?: string; email?: string; url?: string } | undefined {
  if (!author) return undefined;
  if (typeof author !== 'string') return prune({ name: author.name, email: author.email, url: author.url });
  const match = /^([^<(]+?)\s*(?:<([^>]+)>)?\s*(?:\(([^)]+)\))?$/.exec(author.trim());
  return match ? prune({ name: match[1], email: match[2], url: match[3] }) : { name: author };
}

function repositoryUrl(repository: PackageMeta['repository']): string | undefined {
  const url = typeof repository === 'string' ? repository : repository?.url;
  return url?.replace(/^git\+/, '').replace(/\.git$/, '');
}

function prune<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

/**
 * @req FR:ai-plugin/manifest.input
 * @req FR:ai-plugin/manifest.metadata
 */
function sharedMetadata(meta: PackageMeta) {
  return prune({
    description: meta.description,
    author: parseAuthor(meta.author),
    homepage: meta.homepage,
    repository: repositoryUrl(meta.repository),
    license: meta.license,
    keywords: meta.keywords,
  });
}

/**
 * @req FR:ai-plugin/manifest.@claude
 * @req FR:ai-plugin/manifest.name
 * @req FR:ai-plugin/manifest.version
 */
export function buildClaudeManifest(meta: PackageMeta): Record<string, unknown> {
  return { name: PLUGIN_NAME, displayName: 'Catalyst', version: meta.version, ...sharedMetadata(meta) };
}

/**
 * @req FR:ai-plugin/manifest.@portable
 * @req FR:ai-plugin/manifest.portable-schema
 */
export function buildPortableManifest(meta: PackageMeta): Record<string, unknown> {
  return { $schema: AGENT_PLUGINS_SCHEMA, name: PLUGIN_NAME, version: meta.version, ...sharedMetadata(meta) };
}

export function readPackageMeta(packageJsonPath: string): PackageMeta {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageMeta;
}

function writeFile(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.endsWith('\n') ? content : `${content}\n`);
}

const writeJson = (file: string, data: unknown) => writeFile(file, JSON.stringify(data, null, 2));

/**
 * Generate both plugin layouts into `outDir`.
 *
 * @req FR:ai-plugin/skills.generate
 * @req FR:ai-plugin/skills.generate.claude
 * @req FR:ai-plugin/skills.generate.portable
 * @req FR:ai-plugin/bootstrap.@hook
 * @req AC:ai-plugin/single-source
 * @req AC:ai-plugin/no-standing-cost
 */
export function generatePlugin(options: { sourceDir: string; outDir: string; meta: PackageMeta }): { skills: string[] } {
  const { sourceDir, outDir, meta } = options;
  for (const rel of ['.claude-plugin', 'skills', 'hooks', PORTABLE_DIR]) {
    fs.rmSync(path.join(outDir, rel), { recursive: true, force: true });
  }

  // @req FR:ai-plugin/skills.@file
  const templatesDir = path.join(sourceDir, 'skills');
  const skills = fs
    .readdirSync(templatesDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.basename(f, '.md'))
    .sort();

  for (const name of skills) {
    const template = fs.readFileSync(path.join(templatesDir, `${name}.md`), 'utf8');
    writeFile(path.join(outDir, 'skills', name, 'SKILL.md'), renderSkill(name, template, 'claude'));
    writeFile(
      path.join(outDir, PORTABLE_DIR, 'skills', `${PORTABLE_PREFIX}${name}`, 'SKILL.md'),
      renderSkill(name, template, 'portable'),
    );
  }

  writeJson(path.join(outDir, '.claude-plugin', 'plugin.json'), buildClaudeManifest(meta));
  writeJson(path.join(outDir, PORTABLE_DIR, 'plugin.json'), buildPortableManifest(meta));
  fs.mkdirSync(path.join(outDir, 'hooks'), { recursive: true });
  fs.copyFileSync(path.join(sourceDir, 'hooks', 'hooks.json'), path.join(outDir, 'hooks', 'hooks.json'));

  return { skills };
}

/**
 * Install the packaged Claude plugin as a project skills-directory plugin.
 *
 * @req FR:ai-plugin/build.self-host
 */
export function selfHost(options: { packageDir: string; targetDir: string }): void {
  const { packageDir, targetDir } = options;
  fs.rmSync(targetDir, { recursive: true, force: true });
  for (const rel of ['.claude-plugin', 'skills', 'hooks', BOOTSTRAP_SCRIPT]) {
    fs.cpSync(path.join(packageDir, rel), path.join(targetDir, rel), { recursive: true });
  }
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  if (process.argv.includes('--self-host')) {
    const targetDir = path.join(root, '.claude', 'skills', PLUGIN_NAME);
    selfHost({ packageDir: path.join(root, 'node_modules', PACKAGE_NAME), targetDir });
    console.log(`  Self-hosted plugin at ${path.relative(root, targetDir)}`);
  } else {
    const { skills } = generatePlugin({
      sourceDir: path.join(root, 'src', 'resources', 'ai-plugin'),
      outDir: path.join(root, 'dist'),
      meta: readPackageMeta(path.join(root, 'package.json')),
    });
    console.log(`  Generated plugin with ${skills.length} skills`);
  }
}
