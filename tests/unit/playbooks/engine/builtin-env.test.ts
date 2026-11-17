/**
 * Built-in `env` variable through script get()
 */

import { Engine } from '../../../../src/playbooks/engine/engine';
import { PlaybookProvider } from '../../../../src/playbooks/registry/playbook-provider';
import type { Playbook } from '../../../../src/playbooks/types';
import { StatePersistence } from '../../../../src/playbooks/persistence/state-persistence';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Built-in env in scripts', () => {
  let runsDir: string;
  const newEngine = () => new Engine(undefined, new StatePersistence(runsDir));

  beforeEach(() => {
    PlaybookProvider.resetInstance();
    runsDir = mkdtempSync(join(tmpdir(), 'builtin-env-'));
  });

  afterEach(() => {
    rmSync(runsDir, { recursive: true, force: true });
  });

  const run = async (code: string, extra: Playbook['steps'] = []) => {
    const playbook: Playbook = {
      name: 'builtin-env',
      description: 'Reads env from a script',
      owner: 'test',
      steps: [
        ...extra,
        { name: 'probe', action: 'script', config: { code } },
        { action: 'return', config: { outputs: { value: '${{ get(\'probe\') }}' } } }
      ]
    };
    return newEngine().run(playbook);
  };

  // @req FR:playbook-template-engine/context.builtins.script
  it("script get('env') returns the built-ins", async () => {
    const result = await run("return get('env').projectRoot;");
    expect(result.status).toBe('completed');
    expect(result.outputs).toEqual({ value: process.cwd() });
  });

  // @req FR:playbook-template-engine/context.builtins.precedence
  it('a playbook variable named env wins in scripts', async () => {
    const result = await run("return get('env').projectRoot;", [
      { action: 'var', config: { name: 'env', value: { projectRoot: 'mine' } } }
    ]);
    expect(result.outputs).toEqual({ value: 'mine' });
  });

  // @req FR:playbook-template-engine/context.builtins.scope.undefined
  it('script get() of other names and inherited properties is undefined', async () => {
    const result = await run(
      "return get('home') === undefined && get('constructor') === undefined && get('__proto__') === undefined;"
    );
    expect(result.status).toBe('completed');
    expect(result.outputs).toEqual({ value: true });
  });
});
