"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PACKAGE_NAME = void 0;
exports.resolveStartDir = resolveStartDir;
exports.resolveProjectRoot = resolveProjectRoot;
exports.isInstalled = isInstalled;
exports.installedVersion = installedVersion;
exports.declaredMinVersion = declaredMinVersion;
exports.isAtLeast = isAtLeast;
exports.detectPackageManager = detectPackageManager;
exports.planInstall = planInstall;
exports.bootstrap = bootstrap;
exports.main = main;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
exports.PACKAGE_NAME = '@xerilium/catalyst';
const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'];
/** Lockfiles in detection order. @req FR:ai-plugin/bootstrap.package-manager.lockfile */
const LOCKFILES = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lock', 'bun'],
    ['bun.lockb', 'bun'],
    ['package-lock.json', 'npm'],
    ['npm-shrinkwrap.json', 'npm'],
];
const MAX_DETAIL = 300;
const exists = (p) => fs.existsSync(p);
function readPackageJson(dir) {
    try {
        return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    }
    catch {
        return undefined;
    }
}
/**
 * Start directory for root resolution.
 * @req FR:ai-plugin/bootstrap.input
 */
function resolveStartDir(env, cwd) {
    return env.CLAUDE_PROJECT_DIR || cwd;
}
/** Nearest ancestor (inclusive) containing `.git` (directory, or file for worktrees). */
function findGitRoot(start) {
    for (let dir = path.resolve(start);; dir = path.dirname(dir)) {
        if (exists(path.join(dir, '.git'))) {
            return dir;
        }
        if (path.dirname(dir) === dir) {
            return undefined;
        }
    }
}
function declaresWorkspaces(dir) {
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
function resolveProjectRoot(start) {
    const from = path.resolve(start);
    const gitRoot = findGitRoot(from);
    const chain = [];
    for (let dir = from;; dir = path.dirname(dir)) {
        chain.push(dir);
        if (!gitRoot || dir === gitRoot || path.dirname(dir) === dir) {
            break;
        }
    }
    const workspace = [...chain].reverse().find(declaresWorkspaces);
    if (workspace) {
        return workspace;
    }
    const nearestPackage = chain.find((dir) => exists(path.join(dir, 'package.json')));
    return nearestPackage ?? gitRoot ?? from;
}
/** @req FR:ai-plugin/bootstrap.installed */
function isInstalled(root) {
    return exists(path.join(root, 'node_modules', exports.PACKAGE_NAME, 'package.json'));
}
function declaresCatalyst(pkg) {
    return [pkg?.dependencies, pkg?.devDependencies, pkg?.optionalDependencies].some((deps) => deps !== undefined && exports.PACKAGE_NAME in deps);
}
/**
 * Version of the `@xerilium/catalyst` package installed at the project root.
 *
 * @req FR:ai-plugin/bootstrap.min-version
 */
function installedVersion(root) {
    return readPackageJson(path.join(root, 'node_modules', exports.PACKAGE_NAME))?.version;
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
function declaredMinVersion(scriptDir) {
    try {
        const file = path.join(scriptDir, '..', '.claude-plugin', 'plugin.json');
        const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
        return manifest.metadata?.minCatalystVersion;
    }
    catch {
        return undefined;
    }
}
/**
 * Compare `major.minor.patch`, ignoring any prerelease suffix so a local
 * `0.3.0-dev` build satisfies a `0.3.0` minimum.
 *
 * @req FR:ai-plugin/bootstrap.min-version
 */
function isAtLeast(version, minimum) {
    const parts = (v) => (/^(\d+)\.(\d+)\.(\d+)/.exec(v) ?? []).slice(1, 4).map(Number);
    const [have, want] = [parts(version), parts(minimum)];
    if (have.length !== 3 || want.length !== 3) {
        return true;
    }
    for (let i = 0; i < 3; i++) {
        if (have[i] !== want[i]) {
            return have[i] > want[i];
        }
    }
    return true;
}
/**
 * @req FR:ai-plugin/bootstrap.package-manager
 * @req FR:ai-plugin/bootstrap.package-manager.lockfile
 * @req FR:ai-plugin/bootstrap.package-manager.default
 */
function detectPackageManager(root) {
    const field = readPackageJson(root)?.packageManager;
    const match = typeof field === 'string' ? /^([a-z]+)@([^+\s]+)/.exec(field) : null;
    if (match && PACKAGE_MANAGERS.includes(match[1])) {
        return { name: match[1], version: match[2] };
    }
    const lockfile = LOCKFILES.find(([file]) => exists(path.join(root, file)));
    return { name: lockfile ? lockfile[1] : 'npm' };
}
function isYarnClassic(root, version) {
    if (version) {
        return version.startsWith('1.');
    }
    return !exists(path.join(root, '.yarnrc.yml'));
}
/**
 * @req FR:ai-plugin/bootstrap.restore
 * @req FR:ai-plugin/bootstrap.add
 * @req FR:ai-plugin/bootstrap.add.workspace-root
 */
function planInstall(root) {
    const { name: pm, version } = detectPackageManager(root);
    if (declaresCatalyst(readPackageJson(root))) {
        return { pm, action: 'restore', args: ['install'] };
    }
    const workspaceFlag = pm === 'pnpm' && exists(path.join(root, 'pnpm-workspace.yaml'))
        ? ['-w']
        : pm === 'yarn' && declaresWorkspaces(root) && isYarnClassic(root, version)
            ? ['-W']
            : [];
    const args = {
        npm: ['install', '--save-dev', exports.PACKAGE_NAME],
        pnpm: ['add', '-D', ...workspaceFlag, exports.PACKAGE_NAME],
        yarn: ['add', '-D', ...workspaceFlag, exports.PACKAGE_NAME],
        bun: ['add', '-d', exports.PACKAGE_NAME],
    };
    return { pm, action: 'add', args: args[pm] };
}
/** @req FR:ai-plugin/bootstrap.pnp */
function isPnp(root) {
    return exists(path.join(root, '.pnp.cjs')) || exists(path.join(root, '.pnp.js'));
}
const defaultRunner = (command, args, cwd) => {
    const result = (0, child_process_1.spawnSync)(command, args, {
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
        error: result.error,
    };
};
/**
 * Collapse package manager output into one bounded line, keeping only error
 * lines when there are any.
 *
 * @req FR:ai-plugin/bootstrap.output
 */
function oneLine(text) {
    const errors = text.split('\n').filter((line) => /\bERR|error/i.test(line));
    const flat = (errors.length > 0 ? errors.join(' ') : text).replace(/\s+/g, ' ').trim();
    return flat.length > MAX_DETAIL ? `…${flat.slice(-MAX_DETAIL)}` : flat;
}
/** @req FR:ai-plugin/bootstrap.corepack */
function run(plan, root, runner) {
    const result = runner(plan.pm, plan.args, root);
    if (result.error?.code === 'ENOENT' && (plan.pm === 'pnpm' || plan.pm === 'yarn')) {
        const viaCorepack = runner('corepack', [plan.pm, ...plan.args], root);
        return viaCorepack.error?.code === 'ENOENT' ? result : viaCorepack;
    }
    return result;
}
function install(root, runner) {
    const plan = planInstall(root);
    const command = [plan.pm, ...plan.args].join(' ');
    if (isPnp(root)) {
        return {
            ok: false,
            message: `Catalyst: Skipped installing ${exports.PACKAGE_NAME} — Yarn Plug'n'Play isn't supported. Set "nodeLinker: node-modules" in .yarnrc.yml, then run: ${command}`,
        };
    }
    let result;
    try {
        result = run(plan, root, runner);
    }
    catch (err) {
        result = { status: null, stderr: '', error: err };
    }
    if (result.error?.code === 'ENOENT') {
        return { ok: false, message: `Catalyst: Couldn't install ${exports.PACKAGE_NAME} — ${plan.pm} isn't installed. Install ${plan.pm}, then run: ${command}` };
    }
    const failed = result.error !== undefined || result.status !== 0;
    const detail = failed
        ? oneLine(result.stderr || result.stdout || result.error?.message || `exit code ${result.status}`)
        : '';
    // Package managers can exit non-zero after installing (e.g. pnpm blocking dependency build scripts)
    if (failed && !isInstalled(root)) {
        return { ok: false, message: `Catalyst: Couldn't install ${exports.PACKAGE_NAME} (${command} failed: ${detail}). Run it manually.` };
    }
    const done = plan.action === 'restore'
        ? `Catalyst: Installed project dependencies with ${plan.pm} (${exports.PACKAGE_NAME} was missing)`
        : `Catalyst: Added ${exports.PACKAGE_NAME} as a dev dependency with ${plan.pm}`;
    return { ok: true, message: failed ? `${done}; ${plan.pm} reported: ${detail}` : `${done}.` };
}
/**
 * Report an installed package older than the plugin's declared minimum.
 *
 * @req FR:ai-plugin/bootstrap.min-version
 */
function checkMinVersion(root, minimum) {
    const installed = installedVersion(root);
    if (!minimum || !installed || isAtLeast(installed, minimum)) {
        return { exitCode: 0 };
    }
    const { pm } = planInstall(root);
    const upgrade = {
        npm: `npm install --save-dev ${exports.PACKAGE_NAME}@^${minimum}`,
        pnpm: `pnpm add -D ${exports.PACKAGE_NAME}@^${minimum}`,
        yarn: `yarn add -D ${exports.PACKAGE_NAME}@^${minimum}`,
        bun: `bun add -d ${exports.PACKAGE_NAME}@^${minimum}`,
    };
    return {
        exitCode: 1,
        message: `Catalyst: This project has ${exports.PACKAGE_NAME} ${installed}, but the Catalyst plugin needs ${minimum} or later. ` +
            `Upgrade with: ${upgrade[pm]}`,
    };
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
function bootstrap(options) {
    const { runner = defaultRunner } = options;
    try {
        const root = resolveProjectRoot(options.start);
        if (isInstalled(root)) {
            return checkMinVersion(root, options.minVersion);
        }
        const { ok, message } = install(root, runner);
        if (!ok) {
            return { exitCode: 1, message };
        }
        const version = checkMinVersion(root, options.minVersion);
        return version.exitCode === 0 ? { exitCode: 0, message } : version;
    }
    catch (err) {
        return {
            exitCode: 1,
            message: `Catalyst: Couldn't check for ${exports.PACKAGE_NAME} (${oneLine(String(err?.message ?? err))}).`,
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
function main(argv, env = process.env, runner) {
    const flag = argv.indexOf('--min-version');
    const minVersion = flag === -1 ? declaredMinVersion(__dirname) : argv[flag + 1];
    const result = bootstrap({ start: resolveStartDir(env, process.cwd()), minVersion, runner });
    if (result.message) {
        console.log(result.message);
    }
    return result.exitCode;
}
if (require.main === module) {
    process.exitCode = main(process.argv.slice(2));
}
//# sourceMappingURL=bootstrap.js.map
