/**
 * Minimal path globs: `**` spans folders, `*` and `?` stay inside one segment.
 * A pattern without a slash matches the file name at any depth.
 */

const cache = new Map<string, RegExp>();

/** Regular expression for a glob, matched against a repo-relative POSIX path. */
export function globToRegExp(glob: string): RegExp {
  const hit = cache.get(glob);
  if (hit) {return hit;}
  const pattern = glob.includes('/') ? glob : `**/${glob}`;
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*' && pattern[i + 1] === '*') {
      const slash = pattern[i + 2] === '/';
      re += slash ? '(?:.*/)?' : '.*';
      i += slash ? 2 : 1;
    } else if (c === '*') {
      re += '[^/]*';
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  const compiled = new RegExp(`^${re}$`, 'i');
  cache.set(glob, compiled);
  return compiled;
}

/** First glob that matches `filePath`, if any. */
export function firstMatch(filePath: string, globs: string[]): string | undefined {
  return globs.find((g) => globToRegExp(g).test(filePath));
}
