/**
 * Clean command: read-only workspace inventory + phase-b report.
 * @req FR:cli-clean/inventory.@cli
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { CleanOptions } from '../types';
import {
  assertDryRun, collectInventory, toCsv, buildReport, classifyRow, folderSize,
} from '../../core/workspace/inventory';

function expand(p: string): string {
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : path.resolve(p);
}

/**
 * @req FR:cli-clean/inventory.@cli
 * @req FR:cli-clean/inventory.apply-refused
 */
export async function cleanCommand(options: CleanOptions): Promise<void> {
  assertDryRun(Boolean(options.apply));
  const { rows, warnings } = collectInventory({
    root: expand(options.root ?? '.'),
    repos: options.repos,
  });
  const out = expand(options.out ?? '.xe/runs/clean-inventory.csv');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, toCsv(rows));

  const sizes: Record<string, number> = {};
  for (const r of rows) {if (classifyRow(r) === 'candidate') {sizes[r.folder] = folderSize(r.folder);}}
  for (const w of new Set(warnings)) {console.warn(`warning: ${w}`);}
  console.log(`inventory: ${rows.length} rows -> ${out}`);
  console.log(buildReport(rows, sizes));
}
