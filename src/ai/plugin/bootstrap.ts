/**
 * Catalyst plugin bootstrap.
 *
 * Installs the project's `@xerilium/catalyst` package with the project's own
 * package manager when it's missing. Runs from the Claude Code SessionStart
 * hook (`--hook`), from the `catalyst-bootstrap` binary, and from skill
 * package checks.
 *
 * Imports only Node.js built-ins: the plugin copies this file standalone and
 * runs it before any dependency is installed.
 *
 * @req NFR:ai-plugin/portability.zero-deps
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export const PACKAGE_NAME = '@xerilium/catalyst';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';
export type BootstrapMode = 'hook' | 'explicit';

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
  packageManager?: string;
  workspaces?: unknown;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
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
 * @req FR:ai-plugin/bootstrap.scope
 * @req FR:context-storage/storage.project
 */
export function isCatalystProject(root: string): boolean {
  return exists(path.join(root, '.xe')) || declaresCatalyst(readPackageJson(root));
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
      message: `Catalyst: skipped installing ${PACKAGE_NAME} — Yarn Plug'n'Play isn't supported. Set "nodeLinker: node-modules" in .yarnrc.yml, then run: ${command}`,
    };
  }

  let result: RunResult;
  try {
    result = run(plan, root, runner);
  } catch (err) {
    result = { status: null, stderr: '', error: err as NodeJS.ErrnoException };
  }

  if (result.error?.code === 'ENOENT') {
    return { ok: false, message: `Catalyst: couldn't install ${PACKAGE_NAME} — ${plan.pm} isn't installed. Install ${plan.pm}, then run: ${command}` };
  }
  const failed = result.error !== undefined || result.status !== 0;
  const detail = failed
    ? oneLine(result.stderr || result.stdout || result.error?.message || `exit code ${result.status}`)
    : '';
  // Package managers can exit non-zero after installing (e.g. pnpm blocking dependency build scripts)
  if (failed && !isInstalled(root)) {
    return { ok: false, message: `Catalyst: couldn't install ${PACKAGE_NAME} (${command} failed: ${detail}). Run it manually.` };
  }
  const done =
    plan.action === 'restore'
      ? `Catalyst: installed project dependencies with ${plan.pm} (${PACKAGE_NAME} was missing)`
      : `Catalyst: added ${PACKAGE_NAME} as a dev dependency with ${plan.pm}`;
  return { ok: true, message: failed ? `${done}; ${plan.pm} reported: ${detail}` : `${done}.` };
}

/**
 * Ensure the project's Catalyst package is installed.
 *
 * @req FR:ai-plugin/bootstrap.installed
 * @req FR:ai-plugin/bootstrap.scope
 * @req FR:ai-plugin/bootstrap.hook-safe
 * @req FR:ai-plugin/bootstrap.explicit-failure
 * @req FR:ai-plugin/bootstrap.output
 * @req NFR:ai-plugin/performance.noop
 */
export function bootstrap(options: { start: string; mode: BootstrapMode; runner?: Runner }): BootstrapResult {
  const { mode, runner = defaultRunner } = options;
  try {
    const root = resolveProjectRoot(options.start);
    if (isInstalled(root)) {return { exitCode: 0 };}
    if (mode === 'hook' && !isCatalystProject(root)) {return { exitCode: 0 };}

    const { ok, message } = install(root, runner);
    return { exitCode: ok || mode === 'hook' ? 0 : 1, message };
  } catch (err) {
    const message = `Catalyst: couldn't check for ${PACKAGE_NAME} (${oneLine(String((err as Error)?.message ?? err))}).`;
    return { exitCode: mode === 'hook' ? 0 : 1, message };
  }
}

/**
 * CLI entry: `--hook` selects hook mode; explicit otherwise.
 *
 * @req FR:ai-plugin/bootstrap.@hook
 * @req FR:ai-plugin/bootstrap.@cli
 */
export function main(argv: string[], env: NodeJS.ProcessEnv = process.env, runner?: Runner): number {
  const mode: BootstrapMode = argv.includes('--hook') ? 'hook' : 'explicit';
  const result = bootstrap({ start: resolveStartDir(env, process.cwd()), mode, runner });
  if (result.message) {console.log(result.message);}
  return result.exitCode;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
