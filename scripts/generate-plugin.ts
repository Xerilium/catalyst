#!/usr/bin/env tsx

/**
 * Generate the Catalyst AI plugin payloads from skill templates.
 *
 * Both plugin payloads and the CLI come out of one source tree, as three
 * separately published artifacts, because their requirements conflict:
 *
 * - **`@xerilium/catalyst-plugin`**, built at `dist-plugin/` and published to
 *   npm, which the Claude Code marketplace entry sources: `package.json`,
 *   `.claude-plugin/plugin.json`, `skills/{name}/SKILL.md`,
 *   `scripts/bootstrap.js`. It declares no `bin` and has no top-level `bin/`
 *   directory, which claude.ai, Cowork, and organization sync reject.
 * - **`@xerilium/catalyst`**, built at `dist/`: the CLI, which keeps its
 *   `bin/` for `npx catalyst`, and which carries the Agent Plugins 1.0.0
 *   payload at `agent-plugin/` for platforms with no marketplace.
 *
 * Nothing generated is committed: both payloads are built on demand and
 * published from the build output.
 *
 * Usage:
 *   tsx scripts/generate-plugin.ts              # build dist-plugin/ and dist/agent-plugin/
 *   tsx scripts/generate-plugin.ts --self-host  # copy dist-plugin/ to .claude/skills/catalyst/
 *   tsx scripts/generate-plugin.ts --marketplace <file>  # write the marketplace listing
 *
 * @req FR:ai-plugin/skills.generate
 * @req FR:ai-plugin/plugin.package.no-bin
 */

import * as fs from 'fs';
import * as path from 'path';

export const PLUGIN_NAME = 'catalyst';
/** Build output for the plugin package, relative to the repository root. */
export const CLAUDE_PLUGIN_DIR = 'dist-plugin';
/** npm package that carries the Claude Code plugin, and only the plugin. */
export const PLUGIN_PACKAGE_NAME = '@xerilium/catalyst-plugin';
export const PORTABLE_DIR = 'agent-plugin';
export const PORTABLE_PREFIX = 'catalyst-';
export const AGENT_PLUGINS_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';
export const PACKAGE_NAME = '@xerilium/catalyst';
/** Bootstrap location inside the plugin payload. Never `bin/`. */
export const BOOTSTRAP_SCRIPT = 'scripts/bootstrap.js';
/** Bootstrap location inside the npm package. */
export const PACKAGE_BOOTSTRAP_SCRIPT = 'ai/plugin/bootstrap.js';
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
 * The package check at the top of every skill that reaches into the package.
 *
 * Claude skills run the bootstrap unconditionally: it is the only place the
 * plugin's minimum-version contract is enforced, and a version that is present
 * but too old would slip past a "only if missing" check. It exits immediately
 * when the installed package is present and new enough.
 *
 * Portable skills keep the conditional form, because their bootstrap runs
 * through `npx` (seconds, not milliseconds) and those skills ship inside the
 * package itself, so plugin and CLI versions cannot skew.
 *
 * @req FR:ai-plugin/skills.ensure
 * @req FR:ai-plugin/skills.ensure.min-version
 */
function packageCheck(target: Target): string {
  if (target === 'claude') {
    return (
      `> **Setup**: Run \`${CLAUDE_BOOTSTRAP_COMMAND}\` before continuing. It installs ` +
      `\`${PACKAGE_NAME}\` if the project is missing it and stops with upgrade instructions if the ` +
      `installed version is older than this plugin requires. Stop if it reports an error.`
    );
  }
  return `> **Setup**: If \`node_modules/${PACKAGE_NAME}/package.json\` doesn't exist, run \`${PORTABLE_BOOTSTRAP_COMMAND}\` before continuing.`;
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
 * @req FR:ai-plugin/skills.frontmatter
 * @req FR:ai-plugin/skills.frontmatter
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
 * @req FR:ai-plugin/plugin.metadata
 * @req FR:ai-plugin/plugin.metadata
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
 * Minimum `@xerilium/catalyst` version this plugin release requires: the
 * plugin's own `major.minor`, patch zeroed, so CLI patch releases stay
 * compatible and a skill never runs against a CLI that predates it.
 *
 * @req FR:ai-plugin/plugin.min-version
 */
export function minCatalystVersion(version: string): string {
  const match = /^(\d+)\.(\d+)\./.exec(version);
  return match ? `${match[1]}.${match[2]}.0` : version;
}

/**
 * `package.json` for the plugin package.
 *
 * It declares no `bin` and no dependencies. The bootstrap it ships imports
 * only Node built-ins, so Claude Code never has to install anything into the
 * plugin's cache directory — which it could not do anyway, because npm strips
 * `package-lock.json` from published packages.
 *
 * @req FR:ai-plugin/plugin.package
 * @req FR:ai-plugin/plugin.package.no-bin
 * @req FR:ai-plugin/plugin.package.no-bin
 */
export function buildPluginPackageJson(meta: PackageMeta): Record<string, unknown> {
  return {
    name: PLUGIN_PACKAGE_NAME,
    version: meta.version,
    ...sharedMetadata(meta),
    // After the spread: this package is the plugin, not the framework
    description: `Catalyst workflow skills as a Claude Code plugin. Drives the ${PACKAGE_NAME} CLI, which it installs into your project.`,
    files: ['.claude-plugin', 'skills', 'scripts', 'README.md', 'LICENSE'],
  };
}

/**
 * @req FR:ai-plugin/plugin.@ai-plugin
 * @req FR:ai-plugin/plugin.name
 * @req FR:ai-plugin/plugin.version
 * @req FR:ai-plugin/plugin.min-version
 */
export function buildClaudeManifest(meta: PackageMeta): Record<string, unknown> {
  return {
    name: PLUGIN_NAME,
    displayName: 'Catalyst',
    version: meta.version,
    ...sharedMetadata(meta),
    metadata: { minCatalystVersion: minCatalystVersion(meta.version) },
  };
}

/**
 * @req FR:ai-plugin/plugin.@ai-plugin
 * @req FR:ai-plugin/plugin.valid
 */
export function buildPortableManifest(meta: PackageMeta): Record<string, unknown> {
  return { $schema: AGENT_PLUGINS_SCHEMA, name: PLUGIN_NAME, version: meta.version, ...sharedMetadata(meta) };
}

export const MARKETPLACE_NAME = 'xerilium';

/**
 * Build the Claude Code marketplace listing for the public marketplace repository.
 *
 * The entry sources the plugin's own npm package, never the CLI package: one
 * tarball cannot both declare `bin` for `npx catalyst` and omit the top-level
 * `bin/` directory that claude.ai and Cowork refuse.
 *
 * It deliberately carries no `version`: `plugin.json` is the single source of
 * truth for it, and setting both makes Claude Code silently prefer the
 * manifest while `claude plugin validate` reports the mismatch.
 *
 * @req FR:ai-plugin/plugin.marketplace
 * @req FR:ai-plugin/plugin.marketplace.name
 * @req FR:ai-plugin/plugin.marketplace.source
 */
export function buildMarketplace(meta: PackageMeta): Record<string, unknown> {
  const author = parseAuthor(meta.author);
  return {
    name: MARKETPLACE_NAME,
    owner: { name: 'Xerilium', email: author?.email, url: 'https://github.com/xerilium' },
    description: 'Xerilium plugins for AI coding agents',
    plugins: [
      {
        name: PLUGIN_NAME,
        displayName: 'Catalyst',
        ...sharedMetadata(meta),
        source: { source: 'npm', package: PLUGIN_PACKAGE_NAME },
        category: 'development',
      },
    ],
  };
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
 * README for the plugin package. Published on npm, so it says what the package
 * is and how to install it rather than repeating the framework README.
 *
 * @req FR:ai-plugin/plugin.package
 */
export function pluginReadme(meta: PackageMeta): string {
  const code = (text: string) => '`' + text + '`';
  const fence = '```';
  const pkg = code(PACKAGE_NAME);
  return [
    '# Catalyst plugin for Claude Code',
    '',
    `Catalyst workflow skills as a Claude Code plugin. Install it from the ${code(MARKETPLACE_NAME)} marketplace, not with npm:`,
    '',
    `${fence}text`,
    '/plugin marketplace add xerilium/ai-plugins',
    `/plugin install ${PLUGIN_NAME}@${MARKETPLACE_NAME}`,
    fence,
    '',
    `The skills run playbooks from ${pkg}, which this plugin installs into your project with your own package manager the first time a skill needs it, so every teammate runs the version pinned in your lockfile. This release needs ${pkg} ${minCatalystVersion(meta.version)} or later.`,
    '',
    `For the framework itself, see [${PACKAGE_NAME}](https://www.npmjs.com/package/${PACKAGE_NAME}) and the [repository](https://github.com/xerilium/catalyst).`,
    '',
  ].join('\n');
}

/** Skill template names, in a stable order. @req FR:ai-plugin/skills.@ai-skill */
export function listSkills(sourceDir: string): string[] {
  return fs
    .readdirSync(path.join(sourceDir, 'skills'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.basename(f, '.md'))
    .sort();
}

/**
 * Build the `@xerilium/catalyst-plugin` package.
 *
 * `bootstrapSource` is the compiled zero-dependency bootstrap, copied in as
 * `scripts/bootstrap.js` so the package is self-contained and has no top-level
 * `bin/`. No `hooks/`: every skill carries its own package check, so the plugin
 * costs nothing until a skill runs.
 *
 * @req FR:ai-plugin/skills.generate
 * @req FR:ai-plugin/plugin.@ai-plugin
 * @req FR:ai-plugin/plugin.package
 * @req FR:ai-plugin/skills.generate
 * @req FR:ai-plugin/plugin.package.no-bin
 * @req AC:ai-plugin/no-standing-cost
 */
export function generateClaudePlugin(options: {
  sourceDir: string;
  outDir: string;
  meta: PackageMeta;
  bootstrapSource: string;
  license?: string;
}): { skills: string[] } {
  const { sourceDir, outDir, meta, bootstrapSource, license } = options;
  // Read first: the source may be the copy inside `outDir` that we are about to delete
  const bootstrap = fs.readFileSync(bootstrapSource, 'utf8');
  fs.rmSync(outDir, { recursive: true, force: true });

  const skills = listSkills(sourceDir);
  for (const name of skills) {
    const template = fs.readFileSync(path.join(sourceDir, 'skills', `${name}.md`), 'utf8');
    writeFile(path.join(outDir, 'skills', name, 'SKILL.md'), renderSkill(name, template, 'claude'));
  }

  writeJson(path.join(outDir, '.claude-plugin', 'plugin.json'), buildClaudeManifest(meta));
  writeJson(path.join(outDir, 'package.json'), buildPluginPackageJson(meta));
  writeFile(path.join(outDir, BOOTSTRAP_SCRIPT), bootstrap);
  writeFile(path.join(outDir, 'README.md'), pluginReadme(meta));
  if (license) { writeFile(path.join(outDir, 'LICENSE'), license); }
  return { skills };
}

/**
 * Generate the portable Agent Plugins payload inside the npm package.
 *
 * @req FR:ai-plugin/skills.generate
 * @req FR:ai-plugin/plugin.@ai-plugin
 * @req FR:ai-plugin/plugin.publish
 * @req FR:ai-plugin/skills.generate
 */
export function generatePortablePlugin(options: {
  sourceDir: string;
  outDir: string;
  meta: PackageMeta;
}): { skills: string[] } {
  const { sourceDir, outDir, meta } = options;
  const target = path.join(outDir, PORTABLE_DIR);
  fs.rmSync(target, { recursive: true, force: true });

  const skills = listSkills(sourceDir);
  for (const name of skills) {
    const template = fs.readFileSync(path.join(sourceDir, 'skills', `${name}.md`), 'utf8');
    writeFile(path.join(target, 'skills', `${PORTABLE_PREFIX}${name}`, 'SKILL.md'), renderSkill(name, template, 'portable'));
  }

  writeJson(path.join(target, 'plugin.json'), buildPortableManifest(meta));
  return { skills };
}

/**
 * Install the built plugin package as a project skills-directory plugin.
 *
 * @req FR:ai-plugin/local.self-host
 * @req FR:ai-plugin/local.self-host.ignored
 */
export function selfHost(options: { pluginDir: string; targetDir: string }): void {
  const { pluginDir, targetDir } = options;
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.cpSync(pluginDir, targetDir, { recursive: true });
  // Keep the generated copy out of version control without touching the project's .gitignore
  fs.writeFileSync(path.join(targetDir, '.gitignore'), '*\n');
}

/** Compiled bootstrap, preferring this build's output over an earlier install. */
function resolveBootstrapSource(root: string): string {
  const candidates = [
    path.join(root, 'dist', PACKAGE_BOOTSTRAP_SCRIPT),
    path.join(root, 'node_modules', PACKAGE_NAME, PACKAGE_BOOTSTRAP_SCRIPT),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(`Compiled bootstrap not found. Run: npm run build\n  Looked in:\n   ${candidates.join('\n   ')}`);
  }
  return found;
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const sourceDir = path.join(root, 'src', 'resources', 'ai-plugin');
  const meta = readPackageMeta(path.join(root, 'package.json'));
  const pluginDir = path.join(root, CLAUDE_PLUGIN_DIR);
  const marketplaceArg = process.argv.indexOf('--marketplace');

  if (marketplaceArg !== -1) {
    const target = path.resolve(process.argv[marketplaceArg + 1] ?? 'marketplace.json');
    writeJson(target, buildMarketplace(meta));
    console.log(`  Wrote marketplace listing to ${target}`);
  } else if (process.argv.includes('--self-host')) {
    const targetDir = path.join(root, '.claude', 'skills', PLUGIN_NAME);
    selfHost({ pluginDir, targetDir });
    console.log(`  Self-hosted plugin at ${path.relative(root, targetDir)}`);
  } else {
    const licensePath = path.join(root, 'LICENSE');
    const claude = generateClaudePlugin({
      sourceDir,
      outDir: pluginDir,
      meta,
      bootstrapSource: resolveBootstrapSource(root),
      license: fs.existsSync(licensePath) ? fs.readFileSync(licensePath, 'utf8') : undefined,
    });
    const portable = generatePortablePlugin({ sourceDir, outDir: path.join(root, 'dist'), meta });
    console.log(`  Generated ${CLAUDE_PLUGIN_DIR}/ and dist/${PORTABLE_DIR}/ with ${claude.skills.length} skills`);
    if (portable.skills.length !== claude.skills.length) {
      throw new Error('Payloads disagree on skill count');
    }
  }
}
