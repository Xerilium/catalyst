/**
 * Built-in template variables
 *
 * Provided by the engine to `{{name}}` and `get('name')`. Context variables
 * with the same name take precedence.
 *
 * @req FR:playbook-template-engine/context.builtins
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/** Walks up from `start` until `test` matches a directory; returns '' if none. */
function findUp(start: string, test: (dir: string) => boolean): string {
  let dir = path.resolve(start);
  for (;;) {
    if (test(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return '';
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

/**
 * Returns the built-in variables.
 *
 * @param cwd - Directory Catalyst runs in (default: process.cwd())
 *
 * @req FR:playbook-template-engine/context.builtins.project-root
 * @req FR:playbook-template-engine/context.builtins.package-root
 * @req FR:playbook-template-engine/context.builtins.git-root
 * @req FR:playbook-template-engine/context.builtins.home
 * @req FR:playbook-template-engine/context.builtins.platform
 * @req FR:playbook-template-engine/context.builtins.today
 */
export function getBuiltins(cwd: string = process.cwd()): Record<string, string> {
  return {
    'project-root': cwd,
    'package-root': findUp(__dirname, isCatalystPackage),
    'git-root': findUp(cwd, (d) => fs.existsSync(path.join(d, '.git'))),
    home: os.homedir(),
    platform: process.platform,
    today: new Date().toISOString().slice(0, 10),
  };
}
