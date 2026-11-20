/**
 * Never-auto guard: a fixed list of actions full autonomy never takes.
 * The list is code, not settings, so no repository can unlock an entry.
 * @req FR:autonomy/never.fixed
 */

export type NeverCategory = 'release' | 'settings' | 'destructive' | 'publish' | 'merge';

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

/** Split chained commands (`&&`, `||`, `;`, `|`, `&`, newlines) into segments, outside quotes only. */
function segments(command: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote: string | undefined;
  for (const c of command) {
    if (quote) {
      if (c === quote) {quote = undefined;}
      cur += c;
    } else if (c === '"' || c === "'") {
      quote = c;
      cur += c;
    } else if (c === ';' || c === '|' || c === '&' || c === '\n') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
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
  if (sub === 'workflow' && (verb === 'enable' || verb === 'disable')) {return block('settings', `gh workflow ${verb} changes repository automation`);}
  // @req FR:autonomy/never.release
  if (sub === 'workflow' && verb === 'run') {return block('release', 'gh workflow run can start a release or deploy workflow');}
  // @req FR:autonomy/never.destructive
  if (verb === 'delete') {return block('destructive', `gh ${sub} delete deletes data`);}
  // @req FR:autonomy/never.merge
  // Quotes split label names across words, so read the whole command
  if (['pr', 'issue'].includes(sub ?? '') && ['create', 'edit'].includes(verb ?? '') && w.some((a) => /^(--add-label|--label|-l)(=|$)/.test(a)) && /autopilot/i.test(w.join(' '))) {
    return block('merge', 'Only catalyst autonomy autopilot adds Autopilot');
  }
  // @req FR:autonomy/never.publish
  if (sub === 'gist' && verb && !['list', 'view'].includes(verb)) {return block('publish', `gh gist ${verb} publishes outside the repository`);}
  const other = repoFlag(w);
  // Unknown current repository: fail closed
  if (other && (!ctx.repo || other.toLowerCase() !== ctx.repo.toLowerCase())) {
    return block('publish', `--repo ${other} acts outside this repository`);
  }
  // @req FR:autonomy/never.merge
  if (sub === 'pr' && verb === 'merge') {return block('merge', 'gh pr merge merges a PR; the Autopilot gates decide the merge');}
  if (sub === 'api') {return checkGhApi(w, ctx);}
  return undefined;
}

const API_VALUE_FLAGS = new Set(['-X', '--method', '-f', '-F', '--field', '--raw-field', '-H', '--header', '-q', '--jq', '-t', '--template', '--input', '--hostname', '--cache', '-p', '--preview']);

/** GraphQL mutations that change settings, refs, releases, or merge state. */
const BLOCKED_MUTATIONS = /\b(delete\w*|archiveRepository|transferRepository|updateRepository\w*|(create|update)(BranchProtectionRule|Ref|Refs|RepositoryRuleset|Environment|DeploymentProtectionRule)|updateRefs|mergePullRequest|enablePullRequestAutoMerge|addCollaborator\w*|createRelease|updateRelease)\s*\(/;

/** The endpoint: the first positional word after `api`. */
function apiEndpoint(w: string[]): string {
  for (let i = 2; i < w.length; i++) {
    if (w[i].startsWith('-')) {
      if (API_VALUE_FLAGS.has(w[i])) {i++;}
      continue;
    }
    return w[i].replace(/^\//, '');
  }
  return '';
}

function checkGhApi(w: string[], ctx: GuardContext): GuardResult | undefined {
  const method = apiMethod(w);
  const endpoint = apiEndpoint(w);
  if (endpoint === 'graphql') {
    // A query we cannot read could be any mutation: fail closed
    if (w.some((a) => a === '--input' || /^query=@/.test(a) || /^@/.test(a) || /\$\(|`/.test(a))) {
      return block('settings', 'GraphQL query read from a file cannot be checked');
    }
    const m = BLOCKED_MUTATIONS.exec(w.join(' '));
    return /\bmutation\b/.test(w.join(' ')) && m ? block('settings', `GraphQL mutation ${m[1]} changes settings, refs, or merge state`) : undefined;
  }
  // @req FR:autonomy/never.destructive
  if (method === 'DELETE') {return block('destructive', `gh api DELETE ${endpoint}`);}
  if (method === 'GET') {return undefined;}
  // @req FR:autonomy/never.publish
  const target = /^repos\/([^/]+\/[^/]+)/.exec(endpoint)?.[1];
  if (target && !target.includes('{') && (!ctx.repo || target.toLowerCase() !== ctx.repo.toLowerCase())) {
    return block('publish', `gh api ${method} writes to ${target}, outside this repository`);
  }
  // @req FR:autonomy/never.release
  if (/^repos\/[^/]+\/[^/]+\/(releases|git\/refs\/tags|git\/tags|tags)/.test(endpoint) || (/\/git\/refs\/?$/.test(endpoint) && /refs\/tags\//.test(w.join(' ')))) {
    return block('release', `gh api ${method} ${endpoint} creates or changes a release or tag`);
  }
  // @req FR:autonomy/never.merge
  if (/^repos\/[^/]+\/[^/]+\/pulls\/\d+\/merge/.test(endpoint)) {return block('merge', 'gh api merges a PR');}
  if (/\/labels\/?$/.test(endpoint) && /autopilot/i.test(w.join(' '))) {return block('merge', 'Only catalyst autonomy autopilot adds Autopilot');}
  // @req FR:autonomy/never.settings
  if (SETTINGS_API.test(endpoint)) {return block('settings', `gh api ${method} ${endpoint} changes repository settings`);}
  return undefined;
}

const GIT_VALUE_OPTIONS = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--super-prefix', '--config-env']);

/** `git <global options> <sub> ...` → `git <sub> ...` */
function gitWords(w: string[]): string[] {
  let i = 1;
  while (i < w.length && w[i].startsWith('-')) {
    i += GIT_VALUE_OPTIONS.has(w[i]) ? 2 : 1;
  }
  return ['git', ...w.slice(i)];
}

function checkGit(raw: string[]): GuardResult | undefined {
  const w = gitWords(raw);
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
    if (args.some((a) => ['--delete', '-d', '--mirror', '--prune'].includes(a)) || args.some((a) => /^:/.test(a))) {
      return block('destructive', 'git push --delete removes a remote branch or tag');
    }
    // @req FR:autonomy/never.release
    const refs = args.filter((a) => !a.startsWith('-')).slice(1);
    if (refs.some((r) => /^(refs\/tags\/)?v?\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)?$/.test(r.split(':').pop() as string))) {return block('release', 'git push of a version tag publishes a release');}
    // @req FR:autonomy/never.merge
    if (refs.some((r) => /^(refs\/heads\/)?(main|master)$/.test(r.split(':').pop() as string))) {
      return block('merge', 'git push to the default branch skips the Autopilot gates');
    }
  }
  // @req FR:autonomy/never.release
  if (sub === 'tag') {
    const args = w.slice(2);
    const listOnly = args.length === 0 || args.some((a) => ['-l', '--list'].includes(a) || /^--(list|contains|no-contains|merged|no-merged|points-at|sort)(=|$)/.test(a));
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

/** Release tools run through npx or directly. */
const RELEASE_TOOLS = new Set(['semantic-release', 'release-it', 'np', 'changeset', 'changesets', 'lerna', 'standard-version']);

function checkPackageManager(w: string[]): GuardResult | undefined {
  const [tool] = w;
  // @req FR:autonomy/never.release
  if (RELEASE_TOOLS.has(tool) && !['changeset', 'changesets', 'lerna'].includes(tool)) {return block('release', `${tool} releases a package`);}
  if (['changeset', 'changesets', 'lerna'].includes(tool) && w.slice(1).some((a) => ['publish', 'version', 'tag'].includes(a))) {
    return block('release', `${tool} ${w[1]} releases a package`);
  }
  if (!['npm', 'pnpm', 'yarn', 'bun'].includes(tool)) {return undefined;}
  const rest = w.slice(1);
  // @req FR:autonomy/never.release
  if (rest.includes('publish')) {return block('release', `${tool} publish releases a package`);}
  if (rest.some((a) => ['unpublish', 'deprecate', 'dist-tag', 'dist-tags'].includes(a))) {return block('release', `${tool} ${rest.find((a) => /unpublish|deprecate|dist-tag/.test(a))} changes a published package`);}
  if (rest[0] === 'version') {return block('release', `${tool} version bumps a release version`);}
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

/** Commands that run another command named in their arguments. */
const PREFIXES = new Set(['sudo', 'env', 'xargs', 'command', 'nohup', 'time', 'exec', 'nice', 'timeout', 'npx', 'doas']);
const KNOWN_TOOLS = new Set(['semantic-release', 'release-it', 'np', 'changeset', 'changesets', 'lerna', 'standard-version', 'gh', 'git', 'npm', 'pnpm', 'yarn', 'bun', 'rm', 'curl', 'wget', 'eval', 'psql', 'mysql', 'sqlcmd', 'sqlite3', 'sh', 'bash', 'zsh', 'dash', 'ksh', 'pwsh', 'powershell', 'cmd', 'sudo', 'env', 'xargs', 'command', 'nohup', 'time', 'exec', 'nice', 'timeout', 'npx', 'doas']);
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'pwsh', 'powershell', 'cmd']);

/** Inner commands of `$(...)` and backtick substitutions. */
function substitutions(command: string): string[] {
  const found = [...command.matchAll(/`([^`]*)`/g)].map((m) => m[1]);
  for (let i = command.indexOf('$('); i >= 0; i = command.indexOf('$(', i + 2)) {
    let depth = 0;
    for (let j = i + 1; j < command.length; j++) {
      if (command[j] === '(') {depth++;}
      else if (command[j] === ')' && --depth === 0) {
        found.push(command.slice(i + 2, j).replace(/^\s*\(|\)\s*$/g, ''));
        break;
      }
    }
  }
  return found;
}

/** Words with env assignments and wrapper prefixes removed, and the tool reduced to its name. */
function unwrap(w: string[]): string[] {
  let rest = w;
  let piped = false;
  for (;;) {
    rest = rest.filter((x, i) => i > 0 || !/^[A-Za-z_][A-Za-z0-9_]*=/.test(x));
    if (rest.length === 0) {return rest;}
    const tool = rest[0].split(/[\\/]/).pop() as string;
    // xargs appends arguments we cannot see, so the command is never "bare"
    if (!PREFIXES.has(tool)) {return [tool, ...rest.slice(1), ...(piped ? ['<xargs>'] : [])];}
    if (tool === 'xargs') {piped = true;}
    // npx runs the package named by its first non-flag word (`pkg@version`), never a later argument
    if (tool === 'npx') {
      const pkg = rest.findIndex((x, i) => i > 0 && !x.startsWith('-'));
      if (pkg < 0) {return [];}
      rest = [rest[pkg].replace(/(.)@[^/]*$/, '$1'), ...rest.slice(pkg + 1)];
      continue;
    }
    // Skip the wrapper, its flags, and their values: resume at the first word that names a tool
    const next = rest.findIndex((x, i) => i > 0 && KNOWN_TOOLS.has(x.split(/[\\/]/).pop() as string));
    if (next < 0) {return [];}
    rest = rest.slice(next);
  }
}

/**
 * Check one command line, chains, wrappers, and substitutions included, against the never-auto list.
 * @req FR:autonomy/never.@cli
 * @req FR:autonomy/never.wrapped
 */
export function guardCommand(command: string, ctx: GuardContext = {}, depth = 0): GuardResult {
  if (depth > 5) {return block('destructive', 'command nests too deeply to check');}
  for (const inner of substitutions(command)) {
    const r = guardCommand(inner, ctx, depth + 1);
    if (!r.allowed) {return r;}
  }
  for (const segment of segments(command)) {
    const w = unwrap(words(segment));
    const [tool] = w;
    if (!tool) {continue;}
    if (tool === 'eval') {
      const r = guardCommand(w.slice(1).join(' '), ctx, depth + 1);
      if (!r.allowed) {return r;}
      continue;
    }
    if (SHELLS.has(tool)) {
      // `-c`, combined short flags such as `-lc`, `-Command`, or `/c`
      const i = w.findIndex((a) => /^-[a-zA-Z]*c[a-zA-Z]*$/.test(a) || /^(-Command|\/c)$/i.test(a));
      if (i >= 0 && w[i + 1]) {
        const r = guardCommand(w.slice(i + 1).join(' '), ctx, depth + 1);
        if (!r.allowed) {return r;}
      }
      continue;
    }
    const hit =
      (tool === 'gh' ? checkGh(w, ctx) : undefined) ??
      (tool === 'git' ? checkGit(w) : undefined) ??
      checkPackageManager(w) ??
      checkOther(w, segment);
    if (hit) {return hit;}
  }
  return { allowed: true };
}
