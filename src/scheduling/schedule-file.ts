/**
 * Schedule file parsing and validation.
 *
 * @req FR:scheduling/file.@yaml
 * @req FR:scheduling/file.input
 * @req FR:scheduling/file.id
 * @req FR:scheduling/file.invalid
 * @req FR:scheduling/file.triggers
 * @req FR:scheduling/file.triggers.unknown
 * @req FR:scheduling/file.gate
 * @req FR:scheduling/file.gate.timeout
 * @req FR:scheduling/file.script-path
 * @req FR:scheduling/file.secrets
 * @req FR:scheduling/file.ai-gate
 * @req FR:scheduling/file.output
 * @req FR:scheduling/slots.every.minimum
 */

import * as path from 'path';
import * as yaml from 'js-yaml';
import type { CatchUp, Gate, RetryCause, Schedule, Scope, Trigger } from './types';
import { parseCron } from './cron';
import { parseDuration } from './duration';

export interface ParseResult {
  schedule?: Schedule;
  errors: string[];
  warnings: string[];
}

const KNOWN = new Set([
  'id', 'description', 'enabled', 'tz', 'on', 'gate', 'run', 'catch-up', 'max-age', 'timeout', 'retry', 'host', 'env',
]);
const GATE_KEYS = new Set(['script', 'playbook', 'timeout']);
const RUN_KEYS = new Set(['playbook', 'inputs', 'ai', 'cwd']);
const RETRY_KEYS = new Set(['max', 'backoff', 'on']);
const MIN_EVERY_MS = 5 * 60_000;
const MAX_GATE_MS = 10 * 60_000;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Parse one schedule file. Never throws; problems come back as `errors`. */
export function parseSchedule(input: { file: string; text: string; scope: Scope }): ParseResult {
  const { file, text, scope } = input;
  const errors: string[] = [];
  const warnings: string[] = [];
  const err = (field: string, msg: string): void => { errors.push(`${file}: ${field} ${msg}`); };

  let doc: unknown;
  try {
    doc = yaml.load(text, { schema: yaml.JSON_SCHEMA });
  } catch (e) {
    return { errors: [`${file}: invalid YAML: ${(e as Error).message.split('\n')[0]}`], warnings };
  }
  if (!isObject(doc)) { return { errors: [`${file}: expected a YAML mapping`], warnings }; }

  for (const key of Object.keys(doc)) {
    if (!KNOWN.has(key)) { err(key, 'is not a supported field'); }
  }

  const noUnknown = (field: string, obj: Record<string, unknown>, known: Set<string>): void => {
    for (const key of Object.keys(obj)) {
      if (!known.has(key)) { err(`${field}.${key}`, 'is not a supported field'); }
    }
  };

  const duration = (field: string, value: unknown, fallback: string): number => {
    try { return parseDuration(String(value ?? fallback)); } catch (e) { err(field, (e as Error).message); return 0; }
  };

  // id
  const base = path.basename(file).replace(/\.ya?ml$/, '');
  if (typeof doc.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(doc.id)) {
    err('id', 'must be kebab-case');
  } else if (doc.id !== base) {
    err('id', `"${doc.id}" must equal the file name "${base}"`);
  }

  if (doc.enabled !== undefined && typeof doc.enabled !== 'boolean') { err('enabled', 'must be true or false'); }
  if (doc.tz !== undefined) {
    try { new Intl.DateTimeFormat('en', { timeZone: String(doc.tz) }); } catch { err('tz', `"${doc.tz}" is not an IANA time zone`); }
  }

  // on
  const on: Trigger[] = [];
  if (!Array.isArray(doc.on) || doc.on.length === 0) {
    err('on', 'needs at least one trigger');
  } else {
    doc.on.forEach((raw, i) => {
      const where = `on[${i}]`;
      if (!isObject(raw) || Object.keys(raw).length !== 1) { err(where, 'must hold exactly one of cron, every, at'); return; }
      const [type, value] = Object.entries(raw)[0];
      try {
        if (type === 'cron') {
          parseCron(String(value));
          on.push({ cron: String(value) });
        } else if (type === 'every') {
          if (parseDuration(String(value)) < MIN_EVERY_MS) { throw new Error('interval must be at least 5m'); }
          on.push({ every: String(value) });
        } else if (type === 'at') {
          if (!/(Z|[+-]\d{2}:\d{2})$/.test(String(value)) || Number.isNaN(Date.parse(String(value)))) {
            throw new Error('needs an ISO 8601 instant with an offset, like 2026-11-12T09:00-08:00');
          }
          on.push({ at: String(value) });
        } else {
          err(where, `trigger "${type}" is not supported; use cron, every, or at`);
        }
      } catch (e) {
        err(where, `${type}: ${(e as Error).message}`);
      }
    });
  }

  // gate
  let gate: Gate | undefined;
  if (doc.gate !== undefined) {
    const g = doc.gate;
    if (!isObject(g) || (typeof g.script !== 'string') === (typeof g.playbook !== 'string')) {
      err('gate', 'must name exactly one of script or playbook');
    } else {
      noUnknown('gate', g, GATE_KEYS);
      if (g.timeout !== undefined && duration('gate.timeout', g.timeout, '30s') > MAX_GATE_MS) { err('gate.timeout', 'must be at most 10m'); }
      if (typeof g.script === 'string') {
        const clean = path.posix.normalize(g.script.replace(/\\/g, '/'));
        if (scope === 'repo' && (path.posix.isAbsolute(clean) || !clean.startsWith('.xe/') || clean.split('/').includes('..'))) {
          err('gate.script', 'must stay inside the repo\'s .xe/ folder');
        }
        gate = { script: g.script, ...(g.timeout !== undefined ? { timeout: String(g.timeout) } : {}) };
      } else {
        gate = { playbook: String(g.playbook), ...(g.timeout !== undefined ? { timeout: String(g.timeout) } : {}) };
      }
    }
  }

  // run
  if (doc.run !== undefined && !isObject(doc.run)) { err('run', 'must be a mapping'); }
  const runRaw = isObject(doc.run) ? doc.run : {};
  noUnknown('run', runRaw, RUN_KEYS);
  if (typeof runRaw.playbook !== 'string' || runRaw.playbook === '') { err('run.playbook', 'is required'); }
  if (runRaw.cwd !== undefined && scope !== 'user') { err('run.cwd', 'is allowed in user scope only'); }
  if (runRaw.ai !== undefined && typeof runRaw.ai !== 'boolean') { err('run.ai', 'must be true or false'); }
  let inputs: Record<string, string> | undefined;
  if (runRaw.inputs !== undefined) {
    if (!isObject(runRaw.inputs)) { err('run.inputs', 'must be a mapping'); } else {
      inputs = Object.fromEntries(Object.entries(runRaw.inputs).map(([k, v]) => [k, String(v)]));
    }
  }

  // scalars
  const catchUp = (doc['catch-up'] ?? 'latest') as string;
  if (!['none', 'latest', 'all'].includes(catchUp)) { err('catch-up', 'must be none, latest, or all'); }
  const maxAgeMs = duration('max-age', doc['max-age'], '6h');
  const timeoutMs = duration('timeout', doc.timeout, '1h');

  if (doc.retry !== undefined && !isObject(doc.retry)) { err('retry', 'must be a mapping like { max: 0 }'); }
  const retryRaw = isObject(doc.retry) ? doc.retry : {};
  noUnknown('retry', retryRaw, RETRY_KEYS);
  const max = retryRaw.max === undefined ? 2 : Number(retryRaw.max);
  if (!Number.isInteger(max) || max < 0) { err('retry.max', 'must be a whole number, 0 or more'); }
  const backoffMs = duration('retry.backoff', retryRaw.backoff, '5m');
  const retryOn = (retryRaw.on ?? ['error', 'timeout']) as unknown;
  if (!Array.isArray(retryOn) || retryOn.some((c) => c !== 'error' && c !== 'timeout')) {
    err('retry.on', 'must list error, timeout, or both');
  }

  if (doc.host !== undefined && typeof doc.host !== 'string') { err('host', 'must be a string'); }

  const env: string[] = [];
  if (doc.env !== undefined) {
    if (!Array.isArray(doc.env)) { err('env', 'must be a list of variable names'); } else {
      doc.env.forEach((name, i) => {
        if (typeof name !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
          err(`env[${i}]`, 'must be a bare variable name; values never go in schedule files');
        } else { env.push(name); }
      });
    }
  }

  if (scope === 'user' && typeof runRaw.playbook === 'string' && runRaw.cwd === undefined && !/[\\/]/.test(runRaw.playbook)) {
    warnings.push(`${file}: run.playbook "${runRaw.playbook}" is a bare name and run.cwd is not set; it is looked up from your home folder, so set run.cwd or use a path`);
  }

  if (runRaw.ai === true && gate === undefined) {
    warnings.push(`${file}: run.ai is true with no gate; every slot would start the model`);
  }

  if (errors.length > 0) { return { errors, warnings }; }

  const schedule: Schedule = {
    id: doc.id as string,
    ...(typeof doc.description === 'string' ? { description: doc.description } : {}),
    enabled: doc.enabled !== false,
    ...(doc.tz !== undefined ? { tz: String(doc.tz) } : {}),
    on,
    ...(gate ? { gate } : {}),
    run: {
      playbook: runRaw.playbook as string,
      ...(inputs ? { inputs } : {}),
      ...(runRaw.ai !== undefined ? { ai: runRaw.ai as boolean } : {}),
      ...(runRaw.cwd !== undefined ? { cwd: String(runRaw.cwd) } : {}),
    },
    catchUp: catchUp as CatchUp,
    maxAgeMs,
    timeoutMs,
    retry: { max, backoffMs, on: retryOn as RetryCause[] },
    ...(typeof doc.host === 'string' ? { host: doc.host } : {}),
    env,
    scope,
  };
  return { schedule, errors, warnings };
}
