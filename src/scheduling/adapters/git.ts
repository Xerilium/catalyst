/**
 * Default-branch check for repo schedules.
 *
 * @req FR:scheduling/file.default-branch
 */

import { execFileSync } from 'child_process';

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();

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
