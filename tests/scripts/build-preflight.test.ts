/**
 * @req FR:devops-build/build.deps
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const script = path.resolve(__dirname, '../../scripts/build-preflight.cjs');

function run(cwd: string) {
  return spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' });
}

describe('build preflight (runs before tsx, dependency-free)', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('fails with the npm ci instruction when node_modules is missing', () => {
    const r = run(dir);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('npm ci');
  });

  it('passes when the compiler is installed', () => {
    fs.mkdirSync(path.join(dir, 'node_modules', '.bin'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'node_modules', '.bin', 'tsc'), '');
    expect(run(dir).status).toBe(0);
  });

  it('is wired as the prebuild hook so it runs before tsx', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'));
    expect(pkg.scripts.prebuild).toBe('node scripts/build-preflight.cjs');
  });
});
