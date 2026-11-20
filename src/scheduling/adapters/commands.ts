/**
 * Builds the process specs for gates, workers, and playbook runs.
 * Owns the child environment and the CLI entry point.
 *
 * @req FR:scheduling/tick.env
 * @req FR:scheduling/tick.env-mode
 * @req FR:scheduling/tick.start.inputs
 * @req FR:scheduling/tick.start.cwd
 * @req FR:scheduling/tick.gate.timeout
 * @req FR:scheduling/worker.@cli
 */

import * as fs from 'fs';
import * as os from 'os';
import type { Commands, ExecSpec, LoadedSchedule } from '../types';
import { parseDuration } from '../duration';

const BASE_VARS = ['PATH', 'HOME', 'USERPROFILE', 'SystemRoot'];

/** Parse `KEY=VALUE` lines. Ignores comments, blanks, and `export `. */
export function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(raw);
    if (!m) { continue; }
    out[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

/** Child environment: base variables plus the schedule's listed names from the env file. */
export function buildEnv(
  s: Pick<LoadedSchedule, 'env'>,
  opts: { envFile: string; base: Record<string, string | undefined> }
): { env: Record<string, string>; warnings: string[] } {
  const env: Record<string, string> = {};
  const warnings: string[] = [];
  for (const name of BASE_VARS) {
    const v = opts.base[name];
    if (v !== undefined) { env[name] = v; }
  }
  if (s.env.length === 0) { return { env, warnings }; }
  let text: string | undefined;
  try {
    if (process.platform !== 'win32' && (fs.statSync(opts.envFile).mode & 0o077) !== 0) {
      warnings.push(`${opts.envFile}: readable by others; ignored (run chmod 600)`);
    } else {
      text = fs.readFileSync(opts.envFile, 'utf8');
    }
  } catch { /* no env file */ }
  const values = text ? parseEnvFile(text) : {};
  for (const name of s.env) {
    if (values[name] !== undefined) { env[name] = values[name]; }
  }
  return { env, warnings };
}

export interface CommandOptions {
  /** Absolute path of the node binary */
  node: string;
  /** Absolute path of the Catalyst CLI entry */
  cli: string;
  envFile: string;
  base: Record<string, string | undefined>;
  platform: NodeJS.Platform;
  /** Receives env-file warnings (for example, a file others can read) */
  warn?: (message: string) => void;
}

const INTERPRETERS: Record<string, string> = { '.sh': 'bash', '.ps1': 'pwsh', '.js': '', '.mjs': '', '.cjs': '' };

export function buildCommands(o: CommandOptions): Commands {
  const cwdOf = (s: LoadedSchedule): string => s.scope === 'repo' ? s.root! : (s.run.cwd ?? os.homedir());
  const envOf = (s: LoadedSchedule): Record<string, string> => {
    const r = buildEnv(s, o);
    for (const w of r.warnings) { o.warn?.(w); }
    return r.env;
  };
  const catalyst = (s: LoadedSchedule, args: string[]): ExecSpec => ({
    file: o.node, args: [o.cli, ...args], cwd: cwdOf(s), env: envOf(s),
  });

  return {
    gate(s) {
      if (!s.gate) { return undefined; }
      const base = { cwd: cwdOf(s), env: envOf(s), timeoutMs: s.gate.timeout ? parseDuration(s.gate.timeout) : 30_000 };
      if ('playbook' in s.gate) { return { ...catalyst(s, ['run', s.gate.playbook]), timeoutMs: base.timeoutMs }; }
      const ext = /\.[^./\\]+$/.exec(s.gate.script)?.[0] ?? '';
      const interp = INTERPRETERS[ext];
      if (interp === undefined) { return { file: s.gate.script, args: [], ...base }; }
      return { file: interp === '' ? o.node : interp, args: [s.gate.script], ...base };
    },
    worker(s, key, slot) {
      const env: Record<string, string> = {};
      for (const name of [...BASE_VARS, 'CATALYST_SCHEDULE_STATE']) {
        const v = o.base[name];
        if (v !== undefined) { env[name] = v; }
      }
      return {
        file: o.node,
        args: [o.cli, 'schedule', 'exec', s.id, '--scope', s.scopeKey, '--key', key, '--slot', String(slot)],
        cwd: cwdOf(s),
        env,
      };
    },
    playbook(s) {
      const inputs = Object.entries(s.run.inputs ?? {}).flatMap(([k, v]) => ['--input', `${k}=${v}`]);
      return { ...catalyst(s, ['run', s.run.playbook, ...inputs]), timeoutMs: s.timeoutMs };
    },
  };
}

