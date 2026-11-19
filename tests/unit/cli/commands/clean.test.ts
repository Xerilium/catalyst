/**
 * @req FR:cli-clean/inventory.@cli
 * @req FR:cli-clean/inventory.@playbook
 * @req FR:cli-clean/inventory.input
 * @req FR:cli-clean/report.input
 * @req FR:cli-clean/inventory.apply-refused
 */
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { cleanCommand } from '../../../../src/cli/commands/clean';

describe('clean command', () => {
  // @req FR:cli-clean/inventory.apply-refused
  it('rejects --apply before touching anything', async () => {
    await expect(cleanCommand({ apply: true })).rejects.toThrow(/apply/i);
  });

  // @req FR:cli-clean/inventory.@cli
  it('writes CSV with header for an empty root', async () => {
    const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'clean-'));
    const out = path.join(dir, 'out', 'c.csv');
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    await cleanCommand({ root: dir, out });
    expect(fs.readFileSync(out, 'utf-8')).toMatch(/^repo,primary,type/);
    log.mockRestore();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('clean-workspace playbook', () => {
  const pb: any = yaml.load(
    fs.readFileSync(path.join(__dirname, '../../../../src/resources/playbooks/clean-workspace.yaml'), 'utf-8')
  );
  // @req FR:cli-clean/inventory.@playbook
  // @req FR:cli-clean/inventory.input
  // @req FR:cli-clean/report.input
  it('declares inputs with dry-run default', () => {
    expect(pb.id).toBe('clean-workspace');
    const names = pb.inputs.map((i: any) => Object.values(i)[0]);
    expect(names).toEqual(expect.arrayContaining(['apply', 'root', 'repos', 'inventory-path']));
    expect(pb.inputs.find((i: any) => i.boolean === 'apply').default).toBe(false);
  });
});
