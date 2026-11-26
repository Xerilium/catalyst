/**
 * Tests for scheduling non-functional requirements.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { tick } from '../../../src/scheduling/tick';
import { FsStore } from '../../../src/scheduling/adapters/fs-store';
import { FsScheduleSource } from '../../../src/scheduling/adapters/fs-source';
import { NodeProcess } from '../../../src/scheduling/adapters/node-process';
import { buildCommands } from '../../../src/scheduling/adapters/commands';

const SRC = path.join(__dirname, '..', '..', '..', 'src', 'scheduling');

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith('.ts') && !e.name.endsWith('.d.ts') ? [path.join(dir, e.name)] : []
  );
}

describe('NFR:scheduling/portable', () => {
  // @req NFR:scheduling/portable
  it('imports only src/scheduling, Node built-ins, and js-yaml', () => {
    const offenders: string[] = [];
    for (const file of files(SRC)) {
      const text = fs.readFileSync(file, 'utf8');
      for (const m of text.matchAll(/(?:from|import\()\s*['"]([^'"]+)['"]/g)) {
        const spec = m[1];
        if (spec.startsWith('.')) {
          const target = path.resolve(path.dirname(file), spec);
          if (!target.startsWith(SRC)) { offenders.push(`${path.relative(SRC, file)} -> ${spec}`); }
        } else if (!['js-yaml', 'fs', 'os', 'path', 'child_process', 'crypto'].includes(spec) && !spec.startsWith('node:')) {
          offenders.push(`${path.relative(SRC, file)} -> ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('NFR:scheduling/idle-cost', () => {
  // @req NFR:scheduling/idle-cost
  it('finishes a tick with nothing due in under a second and starts no process', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sched-idle-'));
    try {
      const user = path.join(tmp, 'schedules');
      fs.mkdirSync(user);
      for (const id of ['a', 'b', 'c']) {
        fs.writeFileSync(path.join(user, `${id}.yaml`), `id: ${id}\non: [{ cron: "0 3 * * *" }]\nrun: { playbook: p }\n`);
      }
      const proc = new NodeProcess();
      const spawn = jest.spyOn(proc, 'spawnDetached');
      const exec = jest.spyOn(proc, 'exec');
      const deps = {
        clock: { now: () => Date.parse('2026-11-19T10:02:00Z') },
        store: new FsStore(path.join(tmp, 'state')),
        process: proc,
        host: 'h',
        source: new FsScheduleSource({ roots: [], userDir: user, isDefaultBranch: () => true }),
        commands: buildCommands({ node: 'node', cli: 'cli', envFile: '/none', base: {}, platform: process.platform }),
      };
      await tick(deps); // first tick records the baseline
      const start = Date.now();
      await tick(deps);
      expect(Date.now() - start).toBeLessThan(1000);
      expect(spawn).not.toHaveBeenCalled();
      expect(exec).not.toHaveBeenCalled();
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
