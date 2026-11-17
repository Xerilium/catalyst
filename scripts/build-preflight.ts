// @req FR:devops-build/build.deps

import * as fs from 'fs';
import * as path from 'path';

/** Throws with the fix when dependencies are not installed under `root`. */
export function assertDepsInstalled(root: string = process.cwd()): void {
  if (!fs.existsSync(path.join(root, 'node_modules', '.bin', 'tsc'))) {
    throw new Error('Dependencies are not installed (fresh clone or worktree?). Run `npm ci`, then `npm run build`.');
  }
}
