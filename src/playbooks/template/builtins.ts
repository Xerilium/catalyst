/**
 * Built-in `env` variable
 *
 * The engine exposes one built-in object, `env`, readable via `{{env.name}}`,
 * `get('env')`, and script `get('env')`. A context variable named `env` takes
 * precedence. Filesystem roots are discovered once per working directory.
 *
 * @req FR:playbook-template-engine/context.builtins
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/** Name of the built-in variable */
export const BUILTIN_NAME = 'env';

/** Values in the built-in `env` object */
export interface BuiltinEnv {
  projectRoot: string;
  packageRoot: string;
  gitRoot: string;
  xeRoot: string;
  catalystRoot: string;
  home: string;
  platform: string;
  today: string;
}

type Roots = Pick<BuiltinEnv, 'packageRoot' | 'gitRoot' | 'catalystRoot'>;

const rootsCache = new Map<string, Roots>();

/** Walks up from `start` until `test` matches a directory; returns '' if none. */
function findUp(start: string, test: (dir: string) => boolean): string {
  let dir = path.resolve(start);
  for (;;) {
    if (test(dir)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return '';
    }
    dir = parent;
  }
}

function isCatalystPackage(dir: string): boolean {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'));
    return pkg.name === '@xerilium/catalyst';
  } catch {
    return false;
  }
}

function roots(cwd: string): Roots {
  let cached = rootsCache.get(cwd);
  if (!cached) {
    cached = {
      packageRoot: findUp(cwd, (d) => fs.existsSync(path.join(d, 'package.json'))),
      gitRoot: findUp(cwd, (d) => fs.existsSync(path.join(d, '.git'))),
      catalystRoot: findUp(__dirname, isCatalystPackage)
    };
    rootsCache.set(cwd, cached);
  }
  return cached;
}

/**
 * Returns the built-in `env` object.
 *
 * @param cwd - Directory Catalyst runs in (default: process.cwd())
 *
 * @req FR:playbook-template-engine/context.builtins.project-root
 * @req FR:playbook-template-engine/context.builtins.package-root
 * @req FR:playbook-template-engine/context.builtins.git-root
 * @req FR:playbook-template-engine/context.builtins.xe-root
 * @req FR:playbook-template-engine/context.builtins.catalyst-root
 * @req FR:playbook-template-engine/context.builtins.home
 * @req FR:playbook-template-engine/context.builtins.platform
 * @req FR:playbook-template-engine/context.builtins.today
 * @req FR:playbook-template-engine/context.builtins.lazy
 */
export function getBuiltins(cwd: string = process.cwd()): BuiltinEnv {
  return {
    projectRoot: cwd,
    ...roots(cwd),
    xeRoot: path.join(cwd, '.xe'),
    home: os.homedir(),
    platform: process.platform,
    today: new Date().toISOString().slice(0, 10)
  };
}

/**
 * Resolves a top-level variable, falling back to the built-in `env` when the
 * variables object has no own property of that name.
 *
 * @req FR:playbook-template-engine/context.builtins.precedence
 * @req FR:playbook-template-engine/context.builtins.scope
 */
export function withBuiltin(variables: Record<string, unknown> | undefined, name: string): unknown {
  if (variables && Object.prototype.hasOwnProperty.call(variables, name)) {
    return variables[name];
  }
  return name === BUILTIN_NAME ? getBuiltins() : undefined;
}
