import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.md') ? [p] : [];
  });
}

describe('playbook template paths', () => {
  // @req FR:context-storage/templates.shipped-path
  it('never references templates at the unshipped src/resources/templates path', () => {
    const root = join(__dirname, '../../src/resources/playbooks');
    const offenders = walk(root).filter(f =>
      readFileSync(f, 'utf-8').includes('src/resources/templates')
    );
    expect(offenders).toEqual([]);
  });
});
