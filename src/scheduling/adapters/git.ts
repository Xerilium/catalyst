/**
 * Default-branch check for repo schedules.
 *
 * @req FR:scheduling/file.default-branch
 */

import { execFileSync } from 'child_process';
import * as path from 'path';

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();

/**
 * Root of the checkout to register. A linked worktree never sits on the default branch,
 * so it resolves to the main checkout. Falls back to `cwd` outside git.
 */
export function checkoutRoot(cwd: string): string {
  try {
    const top = git(cwd, 'rev-parse', '--show-toplevel');
    const common = path.resolve(top, git(cwd, 'rev-parse', '--git-common-dir'));
    return path.basename(common) === '.git' ? path.dirname(common) : top;
  } catch {
    return cwd;
  }
}

/** True when the checkout is on its default branch. False on any git failure. */
export function isDefaultBranch(root: string): boolean {
  try {
    const current = git(root, 'rev-parse', '--abbrev-ref', 'HEAD');
    let def: string | undefined;
    try { def = git(root, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD').replace(/^origin\//, ''); } catch { /* no remote */ }
    return def ? current === def : current === 'main' || current === 'master';
  } catch {
    return false;
  }
}
