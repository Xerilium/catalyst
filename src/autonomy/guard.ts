/**
 * Never-auto guard: a fixed list of actions full autonomy never takes.
 * The list is code, not settings, so no repository can unlock an entry.
 * @req FR:autonomy/never.fixed
 */

export type NeverCategory = 'release' | 'settings' | 'destructive' | 'publish';

/** @req FR:autonomy/never.output */
export type GuardResult = { allowed: true } | { allowed: false; category: NeverCategory; reason: string };

export interface GuardContext {
  /** `owner/repo` of the current repository, for cross-repository checks */
  repo?: string;
}

/** Split a command line into words, honoring simple quotes. */
function words(segment: string): string[] {
  return [...segment.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3]);
}

/** Split chained commands (`&&`, `||`, `;`, `|`, newlines) into segments. */
function segments(command: string): string[] {
  return command
    .split(/&&|\|\||;|\||\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const block = (category: NeverCategory, reason: string): GuardResult => ({ allowed: false, category, reason });

const SETTINGS_API = /^\/?repos\/[^/]+\/[^/]+(\/(branches\/[^/]+\/protection.*|hooks.*|keys.*|collaborators.*|rulesets.*|actions\/secrets.*|actions\/variables.*|environments.*))?\/?$/;

/** Method of a `gh api` call; GET unless `-X`/`--method` or a field flag says otherwise. */
function apiMethod(w: string[]): string {
  const i = w.findIndex((x) => x === '-X' || x === '--method');
  if (i >= 0 && w[i + 1]) {return w[i + 1].toUpperCase();}
  const inline = w.find((x) => /^(-X|--method=)/.test(x) && x.length > 2);
  if (inline) {return inline.replace(/^(-X|--method=)/, '').toUpperCase();}
  return w.some((x) => /^(-f|-F|--field|--raw-field|--input)$/.test(x)) ? 'POST' : 'GET';
}

function repoFlag(w: string[]): string | undefined {
  const i = w.findIndex((x) => x === '-R' || x === '--repo');
  if (i >= 0) {return w[i + 1];}
  return w.find((x) => x.startsWith('--repo='))?.slice('--repo='.length);
}

function checkGh(w: string[], ctx: GuardContext): GuardResult | undefined {
  const [, sub, verb] = w;
  // @req FR:autonomy/never.release
  if (sub === 'release' && verb && !['list', 'view', 'download'].includes(verb)) {return block('release', `gh release ${verb} releases software`);}
  // @req FR:autonomy/never.settings
  if (['secret', 'variable', 'auth', 'ruleset'].includes(sub ?? '') && !['list', 'view', 'status', 'check'].includes(verb ?? '')) {
    return block('settings', `gh ${sub} ${verb ?? ''} changes settings or credentials`.trim());
  }
  if (sub === 'repo' && verb === 'edit') {return block('settings', 'gh repo edit changes repository settings');}
  // @req FR:autonomy/never.destructive
  if (sub === 'repo' && verb === 'delete') {return block('destructive', 'gh repo delete deletes a repository');}
  // @req FR:autonomy/never.publish
  if (sub === 'gist' && verb && !['list', 'view'].includes(verb)) {return block('publish', `gh gist ${verb} publishes outside the repository`);}
  const other = repoFlag(w);
  // Unknown current repository: fail closed
  if (other && (!ctx.repo || other.toLowerCase() !== ctx.repo.toLowerCase())) {
    return block('publish', `--repo ${other} acts outside this repository`);
  }
  if (sub === 'api') {
    const method = apiMethod(w);
    const endpoint = w.slice(2).find((x) => !x.startsWith('-') && /\//.test(x) && !/^https?:/.test(x)) ?? '';
    if (method === 'DELETE') {return block('destructive', `gh api DELETE ${endpoint}`);}
    if (method !== 'GET' && SETTINGS_API.test(endpoint)) {return block('settings', `gh api ${method} ${endpoint} changes repository settings`);}
  }
  return undefined;
}

function checkGit(w: string[]): GuardResult | undefined {
  const sub = w[1];
  if (sub === 'push') {
    const args = w.slice(2);
    // @req FR:autonomy/never.release
    if (args.includes('--tags') || args.includes('--follow-tags') || args.some((a) => /^refs\/tags\//.test(a))) {return block('release', 'git push --tags publishes release tags');}
    // @req FR:autonomy/never.destructive
    // @req FR:autonomy/never.destructive.lease
    if (args.some((a) => a === '--force' || a === '-f' || /^\+/.test(a) || (/^-[a-z]*f[a-z]*$/.test(a) && !a.startsWith('--')))) {
      return block('destructive', 'git push --force without a lease overwrites remote history');
    }
    if (args.includes('--delete') || args.includes('-d') || args.some((a) => /^:/.test(a))) {
      return block('destructive', 'git push --delete removes a remote branch or tag');
    }
  }
  // @req FR:autonomy/never.release
  if (sub === 'tag') {
    const listOnly = w.length === 2 || w.slice(2).every((a) => ['-l', '--list', '-n'].includes(a) || a.startsWith('--list') || a.startsWith('--contains') || a.startsWith('--sort'));
    if (!listOnly) {return block('release', 'git tag creates or changes a release tag');}
  }
  // @req FR:autonomy/never.destructive
  if (sub === 'filter-branch' || sub === 'filter-repo') {return block('destructive', `git ${sub} rewrites history`);}
  // @req FR:autonomy/never.settings
  if (sub === 'config' && w.slice(2).some((a) => a === '--global' || a === '--system')) {
    return block('settings', 'git config --global changes machine settings');
  }
  return undefined;
}

function checkPackageManager(w: string[]): GuardResult | undefined {
  const [tool] = w;
  if (!['npm', 'pnpm', 'yarn', 'bun'].includes(tool)) {return undefined;}
  const rest = w.slice(1);
  // @req FR:autonomy/never.release
  if (rest.includes('publish')) {return block('release', `${tool} publish releases a package`);}
  if (tool === 'npm' && rest[0] === 'version') {return block('release', 'npm version bumps a release version');}
  // @req FR:autonomy/never.settings
  if (tool === 'npm' && ['login', 'adduser', 'logout', 'token', 'owner', 'access'].includes(rest[0] ?? '')) {
    return block('settings', `npm ${rest[0]} changes credentials or access`);
  }
  if (tool === 'npm' && rest[0] === 'config' && ['set', 'delete'].includes(rest[1] ?? '')) {
    return block('settings', `npm config ${rest[1]} changes settings`);
  }
  return undefined;
}

function checkOther(w: string[], segment: string): GuardResult | undefined {
  const [tool] = w;
  // @req FR:autonomy/never.destructive
  if (tool === 'rm' && w.some((a) => /^-[a-z]*r/i.test(a)) && w.some((a) => ['/', '~', '~/', '/*', '$HOME', '..'].includes(a))) {
    return block('destructive', 'rm -r of the root, home, or parent folder');
  }
  if (/\b(drop\s+(table|database|schema)|truncate\s+table)\b/i.test(segment)) {
    return block('destructive', 'SQL DROP or TRUNCATE deletes data');
  }
  // @req FR:autonomy/never.publish
  if (tool === 'curl') {
    const i = w.findIndex((a) => a === '-X' || a === '--request');
    const inline = w.find((a) => /^-X[A-Za-z]+$/.test(a));
    const method = (i >= 0 ? w[i + 1] : inline?.slice(2))?.toUpperCase();
    const sendsData = w.some((a) => /^(-d|-F|-T|--json|--upload-file|--data(-[a-z]+)?|--form(-string)?)(=.*)?$/.test(a));
    if (sendsData || (method && !['GET', 'HEAD'].includes(method))) {
      return block('publish', 'curl sends data outside the repository');
    }
  }
  if (tool === 'wget' && w.some((a) => /^--(post|put|method|body)/.test(a))) {
    return block('publish', 'wget sends data outside the repository');
  }
  return undefined;
}

/**
 * Check one command line, chains included, against the never-auto list.
 * @req FR:autonomy/never.@cli
 */
export function guardCommand(command: string, ctx: GuardContext = {}): GuardResult {
  for (const segment of segments(command)) {
    const w = words(segment).filter((x) => !/^[A-Z_][A-Z0-9_]*=/.test(x));
    const [tool] = w;
    if (!tool) {continue;}
    const hit =
      (tool === 'gh' ? checkGh(w, ctx) : undefined) ??
      (tool === 'git' ? checkGit(w) : undefined) ??
      checkPackageManager(w) ??
      checkOther(w, segment);
    if (hit) {return hit;}
  }
  return { allowed: true };
}
