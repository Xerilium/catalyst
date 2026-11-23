/**
 * Catalyst Package Location
 *
 * Locates folders by walking up the filesystem, and identifies the installed
 * Catalyst package by its `package.json` name.
 *
 * @req FR:playbook-template-engine/context.builtins.catalyst-root
 * @req FR:playbook-template-engine/paths.protocols.catalyst
 */

import * as fs from 'fs';
import * as path from 'path';

/** Walks up from `start` until `test` matches a directory; returns '' if none. */
export function findUp(start: string, test: (dir: string) => boolean): string {
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

/** True when `dir` holds the `@xerilium/catalyst` package.json. */
export function isCatalystPackage(dir: string): boolean {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'));
    return pkg.name === '@xerilium/catalyst';
  } catch {
    return false;
  }
}
