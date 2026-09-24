/**
 * Tests for the AI plugin generator (scripts/generate-plugin.ts).
 *
 * Generates the plugin from the real skill templates into a temp directory and
 * asserts on the output, so every template is covered.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import Ajv2020 from 'ajv/dist/2020';
import * as yaml from 'js-yaml';
import {
  AGENT_PLUGINS_SCHEMA,
  CLAUDE_BOOTSTRAP_COMMAND,
  PLUGIN_NAME,
  PORTABLE_BOOTSTRAP_COMMAND,
  PORTABLE_DIR,
  PORTABLE_PREFIX,
  buildClaudeManifest,
  buildPortableManifest,
  generatePlugin,
  parseFrontmatter,
  readPackageMeta,
  selfHost,
  type PackageMeta,
} from '../../scripts/generate-plugin';

const ROOT = path.join(__dirname, '../..');
const SOURCE_DIR = path.join(ROOT, 'src/resources/ai-plugin');
const TEMPLATES_DIR = path.join(SOURCE_DIR, 'skills');
const PACKAGE_JSON = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const templateNames = fs
  .readdirSync(TEMPLATES_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => path.basename(f, '.md'))
  .sort();

const readTemplate = (name: string) => fs.readFileSync(path.join(TEMPLATES_DIR, `${name}.md`), 'utf8');
const usesPackage = (name: string) => readTemplate(name).includes('@xerilium/catalyst');

let out: string;
let meta: PackageMeta;

const claudeSkill = (name: string) => fs.readFileSync(path.join(out, 'skills', name, 'SKILL.md'), 'utf8');
const portableSkill = (name: string) =>
  fs.readFileSync(path.join(out, PORTABLE_DIR, 'skills', `${PORTABLE_PREFIX}${name}`, 'SKILL.md'), 'utf8');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(out, rel), 'utf8'));

function listFiles(dir: string, prefix = ''): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? listFiles(path.join(dir, e.name), `${prefix}${e.name}/`)
        : [`${prefix}${e.name}`],
    )
    .sort();
}

beforeAll(() => {
  out = fs.mkdtempSync(path.join(os.tmpdir(), 'catalyst-plugin-'));
  meta = readPackageMeta(path.join(ROOT, 'package.json'));
  generatePlugin({ sourceDir: SOURCE_DIR, outDir: out, meta });
});

afterAll(() => {
  fs.rmSync(out, { recursive: true, force: true });
});

describe('skill templates', () => {
  // @req FR:ai-plugin/skills.@file
  it.each(templateNames)('%s declares a name matching its file and a description', (name) => {
    const { fields } = parseFrontmatter(readTemplate(name));
    expect(fields.get('name')?.replace(/"/g, '')).toBe(name);
    expect(fields.get('description')).toBeTruthy();
  });
});

describe('skill generation', () => {
  // @req FR:ai-plugin/skills.generate
  // @req FR:ai-plugin/skills.generate.claude
  it('writes one Claude skill per template', () => {
    expect(fs.readdirSync(path.join(out, 'skills')).sort()).toEqual(templateNames);
  });

  // @req FR:session-status/checkin.@ai-command
  it('publishes the sitrep skill as /catalyst:sitrep', () => {
    expect(parseFrontmatter(claudeSkill('sitrep')).fields.get('name')).toBe('sitrep');
    expect(readJson('.claude-plugin/plugin.json').name).toBe('catalyst');
  });

  // @req FR:ai-plugin/skills.generate
  // @req FR:ai-plugin/skills.generate.portable
  it('writes one portable skill per template with the catalyst- prefix', () => {
    expect(fs.readdirSync(path.join(out, PORTABLE_DIR, 'skills')).sort()).toEqual(
      templateNames.map((n) => `${PORTABLE_PREFIX}${n}`),
    );
  });

  // @req FR:ai-plugin/skills.frontmatter
  it.each(templateNames)('%s skills are named after their directories', (name) => {
    expect(parseFrontmatter(claudeSkill(name)).fields.get('name')).toBe(name);
    expect(parseFrontmatter(portableSkill(name)).fields.get('name')).toBe(`${PORTABLE_PREFIX}${name}`);
  });

  // @req FR:ai-plugin/skills.frontmatter.claude
  it.each(templateNames)('%s Claude skill keeps only supported frontmatter', (name) => {
    const keys = [...parseFrontmatter(claudeSkill(name)).fields.keys()];
    for (const key of keys) {
      expect(['name', 'description', 'argument-hint', 'allowed-tools']).toContain(key);
    }
    expect(keys).toEqual(expect.arrayContaining(['name', 'description']));
  });

  // @req FR:ai-plugin/skills.frontmatter.claude
  it('preserves argument hints and tool grants from templates', () => {
    const fields = parseFrontmatter(claudeSkill('create')).fields;
    expect(fields.get('argument-hint')).toBe('"[description]"');
    expect(fields.get('allowed-tools')).toBe('Read, Edit, Write, Glob, Grep, Bash, Task, TodoWrite');
  });

  // @req FR:ai-plugin/skills.frontmatter.claude
  // @req FR:ai-plugin/skills.frontmatter.portable
  it.each(templateNames)('%s skills have frontmatter that parses as YAML strings', (name) => {
    for (const skill of [claudeSkill(name), portableSkill(name)]) {
      const data = yaml.load(skill.slice(4, skill.indexOf('\n---\n'))) as Record<string, unknown>;
      for (const value of Object.values(data)) expect(typeof value).toBe('string');
    }
  });

  // @req FR:ai-plugin/skills.frontmatter.portable
  it.each(templateNames)('%s portable skill keeps only Agent Skills fields', (name) => {
    const { fields } = parseFrontmatter(portableSkill(name));
    expect([...fields.keys()].sort()).toEqual(['description', 'name']);
    expect(fields.get('name')).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(fields.get('name')!.length).toBeLessThanOrEqual(64);
    const description = fields.get('description')!.replace(/^"|"$/g, '');
    expect(description.length).toBeGreaterThan(0);
    expect(description.length).toBeLessThanOrEqual(1024);
  });
});

describe('skill transforms', () => {
  // @req FR:ai-plugin/skills.transform
  it.each(templateNames)('%s portable skill uses catalyst- skill references', (name) => {
    const skill = portableSkill(name);
    expect(skill).not.toMatch(/\/catalyst:/);
    if (parseFrontmatter(readTemplate(name)).body.includes('/catalyst:')) {
      expect(skill).toMatch(/\/catalyst-[a-z]/);
    }
  });

  // @req FR:ai-plugin/skills.transform
  it('keeps /catalyst: references in Claude skills', () => {
    expect(claudeSkill('run')).toContain('/catalyst:run');
  });

  // @req FR:ai-plugin/skills.transform.platform-claude
  it('names Claude as the platform in Claude skills', () => {
    for (const name of templateNames) expect(claudeSkill(name)).not.toContain('$$AI_PLATFORM$$');
    expect(claudeSkill('pr-review')).toContain('`ai-platform` → "Claude"');
  });

  // @req FR:ai-plugin/skills.transform.platform-portable
  it('asks the running platform for its name in portable skills', () => {
    for (const name of templateNames) expect(portableSkill(name)).not.toContain('$$AI_PLATFORM$$');
    expect(portableSkill('pr-review')).toMatch(/`ai-platform` → your AI platform's name/);
  });
});

describe('package check', () => {
  // @req FR:ai-plugin/skills.ensure
  it.each(templateNames)('%s gets a package check only when it uses the package', (name) => {
    const expected = usesPackage(name);
    expect(claudeSkill(name).includes(CLAUDE_BOOTSTRAP_COMMAND)).toBe(expected);
    expect(portableSkill(name).includes(PORTABLE_BOOTSTRAP_COMMAND)).toBe(expected);
  });

  // @req FR:ai-plugin/skills.ensure
  it('leaves the read-only sitrep skill without a package check', () => {
    expect(usesPackage('sitrep')).toBe(false);
    expect(claudeSkill('sitrep')).not.toContain('bootstrap');
  });

  // @req FR:ai-plugin/skills.ensure.claude
  it('points Claude checks at the bundled script', () => {
    expect(CLAUDE_BOOTSTRAP_COMMAND).toBe('node "${CLAUDE_PLUGIN_ROOT}/ai/plugin/bootstrap.js"');
  });

  // @req FR:ai-plugin/skills.ensure.portable
  it('points portable checks at the package binary', () => {
    expect(PORTABLE_BOOTSTRAP_COMMAND).toBe('npx -y -p @xerilium/catalyst catalyst-bootstrap');
  });

  // @req FR:ai-plugin/skills.ensure
  it('places the check before the skill body', () => {
    const body = parseFrontmatter(claudeSkill('create')).body.trimStart();
    expect(body.startsWith('>')).toBe(true);
    expect(body.indexOf(CLAUDE_BOOTSTRAP_COMMAND)).toBeLessThan(body.indexOf('# '));
  });

  // @req FR:ai-plugin/skills.ensure.allowed-tools
  it('pre-approves the bootstrap command when Bash is restricted', () => {
    const tools = parseFrontmatter(claudeSkill('pr-review')).fields.get('allowed-tools')!;
    expect(tools).toContain(`Bash(${CLAUDE_BOOTSTRAP_COMMAND})`);
  });

  // @req FR:ai-plugin/skills.ensure.allowed-tools
  it('leaves unrestricted Bash grants untouched', () => {
    const tools = parseFrontmatter(claudeSkill('create')).fields.get('allowed-tools')!;
    expect(tools).not.toContain('bootstrap');
  });
});

describe('manifests', () => {
  const schema = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'tests/fixtures/agent-plugins/plugin.schema.json'), 'utf8'),
  );

  // @req FR:ai-plugin/manifest.@claude
  // @req FR:ai-plugin/manifest.name
  // @req FR:ai-plugin/manifest.version
  it('writes the Claude manifest at .claude-plugin/plugin.json', () => {
    const manifest = readJson('.claude-plugin/plugin.json');
    expect(manifest.name).toBe(PLUGIN_NAME);
    expect(PLUGIN_NAME).toBe('catalyst');
    expect(manifest.version).toBe(PACKAGE_JSON.version);
  });

  // @req FR:ai-plugin/manifest.@portable
  // @req FR:ai-plugin/manifest.name
  // @req FR:ai-plugin/manifest.version
  it('writes the portable manifest at agent-plugin/plugin.json', () => {
    const manifest = readJson(`${PORTABLE_DIR}/plugin.json`);
    expect(manifest.$schema).toBe(AGENT_PLUGINS_SCHEMA);
    expect(manifest.name).toBe(PLUGIN_NAME);
    expect(manifest.version).toBe(PACKAGE_JSON.version);
  });

  // @req FR:ai-plugin/manifest.portable-schema
  it('produces a portable manifest valid against the Agent Plugins 1.0.0 schema', () => {
    const ajv = new Ajv2020({ strict: false });
    const validate = ajv.compile(schema);
    const manifest = readJson(`${PORTABLE_DIR}/plugin.json`);
    expect(validate(manifest)).toBe(true);
    expect(validate.errors ?? null).toBeNull();
  });

  // @req FR:ai-plugin/manifest.input
  // @req FR:ai-plugin/manifest.metadata
  it('copies package metadata into both manifests', () => {
    const input: PackageMeta = {
      name: '@acme/tool',
      version: '1.2.3',
      description: 'Tool',
      author: 'Acme Corp <dev@acme.test> (https://acme.test)',
      homepage: 'https://acme.test',
      repository: { type: 'git', url: 'git+https://github.com/acme/tool.git' },
      license: 'MIT',
      keywords: ['a', 'b'],
    };
    const expected = {
      description: 'Tool',
      author: { name: 'Acme Corp', email: 'dev@acme.test', url: 'https://acme.test' },
      homepage: 'https://acme.test',
      repository: 'https://github.com/acme/tool',
      license: 'MIT',
      keywords: ['a', 'b'],
    };
    expect(buildClaudeManifest(input)).toMatchObject({ name: PLUGIN_NAME, version: '1.2.3', ...expected });
    expect(buildPortableManifest(input)).toMatchObject({ name: PLUGIN_NAME, version: '1.2.3', ...expected });
  });

  // @req FR:ai-plugin/manifest.publish
  it('publishes the plugin artifacts and bootstrap binary in the npm package', () => {
    for (const entry of ['.claude-plugin', 'skills', 'hooks', 'agent-plugin', 'ai', 'bin']) {
      expect(PACKAGE_JSON.files).toContain(entry);
    }
    expect(PACKAGE_JSON.bin['catalyst-bootstrap']).toBe('./bin/catalyst-bootstrap.js');
    expect(fs.existsSync(path.join(ROOT, 'bin/catalyst-bootstrap.js'))).toBe(true);
  });
});

describe('marketplace', () => {
  const marketplace = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin/marketplace.json'), 'utf8'));

  // @req FR:ai-plugin/marketplace.@json
  // @req FR:ai-plugin/marketplace.name
  it('is named xerilium with an owner', () => {
    expect(marketplace.name).toBe('xerilium');
    expect(marketplace.owner?.name).toBeTruthy();
  });

  // @req FR:ai-plugin/marketplace.source
  it('lists the catalyst plugin from the npm package', () => {
    expect(marketplace.plugins).toHaveLength(1);
    expect(marketplace.plugins[0]).toMatchObject({
      name: PLUGIN_NAME,
      source: { source: 'npm', package: PACKAGE_JSON.name },
    });
  });
});

describe('hooks', () => {
  // @req FR:ai-plugin/bootstrap.@hook
  it('runs the bootstrap script in hook mode at session start', () => {
    const hooks = readJson('hooks/hooks.json').hooks;
    expect(Object.keys(hooks)).toEqual(['SessionStart']);
    const commands = hooks.SessionStart.flatMap((m: { hooks: Array<{ type: string; command: string }> }) => m.hooks);
    expect(commands).toEqual([expect.objectContaining({ type: 'command', command: `${CLAUDE_BOOTSTRAP_COMMAND} --hook` })]);
  });
});

describe('architecture constraints', () => {
  // @req AC:ai-plugin/single-source
  it('generates every artifact from the templates and nothing else', () => {
    expect(listFiles(out)).toEqual(
      [
        '.claude-plugin/plugin.json',
        'hooks/hooks.json',
        `${PORTABLE_DIR}/plugin.json`,
        ...templateNames.map((n) => `${PORTABLE_DIR}/skills/${PORTABLE_PREFIX}${n}/SKILL.md`),
        ...templateNames.map((n) => `skills/${n}/SKILL.md`),
      ].sort(),
    );
  });

  // @req AC:ai-plugin/thin-skills
  it.each(templateNames)('%s reaches Catalyst resources only through node_modules', (name) => {
    for (const skill of [claudeSkill(name), portableSkill(name)]) {
      const pluginRefs = skill.match(/\$\{CLAUDE_PLUGIN_ROOT\}[^\s"`)]*/g) ?? [];
      expect(pluginRefs.every((ref) => ref === '${CLAUDE_PLUGIN_ROOT}/ai/plugin/bootstrap.js')).toBe(true);
      for (const ref of skill.match(/[\w@./-]*playbooks\/[\w./-]+\.md/g) ?? []) {
        expect(ref).toMatch(/node_modules\/@xerilium\/catalyst\/playbooks\//);
      }
    }
  });

  // @req AC:ai-plugin/no-standing-cost
  it('declares no MCP servers or always-on context', () => {
    const files = listFiles(out);
    expect(files.some((f) => /(^|\/)\.?mcp\.json$/.test(f))).toBe(false);
    expect(readJson('.claude-plugin/plugin.json')).not.toHaveProperty('mcpServers');
    expect(files.some((f) => /(^|\/)(CLAUDE|AGENTS)\.md$/.test(f))).toBe(false);
  });
});

describe('self-hosting', () => {
  let target: string;

  beforeEach(() => {
    target = fs.mkdtempSync(path.join(os.tmpdir(), 'catalyst-self-host-'));
  });

  afterEach(() => {
    fs.rmSync(target, { recursive: true, force: true });
  });

  // @req FR:ai-plugin/build.self-host
  it('copies the Claude plugin and bootstrap script, replacing stale files', () => {
    const pkgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalyst-pkg-'));
    try {
      generatePlugin({ sourceDir: SOURCE_DIR, outDir: pkgDir, meta });
      fs.mkdirSync(path.join(pkgDir, 'ai/plugin'), { recursive: true });
      fs.writeFileSync(path.join(pkgDir, 'ai/plugin/bootstrap.js'), '// bootstrap');
      fs.mkdirSync(path.join(target, 'skills/removed'), { recursive: true });
      fs.writeFileSync(path.join(target, 'skills/removed/SKILL.md'), 'stale');

      selfHost({ packageDir: pkgDir, targetDir: target });

      expect(listFiles(target)).toEqual(
        [
          '.claude-plugin/plugin.json',
          'ai/plugin/bootstrap.js',
          'hooks/hooks.json',
          ...templateNames.map((n) => `skills/${n}/SKILL.md`),
        ].sort(),
      );
    } finally {
      fs.rmSync(pkgDir, { recursive: true, force: true });
    }
  });

  // @req FR:ai-plugin/build.self-host.ignored
  it('is git-ignored', () => {
    const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8').split('\n');
    expect(gitignore).toContain('.claude/skills/catalyst/');
  });
});
