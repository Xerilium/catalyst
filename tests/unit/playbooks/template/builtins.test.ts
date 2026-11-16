/**
 * Built-in `env` variable tests
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

import { TemplateEngine } from '@playbooks/template/engine';
import { getBuiltins } from '@playbooks/template/builtins';

/**
 * @req FR:playbook-template-engine/context.builtins
 */
describe('built-in env variable', () => {
  const engine = new TemplateEngine();

  // @req FR:playbook-template-engine/context.builtins.project-root
  it('env.projectRoot is the cwd', async () => {
    expect(await engine.interpolate('{{env.projectRoot}}', {})).toBe(process.cwd());
  });

  // @req FR:playbook-template-engine/context.builtins.package-root
  it("env.packageRoot is the nearest package.json directory from the cwd", async () => {
    const root = await engine.interpolate("${{ get('env').packageRoot }}", {});
    expect(fs.existsSync(path.join(root, 'package.json'))).toBe(true);
    expect(path.relative(root, process.cwd()).startsWith('..')).toBe(false);
  });

  // @req FR:playbook-template-engine/context.builtins.catalyst-root
  it('env.catalystRoot contains the catalyst package.json', async () => {
    const root = await engine.interpolate('{{env.catalystRoot}}', {});
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
    expect(pkg.name).toBe('@xerilium/catalyst');
  });

  // @req FR:playbook-template-engine/context.builtins.xe-root
  it('env.xeRoot is the .xe folder under the project root', async () => {
    expect(await engine.interpolate('{{env.xeRoot}}', {})).toBe(path.join(process.cwd(), '.xe'));
  });

  // @req FR:playbook-template-engine/context.builtins.git-root
  it('env.gitRoot is a repo root, or a string outside one', () => {
    expect(fs.existsSync(path.join(getBuiltins().gitRoot, '.git'))).toBe(true);
    expect(typeof getBuiltins(os.tmpdir()).gitRoot).toBe('string');
  });

  // @req FR:playbook-template-engine/context.builtins.home
  it('env.home', async () => {
    expect(await engine.interpolate('{{env.home}}', {})).toBe(os.homedir());
  });

  // @req FR:playbook-template-engine/context.builtins.platform
  it('env.platform', async () => {
    expect(await engine.interpolate("${{ get('env').platform }}", {})).toBe(process.platform);
  });

  // @req FR:playbook-template-engine/context.builtins.today
  it('env.today is an ISO date', async () => {
    expect(await engine.interpolate('{{env.today}}', {})).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // @req FR:playbook-template-engine/context.builtins.precedence
  it('a context variable named env overrides the built-in', async () => {
    expect(await engine.interpolate('{{env.home}}', { env: { home: 'x' } })).toBe('x');
  });

  // @req FR:playbook-template-engine/context.builtins.scope
  it('does not expose built-ins as top-level names or inherited properties', async () => {
    const result = await engine.interpolate(
      "${{ get('home') === undefined && get('platform') === undefined && get('constructor') === undefined && get('__proto__') === undefined }}",
      {}
    );
    expect(result).toBe('true');
  });

  // @req FR:playbook-template-engine/context.builtins.lazy
  it('discovers filesystem roots once per working directory', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'builtins-cache-'));
    try {
      fs.writeFileSync(path.join(dir, 'package.json'), '{}');
      expect(getBuiltins(dir).packageRoot).toBe(dir);
      fs.rmSync(path.join(dir, 'package.json'));
      expect(getBuiltins(dir).packageRoot).toBe(dir);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
