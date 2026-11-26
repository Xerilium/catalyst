/**
 * Registered checkouts, stored in `~/.config/catalyst/schedule.json`.
 *
 * @req FR:scheduling/install.register
 * @req FR:scheduling/install.uninstall
 */

import * as fs from 'fs';
import * as path from 'path';

export class Registry {
  constructor(private readonly file: string) {}

  roots(): string[] {
    try {
      const doc = JSON.parse(fs.readFileSync(this.file, 'utf8')) as { roots?: unknown };
      return Array.isArray(doc.roots) ? doc.roots.filter((r): r is string => typeof r === 'string') : [];
    } catch { return []; }
  }

  private save(roots: string[]): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify({ roots }, null, 2) + '\n');
  }

  add(root: string): void {
    const roots = this.roots();
    if (!roots.includes(root)) { this.save([...roots, root]); }
  }

  remove(root: string): void {
    this.save(this.roots().filter((r) => r !== root));
  }

  clear(): void {
    this.save([]);
  }
}
