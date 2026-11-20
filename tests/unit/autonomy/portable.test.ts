/**
 * Portability: the autonomy core imports only Node built-ins and itself, and reaches
 * GitHub, files, and the clock only through ports.
 */

import * as fs from 'fs';
import * as path from 'path';
import { builtinModules } from 'module';

const CORE = path.join(__dirname, '../../../src/autonomy');
const coreFiles = fs
  .readdirSync(CORE)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
  .map((f) => path.join(CORE, f));
const imports = (file: string): string[] =>
  [...fs.readFileSync(file, 'utf-8').matchAll(/(?:from\s+|require\()\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);

describe('autonomy core', () => {
  it('has core files to check', () => {
    expect(coreFiles.length).toBeGreaterThan(5);
  });

  // @req NFR:autonomy/portable.core
  it('imports only Node built-ins and sibling core modules', () => {
    const builtins = new Set(builtinModules);
    for (const file of coreFiles) {
      for (const spec of imports(file)) {
        const ok = spec.startsWith('./') || builtins.has(spec.replace(/^node:/, ''));
        expect([path.basename(file), spec, ok]).toEqual([path.basename(file), spec, true]);
      }
    }
  });

  // @req NFR:autonomy/portable.ports
  it('reaches GitHub, files, and the clock only through ports', () => {
    for (const file of coreFiles) {
      const src = fs.readFileSync(file, 'utf-8');
      expect([path.basename(file), /child_process|from 'fs'|require\('fs'\)|new Date\(\)|Date\.now\(\)/.test(src)]).toEqual([
        path.basename(file),
        false,
      ]);
    }
  });
});
