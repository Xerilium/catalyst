/**
 * GitHub port over the `gh` CLI, and the repo port over git and the config file.
 * @req NFR:autonomy/portable.ports
 */

import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { GitHubPort, PrFacts, RepoPort } from '../types';

/** Runs a command with optional stdin and resolves its stdout. */
export type Runner = (args: string[], input?: string) => Promise<string>;

function runner(cmd: string, cwd: string): Runner {
  return (args, input) =>
    new Promise((resolve, reject) => {
      const child = execFile(cmd, args, { cwd, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {reject(new Error(`${cmd} ${args.slice(0, 2).join(' ')} failed: ${(stderr || err.message).trim()}`));}
        else {resolve(stdout);}
      });
      if (input !== undefined) {
        child.stdin?.end(input);
      }
    });
}

/** Per-file patches from a unified diff, keyed by the new path. */
export function splitDiff(diff: string): Record<string, string> {
  const patches: Record<string, string> = {};
  let current: string | undefined;
  for (const line of diff.split(/\r?\n/)) {
    const head = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
    if (head) {
      current = head[2];
      patches[current] = '';
      continue;
    }
    if (current !== undefined) {patches[current] += `${line}\n`;}
  }
  return patches;
}

export class GhAutonomyGitHub implements GitHubPort {
  constructor(private readonly gh: Runner) {}

  static fromCwd(cwd: string): GhAutonomyGitHub {
    return new GhAutonomyGitHub(runner('gh', cwd));
  }

  async viewer(): Promise<string> {
    return (await this.gh(['api', 'user', '--jq', '.login'])).trim();
  }

  async pullRequest(pr: number): Promise<PrFacts> {
    const [view, diff] = await Promise.all([
      this.gh(['pr', 'view', String(pr), '--json', 'number,author,state,isDraft,labels,files']),
      this.gh(['pr', 'diff', String(pr)]),
    ]);
    const raw = JSON.parse(view) as {
      number: number;
      author: { login: string };
      state: PrFacts['state'];
      isDraft: boolean;
      labels: { name: string }[];
      files: { path: string; additions: number; deletions: number }[];
    };
    const patches = splitDiff(diff);
    return {
      number: raw.number,
      author: raw.author.login,
      state: raw.state,
      isDraft: raw.isDraft,
      labels: raw.labels.map((l) => l.name),
      files: raw.files.map((f) => ({ ...f, patch: patches[f.path] })),
    };
  }

  async addLabel(pr: number, label: string): Promise<void> {
    await this.gh(['pr', 'edit', String(pr), '--add-label', label]);
  }

  async comment(pr: number, body: string): Promise<void> {
    await this.gh(['pr', 'comment', String(pr), '--body-file', '-'], body);
  }
}

/** Reads the committed config and the commit that last changed it. */
export class GitRepo implements RepoPort {
  constructor(private readonly root: string, private readonly git: Runner | undefined = undefined) {}

  configText(): string | undefined {
    try {
      return fs.readFileSync(path.join(this.root, '.xe', 'config', 'catalyst.json'), 'utf-8');
    } catch {
      return undefined;
    }
  }

  configCommit(): string | undefined {
    return this.commit;
  }

  /** Resolve the config commit once, before decisions run. */
  async load(): Promise<this> {
    try {
      const run = this.git ?? runner('git', this.root);
      this.commit = (await run(['log', '-1', '--format=%h', '--', '.xe/config/catalyst.json'])).trim() || undefined;
    } catch {
      this.commit = undefined;
    }
    return this;
  }

  private commit: string | undefined;
}

/** `owner/repo` of the checkout, when gh can tell. */
export async function currentRepo(cwd: string): Promise<string | undefined> {
  try {
    return (await runner('gh', cwd)(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'])).trim() || undefined;
  } catch {
    return undefined;
  }
}
