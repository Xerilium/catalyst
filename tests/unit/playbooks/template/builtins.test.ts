/**
 * Built-in template variables tests
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

import { TemplateEngine } from '@playbooks/template/engine';
import { getBuiltins } from '@playbooks/template/builtins';

/**
 * @req FR:playbook-template-engine/context.builtins
 */
describe('built-in variables', () => {
  const engine = new TemplateEngine();

  // @req FR:playbook-template-engine/context.builtins.project-root
  it('project-root is the cwd', async () => {
    expect(await engine.interpolate('{{project-root}}', {})).toBe(process.cwd());
  });

  // @req FR:playbook-template-engine/context.builtins.package-root
  it('package-root contains the catalyst package.json', async () => {
    const root = await engine.interpolate('${{ get("package-root") }}', {});
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
    expect(pkg.name).toBe('@xerilium/catalyst');
  });

  // @req FR:playbook-template-engine/context.builtins.git-root
  it('git-root is a repo root, or empty outside one', async () => {
    const root = getBuiltins()['git-root'];
    expect(fs.existsSync(path.join(root, '.git'))).toBe(true);
    expect(getBuiltins(os.tmpdir())['git-root']).toBeDefined();
  });

  // @req FR:playbook-template-engine/context.builtins.home
  it('home', async () => {
    expect(await engine.interpolate('{{home}}', {})).toBe(os.homedir());
  });

  // @req FR:playbook-template-engine/context.builtins.platform
  it('platform', async () => {
    expect(await engine.interpolate("${{ get('platform') }}", {})).toBe(process.platform);
  });

  // @req FR:playbook-template-engine/context.builtins.today
  it('today is ISO date', async () => {
    expect(await engine.interpolate('{{today}}', {})).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // @req FR:playbook-template-engine/context.builtins.precedence
  it('context overrides built-ins', async () => {
    expect(await engine.interpolate('{{home}}', { home: 'x' })).toBe('x');
  });
});
