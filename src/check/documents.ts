/**
 * Document loading for check rules.
 * @req FR:cli-check/spec.input
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { Document } from './types';

/** Match a feature ID against an exact ID or a `*` / `?` glob. */
export function featureMatcher(pattern: string | undefined): (id: string) => boolean {
  if (!pattern) {return () => true;}
  if (!/[*?]/.test(pattern)) {return (id) => id === pattern;}
  const regex = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  return (id) => regex.test(id);
}

/**
 * Every `.xe/features/**\/spec.md` whose feature ID matches `feature`, sorted by path.
 * @req FR:cli-check/check.input
 */
export function loadSpecs(root: string, feature?: string): Document[] {
  const featuresDir = path.join(root, '.xe', 'features');
  const matches = featureMatcher(feature);
  const docs: Document[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === 'spec.md') {
        const id = path.relative(featuresDir, dir).split(path.sep).join('/');
        if (matches(id)) {
          docs.push({
            path: path.relative(root, full).split(path.sep).join('/'),
            content: fs.readFileSync(full, 'utf-8'),
          });
        }
      }
    }
  };
  if (fs.existsSync(featuresDir)) {walk(featuresDir);}
  return docs.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Git-tracked `.xe/rollouts/rollout-*.md` files, sorted by path. Untracked rollouts are legitimate scratch.
 * @req FR:cli-check/rollout.input
 */
export function loadTrackedRollouts(root: string): Document[] {
  let listed: string;
  try {
    listed = execFileSync('git', ['ls-files', '--', '.xe/rollouts/rollout-*.md'], {
      cwd: root,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return [];
  }
  return listed
    .split(/\r?\n/)
    .filter((p) => p && fs.existsSync(path.join(root, p)))
    .sort((a, b) => a.localeCompare(b))
    .map((p) => ({ path: p, content: fs.readFileSync(path.join(root, p), 'utf-8') }));
}
