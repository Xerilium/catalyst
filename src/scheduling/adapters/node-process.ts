/**
 * Process port backed by Node child processes. Kills the whole tree on timeout.
 *
 * @req FR:scheduling/worker.timeout
 */

import { spawn, spawnSync } from 'child_process';
import type { ExecResult, ExecSpec, ProcessPort } from '../types';

const MAX_OUTPUT = 1_000_000;
const MAX_STDERR = 8_000;

function killTree(pid: number): void {
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch { /* already gone */ }
}

export class NodeProcess implements ProcessPort {
  exec(spec: ExecSpec): Promise<ExecResult> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let done = false;
      const finish = (code: number | null): void => {
        if (done) { return; }
        done = true;
        clearTimeout(timer);
        resolve({ code, stdout, stderr, timedOut });
      };
      const child = spawn(spec.file, spec.args, {
        cwd: spec.cwd,
        env: spec.env ?? process.env,
        detached: process.platform !== 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      child.stdout.on('data', (d: Buffer) => { stdout = (stdout + d.toString()).slice(-MAX_OUTPUT); }); // keeps the tail: the verdict line comes last
      child.stderr.on('data', (d: Buffer) => { stderr = (stderr + d.toString()).slice(-MAX_STDERR); }); // a bounded tail for the diagnostic log, never the ledger
      child.on('error', () => finish(127));
      child.on('close', (code) => finish(code));
      const timer = spec.timeoutMs
        ? setTimeout(() => {
            timedOut = true;
            if (child.pid) { killTree(child.pid); }
            setTimeout(() => finish(null), 2000).unref();
          }, spec.timeoutMs)
        : undefined as unknown as NodeJS.Timeout;
    });
  }

  spawnDetached(spec: ExecSpec): { pid: number } {
    const child = spawn(spec.file, spec.args, {
      cwd: spec.cwd,
      env: spec.env ?? process.env,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.on('error', () => { /* surfaced as a dead lock on the next tick */ });
    child.unref();
    return { pid: child.pid ?? -1 };
  }

  isAlive(pid: number): boolean {
    if (pid <= 0) { return false; }
    try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code === 'EPERM'; }
  }
}
