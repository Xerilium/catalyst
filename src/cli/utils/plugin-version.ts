/**
 * Detects an installed Claude Code `catalyst` plugin that lags the CLI.
 * @req FR:cli.plugin-stale
 */

import * as os from 'os';
import * as path from 'path';
import { applicablePluginInstalls } from '../../ai/plugin/bootstrap';

const PLUGIN_KEY = 'catalyst@xerilium';

interface Version {
  nums: [number, number, number];
  pre: string[];
}

function parse(v: unknown): Version | undefined {
  const m = typeof v === 'string' ? /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+.*)?$/.exec(v) : null;
  return m ? { nums: [+m[1], +m[2], +m[3]], pre: m[4] ? m[4].split('.') : [] } : undefined;
}

/** Negative when a < b, per SemVer precedence (a prerelease sorts below its release). */
function compare(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) {
    if (a.nums[i] !== b.nums[i]) {return a.nums[i] - b.nums[i];}
  }
  if (!a.pre.length || !b.pre.length) {return b.pre.length - a.pre.length;}
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const x = a.pre[i];
    const y = b.pre[i];
    if (x === undefined) {return -1;}
    if (y === undefined) {return 1;}
    if (x === y) {continue;}
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) {return +x - +y;}
    if (xn !== yn) {return xn ? -1 : 1;}
    return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * Returns a warning when the newest applicable installed plugin is older than
 * the CLI, otherwise undefined. Never throws.
 */
export function getStalePluginWarning(
  cliVersion: string,
  configDir: string = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
  cwd: string = process.cwd()
): string | undefined {
  try {
    const cli = parse(cliVersion);
    // A prerelease CLI is ahead of any published plugin, so there is nothing to update to
    if (!cli || cli.pre.length || cliVersion === '0.0.0') {return undefined;}
    let newest: { raw: string; scope: string; v: Version } | undefined;
    for (const e of applicablePluginInstalls(configDir, cwd)) {
      const v = parse(e.version);
      if (v && (!newest || compare(v, newest.v) > 0)) {newest = { raw: e.version, scope: e.scope, v };}
    }
    if (!newest || compare(newest.v, cli) >= 0) {return undefined;}
    const scope = newest.scope === 'project' || newest.scope === 'local' ? ` --scope ${newest.scope}` : '';
    return `Catalyst plugin ${newest.raw} is older than the CLI ${cliVersion}. Skills may be missing. Run: claude plugin update ${PLUGIN_KEY}${scope}`;
  } catch {
    return undefined;
  }
}
