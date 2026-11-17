/**
 * @req FR:devops-build/build.deps
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { assertDepsInstalled } from '../../scripts/build-preflight';

describe('assertDepsInstalled', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('fails with the npm ci instruction when node_modules is missing', () => {
    expect(() => assertDepsInstalled(dir)).toThrow('npm ci');
  });

  it('passes when the compiler is installed', () => {
    fs.mkdirSync(path.join(dir, 'node_modules', '.bin'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'node_modules', '.bin', 'tsc'), '');
    expect(() => assertDepsInstalled(dir)).not.toThrow();
  });
});
