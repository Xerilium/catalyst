/**
 * Schedule source: user-scope folder plus every registered repo's `.xe/schedules`.
 *
 * @req FR:scheduling/file.@yaml
 * @req FR:scheduling/file.default-branch
 * @req FR:scheduling/file.invalid
 * @req FR:scheduling/tick.input
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { LoadedSchedule, ScheduleSource, Scope } from '../types';
import { parseSchedule } from '../schedule-file';

export const repoScopeKey = (root: string): string => `repo-${createHash('sha1').update(root).digest('hex').slice(0, 8)}`;

export interface FsSourceOptions {
  roots: string[];
  userDir: string;
  isDefaultBranch: (root: string) => boolean;
}

export class FsScheduleSource implements ScheduleSource {
  constructor(private readonly opts: FsSourceOptions) {}

  load(): { schedules: LoadedSchedule[]; errors: string[]; warnings: string[] } {
    const out = { schedules: [] as LoadedSchedule[], errors: [] as string[], warnings: [] as string[] };
    this.loadDir(out, this.opts.userDir, 'user', 'user', undefined, this.opts.userDir);
    for (const root of this.opts.roots) {
      if (!fs.existsSync(root)) {
        out.warnings.push(`${root}: registered checkout not found`);
      } else if (!this.opts.isDefaultBranch(root)) {
        out.warnings.push(`${root}: not on its default branch (origin/HEAD, else main or master); repo schedules skipped`);
      } else {
        this.loadDir(out, path.join(root, '.xe', 'schedules'), 'repo', repoScopeKey(root), root, root);
      }
    }
    return out;
  }

  private loadDir(
    out: { schedules: LoadedSchedule[]; errors: string[]; warnings: string[] },
    dir: string, scope: Scope, scopeKey: string, root: string | undefined, labelBase: string
  ): void {
    let names: string[];
    try { names = fs.readdirSync(dir).filter((n) => /\.ya?ml$/.test(n)).sort(); } catch { return; }
    const seen = new Set<string>();
    for (const name of names) {
      const full = path.join(dir, name);
      const label = scope === 'repo' ? path.relative(labelBase, full).split(path.sep).join('/') : full;
      let text: string;
      try { text = fs.readFileSync(full, 'utf8'); } catch (e) { out.errors.push(`${label}: cannot read file: ${(e as Error).message}`); continue; }
      const r = parseSchedule({ file: label, text, scope });
      out.errors.push(...r.errors);
      out.warnings.push(...r.warnings);
      if (!r.schedule) { continue; }
      if (seen.has(r.schedule.id)) { out.errors.push(`${label}: duplicate schedule id "${r.schedule.id}"`); continue; }
      seen.add(r.schedule.id);
      out.schedules.push({ ...r.schedule, scopeKey, ...(root ? { root } : {}) });
    }
  }
}
