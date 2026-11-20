/**
 * GitHub and repo-config ports over the `gh` CLI, and the main-checkout lookup over git.
 * @req NFR:autonomy/portable.ports
 */

import { execFile } from 'child_process';
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
  return Object.fromEntries(Object.entries(parseDiff(diff)).map(([k, v]) => [k, v.patch]));
}

/** Per-file patch and, for a rename, the old path. Keyed by the new path. */
export function parseDiff(diff: string): Record<string, { patch: string; previousPath?: string }> {
  const files: Record<string, { patch: string; previousPath?: string }> = {};
  let current: string | undefined;
  for (const line of diff.split(/\r?\n/)) {
    const head = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
    if (head) {
      current = head[2];
      files[current] = { patch: '', ...(head[1] !== head[2] ? { previousPath: head[1] } : {}) };
      continue;
    }
    if (current === undefined) {continue;}
    const from = /^rename from (.+)$/.exec(line);
    if (from) {files[current].previousPath = from[1];}
    files[current].patch += `${line}\n`;
  }
  return files;
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
      this.gh(['pr', 'view', String(pr), '--json', 'number,author,state,isDraft,labels,files,changedFiles,additions,deletions']),
      this.gh(['pr', 'diff', String(pr)]),
    ]);
    const raw = JSON.parse(view) as {
      number: number;
      author: { login: string };
      state: PrFacts['state'];
      isDraft: boolean;
      labels: { name: string }[];
      files: { path: string; additions: number; deletions: number }[];
      changedFiles?: number;
      additions?: number;
      deletions?: number;
    };
    const parsed = parseDiff(diff);
    return {
      number: raw.number,
      author: raw.author.login,
      state: raw.state,
      isDraft: raw.isDraft,
      labels: raw.labels.map((l) => l.name),
      files: raw.files.map((f) => ({ ...f, patch: parsed[f.path]?.patch, previousPath: parsed[f.path]?.previousPath })),
      changedFiles: raw.changedFiles,
      additions: raw.additions,
      deletions: raw.deletions,
    };
  }

  async addLabel(pr: number, label: string): Promise<void> {
    await this.gh(['pr', 'edit', String(pr), '--add-label', label]);
  }

  async comment(pr: number, body: string): Promise<void> {
    await this.gh(['pr', 'comment', String(pr), '--body-file', '-'], body);
  }
}

const CONFIG_PATH = '.xe/config/catalyst.json';

/**
 * Reads the config from the default branch on GitHub, and the commit that last changed it.
 * Server state only: no local file or ref, which an agent could change, decides.
 * @req FR:autonomy/config.repo-only.merged
 * @req FR:autonomy/config.repo-only.merged.missing
 */
export class GitHubRepoConfig implements RepoPort {
  private text: string | undefined;
  private commit: string | undefined;
  private note: string | undefined;

  constructor(private readonly gh: Runner) {}

  static fromCwd(cwd: string): GitHubRepoConfig {
    return new GitHubRepoConfig(runner('gh', cwd));
  }

  configText(): string | undefined {
    return this.text;
  }

  configCommit(): string | undefined {
    return this.commit;
  }

  configNote(): string | undefined {
    return this.note;
  }

  /** Resolve the merged config once, before decisions run. Missing or unreadable means off. */
  async load(): Promise<this> {
    try {
      const branch = (await this.gh(['repo', 'view', '--json', 'defaultBranchRef', '--jq', '.defaultBranchRef.name'])).trim();
      if (!branch) {return this;}
      const ref = encodeURIComponent(branch);
      this.text = await this.gh(['api', `repos/{owner}/{repo}/contents/${CONFIG_PATH}?ref=${ref}`, '-H', 'Accept: application/vnd.github.raw']);
      this.commit =
        (await this.gh(['api', `repos/{owner}/{repo}/commits?path=${CONFIG_PATH}&sha=${ref}&per_page=1`, '--jq', '(.[0].sha // "")[0:7]'])).trim() || undefined;
    } catch (e) {
      this.text = undefined;
      this.commit = undefined;
      const msg = (e as Error).message;
      // A missing file is a normal "off"; anything else is worth a note
      if (!/404|Not Found/i.test(msg)) {this.note = `Could not read the config from GitHub: ${msg}`;}
    }
    return this;
  }
}

/**
 * The main checkout, shared by every worktree, so one ledger and one STOP file cover the repository.
 * @req FR:autonomy/ledger.@file.shared
 */
export async function mainCheckout(cwd: string, git: Runner = runner('git', cwd)): Promise<string> {
  try {
    const common = (await git(['rev-parse', '--path-format=absolute', '--git-common-dir'])).trim();
    return common && path.basename(common) === '.git' ? path.dirname(common) : cwd;
  } catch {
    return cwd;
  }
}

/** `owner/repo` of the checkout, when gh can tell. */
export async function currentRepo(cwd: string): Promise<string | undefined> {
  try {
    return (await runner('gh', cwd)(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'])).trim() || undefined;
  } catch {
    return undefined;
  }
}
