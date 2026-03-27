/**
 * Test that nested playbook returns don't propagate to parent
 */

import { Engine } from '../../../../src/playbooks/engine/engine';
import type { Playbook, PlaybookStep } from '../../../../src/playbooks/types';

describe('Nested Playbook Return Isolation', () => {
  it('should isolate nested step early return when using executeSteps', async () => {
    const engine = new Engine();

    // Create a parent playbook with nested steps that include a return
    const parentPlaybook: Playbook = {
      name: 'test-parent',
      description: 'Test parent playbook',
      owner: 'test',
      steps: [
        {
          action: 'var',
          config: { name: 'before-nested', value: 'parent-before' }
        },
        {
          name: 'nested-call',
          action: 'if',
          config: {
            condition: true,
            then: [
              {
                action: 'var',
                config: { name: 'nested-var', value: 'nested-value' }
              },
              {
                action: 'return',
                config: { result: 'nested-return' }
              },
              {
                action: 'var',
                config: { name: 'after-return', value: 'should-not-execute' }
              }
            ]
          }
        },
        {
          action: 'var',
          config: { name: 'after-nested', value: 'parent-after' }
        }
      ],
      outputs: {
        'before-nested': 'string',
        'after-nested': 'string'
      }
    };

    // Execute parent playbook
    const result = await engine.run(parentPlaybook);

    // Parent should complete successfully (nested return should NOT stop parent)
    expect(result.status).toBe('completed');
    expect(result.error).toBeUndefined();

    // Both before and after variables should be set in parent
    expect(result.outputs['before-nested']).toBe('parent-before');
    expect(result.outputs['after-nested']).toBe('parent-after');
  });
});
