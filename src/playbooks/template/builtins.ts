/**
 * Built-in `env` variable
 *
 * The engine exposes one built-in object, `env`, readable via `{{env.name}}`,
 * `get('env')`, and script `get('env')`. A context variable named `env` takes
 * precedence. Filesystem roots are discovered only when `env` is read; project
 * roots are re-checked on every read so files created mid-run are found.
 *
 * @req FR:playbook-template-engine/context.builtins
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { findUp, isCatalystPackage } from './catalyst-package';

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

/** Installed package location never changes during a process, so it is cached once found. */
let catalystRootCache = '';

function roots(cwd: string): Roots {
  if (!catalystRootCache) {
    catalystRootCache = findUp(__dirname, isCatalystPackage);
  }
  return {
    packageRoot: findUp(cwd, (d) => fs.existsSync(path.join(d, 'package.json'))),
    gitRoot: findUp(cwd, (d) => fs.existsSync(path.join(d, '.git'))),
    catalystRoot: catalystRootCache
  };
}

/** Formats a date as local-time `YYYY-MM-DD`. */
function localIsoDate(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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
 * @req FR:playbook-template-engine/context.builtins.cache
 * @req FR:playbook-template-engine/context.builtins.fresh
 */
export function getBuiltins(cwd: string = process.cwd()): BuiltinEnv {
  return {
    projectRoot: cwd,
    ...roots(cwd),
    xeRoot: path.join(cwd, '.xe'),
    home: os.homedir(),
    platform: process.platform,
    today: localIsoDate(new Date())
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
