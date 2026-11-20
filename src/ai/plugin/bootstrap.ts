/**
 * Catalyst plugin bootstrap.
 *
 * Installs the project's `@xerilium/catalyst` package with the project's own
 * package manager when it's missing, then checks the installed version against
 * the minimum the plugin declares. Runs from the `catalyst-bootstrap` binary
 * and from the package check at the top of each skill.
 *
 * Imports only Node.js built-ins: the plugin copies this file standalone and
 * runs it before any dependency is installed.
 *
 * @req NFR:ai-plugin/portability.zero-deps
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export const PACKAGE_NAME = '@xerilium/catalyst';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface RunResult {
  status: number | null;
  stderr: string;
  /** Some package managers (pnpm) report errors on stdout */
  stdout?: string;
  error?: NodeJS.ErrnoException;
}

/** Runs a command synchronously; injectable for tests. */
export type Runner = (command: string, args: string[], cwd: string) => RunResult;

export interface InstallPlan {
  pm: PackageManager;
  action: 'restore' | 'add';
  args: string[];
}

export interface BootstrapResult {
  exitCode: number;
  /** Single status line; absent when no action was needed */
  message?: string;
}

interface PackageJson {
  version?: string;
  packageManager?: string;
  workspaces?: unknown;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/** The subset of `.claude-plugin/plugin.json` the bootstrap reads. */
interface PluginManifest {
  version?: string;
  metadata?: { minCatalystVersion?: string };
}

const PACKAGE_MANAGERS: readonly PackageManager[] = ['npm', 'pnpm', 'yarn', 'bun'];

/** Lockfiles in detection order. @req FR:ai-plugin/bootstrap.package-manager.lockfile */
const LOCKFILES: ReadonlyArray<[string, PackageManager]> = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['package-lock.json', 'npm'],
  ['npm-shrinkwrap.json', 'npm'],
];

const MAX_DETAIL = 300;

const PLUGIN_KEY = 'catalyst@xerilium';
const MARKETPLACE_SOURCE = '{"source":"github","repo":"xerilium/ai-plugins"}';
const VERSION = '\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?';

const exists = (p: string): boolean => fs.existsSync(p);

function readPackageJson(dir: string): PackageJson | undefined {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')) as PackageJson;
  } catch {
    return undefined;
  }
}

/**
 * Start directory for root resolution.
 * @req FR:ai-plugin/bootstrap.input
 */
export function resolveStartDir(env: NodeJS.ProcessEnv, cwd: string): string {
  return env.CLAUDE_PROJECT_DIR || cwd;
}

/** Nearest ancestor (inclusive) containing `.git` (directory, or file for worktrees). */
function findGitRoot(start: string): string | undefined {
  for (let dir = path.resolve(start); ; dir = path.dirname(dir)) {
    if (exists(path.join(dir, '.git'))) { return dir; }
    if (path.dirname(dir) === dir) { return undefined; }
  }
}

function declaresWorkspaces(dir: string): boolean {
  return exists(path.join(dir, 'pnpm-workspace.yaml')) || readPackageJson(dir)?.workspaces !== undefined;
}

/**
 * Resolve the project root the package belongs in.
 *
 * Searches from the start directory up to the git root (or only the start
 * directory outside git, so an unrelated `~/package.json` is never picked).
 *
 * @req FR:ai-plugin/bootstrap.root
 * @req FR:ai-plugin/bootstrap.root.fallback
 */
export function resolveProjectRoot(start: string): string {
  const from = path.resolve(start);
  const gitRoot = findGitRoot(from);
  const chain: string[] = [];
  for (let dir = from; ; dir = path.dirname(dir)) {
    chain.push(dir);
    if (!gitRoot || dir === gitRoot || path.dirname(dir) === dir) { break; }
  }

  const workspace = [...chain].reverse().find(declaresWorkspaces);
  if (workspace) { return workspace; }

  const nearestPackage = chain.find((dir) => exists(path.join(dir, 'package.json')));
  return nearestPackage ?? gitRoot ?? from;
}

/** @req FR:ai-plugin/bootstrap.installed */
export function isInstalled(root: string): boolean {
  return exists(path.join(root, 'node_modules', PACKAGE_NAME, 'package.json'));
}

function declaresCatalyst(pkg: PackageJson | undefined): boolean {
  return [pkg?.dependencies, pkg?.devDependencies, pkg?.optionalDependencies].some(
    (deps) => deps !== undefined && PACKAGE_NAME in deps,
  );
}

/**
 * Version of the `@xerilium/catalyst` package installed at the project root.
 *
 * @req FR:ai-plugin/bootstrap.min-version
 */
export function installedVersion(root: string): string | undefined {
  return readPackageJson(path.join(root, 'node_modules', PACKAGE_NAME))?.version;
}

/**
 * Minimum package version the plugin that owns this script declares, read from
 * the sibling `.claude-plugin/plugin.json` (`<plugin root>/scripts/bootstrap.js`
 * → `<plugin root>/.claude-plugin/plugin.json`). Absent when the script runs
 * from the npm package instead of a plugin.
 *
 * @req FR:ai-plugin/bootstrap.min-version
 * @req FR:ai-plugin/plugin.min-version
 */
export function declaredMinVersion(scriptDir: string): string | undefined {
  try {
    const file = path.join(scriptDir, '..', '.claude-plugin', 'plugin.json');
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8')) as PluginManifest;
    return manifest.metadata?.minCatalystVersion;
  } catch {
    return undefined;
  }
}

/**
 * Compare `major.minor.patch`, ignoring any prerelease suffix so a local
 * `0.3.0-dev` build satisfies a `0.3.0` minimum.
 *
 * @req FR:ai-plugin/bootstrap.min-version
 */
export function isAtLeast(version: string, minimum: string): boolean {
  const parts = (v: string) => (/^(\d+)\.(\d+)\.(\d+)/.exec(v) ?? []).slice(1, 4).map(Number);
  const [have, want] = [parts(version), parts(minimum)];
  if (have.length !== 3 || want.length !== 3) { return true; }
  for (let i = 0; i < 3; i++) {
    if (have[i] !== want[i]) { return have[i] > want[i]; }
  }
  return true;
}

/**
 * @req FR:ai-plugin/bootstrap.package-manager
 * @req FR:ai-plugin/bootstrap.package-manager.lockfile
 * @req FR:ai-plugin/bootstrap.package-manager.default
 */
export function detectPackageManager(root: string): { name: PackageManager; version?: string } {
  const field = readPackageJson(root)?.packageManager;
  const match = typeof field === 'string' ? /^([a-z]+)@([^+\s]+)/.exec(field) : null;
  if (match && (PACKAGE_MANAGERS as readonly string[]).includes(match[1])) {
    return { name: match[1] as PackageManager, version: match[2] };
  }
  const lockfile = LOCKFILES.find(([file]) => exists(path.join(root, file)));
  return { name: lockfile ? lockfile[1] : 'npm' };
}

function isYarnClassic(root: string, version: string | undefined): boolean {
  if (version) { return version.startsWith('1.'); }
  return !exists(path.join(root, '.yarnrc.yml'));
}

/**
 * @req FR:ai-plugin/bootstrap.restore
 * @req FR:ai-plugin/bootstrap.add
 * @req FR:ai-plugin/bootstrap.add.workspace-root
 */
export function planInstall(root: string): InstallPlan {
  const { name: pm, version } = detectPackageManager(root);

  if (declaresCatalyst(readPackageJson(root))) {
    return { pm, action: 'restore', args: ['install'] };
  }

  const workspaceFlag =
    pm === 'pnpm' && exists(path.join(root, 'pnpm-workspace.yaml'))
      ? ['-w']
      : pm === 'yarn' && declaresWorkspaces(root) && isYarnClassic(root, version)
        ? ['-W']
        : [];

  const args: Record<PackageManager, string[]> = {
    npm: ['install', '--save-dev', PACKAGE_NAME],
    pnpm: ['add', '-D', ...workspaceFlag, PACKAGE_NAME],
    yarn: ['add', '-D', ...workspaceFlag, PACKAGE_NAME],
    bun: ['add', '-d', PACKAGE_NAME],
  };
  return { pm, action: 'add', args: args[pm] };
}

/** @req FR:ai-plugin/bootstrap.pnp */
function isPnp(root: string): boolean {
  return exists(path.join(root, '.pnp.cjs')) || exists(path.join(root, '.pnp.js'));
}

const defaultRunner: Runner = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    status: result.status,
    stderr: result.stderr ?? '',
    stdout: result.stdout ?? '',
    error: result.error as NodeJS.ErrnoException | undefined,
  };
};

/**
 * Collapse package manager output into one bounded line, keeping only error
 * lines when there are any.
 *
 * @req FR:ai-plugin/bootstrap.output
 */
function oneLine(text: string): string {
  const errors = text.split('\n').filter((line) => /\bERR|error/i.test(line));
  const flat = (errors.length > 0 ? errors.join(' ') : text).replace(/\s+/g, ' ').trim();
  return flat.length > MAX_DETAIL ? `…${flat.slice(-MAX_DETAIL)}` : flat;
}

/** @req FR:ai-plugin/bootstrap.corepack */
function run(plan: InstallPlan, root: string, runner: Runner): RunResult {
  const result = runner(plan.pm, plan.args, root);
  if (result.error?.code === 'ENOENT' && (plan.pm === 'pnpm' || plan.pm === 'yarn')) {
    const viaCorepack = runner('corepack', [plan.pm, ...plan.args], root);
    return viaCorepack.error?.code === 'ENOENT' ? result : viaCorepack;
  }
  return result;
}

function install(root: string, runner: Runner): { ok: boolean; message: string } {
  const plan = planInstall(root);
  const command = [plan.pm, ...plan.args].join(' ');

  if (isPnp(root)) {
    return {
      ok: false,
      message: `Catalyst: Skipped installing ${PACKAGE_NAME} — Yarn Plug'n'Play isn't supported. Set "nodeLinker: node-modules" in .yarnrc.yml, then run: ${command}`,
    };
  }

  let result: RunResult;
  try {
    result = run(plan, root, runner);
  } catch (err) {
    result = { status: null, stderr: '', error: err as NodeJS.ErrnoException };
  }

  if (result.error?.code === 'ENOENT') {
    return { ok: false, message: `Catalyst: Couldn't install ${PACKAGE_NAME} — ${plan.pm} isn't installed. Install ${plan.pm}, then run: ${command}` };
  }
  const failed = result.error !== undefined || result.status !== 0;
  const detail = failed
    ? oneLine(result.stderr || result.stdout || result.error?.message || `exit code ${result.status}`)
    : '';
  // Package managers can exit non-zero after installing (e.g. pnpm blocking dependency build scripts)
  if (failed && !isInstalled(root)) {
    return { ok: false, message: `Catalyst: Couldn't install ${PACKAGE_NAME} (${command} failed: ${detail}). Run it manually.` };
  }
  const done =
    plan.action === 'restore'
      ? `Catalyst: Installed project dependencies with ${plan.pm} (${PACKAGE_NAME} was missing)`
      : `Catalyst: Added ${PACKAGE_NAME} as a dev dependency with ${plan.pm}`;
  return { ok: true, message: failed ? `${done}; ${plan.pm} reported: ${detail}` : `${done}.` };
}

/**
 * Report an installed package older than the plugin's declared minimum.
 *
 * @req FR:ai-plugin/bootstrap.min-version
 */
function checkMinVersion(root: string, minimum: string | undefined): BootstrapResult {
  const installed = installedVersion(root);
  if (!minimum || !installed || isAtLeast(installed, minimum)) { return { exitCode: 0 }; }

  const { pm } = planInstall(root);
  const upgrade: Record<PackageManager, string> = {
    npm: `npm install --save-dev ${PACKAGE_NAME}@^${minimum}`,
    pnpm: `pnpm add -D ${PACKAGE_NAME}@^${minimum}`,
    yarn: `yarn add -D ${PACKAGE_NAME}@^${minimum}`,
    bun: `bun add -d ${PACKAGE_NAME}@^${minimum}`,
  };
  return {
    exitCode: 1,
    message:
      `Catalyst: This project has ${PACKAGE_NAME} ${installed}, but the Catalyst plugin needs ${minimum} or later. ` +
      `Upgrade with: ${upgrade[pm]}`,
  };
}

/** Settings directory: `CLAUDE_CONFIG_DIR`, else `~/.claude`. */
function configDir(env: NodeJS.ProcessEnv): string {
  return env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readJson(file: string): any {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
}

function readText(file: string): string {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

/** Resolved version from the first lockfile that lists the package. */
function lockedVersion(root: string): string | undefined {
  const { name: pm } = detectPackageManager(root);
  if (pm === 'npm') {
    for (const file of ['package-lock.json', 'npm-shrinkwrap.json']) {
      const lock = readJson(path.join(root, file));
      const version = lock?.packages?.[`node_modules/${PACKAGE_NAME}`]?.version ?? lock?.dependencies?.[PACKAGE_NAME]?.version;
      if (typeof version === 'string') { return version; }
    }
    return undefined;
  }
  const name = PACKAGE_NAME.replace('/', '\\/');
  if (pm === 'pnpm') {
  const pnpm = readText(path.join(root, 'pnpm-lock.yaml'));
  const fromPnpm =
    new RegExp(`['"]?${name}['"]?:\\s*\\n(?:[ \\t]+specifier:[^\\n]*\\n)?[ \\t]+version:\\s*['"]?(${VERSION})`).exec(pnpm) ??
    new RegExp(`['"]?${name}['"]?:\\s+['"]?(${VERSION})`).exec(pnpm);
  return fromPnpm?.[1];
  }
  if (pm !== 'yarn') { return undefined; }
  const yarn = readText(path.join(root, 'yarn.lock'));
  return new RegExp(`^"?${name}@[^\\n]*:\\n(?:[ ]+[^\\n]*\\n)*?[ ]+version:? "?(${VERSION})`, 'm').exec(yarn)?.[1];
}

/**
 * The `@xerilium/catalyst` version the repo pins: the lockfile's resolved
 * version, else an exact version in `package.json`. Absent when the repo
 * declares no usable pin.
 *
 * @req FR:ai-plugin/bootstrap.pin.source
 * @req FR:ai-plugin/bootstrap.pin.none
 * @req FR:ai-plugin/bootstrap.pin.repo-wins
 * @req FR:ai-plugin/bootstrap.pin.no-override
 */
export function pinnedVersion(root: string): string | undefined {
  const pkg = readPackageJson(root);
  if (!declaresCatalyst(pkg)) { return undefined; }
  const locked = lockedVersion(root);
  if (locked) { return locked; }
  const range = pkg?.dependencies?.[PACKAGE_NAME] ?? pkg?.devDependencies?.[PACKAGE_NAME] ?? pkg?.optionalDependencies?.[PACKAGE_NAME];
  return typeof range === 'string' && new RegExp(`^${VERSION}$`).test(range) ? range : undefined;
}

function manifestVersion(pluginRoot: string): string | undefined {
  const version = readJson(path.join(pluginRoot, '.claude-plugin', 'plugin.json'))?.version;
  return typeof version === 'string' ? version : undefined;
}

/**
 * Version of the plugin copy that is loaded: the manifest beside the running
 * script, else `CLAUDE_PLUGIN_ROOT`, else the newest `catalyst@xerilium` install.
 *
 * @req FR:ai-plugin/bootstrap.pin.loaded
 * @req FR:ai-plugin/bootstrap.pin.loaded.record
 */
export function loadedPluginVersion(
  scriptDir: string | undefined,
  env: NodeJS.ProcessEnv,
  root: string,
): { version: string; fromRecord: boolean } | undefined {
  const own = scriptDir ? manifestVersion(path.join(scriptDir, '..')) : undefined;
  if (own) { return { version: own, fromRecord: false }; }
  const fromRoot = env.CLAUDE_PLUGIN_ROOT ? manifestVersion(env.CLAUDE_PLUGIN_ROOT) : undefined;
  if (fromRoot) { return { version: fromRoot, fromRecord: false }; }
  const entries: unknown = readJson(path.join(configDir(env), 'plugins', 'installed_plugins.json'))?.plugins?.[PLUGIN_KEY];
  if (!Array.isArray(entries)) { return undefined; }
  let newest: string | undefined;
  for (const entry of entries) {
    const v: unknown = entry?.version;
    if (typeof v !== 'string' || !/^\d+\.\d+\.\d+/.test(v)) { continue; }
    // Project- and local-scope installs apply only inside their own project
    if ((entry?.scope === 'project' || entry?.scope === 'local') && !withinDir(root, entry?.projectPath)) { continue; }
    if (newest === undefined || (isAtLeast(v, newest) && !isAtLeast(newest, v))) { newest = v; }
  }
  return newest ? { version: newest, fromRecord: true } : undefined;
}

function withinDir(dir: string, parent: unknown): boolean {
  if (typeof parent !== 'string') { return false; }
  const rel = path.relative(path.resolve(parent), path.resolve(dir));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function localMarketplace(env: NodeJS.ProcessEnv): boolean {
  const source = readJson(path.join(configDir(env), 'settings.json'))?.extraKnownMarketplaces?.xerilium?.source?.source;
  return source === 'directory';
}

const PLUGIN_FIX =
  `Fix: in ~/.claude/settings.json set extraKnownMarketplaces.xerilium.source to ${MARKETPLACE_SOURCE}. ` +
  'Then run: claude plugin marketplace remove xerilium && claude plugin marketplace add xerilium/ai-plugins && claude plugin install catalyst@xerilium. ' +
  'Then restart the session. Plugin development uses --plugin-dir, never a local marketplace.';

/**
 * Compare the loaded plugin with the version the repo pins. The repo's pin
 * wins: nothing else (latest release, parent or user config) is consulted. A
 * repo with no pin gets no check.
 *
 * @req FR:ai-plugin/bootstrap.pin
 * @req FR:ai-plugin/bootstrap.pin.message
 * @req FR:ai-plugin/bootstrap.pin.local-marketplace
 * @req FR:ai-plugin/bootstrap.pin.newer
 * @req FR:ai-plugin/bootstrap.pin.unreadable
 */
export function checkPluginPin(options: { root: string; scriptDir?: string; env?: NodeJS.ProcessEnv }): BootstrapResult {
  try {
    const env = options.env ?? process.env;
    const pin = pinnedVersion(options.root);
    if (!pin) { return { exitCode: 0 }; }
    const loaded = loadedPluginVersion(options.scriptDir, env, options.root);
    const local = localMarketplace(env);
    if (loaded && !isAtLeast(loaded.version, pin)) {
      const message =
        `Catalyst: The loaded Catalyst plugin is ${loaded.version}, but this repo pins ${PACKAGE_NAME} ${pin}. ` +
        `A stale plugin copy is loaded, often from a local-directory xerilium marketplace in user settings. ${PLUGIN_FIX}`;
      // An install record shows what is installed, not what loaded: only a local marketplace confirms it
      return { exitCode: loaded.fromRecord && !local ? 0 : 1, message };
    }
    if (local) {
      return {
        exitCode: 0,
        message: `Catalyst: Warning: user settings point the xerilium marketplace at a local directory, so the plugin can go stale. ${PLUGIN_FIX}`,
      };
    }
  } catch {
    // A failed check never blocks work
  }
  return { exitCode: 0 };
}

function ensurePackage(root: string, minVersion: string | undefined, runner: Runner): BootstrapResult {
  if (isInstalled(root)) { return checkMinVersion(root, minVersion); }

  const { ok, message } = install(root, runner);
  if (!ok) { return { exitCode: 1, message }; }

  const version = checkMinVersion(root, minVersion);
  return version.exitCode === 0 ? { exitCode: 0, message } : version;
}

/**
 * Ensure the project's Catalyst package is installed and new enough for the
 * plugin that invoked this script.
 *
 * @req FR:ai-plugin/bootstrap.installed
 * @req FR:ai-plugin/bootstrap.failure
 * @req FR:ai-plugin/bootstrap.min-version
 * @req FR:ai-plugin/bootstrap.output
 * @req NFR:ai-plugin/performance.noop
 */
export function bootstrap(options: {
  start: string;
  minVersion?: string;
  runner?: Runner;
  /** Directory of the running script, to find the plugin manifest beside it */
  scriptDir?: string;
  env?: NodeJS.ProcessEnv;
}): BootstrapResult {
  const { runner = defaultRunner } = options;
  try {
    const root = resolveProjectRoot(options.start);
    const pin = checkPluginPin({ root, scriptDir: options.scriptDir, env: options.env });
    if (pin.exitCode !== 0) { return pin; }

    const result = ensurePackage(root, options.minVersion, runner);
    if (result.exitCode !== 0 || !pin.message) { return result; }
    return { exitCode: 0, message: result.message ? `${pin.message}\n${result.message}` : pin.message };
  } catch (err) {
    return {
      exitCode: 1,
      message: `Catalyst: Couldn't check for ${PACKAGE_NAME} (${oneLine(String((err as Error)?.message ?? err))}).`,
    };
  }
}

/**
 * CLI entry. The plugin's declared minimum comes from the manifest beside this
 * script; `--min-version <v>` overrides it for the portable `catalyst-bootstrap`
 * binary, which has no plugin manifest to read.
 *
 * @req FR:ai-plugin/bootstrap.@cli
 */
export function main(argv: string[], env: NodeJS.ProcessEnv = process.env, runner?: Runner): number {
  const flag = argv.indexOf('--min-version');
  const minVersion = flag === -1 ? declaredMinVersion(__dirname) : argv[flag + 1];
  const result = bootstrap({ start: resolveStartDir(env, process.cwd()), minVersion, runner, scriptDir: __dirname, env });
  if (result.message) { console.log(result.message); }
  return result.exitCode;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
