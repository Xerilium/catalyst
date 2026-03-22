import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type { Playbook, PlaybookAction, PlaybookActionResult } from '@playbooks/types';
import { PlaybookProvider } from '@playbooks/registry/playbook-provider';
import { Engine } from '@playbooks/engine/engine';

// ─────────────────────────────────────────────────────────────────────────────
// Mock action that throws if actually invoked
// ─────────────────────────────────────────────────────────────────────────────

class FailIfCalledAction implements PlaybookAction<unknown> {
  static readonly actionType = 'fail-if-called';

  async execute(): Promise<PlaybookActionResult> {
    throw new Error('Action should NOT have been executed in what-if mode');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// What-If Mode Tests
// @req FR:playbook-engine/execution.sequential
// ─────────────────────────────────────────────────────────────────────────────

describe('What-If Mode', () => {
  let engine: Engine;
  let provider: PlaybookProvider;

  beforeEach(() => {
    PlaybookProvider.resetInstance();
    provider = PlaybookProvider.getInstance();
    provider.getActionTypes();
    provider.registerAction('fail-if-called', FailIfCalledAction);
    engine = new Engine();
  });

  afterEach(() => {
    provider.clearAll();
    PlaybookProvider.resetInstance();
  });

  it('should extract variable references from step configs', async () => {
    const playbook: Playbook = {
      name: 'what-if-test',
      description: 'Test what-if mode',
      owner: 'Engineer',
      steps: [
        {
          name: 'step-one',
          action: 'fail-if-called',
          config: { path: '{{source-file}}', encoding: '${{ get("output-format") }}' }
        },
        {
          name: 'step-two',
          action: 'fail-if-called',
          config: { data: '{{payload}}' }
        }
      ]
    };

    const result = await engine.run(playbook, {}, { mode: 'what-if' });

    expect(result.status).toBe('completed');
    expect(result.stepsExecuted).toBe(0);

    const summary = result.outputs.summary as Array<{
      stepName: string;
      actionType: string;
      inputVarRefs: string[];
    }>;
    expect(summary).toHaveLength(2);
    expect(summary[0]).toEqual({
      stepName: 'step-one',
      actionType: 'fail-if-called',
      inputVarRefs: ['source-file', 'output-format'],
      hasExplicitName: true
    });
    expect(summary[1]).toEqual({
      stepName: 'step-two',
      actionType: 'fail-if-called',
      inputVarRefs: ['payload'],
      hasExplicitName: true
    });
  });

  it('should not invoke any actions', async () => {
    const playbook: Playbook = {
      name: 'no-invoke-test',
      description: 'Verify actions not invoked',
      owner: 'Engineer',
      steps: [
        {
          name: 'dangerous-step',
          action: 'fail-if-called',
          config: { data: '{{sensitive}}' }
        }
      ]
    };

    // This would throw if the action was actually called
    const result = await engine.run(playbook, {}, { mode: 'what-if' });
    expect(result.status).toBe('completed');
  });

  it('should auto-generate step names for unnamed steps', async () => {
    const playbook: Playbook = {
      name: 'unnamed-steps-test',
      description: 'Test unnamed step naming',
      owner: 'Engineer',
      steps: [
        {
          action: 'fail-if-called',
          config: { x: '{{alpha}}' }
        },
        {
          action: 'fail-if-called',
          config: { y: '{{beta}}' }
        }
      ]
    };

    const result = await engine.run(playbook, {}, { mode: 'what-if' });

    const summary = result.outputs.summary as Array<{ stepName: string }>;
    expect(summary[0].stepName).toBe('fail-if-called-1');
    expect(summary[1].stepName).toBe('fail-if-called-2');
  });

  it('should handle steps with empty config', async () => {
    const playbook: Playbook = {
      name: 'empty-config-test',
      description: 'Test steps with empty config',
      owner: 'Engineer',
      steps: [
        {
          name: 'empty-step',
          action: 'fail-if-called',
          config: {}
        }
      ]
    };

    const result = await engine.run(playbook, {}, { mode: 'what-if' });

    const summary = result.outputs.summary as Array<{ inputVarRefs: string[] }>;
    expect(summary[0].inputVarRefs).toEqual([]);
  });

  it('should handle steps with literal config values (no var refs)', async () => {
    const playbook: Playbook = {
      name: 'literal-config-test',
      description: 'Test steps with no template references',
      owner: 'Engineer',
      steps: [
        {
          name: 'set-var',
          action: 'var',
          config: { name: 'my-var', value: 'hello' }
        },
        {
          name: 'do-work',
          action: 'fail-if-called',
          config: { task: 'process', count: 42 }
        },
        {
          name: 'finish',
          action: 'return',
          config: { code: 'Done' }
        }
      ]
    };

    const result = await engine.run(playbook, {}, { mode: 'what-if' });

    expect(result.status).toBe('completed');
    const summary = result.outputs.summary as Array<{
      stepName: string;
      actionType: string;
      inputVarRefs: string[];
    }>;
    expect(summary).toHaveLength(3);
    expect(summary[0].actionType).toBe('var');
    expect(summary[0].inputVarRefs).toEqual([]);
    expect(summary[1].actionType).toBe('fail-if-called');
    expect(summary[1].inputVarRefs).toEqual([]);
    expect(summary[2].actionType).toBe('return');
    expect(summary[2].inputVarRefs).toEqual([]);
  });

  it('should deduplicate variable references', async () => {
    const playbook: Playbook = {
      name: 'dedup-test',
      description: 'Test deduplication of var refs',
      owner: 'Engineer',
      steps: [
        {
          name: 'multi-ref',
          action: 'fail-if-called',
          config: {
            greeting: 'Hello {{user-name}}',
            farewell: 'Goodbye {{user-name}}, see you {{user-name}}'
          }
        }
      ]
    };

    const result = await engine.run(playbook, {}, { mode: 'what-if' });
    const summary = result.outputs.summary as Array<{ inputVarRefs: string[] }>;
    expect(summary[0].inputVarRefs).toEqual(['user-name']);
  });

  it('should ignore escaped template references', async () => {
    const playbook: Playbook = {
      name: 'escaped-test',
      description: 'Test that escaped templates are not treated as var refs',
      owner: 'Engineer',
      steps: [
        {
          name: 'write-template',
          action: 'fail-if-called',
          config: {
            content: 'Hello \\{{name\\}}! Welcome to {{product}}.',
            literal: '\\{{not-a-ref}}',
            real: '{{actual-ref}}'
          }
        }
      ]
    };

    const result = await engine.run(playbook, {}, { mode: 'what-if' });
    const summary = result.outputs.summary as Array<{ inputVarRefs: string[] }>;
    // Only unescaped {{product}} and {{actual-ref}} should appear
    expect(summary[0].inputVarRefs).toEqual(['product', 'actual-ref']);
  });

  it('should include nested steps for control-flow actions', async () => {
    const playbook: Playbook = {
      name: 'nested-what-if-test',
      description: 'Test hierarchical what-if output',
      owner: 'Engineer',
      steps: [
        {
          name: 'check-condition',
          action: 'if',
          config: {
            condition: "${{ get('enabled') }}",
            then: [
              { action: 'fail-if-called', config: { x: '{{alpha}}' } }
            ],
            else: [
              { action: 'fail-if-called', config: { y: '{{beta}}' } },
              { action: 'fail-if-called', config: { z: '{{gamma}}' } }
            ]
          }
        },
        {
          name: 'loop',
          action: 'for-each',
          config: {
            in: "${{ get('items') }}",
            item: 'letter',
            steps: [
              { action: 'fail-if-called', config: { data: '{{letter}}' } }
            ]
          }
        }
      ]
    };

    const result = await engine.run(playbook, {}, { mode: 'what-if' });
    expect(result.status).toBe('completed');

    const summary = result.outputs.summary as Array<{
      stepName: string;
      actionType: string;
      inputVarRefs: string[];
      children?: Record<string, Array<{ stepName: string; actionType: string; inputVarRefs: string[] }>>;
    }>;

    // if step: condition references 'enabled', then/else are children
    expect(summary[0].actionType).toBe('if');
    expect(summary[0].inputVarRefs).toEqual(['enabled']);
    expect(summary[0].children).toBeDefined();
    expect(summary[0].children!.then).toHaveLength(1);
    expect(summary[0].children!.then[0].inputVarRefs).toEqual(['alpha']);
    expect(summary[0].children!.else).toHaveLength(2);

    // for-each step: in references 'items', steps are children
    expect(summary[1].actionType).toBe('for-each');
    expect(summary[1].inputVarRefs).toEqual(['items']);
    expect(summary[1].children).toBeDefined();
    expect(summary[1].children!.steps).toHaveLength(1);
    expect(summary[1].children!.steps[0].inputVarRefs).toEqual(['letter']);
  });

  it('should still validate playbook structure in what-if mode', async () => {
    const invalidPlaybook = {
      name: '',
      description: 'Invalid playbook',
      owner: 'Engineer',
      steps: []
    } as Playbook;

    const result = await engine.run(invalidPlaybook, {}, { mode: 'what-if' });
    expect(result.status).toBe('failed');
  });

  it('should still validate inputs in what-if mode', async () => {
    const playbook: Playbook = {
      name: 'input-validation-test',
      description: 'Test input validation in what-if',
      owner: 'Engineer',
      inputs: [
        { name: 'required-param', type: 'string', required: true }
      ],
      steps: [
        {
          name: 'step',
          action: 'fail-if-called',
          config: { data: '{{required-param}}' }
        }
      ]
    };

    // Missing required input should still fail
    const result = await engine.run(playbook, {}, { mode: 'what-if' });
    expect(result.status).toBe('failed');
  });
});
