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
  BOOTSTRAP_SCRIPT,
  CLAUDE_BOOTSTRAP_COMMAND,
  CLAUDE_PLUGIN_DIR,
  PLUGIN_NAME,
  PLUGIN_REPO_REF,
  PLUGIN_REPO_URL,
  PORTABLE_BOOTSTRAP_COMMAND,
  PORTABLE_DIR,
  PORTABLE_PREFIX,
  buildClaudeManifest,
  buildMarketplace,
  buildPortableManifest,
  diffPayload,
  generateClaudePlugin,
  generatePortablePlugin,
  minCatalystVersion,
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
/** The Claude payload root inside `out`, mirroring the repository's `plugin/`. */
let claudeOut: string;
let meta: PackageMeta;
/** Stand-in for the compiled bootstrap the build copies into the payload. */
const BOOTSTRAP_STUB = '// compiled bootstrap\n';

const claudeSkill = (name: string) => fs.readFileSync(path.join(claudeOut, 'skills', name, 'SKILL.md'), 'utf8');
const portableSkill = (name: string) =>
  fs.readFileSync(path.join(out, PORTABLE_DIR, 'skills', `${PORTABLE_PREFIX}${name}`, 'SKILL.md'), 'utf8');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(claudeOut, rel), 'utf8'));
const readPortableJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(out, PORTABLE_DIR, rel), 'utf8'));

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
  claudeOut = path.join(out, CLAUDE_PLUGIN_DIR);
  meta = readPackageMeta(path.join(ROOT, 'package.json'));
  const bootstrapSource = path.join(out, 'bootstrap-source.js');
  fs.writeFileSync(bootstrapSource, BOOTSTRAP_STUB);
  generateClaudePlugin({ sourceDir: SOURCE_DIR, outDir: claudeOut, meta, bootstrapSource });
  generatePortablePlugin({ sourceDir: SOURCE_DIR, outDir: out, meta });
});

afterAll(() => {
  fs.rmSync(out, { recursive: true, force: true });
});

describe('skill templates', () => {
  // @req FR:ai-plugin/skills.@ai-skill
  it.each(templateNames)('%s declares a name matching its file and a description', (name) => {
    const { fields } = parseFrontmatter(readTemplate(name));
    expect(fields.get('name')?.replace(/"/g, '')).toBe(name);
    expect(fields.get('description')).toBeTruthy();
  });
});

describe('skill generation', () => {
  // @req FR:ai-plugin/skills.generate
  // @req FR:ai-plugin/skills.generate
  it('writes one Claude skill per template', () => {
    expect(fs.readdirSync(path.join(claudeOut, 'skills')).sort()).toEqual(templateNames);
  });

  // @req FR:session-status/checkin.@ai-skill
  it('publishes the sitrep skill as /catalyst:sitrep', () => {
    expect(parseFrontmatter(claudeSkill('sitrep')).fields.get('name')).toBe('sitrep');
    expect(readJson('.claude-plugin/plugin.json').name).toBe('catalyst');
  });

  // @req FR:ai-plugin/skills.generate
  // @req FR:ai-plugin/skills.generate
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

  // @req FR:ai-plugin/skills.frontmatter
  it.each(templateNames)('%s Claude skill keeps only supported frontmatter', (name) => {
    const keys = [...parseFrontmatter(claudeSkill(name)).fields.keys()];
    for (const key of keys) {
      expect(['name', 'description', 'argument-hint', 'allowed-tools']).toContain(key);
    }
    expect(keys).toEqual(expect.arrayContaining(['name', 'description']));
  });

  // @req FR:ai-plugin/skills.frontmatter
  it('preserves argument hints and tool grants from templates', () => {
    const fields = parseFrontmatter(claudeSkill('create')).fields;
    expect(fields.get('argument-hint')).toBe('"[description]"');
    expect(fields.get('allowed-tools')).toBe('Read, Edit, Write, Glob, Grep, Bash, Task, TodoWrite');
  });

  // @req FR:ai-plugin/skills.frontmatter
  // @req FR:ai-plugin/skills.frontmatter
  it.each(templateNames)('%s skills have frontmatter that parses as YAML strings', (name) => {
    for (const skill of [claudeSkill(name), portableSkill(name)]) {
      const data = yaml.load(skill.slice(4, skill.indexOf('\n---\n'))) as Record<string, unknown>;
      for (const value of Object.values(data)) expect(typeof value).toBe('string');
    }
  });

  // @req FR:ai-plugin/skills.frontmatter
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

  // @req FR:ai-plugin/skills.ensure
  it('points Claude checks at the bundled script', () => {
    expect(CLAUDE_BOOTSTRAP_COMMAND).toBe(`node "\${CLAUDE_PLUGIN_ROOT}/${BOOTSTRAP_SCRIPT}"`);
  });

  // @req FR:ai-plugin/skills.ensure
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

  // @req FR:ai-plugin/plugin.@ai-plugin
  // @req FR:ai-plugin/plugin.name
  // @req FR:ai-plugin/plugin.version
  it('writes the Claude manifest at .claude-plugin/plugin.json', () => {
    const manifest = readJson('.claude-plugin/plugin.json');
    expect(manifest.name).toBe(PLUGIN_NAME);
    expect(PLUGIN_NAME).toBe('catalyst');
    expect(manifest.version).toBe(PACKAGE_JSON.version);
  });

  // @req FR:ai-plugin/plugin.@ai-plugin
  // @req FR:ai-plugin/plugin.name
  // @req FR:ai-plugin/plugin.version
  it('writes the portable manifest at agent-plugin/plugin.json', () => {
    const manifest = readPortableJson('plugin.json');
    expect(manifest.$schema).toBe(AGENT_PLUGINS_SCHEMA);
    expect(manifest.name).toBe(PLUGIN_NAME);
    expect(manifest.version).toBe(PACKAGE_JSON.version);
  });

  // @req FR:ai-plugin/plugin.valid
  it('produces a portable manifest valid against the Agent Plugins 1.0.0 schema', () => {
    const ajv = new Ajv2020({ strict: false });
    const validate = ajv.compile(schema);
    const manifest = readPortableJson('plugin.json');
    expect(validate(manifest)).toBe(true);
    expect(validate.errors ?? null).toBeNull();
  });

  // @req FR:ai-plugin/plugin.metadata
  // @req FR:ai-plugin/plugin.metadata
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

  // @req FR:ai-plugin/plugin.min-version
  it('declares the minimum package version as its own major.minor.0', () => {
    expect(minCatalystVersion('0.3.0-dev')).toBe('0.3.0');
    expect(minCatalystVersion('0.3.7')).toBe('0.3.0');
    expect(minCatalystVersion('1.4.2')).toBe('1.4.0');
    expect(buildClaudeManifest({ name: 'x', version: '0.3.7' })).toMatchObject({
      metadata: { minCatalystVersion: '0.3.0' },
    });
  });

  // @req FR:ai-plugin/plugin.min-version
  it('declares a minimum the real payload bootstrap can read back', () => {
    expect(readJson('.claude-plugin/plugin.json').metadata.minCatalystVersion)
      .toBe(minCatalystVersion(PACKAGE_JSON.version));
  });

  // @req FR:ai-plugin/plugin.publish
  it('publishes the portable payload and bootstrap binary in the npm package', () => {
    for (const entry of ['agent-plugin', 'ai', 'bin']) {
      expect(PACKAGE_JSON.files).toContain(entry);
    }
    expect(PACKAGE_JSON.bin['catalyst-bootstrap']).toBe('./bin/catalyst-bootstrap.js');
    expect(fs.existsSync(path.join(ROOT, 'bin/catalyst-bootstrap.js'))).toBe(true);
  });

  // The npm tarball is not a plugin any more: shipping the Claude layout there
  // is what coupled plugin installs to npm publishes.
  // @req AC:ai-plugin/separate-payloads
  it('keeps the Claude plugin layout out of the npm package', () => {
    for (const entry of ['.claude-plugin', 'skills', 'hooks', CLAUDE_PLUGIN_DIR]) {
      expect(PACKAGE_JSON.files).not.toContain(entry);
    }
  });
});

describe('marketplace', () => {
  const marketplace = buildMarketplace(readPackageMeta(path.join(ROOT, 'package.json'))) as any;

  // @req FR:ai-plugin/plugin.marketplace
  // @req FR:ai-plugin/plugin.marketplace.name
  it('is named xerilium with an owner', () => {
    expect(marketplace.name).toBe('xerilium');
    expect(marketplace.owner?.name).toBeTruthy();
  });

  // @req FR:ai-plugin/plugin.marketplace.source
  // @req AC:ai-plugin/separate-payloads
  it('sources the plugin from this repository, not npm', () => {
    expect(marketplace.plugins).toHaveLength(1);
    expect(marketplace.plugins[0]).toMatchObject({
      name: PLUGIN_NAME,
      source: { source: 'git-subdir', url: PLUGIN_REPO_URL, path: CLAUDE_PLUGIN_DIR, ref: PLUGIN_REPO_REF },
    });
    expect(marketplace.plugins[0].source.source).not.toBe('npm');
  });

  // An https URL avoids the SSH probe, so users without a GitHub key can install.
  // @req FR:ai-plugin/plugin.marketplace.source
  it('clones over https', () => {
    expect(marketplace.plugins[0].source.url).toMatch(/^https:\/\//);
  });

  // plugin.json is the only place a version is declared; setting both makes
  // Claude Code silently prefer the manifest and the validator warn.
  // @req FR:ai-plugin/plugin.marketplace.version
  it('declares no version on the entry', () => {
    expect(marketplace.plugins[0]).not.toHaveProperty('version');
    expect(buildClaudeManifest(meta)).toHaveProperty('version');
  });
});

describe('architecture constraints', () => {
  // @req AC:ai-plugin/single-source
  it('generates every artifact from the templates and nothing else', () => {
    expect(listFiles(claudeOut)).toEqual(
      [
        '.claude-plugin/plugin.json',
        BOOTSTRAP_SCRIPT,
        ...templateNames.map((n) => `skills/${n}/SKILL.md`),
      ].sort(),
    );
    expect(listFiles(path.join(out, PORTABLE_DIR))).toEqual(
      [
        'plugin.json',
        ...templateNames.map((n) => `skills/${PORTABLE_PREFIX}${n}/SKILL.md`),
      ].sort(),
    );
  });

  // claude.ai, Cowork, and organization sync reject a plugin with one.
  // @req AC:ai-plugin/no-bin
  it('puts the bootstrap in scripts/, never a top-level bin/', () => {
    expect(fs.existsSync(path.join(claudeOut, 'bin'))).toBe(false);
    expect(fs.readFileSync(path.join(claudeOut, BOOTSTRAP_SCRIPT), 'utf8')).toBe(BOOTSTRAP_STUB);
    expect(BOOTSTRAP_SCRIPT.startsWith('scripts/')).toBe(true);
  });

  // The committed payload is a build artifact, so drift has to be detectable.
  // @req FR:ai-plugin/plugin.committed
  // @req FR:ai-plugin/plugin.committed.current
  it('matches the committed plugin/ payload', () => {
    expect(diffPayload(claudeOut, path.join(ROOT, CLAUDE_PLUGIN_DIR))).toEqual([BOOTSTRAP_SCRIPT]);
  });

  // @req FR:ai-plugin/plugin.committed.current
  it('reports a changed file as drift', () => {
    const stale = fs.mkdtempSync(path.join(os.tmpdir(), 'catalyst-stale-'));
    try {
      fs.cpSync(claudeOut, stale, { recursive: true });
      expect(diffPayload(claudeOut, stale)).toEqual([]);
      fs.writeFileSync(path.join(stale, 'skills', templateNames[0], 'SKILL.md'), 'stale');
      expect(diffPayload(claudeOut, stale)).toEqual([`skills/${templateNames[0]}/SKILL.md`]);
      fs.rmSync(path.join(stale, '.claude-plugin/plugin.json'));
      expect(diffPayload(claudeOut, stale)).toContain('.claude-plugin/plugin.json');
    } finally {
      fs.rmSync(stale, { recursive: true, force: true });
    }
  });
});

describe('no session hook', () => {
  // The hook installed a package into any repository the user opened and could
  // hold session start for its 300s timeout; every skill already checks.
  // @req AC:ai-plugin/no-standing-cost
  // @req FR:ai-plugin/skills.ensure.min-version
  it('ships no hooks and no hook mode', () => {
    expect(listFiles(claudeOut).some((f) => f.startsWith('hooks/'))).toBe(false);
    expect(readJson('.claude-plugin/plugin.json')).not.toHaveProperty('hooks');
    expect(fs.existsSync(path.join(SOURCE_DIR, 'claude-hooks'))).toBe(false);
    expect(CLAUDE_BOOTSTRAP_COMMAND).not.toContain('--hook');
  });

  // @req AC:ai-plugin/thin-skills
  it.each(templateNames)('%s reaches Catalyst resources only through node_modules', (name) => {
    for (const skill of [claudeSkill(name), portableSkill(name)]) {
      const pluginRefs = skill.match(/\$\{CLAUDE_PLUGIN_ROOT\}[^\s"`)]*/g) ?? [];
      expect(pluginRefs.every((ref) => ref === `\${CLAUDE_PLUGIN_ROOT}/${BOOTSTRAP_SCRIPT}`)).toBe(true);
      for (const ref of skill.match(/[\w@./-]*playbooks\/[\w./-]+\.md/g) ?? []) {
        expect(ref).toMatch(/node_modules\/@xerilium\/catalyst\/playbooks\//);
      }
    }
  });

  // @req AC:ai-plugin/no-standing-cost
  it('declares no MCP servers or always-on context', () => {
    const files = listFiles(claudeOut);
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
  it('copies the committed payload, replacing stale files', () => {
    fs.mkdirSync(path.join(target, 'skills/removed'), { recursive: true });
    fs.writeFileSync(path.join(target, 'skills/removed/SKILL.md'), 'stale');

    selfHost({ pluginDir: claudeOut, targetDir: target });

    expect(listFiles(target)).toEqual(
      [
        '.gitignore',
        '.claude-plugin/plugin.json',
        BOOTSTRAP_SCRIPT,
        ...templateNames.map((n) => `skills/${n}/SKILL.md`),
      ].sort(),
    );
  });

  // @req FR:ai-plugin/build.self-host.ignored
  it('ignores itself without a root .gitignore entry', () => {
    selfHost({ pluginDir: claudeOut, targetDir: target });
    expect(fs.readFileSync(path.join(target, '.gitignore'), 'utf8').trim()).toBe('*');
    const rootIgnore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
    expect(rootIgnore).not.toContain('.claude/skills/catalyst');
  });
});
