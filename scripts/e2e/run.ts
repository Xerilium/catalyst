#!/usr/bin/env tsx
/**
 * Scripted e2e gate: drives every Catalyst skill headlessly (`claude -p`) against a
 * private throwaway GitHub repo with a toy TypeScript app, installing the LOCAL build.
 *
 * @req FR:e2e-gate/gate.@scripts
 * @req FR:e2e-gate/gate.repo
 * @req FR:e2e-gate/gate.local-build
 * @req FR:e2e-gate/gate.skills
 * @req FR:e2e-gate/gate.flaws
 * @req FR:e2e-gate/gate.matrix
 * @req FR:e2e-gate/gate.exit
 *
 * Usage: tsx scripts/e2e/run.ts [--skills init,fix] [--keep] [--budget 5] [--model sonnet] [--out dir]
 * Requires: gh (authed; delete_repo scope for cleanup), claude, pnpm, git, and a built
 * dist/catalyst-latest.tgz + dist/ (run `npm run build` first; see README).
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const argv = process.argv.slice(2);
const opt = (n: string, d?: string) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : d;
};
const KEEP = argv.includes('--keep');
const BUDGET = opt('budget', '5')!;
const MODEL = opt('model');
const ALL = ['init', 'blueprint', 'explore', 'create', 'change', 'fix', 'rollout', 'run', 'sitrep', 'pr-review', 'pr-update', 'pr-loop'];
const SELECTED = (opt('skills') ?? ALL.join(',')).split(',');
const OWNER = opt('owner') ?? spawnSync('gh', ['api', 'user', '-q', '.login'], { encoding: 'utf8' }).stdout.trim();
const REPO = `catalyst-e2e-${Date.now().toString(36)}`;
const SLUG = `${OWNER}/${REPO}`;
const OUT = path.resolve(opt('out', path.join(ROOT, 'e2e-results'))!);
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'catalyst-e2e-'));
fs.mkdirSync(OUT, { recursive: true });

const HEADLESS = '\n\n(Non-interactive e2e run: nobody can answer questions. Do not ask; choose sensible defaults, state assumptions, and complete the work.)';

type Row = { skill: string; result: 'PASS' | 'FAIL' | 'PARTIAL'; evidence: string; defect: string };
const rows: Row[] = [];

function sh(cmd: string, args: string[], cwd = WORK, input?: string) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', input, maxBuffer: 64 << 20 });
  return { code: r.status ?? 1, out: (r.stdout ?? '') + (r.stderr ?? ''), stdout: r.stdout ?? '' };
}
const exists = (p: string) => fs.existsSync(path.join(WORK, p));
const find = (dir: string, re: RegExp): string[] => {
  const d = path.join(WORK, dir);
  if (!fs.existsSync(d)) return [];
  const out: string[] = [];
  const walk = (p: string) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const f = path.join(p, e.name);
      e.isDirectory() ? walk(f) : re.test(f) && out.push(path.relative(WORK, f));
    }
  };
  walk(d);
  return out;
};

/** Run a skill headlessly; returns assistant text. Full transcript saved as evidence. */
function skill(name: string, args: string, tag = name): { text: string; ok: boolean } {
  const a = ['-p', `/catalyst:${name} ${args}`.trim() + HEADLESS, '--plugin-dir', path.join(ROOT, 'dist'),
    '--permission-mode', 'bypassPermissions', '--output-format', 'json', '--max-budget-usd', BUDGET];
  if (MODEL) a.push('--model', MODEL);
  const r = sh('claude', a);
  fs.writeFileSync(path.join(OUT, `${tag}.json`), r.out);
  let text = r.stdout;
  try {
    const j = JSON.parse(r.stdout);
    text = String(j.result ?? '');
    return { text, ok: !j.is_error };
  } catch {
    return { text, ok: false };
  }
}

function record(s: string, checks: [string, boolean][], skillOk: boolean, text: string) {
  const failed = checks.filter(([, ok]) => !ok).map(([n]) => n);
  const passed = checks.length - failed.length;
  const result = !skillOk || passed === 0 ? 'FAIL' : failed.length ? 'PARTIAL' : 'PASS';
  const evidence = `${passed}/${checks.length} checks; transcript e2e-results/${s}.json`;
  const defect = result === 'PASS' ? '-' : `${skillOk ? '' : 'skill errored; '}failed: ${failed.join(', ')}; last: ${text.replace(/\s+/g, ' ').slice(0, 160)}`;
  rows.push({ skill: s, result, evidence, defect });
  console.log(`${result.padEnd(7)} ${s}`);
}

function setup() {
  const tgz = path.join(ROOT, 'dist/catalyst-latest.tgz');
  if (!fs.existsSync(tgz) || !fs.existsSync(path.join(ROOT, 'dist', '.claude-plugin'))) throw new Error('Run `npm run build` first');
  const w = (f: string, c: string) => { fs.mkdirSync(path.dirname(path.join(WORK, f)), { recursive: true }); fs.writeFileSync(path.join(WORK, f), c); };
  w('package.json', JSON.stringify({ name: 'toy-app', version: '1.0.0', private: true, type: 'module', packageManager: 'pnpm@11.0.8',
    scripts: { test: 'tsx --test src/*.test.ts', build: 'tsc -p .' } }, null, 2));
  w('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, outDir: 'out', skipLibCheck: true }, include: ['src'] }, null, 2));
  w('src/todo.ts', `export interface Todo { id: number; title: string; done: boolean }\nconst todos: Todo[] = [];\nexport function add(title: string): Todo {\n  const t = { id: todos.length + 1, title, done: false };\n  todos.push(t);\n  return t;\n}\nexport function list(): Todo[] { return [...todos]; }\n`);
  w('src/todo.test.ts', `import test from 'node:test';\nimport assert from 'node:assert';\nimport { add, list } from './todo.js';\ntest('add', () => { add('a'); assert.equal(list().length, 1); });\n`);
  w('pnpm-workspace.yaml', 'allowBuilds:\n  esbuild: true\n');
  w('.gitignore', 'node_modules\nout\n');
  w('README.md', '# toy-app\nTiny todo library used for Catalyst e2e validation.\n');
  for (const c of [['git', 'init', '-q', '-b', 'main'], ['git', 'config', 'user.email', 'e2e@example.com'], ['git', 'config', 'user.name', 'e2e']]) sh(c[0], c.slice(1));
  let r = sh('pnpm', ['add', '-D', 'typescript', 'tsx', '@types/node']);
  if (r.code && !/ERR_PNPM_IGNORED_BUILDS/.test(r.out)) throw new Error('pnpm add deps: ' + r.out);
  r = sh('pnpm', ['add', '-D', `file:${tgz}`]);
  if (r.code && !/ERR_PNPM_IGNORED_BUILDS/.test(r.out)) throw new Error('pnpm add catalyst: ' + r.out);
  const installed = JSON.parse(fs.readFileSync(path.join(WORK, 'node_modules/@xerilium/catalyst/package.json'), 'utf8')).version;
  const local = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  console.log(`catalyst installed: ${installed} (local ${local})`);
  if (installed !== local) throw new Error(`installed ${installed} != local ${local}`);
  sh('git', ['add', '-A']); sh('git', ['commit', '-qm', 'chore: toy app']);
  r = sh('gh', ['repo', 'create', SLUG, '--private', '--source', '.', '--push']);
  repoCreated = r.code === 0;
  if (r.code) throw new Error('gh repo create: ' + r.out);
  console.log(`repo https://github.com/${SLUG}`);
}

function prWithFlaws(branch: string): string {
  sh('git', ['checkout', '-q', '-b', branch, 'main']);
  const w = (f: string, c: string) => fs.writeFileSync(path.join(WORK, f), c);
  w('src/config.ts', `export const API_KEY = 'sk_live_51HxxEXAMPLEEXAMPLE0000';\nexport function pageCount(total: number, size: number): number {\n  return Math.floor(total / size); // off-by-one: drops the partial last page\n}\n`);
  sh('git', ['add', '-A']); sh('git', ['commit', '-qm', 'feat: add config and paging']);
  sh('git', ['push', '-q', '-u', 'origin', branch]);
  const r = sh('gh', ['pr', 'create', '--draft', '--title', 'feat: add config and paging', '--body', 'Adds paging helper and config.', '--base', 'main', '--head', branch]);
  return r.stdout.trim().split('/').pop() ?? '';
}
/** Sync to the pushed PR branch and return all src/ text (skills may rename or split files). */
function branchSrc(branch: string): string {
  sh('git', ['fetch', '-q', 'origin', branch]);
  sh('git', ['checkout', '-q', '-B', branch, `origin/${branch}`]);
  return find('src', /\.[cm]?[jt]sx?$/).map(f => fs.readFileSync(path.join(WORK, f), 'utf8')).join('\n');
}
const prJson = (n: string) => JSON.parse(sh('gh', ['pr', 'view', n, '--json', 'reviews,comments,commits,body']).stdout || '{}');

const steps: Record<string, () => void> = {
  init() {
    const r = skill('init', 'toy todo library for e2e validation');
    record('init', [['.xe dir or context files created', exists('.xe') || find('.', /(engineering|product|architecture)\.md$/).length > 0]], r.ok, r.text);
  },
  blueprint() {
    const r = skill('blueprint', 'toy todo library: add, list, complete todos');
    record('blueprint', [['blueprint file exists', find('.xe', /blueprint|roadmap|features/i).length > 0 || find('.', /blueprint/i).length > 0]], r.ok, r.text);
  },
  explore() {
    const before = sh('git', ['status', '--porcelain']).stdout;
    const r = skill('explore', 'how should the toy app persist todos between runs?');
    record('explore', [['non-trivial answer', r.text.length > 200], ['mentions persistence option', /file|json|sqlite|storage|disk/i.test(r.text + find('.xe', /\.md$/).map(f => fs.readFileSync(path.join(WORK, f), 'utf8')).join(''))], ['no source files changed', !/src\//.test(sh('git', ['status', '--porcelain']).stdout.replace(before, ''))]], r.ok, r.text);
  },
  create() {
    const r = skill('create', 'add a complete(id) function to the todo module that marks a todo done');
    record('create', [['spec created', find('.xe', /spec\.md$/).length > 0 || find('.', /spec\.md$/).length > 0], ['complete() implemented', /complete/.test(fs.readFileSync(path.join(WORK, 'src/todo.ts'), 'utf8'))], ['tests pass', sh('pnpm', ['test']).code === 0]], r.ok, r.text);
  },
  change() {
    const r = skill('change', 'update the todo module so add() rejects empty titles by throwing an Error');
    record('change', [['empty-title guard present', /throw/.test(fs.readFileSync(path.join(WORK, 'src/todo.ts'), 'utf8'))], ['tests pass', sh('pnpm', ['test']).code === 0]], r.ok, r.text);
  },
  fix() {
    fs.appendFileSync(path.join(WORK, 'src/todo.ts'), `export function remove(id: number): boolean {\n  const i = todos.findIndex(t => t.id === id) + 1; // bug: off-by-one\n  if (i <= 0) return false;\n  todos.splice(i, 1);\n  return true;\n}\n`);
    const r = skill('fix', 'remove(id) deletes the wrong todo or nothing; fix it and add a regression test');
    const src = fs.readFileSync(path.join(WORK, 'src/todo.ts'), 'utf8');
    record('fix', [['off-by-one removed', !/findIndex\([^)]*\)\s*\+\s*1/.test(src)], ['regression test added', /remove/.test(find('src', /test\.ts$/).map(f => fs.readFileSync(path.join(WORK, f), 'utf8')).join(''))], ['tests pass', sh('pnpm', ['test']).code === 0]], r.ok, r.text);
  },
  rollout() {
    const r = skill('rollout', '');
    record('rollout', [['responds with rollout orientation', r.text.length > 50 && /rollout|feature|blueprint|next/i.test(r.text)]], r.ok, r.text);
  },
  run() {
    const r = skill('run', 'explore how should the toy app handle due dates?');
    record('run', [['playbook executed', r.text.length > 100]], r.ok, r.text);
  },
  sitrep() {
    const r = skill('sitrep', '');
    record('sitrep', [['has Goal/Next lines', /Goal/.test(r.text) && /Next/.test(r.text)], ['read-only', sh('git', ['status', '--porcelain']).stdout === lastStatus]], r.ok, r.text);
  },
  'pr-review'() {
    prNum = prWithFlaws('e2e/flawed');
    const r = skill('pr-review', prNum);
    const j = prJson(prNum);
    const body = r.text + JSON.stringify(j.reviews) + JSON.stringify(j.comments);
    record('pr-review', [['PR number resolved', !!prNum], ['flags hardcoded secret', /secret|api[_ ]?key|sk_live|credential/i.test(body)], ['flags off-by-one/paging', /off-by-one|floor|ceil|partial|last page/i.test(body)], ['flags missing tests', /test/i.test(body)]], r.ok, r.text);
  },
  'pr-update'() {
    sh('gh', ['pr', 'review', prNum, '--comment', '--body', 'Please move the API key to an env var (process.env.API_KEY) and fix pageCount to round up.']);
    const before = prJson(prNum).commits.length;
    const r = skill('pr-update', prNum);
    const after = prJson(prNum);
    const cfg = branchSrc('e2e/flawed');
    record('pr-update', [['new commit pushed', after.commits.length > before], ['secret removed', !/sk_live/.test(cfg)], ['paging fixed', /ceil/.test(cfg)], ['replied on PR', after.comments.length + after.reviews.length >= 2]], r.ok, r.text);
  },
  'pr-loop'() {
    sh('git', ['checkout', '-q', 'main']);
    const n = prWithFlaws('e2e/loop');
    const before = prJson(n);
    const r = skill('pr-loop', n);
    const after = prJson(n);
    const cfg = branchSrc('e2e/loop');
    record('pr-loop', [['review posted', after.reviews.length + after.comments.length > before.reviews.length + before.comments.length], ['fix commit pushed', after.commits.length > before.commits.length], ['secret removed', !/sk_live/.test(cfg)]], r.ok, r.text);
  },
};
let prNum = '';
let lastStatus = '';

function matrix(): string {
  const esc = (s: string) => s.replace(/\|/g, '\\|');
  return ['| skill | result | evidence | defect |', '| --- | --- | --- | --- |', ...rows.map(r => `| ${r.skill} | ${r.result} | ${esc(r.evidence)} | ${esc(r.defect)} |`)].join('\n');
}

let exit = 0;
let repoCreated = false;
try {
  setup();
  for (const s of ALL.filter(x => SELECTED.includes(x))) {
    lastStatus = sh('git', ['status', '--porcelain']).stdout;
    try { steps[s](); } catch (e) { rows.push({ skill: s, result: 'FAIL', evidence: 'harness error', defect: String(e).slice(0, 200) }); }
    if (!['pr-review', 'pr-update', 'pr-loop'].includes(s)) { sh('git', ['add', '-A']); sh('git', ['commit', '-qm', `e2e: after ${s}`]); sh('git', ['push', '-q', 'origin', 'main']); }
  }
} catch (e) {
  console.error(String(e)); exit = 2;
} finally {
  const md = matrix();
  fs.writeFileSync(path.join(OUT, 'matrix.md'), md + '\n');
  console.log('\n' + md);
  if (!KEEP && !repoCreated) fs.rmSync(WORK, { recursive: true, force: true });
  else if (!KEEP) {
    const d = sh('gh', ['repo', 'delete', SLUG, '--yes']);
    console.log(d.code ? `CLEANUP FAILED (needs delete_repo scope: gh auth refresh -s delete_repo): delete https://github.com/${SLUG} manually\n${d.out}` : `deleted ${SLUG}`);
    if (d.code) exit = exit || 3;
    fs.rmSync(WORK, { recursive: true, force: true });
  } else console.log(`kept ${WORK} and https://github.com/${SLUG}`);
}
if (rows.some(r => r.result !== 'PASS')) exit = exit || 1;
process.exit(exit);
