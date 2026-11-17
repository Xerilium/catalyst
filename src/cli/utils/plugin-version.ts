/**
 * Detects an installed Claude Code `catalyst` plugin that lags the CLI.
 * @req FR:cli-engine/cli.plugin-stale
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const PLUGIN_KEY = 'catalyst@xerilium';

interface Version {
  nums: [number, number, number];
  pre: boolean;
}

function parse(v: unknown): Version | undefined {
  const m = typeof v === 'string' ? /^(\d+)\.(\d+)\.(\d+)(-.+)?$/.exec(v) : null;
  return m ? { nums: [+m[1], +m[2], +m[3]], pre: !!m[4] } : undefined;
}

/** Negative when a < b. A prerelease sorts below its release. */
function compare(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) {
    if (a.nums[i] !== b.nums[i]) {return a.nums[i] - b.nums[i];}
  }
  return Number(!a.pre) - Number(!b.pre);
}

function isWithin(dir: string, root: unknown): boolean {
  if (typeof root !== 'string') {return false;}
  const rel = path.relative(root, dir);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
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
    if (!cli || cli.pre || cliVersion === '0.0.0') {return undefined;}
    const record = JSON.parse(
      fs.readFileSync(path.join(configDir, 'plugins', 'installed_plugins.json'), 'utf-8')
    );
    const entries: unknown = record?.plugins?.[PLUGIN_KEY];
    if (!Array.isArray(entries)) {return undefined;}

    let newest: { raw: string; v: Version } | undefined;
    for (const e of entries) {
      if (e?.scope === 'project' && !isWithin(cwd, e.projectPath)) {continue;}
      const v = parse(e?.version);
      if (v && (!newest || compare(v, newest.v) > 0)) {newest = { raw: e.version, v };}
    }
    if (!newest || compare(newest.v, cli) >= 0) {return undefined;}
    return `Catalyst plugin ${newest.raw} is older than the CLI ${cliVersion}. Skills may be missing. Run: claude plugin update ${PLUGIN_KEY}`;
  } catch {
    return undefined;
  }
}
