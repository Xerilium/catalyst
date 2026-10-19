/**
 * Tests for the AI plugin bootstrap (src/ai/plugin/bootstrap.ts).
 *
 * Uses real temp directories for filesystem detection and an injected runner
 * so no package manager is ever spawned.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  PACKAGE_NAME,
  bootstrap,
  detectPackageManager,
  isCatalystProject,
  isInstalled,
  main,
  planInstall,
  resolveProjectRoot,
  resolveStartDir,
  type Runner,
  type RunResult,
} from '../../../src/ai/plugin/bootstrap';

interface Call {
  command: string;
  args: string[];
  cwd: string;
}

/** Runner that records calls and returns scripted results (default: success). */
function fakeRunner(results: Array<Partial<RunResult>> = []): Runner & { calls: Call[] } {
  const calls: Call[] = [];
  const runner = ((command: string, args: string[], cwd: string): RunResult => {
    calls.push({ command, args, cwd });
    const r = results[calls.length - 1] ?? {};
    return { status: r.status ?? 0, stderr: r.stderr ?? '', stdout: r.stdout, error: r.error };
  }) as Runner & { calls: Call[] };
  runner.calls = calls;
  return runner;
}

function enoent(): NodeJS.ErrnoException {
  const e = new Error('spawn ENOENT') as NodeJS.ErrnoException;
  e.code = 'ENOENT';
  return e;
}

let tmp: string;

function write(rel: string, content = ''): string {
  const p = path.join(tmp, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  return p;
}

function mkdir(rel: string): string {
  const p = path.join(tmp, rel);
  fs.mkdirSync(p, { recursive: true });
  return p;
}

function pkg(rel: string, json: Record<string, unknown>): void {
  write(path.join(rel, 'package.json'), JSON.stringify(json));
}

function installCatalyst(rel = '.'): void {
  pkg(path.join(rel, 'node_modules', PACKAGE_NAME), { name: PACKAGE_NAME, version: '1.0.0' });
}

beforeEach(() => {
  tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'catalyst-bootstrap-')));
  mkdir('.git');
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('resolveStartDir', () => {
  // @req FR:ai-plugin/bootstrap.input
  it('prefers CLAUDE_PROJECT_DIR over the working directory', () => {
    expect(resolveStartDir({ CLAUDE_PROJECT_DIR: '/proj' }, '/cwd')).toBe('/proj');
    expect(resolveStartDir({}, '/cwd')).toBe('/cwd');
  });
});

describe('resolveProjectRoot', () => {
  // @req FR:ai-plugin/bootstrap.root
  it('resolves the outermost pnpm workspace root within the git root', () => {
    write('pnpm-workspace.yaml', 'packages:\n  - packages/*\n');
    pkg('.', { name: 'mono' });
    pkg('packages/app', { name: 'app' });
    expect(resolveProjectRoot(path.join(tmp, 'packages', 'app'))).toBe(tmp);
  });

  // @req FR:ai-plugin/bootstrap.root
  it('resolves a package.json workspaces root', () => {
    pkg('.', { name: 'mono', workspaces: ['packages/*'] });
    pkg('packages/app', { name: 'app' });
    const start = mkdir('packages/app/src');
    expect(resolveProjectRoot(start)).toBe(tmp);
  });

  // @req FR:ai-plugin/bootstrap.root.fallback
  it('falls back to the nearest package.json directory', () => {
    pkg('tools/cli', { name: 'cli' });
    const start = mkdir('tools/cli/src');
    expect(resolveProjectRoot(start)).toBe(path.join(tmp, 'tools', 'cli'));
  });

  // @req FR:ai-plugin/bootstrap.root.fallback
  it('falls back to the git root when no package.json exists', () => {
    const start = mkdir('docs/guides');
    expect(resolveProjectRoot(start)).toBe(tmp);
  });

  // @req FR:ai-plugin/bootstrap.root.fallback
  it('recognizes a worktree .git file as the git root', () => {
    fs.rmSync(path.join(tmp, '.git'), { recursive: true });
    write('.git', 'gitdir: /elsewhere/.git/worktrees/x\n');
    const start = mkdir('src');
    expect(resolveProjectRoot(start)).toBe(tmp);
  });

  // @req FR:ai-plugin/bootstrap.root.fallback
  it('falls back to the start directory outside a git repository', () => {
    fs.rmSync(path.join(tmp, '.git'), { recursive: true });
    const start = mkdir('scratch');
    expect(resolveProjectRoot(start)).toBe(start);
  });
});

describe('isInstalled', () => {
  // @req FR:ai-plugin/bootstrap.installed
  it('detects the package in the project node_modules', () => {
    expect(isInstalled(tmp)).toBe(false);
    installCatalyst();
    expect(isInstalled(tmp)).toBe(true);
  });
});

describe('isCatalystProject', () => {
  // @req FR:ai-plugin/bootstrap.scope
  it('is true when .xe/ exists', () => {
    mkdir('.xe');
    expect(isCatalystProject(tmp)).toBe(true);
  });

  // @req FR:ai-plugin/bootstrap.scope
  it('is true when package.json declares the package', () => {
    pkg('.', { devDependencies: { [PACKAGE_NAME]: '^0.2.0' } });
    expect(isCatalystProject(tmp)).toBe(true);
  });

  // @req FR:ai-plugin/bootstrap.scope
  it('is false for unrelated projects', () => {
    pkg('.', { dependencies: { react: '^19.0.0' } });
    expect(isCatalystProject(tmp)).toBe(false);
  });
});

describe('detectPackageManager', () => {
  // @req FR:ai-plugin/bootstrap.package-manager
  it('honors the packageManager field over lockfiles', () => {
    pkg('.', { packageManager: 'pnpm@9.12.0' });
    write('package-lock.json', '{}');
    expect(detectPackageManager(tmp)).toEqual({ name: 'pnpm', version: '9.12.0' });
  });

  // @req FR:ai-plugin/bootstrap.package-manager
  it('ignores unknown packageManager values', () => {
    pkg('.', { packageManager: 'deno@2.0.0' });
    write('yarn.lock', '');
    expect(detectPackageManager(tmp).name).toBe('yarn');
  });

  // @req FR:ai-plugin/bootstrap.package-manager.lockfile
  it.each([
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lock', 'bun'],
    ['bun.lockb', 'bun'],
    ['package-lock.json', 'npm'],
    ['npm-shrinkwrap.json', 'npm'],
  ])('infers from %s', (lockfile, expected) => {
    write(lockfile, '');
    expect(detectPackageManager(tmp).name).toBe(expected);
  });

  // @req FR:ai-plugin/bootstrap.package-manager.default
  it('defaults to npm', () => {
    expect(detectPackageManager(tmp).name).toBe('npm');
  });
});

describe('planInstall', () => {
  // @req FR:ai-plugin/bootstrap.restore
  it.each([
    ['package-lock.json', 'npm', ['install']],
    ['pnpm-lock.yaml', 'pnpm', ['install']],
    ['yarn.lock', 'yarn', ['install']],
    ['bun.lock', 'bun', ['install']],
  ])('restores dependencies when package.json declares the package (%s)', (lockfile, pm, args) => {
    pkg('.', { devDependencies: { [PACKAGE_NAME]: '^0.2.0' } });
    write(lockfile, '');
    expect(planInstall(tmp)).toMatchObject({ action: 'restore', pm, args });
  });

  // @req FR:ai-plugin/bootstrap.add
  it.each([
    ['package-lock.json', 'npm', ['install', '--save-dev', PACKAGE_NAME]],
    ['pnpm-lock.yaml', 'pnpm', ['add', '-D', PACKAGE_NAME]],
    ['yarn.lock', 'yarn', ['add', '-D', PACKAGE_NAME]],
    ['bun.lock', 'bun', ['add', '-d', PACKAGE_NAME]],
  ])('adds the package as a dev dependency when undeclared (%s)', (lockfile, pm, args) => {
    pkg('.', { name: 'app' });
    write(lockfile, '');
    expect(planInstall(tmp)).toMatchObject({ action: 'add', pm, args });
  });

  // @req FR:ai-plugin/bootstrap.add
  it('adds with npm in a project without package.json', () => {
    expect(planInstall(tmp)).toMatchObject({
      action: 'add',
      pm: 'npm',
      args: ['install', '--save-dev', PACKAGE_NAME],
    });
  });

  // @req FR:ai-plugin/bootstrap.add.workspace-root
  it('passes -w when adding at a pnpm workspace root', () => {
    pkg('.', { name: 'mono' });
    write('pnpm-workspace.yaml', 'packages: []\n');
    write('pnpm-lock.yaml', '');
    expect(planInstall(tmp).args).toEqual(['add', '-D', '-w', PACKAGE_NAME]);
  });

  // @req FR:ai-plugin/bootstrap.add.workspace-root
  it('passes -W when adding at a Yarn classic workspace root', () => {
    pkg('.', { name: 'mono', workspaces: ['packages/*'], packageManager: 'yarn@1.22.22' });
    expect(planInstall(tmp).args).toEqual(['add', '-D', '-W', PACKAGE_NAME]);
  });

  // @req FR:ai-plugin/bootstrap.add.workspace-root
  it('omits the workspace flag for Yarn Berry', () => {
    pkg('.', { name: 'mono', workspaces: ['packages/*'] });
    write('yarn.lock', '');
    write('.yarnrc.yml', 'nodeLinker: node-modules\n');
    expect(planInstall(tmp).args).toEqual(['add', '-D', PACKAGE_NAME]);
  });
});

describe('bootstrap', () => {
  // @req FR:ai-plugin/bootstrap.installed
  it('takes no action and prints nothing when already installed', () => {
    mkdir('.xe');
    installCatalyst();
    const runner = fakeRunner();
    for (const mode of ['hook', 'explicit'] as const) {
      expect(bootstrap({ start: tmp, mode, runner })).toEqual({ exitCode: 0 });
    }
    expect(runner.calls).toHaveLength(0);
  });

  // @req FR:ai-plugin/bootstrap.scope
  it('skips non-Catalyst projects in hook mode', () => {
    pkg('.', { name: 'other' });
    const runner = fakeRunner();
    expect(bootstrap({ start: tmp, mode: 'hook', runner })).toEqual({ exitCode: 0 });
    expect(runner.calls).toHaveLength(0);
  });

  // @req FR:ai-plugin/bootstrap.scope
  it('installs in any project in explicit mode', () => {
    pkg('.', { name: 'new-app' });
    const runner = fakeRunner();
    const result = bootstrap({ start: tmp, mode: 'explicit', runner });
    expect(result.exitCode).toBe(0);
    expect(runner.calls).toEqual([
      { command: 'npm', args: ['install', '--save-dev', PACKAGE_NAME], cwd: tmp },
    ]);
  });

  // @req FR:ai-plugin/bootstrap.restore
  // @req FR:ai-plugin/bootstrap.output
  it('restores a fresh clone in hook mode and reports one line', () => {
    mkdir('.xe');
    pkg('.', { devDependencies: { [PACKAGE_NAME]: '^0.2.0' } });
    write('pnpm-lock.yaml', '');
    const runner = fakeRunner();
    const result = bootstrap({ start: path.join(tmp), mode: 'hook', runner });
    expect(runner.calls).toEqual([{ command: 'pnpm', args: ['install'], cwd: tmp }]);
    expect(result.exitCode).toBe(0);
    expect(result.message).toMatch(/^Catalyst: .*pnpm/);
    expect(result.message).not.toContain('\n');
  });

  // @req FR:ai-plugin/bootstrap.root
  it('installs at the workspace root when started in a subpackage', () => {
    mkdir('.xe');
    pkg('.', { name: 'mono', workspaces: ['packages/*'] });
    write('package-lock.json', '{}');
    const start = mkdir('packages/app');
    const runner = fakeRunner();
    bootstrap({ start, mode: 'hook', runner });
    expect(runner.calls[0].cwd).toBe(tmp);
  });

  // @req FR:ai-plugin/bootstrap.corepack
  it('retries pnpm through Corepack when pnpm is not on PATH', () => {
    mkdir('.xe');
    pkg('.', { packageManager: 'pnpm@9.12.0' });
    const runner = fakeRunner([{ error: enoent(), status: null }, { status: 0 }]);
    const result = bootstrap({ start: tmp, mode: 'hook', runner });
    expect(runner.calls.map((c) => [c.command, ...c.args])).toEqual([
      ['pnpm', 'add', '-D', PACKAGE_NAME],
      ['corepack', 'pnpm', 'add', '-D', PACKAGE_NAME],
    ]);
    expect(result.exitCode).toBe(0);
  });

  // @req FR:ai-plugin/bootstrap.corepack
  it('does not use Corepack for npm or bun', () => {
    mkdir('.xe');
    write('bun.lock', '');
    const runner = fakeRunner([{ error: enoent(), status: null }]);
    bootstrap({ start: tmp, mode: 'hook', runner });
    expect(runner.calls).toHaveLength(1);
  });

  // @req FR:ai-plugin/bootstrap.pnp
  it('skips Yarn Plug\'n\'Play projects with the remedy', () => {
    mkdir('.xe');
    pkg('.', { packageManager: 'yarn@4.5.0' });
    write('.pnp.cjs', '');
    const runner = fakeRunner();
    const result = bootstrap({ start: tmp, mode: 'hook', runner });
    expect(runner.calls).toHaveLength(0);
    expect(result.exitCode).toBe(0);
    expect(result.message).toContain('nodeLinker: node-modules');
  });

  // @req FR:ai-plugin/bootstrap.hook-safe
  it('exits 0 in hook mode when installation fails', () => {
    mkdir('.xe');
    const runner = fakeRunner([{ status: 1, stderr: 'npm ERR! network timeout' }]);
    const result = bootstrap({ start: tmp, mode: 'hook', runner });
    expect(result.exitCode).toBe(0);
    expect(result.message).toContain('network timeout');
    expect(result.message).toContain(`npm install --save-dev ${PACKAGE_NAME}`);
  });

  // @req FR:ai-plugin/bootstrap.hook-safe
  it('exits 0 in hook mode when the runner throws', () => {
    mkdir('.xe');
    const runner = (() => {
      throw new Error('boom');
    }) as Runner;
    expect(bootstrap({ start: tmp, mode: 'hook', runner }).exitCode).toBe(0);
  });

  // @req FR:ai-plugin/bootstrap.explicit-failure
  it('exits non-zero in explicit mode when installation fails', () => {
    const runner = fakeRunner([{ status: 1, stderr: 'boom' }]);
    expect(bootstrap({ start: tmp, mode: 'explicit', runner }).exitCode).not.toBe(0);
  });

  // @req FR:ai-plugin/bootstrap.explicit-failure
  it('exits non-zero in explicit mode when the package manager is missing', () => {
    write('bun.lock', '');
    const runner = fakeRunner([{ error: enoent(), status: null }]);
    const result = bootstrap({ start: tmp, mode: 'explicit', runner });
    expect(result.exitCode).not.toBe(0);
    expect(result.message).toMatch(/bun/);
  });

  // @req FR:ai-plugin/bootstrap.explicit-failure
  it('exits non-zero in explicit mode when skipping Plug\'n\'Play', () => {
    write('.pnp.cjs', '');
    const result = bootstrap({ start: tmp, mode: 'explicit', runner: fakeRunner() });
    expect(result.exitCode).not.toBe(0);
  });

  // @req FR:ai-plugin/bootstrap.explicit-failure
  // @req FR:ai-plugin/bootstrap.output
  it('succeeds when the package is installed despite a non-zero exit, and reports why', () => {
    // pnpm exits 1 with ERR_PNPM_IGNORED_BUILDS after installing when it blocks build scripts
    const runner = ((): RunResult => {
      installCatalyst();
      return { status: 1, stderr: '', stdout: '[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: x' };
    }) as Runner;
    const result = bootstrap({ start: tmp, mode: 'explicit', runner });
    expect(result.exitCode).toBe(0);
    expect(result.message).toContain('ERR_PNPM_IGNORED_BUILDS');
  });

  // @req FR:ai-plugin/bootstrap.output
  it('reports only error lines when the output has them', () => {
    const stdout = 'Progress: resolved 1\nPackages: +1\n[ERR_PNPM_X] Something broke\nRun "pnpm fix"';
    const runner = fakeRunner([{ status: 1, stderr: '', stdout }]);
    const { message } = bootstrap({ start: tmp, mode: 'explicit', runner });
    expect(message).toContain('[ERR_PNPM_X] Something broke');
    expect(message).not.toContain('Progress');
  });

  // @req FR:ai-plugin/bootstrap.output
  it('reports stdout when the package manager writes errors there', () => {
    const runner = fakeRunner([{ status: 1, stderr: '', stdout: 'ERR_PNPM_FETCH_404 not found' }]);
    expect(bootstrap({ start: tmp, mode: 'explicit', runner }).message).toContain('ERR_PNPM_FETCH_404');
  });

  // @req FR:ai-plugin/bootstrap.output
  it('truncates long package manager errors to a single line', () => {
    mkdir('.xe');
    const stderr = Array.from({ length: 200 }, (_, i) => `line ${i} ${'x'.repeat(40)}`).join('\n');
    const runner = fakeRunner([{ status: 1, stderr }]);
    const { message } = bootstrap({ start: tmp, mode: 'hook', runner });
    expect(message).not.toContain('\n');
    expect(message!.length).toBeLessThan(600);
  });
});

describe('main', () => {
  let log: jest.SpyInstance;

  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
  });

  // @req FR:ai-plugin/bootstrap.@hook
  // @req FR:ai-plugin/bootstrap.@cli
  it('runs hook mode with --hook and explicit mode otherwise', () => {
    pkg('.', { name: 'plain' });
    const runner = fakeRunner([{ status: 1, stderr: 'nope' }, { status: 1, stderr: 'nope' }]);
    expect(main(['--hook'], { CLAUDE_PROJECT_DIR: tmp }, runner)).toBe(0);
    expect(runner.calls).toHaveLength(0); // not a Catalyst project → hook skips
    expect(main([], { CLAUDE_PROJECT_DIR: tmp }, runner)).not.toBe(0);
    expect(runner.calls).toHaveLength(1);
  });

  // @req FR:ai-plugin/bootstrap.output
  it('prints the status line only when there is one', () => {
    mkdir('.xe');
    installCatalyst();
    main(['--hook'], { CLAUDE_PROJECT_DIR: tmp }, fakeRunner());
    expect(log).not.toHaveBeenCalled();
    fs.rmSync(path.join(tmp, 'node_modules'), { recursive: true });
    main(['--hook'], { CLAUDE_PROJECT_DIR: tmp }, fakeRunner());
    expect(log).toHaveBeenCalledTimes(1);
  });
});

describe('non-functional requirements', () => {
  // @req NFR:ai-plugin/performance.noop
  it('finishes in under 100ms when already installed', () => {
    mkdir('.xe');
    pkg('.', { devDependencies: { [PACKAGE_NAME]: '^0.2.0' } });
    installCatalyst();
    const start = mkdir('a/b/c/d');
    const t0 = process.hrtime.bigint();
    bootstrap({ start, mode: 'hook', runner: fakeRunner() });
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    expect(ms).toBeLessThan(100);
  });

  // @req NFR:ai-plugin/portability.zero-deps
  it('imports only Node.js built-in modules', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../../src/ai/plugin/bootstrap.ts'),
      'utf8',
    );
    const specifiers = [...source.matchAll(/(?:from\s+|require\()\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    expect(specifiers.length).toBeGreaterThan(0);
    const builtins = new Set(require('module').builtinModules as string[]);
    for (const spec of specifiers) {
      expect(builtins.has(spec.replace(/^node:/, ''))).toBe(true);
    }
  });
});
