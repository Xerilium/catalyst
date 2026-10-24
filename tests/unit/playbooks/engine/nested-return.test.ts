/**
 * Early return from nested control blocks and sub-playbooks
 *
 * @req FR:playbook-engine/actions.builtin.return.halt
 */

import { Engine } from '../../../../src/playbooks/engine/engine';
import { PlaybookProvider } from '../../../../src/playbooks/registry/playbook-provider';
import type { Playbook } from '../../../../src/playbooks/types';
import { StatePersistence } from '../../../../src/playbooks/persistence/state-persistence';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Nested return', () => {
  // Own runs dir: other suites clean the shared .xe/runs while runs archive
  let runsDir: string;
  const newEngine = () => new Engine(undefined, new StatePersistence(runsDir));

  beforeEach(() => {
    PlaybookProvider.resetInstance();
    runsDir = mkdtempSync(join(tmpdir(), 'nested-return-'));
  });

  afterEach(() => {
    rmSync(runsDir, { recursive: true, force: true });
  });

  it('ends the playbook when return runs inside an if block', async () => {
    const playbook: Playbook = {
      name: 'test-parent',
      description: 'Return inside if',
      owner: 'test',
      steps: [
        { action: 'var', config: { name: 'before', value: 'set' } },
        {
          name: 'guard',
          action: 'if',
          config: {
            condition: true,
            then: [
              { action: 'return', config: { outputs: { result: 'early' } } },
              { action: 'var', config: { name: 'inside-after', value: 'ran' } }
            ]
          }
        },
        { action: 'var', config: { name: 'after', value: 'ran' } }
      ]
    };

    const result = await newEngine().run(playbook);

    expect(result.status).toBe('completed');
    expect(result.outputs).toEqual({ result: 'early' });
    expect(result.stepsExecuted).toBe(2);
  });

  it('ends the playbook when return runs inside a for-each inside an if', async () => {
    const playbook: Playbook = {
      name: 'test-loop',
      description: 'Return inside for-each',
      owner: 'test',
      steps: [
        {
          name: 'guard',
          action: 'if',
          config: {
            condition: true,
            then: [
              {
                action: 'for-each',
                config: {
                  item: 'n',
                  in: [1, 2, 3],
                  steps: [
                    { action: 'var', config: { name: 'last', value: '{{n}}' } },
                    { action: 'return', config: { outputs: { last: '{{n}}' } } }
                  ]
                }
              }
            ]
          }
        },
        { action: 'var', config: { name: 'after', value: 'ran' } }
      ]
    };

    const result = await newEngine().run(playbook);

    expect(result.status).toBe('completed');
    expect(result.outputs).toEqual({ last: 1 });
    expect(result.stepsExecuted).toBe(1);
  });

  it('returns only to the caller when a sub-playbook returns inside an if', async () => {
    const child: Playbook = {
      name: 'child',
      description: 'Child with early return',
      owner: 'test',
      steps: [
        {
          action: 'if',
          config: {
            condition: true,
            then: [{ action: 'return', config: { outputs: { from: 'child' } } }]
          }
        },
        { action: 'var', config: { name: 'child-after', value: 'ran' } }
      ]
    };
    PlaybookProvider.getInstance().registerLoader({
      name: 'nested-return-test',
      supports: (id: string) => id === 'child',
      load: async (id: string) => (id === 'child' ? child : undefined)
    });

    const parent: Playbook = {
      name: 'parent',
      description: 'Calls child',
      owner: 'test',
      outputs: { 'child-result': 'object', after: 'string' },
      steps: [
        { name: 'child-result', action: 'playbook', config: { name: 'child', inputs: {} } },
        { name: 'after', action: 'var', config: { name: 'after', value: 'ran' } }
      ]
    };

    const result = await newEngine().run(parent);

    expect(result.status).toBe('completed');
    expect(result.outputs['child-result']).toEqual({ from: 'child' });
    expect(result.outputs['after']).toBe('ran');
  });
});
