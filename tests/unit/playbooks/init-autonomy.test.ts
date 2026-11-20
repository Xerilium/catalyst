/**
 * `catalyst init` explains full autonomy and validates its config, through the
 * real engine. A stub `catalyst` bin stands in for the installed CLI.
 */

import * as fs from 'fs';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { Engine } from '../../../src/playbooks/engine/engine';
import { PlaybookProvider } from '../../../src/playbooks/registry/playbook-provider';
import { StatePersistence } from '../../../src/playbooks/persistence/state-persistence';
import type { CheckpointPrompter, CheckpointPromptConfig, CheckpointResponse } from '../../../src/playbooks/engine/checkpoint-prompter';

const ROOT = path.resolve(__dirname, '../../..');
const SETUP = path.join(ROOT, 'src/resources/playbooks/setup-autonomy.yaml');

class Prompter implements CheckpointPrompter {
  async prompt(config: CheckpointPromptConfig): Promise<CheckpointResponse> {
    const key = config.defaultKey ?? config.options[0].key;
    return { selected: key, value: key, hasTextInput: false };
  }
}

let dir: string;
let cwd: string;

beforeEach(() => {
  PlaybookProvider.resetInstance();
  dir = mkdtempSync(path.join(tmpdir(), 'init-autonomy-'));
  fs.mkdirSync(path.join(dir, 'node_modules/@xerilium/catalyst'), { recursive: true });
  fs.symlinkSync(path.join(ROOT, 'src/resources/playbooks'), path.join(dir, 'node_modules/@xerilium/catalyst/playbooks'));
  // Stub CLI: prints a problem and exits 2 when the config has "bad", else prints on or off
  fs.mkdirSync(path.join(dir, 'node_modules/.bin'), { recursive: true });
  const bin = path.join(dir, 'node_modules/.bin/catalyst');
  fs.writeFileSync(
    bin,
    '#!/bin/sh\nif grep -q bad .xe/config/catalyst.json; then echo "autonomy.budget.minutes: must be a whole number"; exit 2; fi\nif grep -q enabled.:true .xe/config/catalyst.json; then echo "Full autonomy: on"; else echo "Full autonomy: off"; fi\n'
  );
  fs.chmodSync(bin, 0o755);
  fs.mkdirSync(path.join(dir, '.xe/config'), { recursive: true });
  cwd = process.cwd();
  process.chdir(dir);
});

afterEach(() => {
  process.chdir(cwd);
  rmSync(dir, { recursive: true, force: true });
});

async function setup(config?: unknown): Promise<string> {
  if (config !== undefined) {
    fs.writeFileSync(path.join(dir, '.xe/config/catalyst.json'), JSON.stringify(config));
  }
  const before = fs.existsSync(path.join(dir, '.xe/config/catalyst.json'))
    ? fs.readFileSync(path.join(dir, '.xe/config/catalyst.json'), 'utf-8')
    : undefined;
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    const playbook = await PlaybookProvider.getInstance().loadPlaybook(SETUP);
    const result = await new Engine(undefined, new StatePersistence(path.join(dir, '.xe/runs')), undefined, undefined, new Prompter()).run(playbook, {});
    expect(result.status).toBe('completed');
    const after = fs.existsSync(path.join(dir, '.xe/config/catalyst.json'))
      ? fs.readFileSync(path.join(dir, '.xe/config/catalyst.json'), 'utf-8')
      : undefined;
    // @req FR:cli-init/init.autonomy.no-enable
    expect(after).toEqual(before);
    return log.mock.calls.map((c) => String(c[0])).join('\n');
  } finally {
    log.mockRestore();
  }
}

describe('init: full autonomy', () => {
  // @req FR:cli-init/init.autonomy
  // @req FR:cli-init/init.autonomy.off
  it('says autonomy is off and points to the docs when the key is missing', async () => {
    const said = await setup();
    expect(said).toMatch(/Full autonomy: off/);
    expect(said).toMatch(/docs\/autonomy\.md/);
  });

  // @req FR:cli-init/init.autonomy
  // @req FR:cli-init/init.autonomy.risks
  it('lists the risks when autonomy is on', async () => {
    const said = await setup({ autonomy: { enabled: true } });
    expect(said).toMatch(/Full autonomy: on/);
    expect(said).toMatch(/risk/i);
    expect(said).toMatch(/STOP/);
  });

  // @req FR:cli-init/init.autonomy.validate
  it('reports config problems', async () => {
    const said = await setup({ autonomy: { enabled: true, budget: { minutes: 'bad' } } });
    expect(said).toMatch(/autonomy\.budget\.minutes/);
  }, 20000);

  // @req FR:cli-init/init.autonomy.no-enable
  it('never turns autonomy on', async () => {
    const said = await setup({ autonomy: { enabled: false } });
    expect(said).toMatch(/Full autonomy: off/);
  });

  // @req FR:cli-init/init.autonomy
  it('is composed into init', () => {
    expect(fs.readFileSync(path.join(ROOT, 'src/resources/cli-commands/init.yaml'), 'utf-8')).toMatch(/playbook: setup-autonomy/);
  });
});
