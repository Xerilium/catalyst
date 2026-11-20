/**
 * Tests for schedule file loading.
 */

import { parseSchedule } from '../../../src/scheduling/schedule-file';

const ok = `
id: pr-sweep
description: Sweep PRs
tz: America/Los_Angeles
on:
  - every: 2h
  - cron: "20 16 * * 1-5"
gate: { script: .xe/scripts/gate.sh }
run: { playbook: sweep, inputs: { a: b }, ai: true }
catch-up: all
max-age: 3h
timeout: 30m
retry: { max: 1, backoff: 10m, on: [timeout] }
host: laptop
env: [GH_TOKEN]
`;

const parse = (text: string, file = 'pr-sweep.yaml', scope: 'repo' | 'user' = 'repo') =>
  parseSchedule({ file, text, scope });

describe('parseSchedule', () => {
  // @req FR:scheduling/file.@yaml
  // @req FR:scheduling/file.input
  // @req FR:scheduling/$schedule
  // @req FR:scheduling/file.output
  it('loads a valid schedule with normalized values', () => {
    const r = parse(ok);
    expect(r.errors).toEqual([]);
    expect(r.schedule).toMatchObject({
      id: 'pr-sweep',
      enabled: true,
      tz: 'America/Los_Angeles',
      catchUp: 'all',
      maxAgeMs: 3 * 3600_000,
      timeoutMs: 1_800_000,
      retry: { max: 1, backoffMs: 600_000, on: ['timeout'] },
      host: 'laptop',
      env: ['GH_TOKEN'],
      scope: 'repo',
    });
    expect(r.schedule?.run).toEqual({ playbook: 'sweep', inputs: { a: 'b' }, ai: true });
  });

  it('applies defaults', () => {
    const r = parse('id: a\non: [{ every: 1h }]\nrun: { playbook: p }', 'a.yaml');
    expect(r.schedule).toMatchObject({
      enabled: true,
      catchUp: 'latest',
      maxAgeMs: 6 * 3600_000,
      timeoutMs: 3600_000,
      retry: { max: 2, backoffMs: 300_000, on: ['error', 'timeout'] },
      env: [],
    });
  });

  // @req FR:scheduling/file.id
  it('rejects an id that differs from the file name', () => {
    const r = parse(ok, 'other.yaml');
    expect(r.schedule).toBeUndefined();
    expect(r.errors.join()).toMatch(/other\.yaml.*id/);
  });

  // @req FR:scheduling/file.invalid
  it('reports each problem by file and field', () => {
    const r = parse('id: a\non: []\nrun: {}\ncatch-up: sometimes\ntimeout: soon', 'a.yaml');
    expect(r.schedule).toBeUndefined();
    const text = r.errors.join('\n');
    expect(text).toMatch(/a\.yaml: on/);
    expect(text).toMatch(/a\.yaml: run\.playbook/);
    expect(text).toMatch(/a\.yaml: catch-up/);
    expect(text).toMatch(/a\.yaml: timeout/);
  });

  it('reports invalid YAML', () => {
    expect(parse('id: [', 'a.yaml').errors[0]).toMatch(/a\.yaml/);
  });

  // @req FR:scheduling/file.triggers
  // @req FR:scheduling/file.triggers.unknown
  it('rejects trigger types other than cron, every, at', () => {
    const r = parse('id: a\non: [{ github: {} }]\nrun: { playbook: p }', 'a.yaml');
    expect(r.errors.join()).toMatch(/a\.yaml: on\[0\].*github/);
  });

  // @req FR:scheduling/slots.every.minimum
  it('rejects an interval under five minutes', () => {
    const r = parse('id: a\non: [{ every: 4m }]\nrun: { playbook: p }', 'a.yaml');
    expect(r.errors.join()).toMatch(/on\[0\]/);
  });

  it('rejects a bad cron expression and a bad at instant', () => {
    expect(parse('id: a\non: [{ cron: "x" }]\nrun: { playbook: p }', 'a.yaml').errors.join()).toMatch(/on\[0\]/);
    expect(parse('id: a\non: [{ at: tomorrow }]\nrun: { playbook: p }', 'a.yaml').errors.join()).toMatch(/on\[0\]/);
  });

  // @req FR:scheduling/file.gate
  it('rejects a gate with neither script nor playbook', () => {
    const r = parse('id: a\non: [{ every: 1h }]\ngate: { timeout: 5s }\nrun: { playbook: p }', 'a.yaml');
    expect(r.errors.join()).toMatch(/a\.yaml: gate/);
  });

  // @req FR:scheduling/file.script-path
  it('rejects a repo-scope script outside .xe/', () => {
    const base = 'id: a\non: [{ every: 1h }]\nrun: { playbook: p }\n';
    expect(parse(base + 'gate: { script: scripts/x.sh }', 'a.yaml').errors.join()).toMatch(/gate\.script/);
    expect(parse(base + 'gate: { script: .xe/../x.sh }', 'a.yaml').errors.join()).toMatch(/gate\.script/);
    expect(parse(base + 'gate: { script: /bin/x.sh }', 'a.yaml').errors.join()).toMatch(/gate\.script/);
    expect(parse(base + 'gate: { script: .xe/scripts/x.sh }', 'a.yaml').errors).toEqual([]);
  });

  it('allows any script path in user scope', () => {
    const r = parse('id: a\non: [{ every: 1h }]\nrun: { playbook: p }\ngate: { script: /opt/x.sh }', 'a.yaml', 'user');
    expect(r.errors).toEqual([]);
  });

  // @req FR:scheduling/file.secrets
  it('rejects an env entry that is not a bare variable name', () => {
    const r = parse('id: a\non: [{ every: 1h }]\nrun: { playbook: p }\nenv: ["TOKEN=abc"]', 'a.yaml');
    expect(r.errors.join()).toMatch(/a\.yaml: env\[0\]/);
  });

  // @req FR:scheduling/file.ai-gate
  it('warns when run.ai is true and there is no gate', () => {
    const r = parse('id: a\non: [{ every: 1h }]\nrun: { playbook: p, ai: true }', 'a.yaml');
    expect(r.errors).toEqual([]);
    expect(r.warnings.join()).toMatch(/a\.yaml.*gate/);
  });

  it('allows cwd in user scope only', () => {
    const text = 'id: a\non: [{ every: 1h }]\nrun: { playbook: p, cwd: ~/dev/x }';
    expect(parse(text, 'a.yaml', 'repo').errors.join()).toMatch(/run\.cwd/);
    expect(parse(text, 'a.yaml', 'user').errors).toEqual([]);
  });
});
