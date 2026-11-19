/**
 * Tests for exposing returned code/message to callers
 *
 * @req FR:playbook-engine/execution.result-code - ExecutionResult exposes code and message
 * @req FR:playbook-engine/actions.builtin.function.return - Function result exposes code and message
 */

import { describe, it, expect, jest } from '@jest/globals';
import type { PlaybookActionResult, StepExecutor } from '@playbooks/types';
import { FunctionInvocationAction } from '@playbooks/engine/actions/function-invocation-action';
import { Engine } from '@playbooks/engine/engine';
import { withResultCode } from '@playbooks/engine/execution-context';
import { CatalystError } from '@core/errors';
import type { Playbook } from '@playbooks/types';

function executorReturning(results: PlaybookActionResult[]): StepExecutor {
  return {
    executeSteps: jest.fn<StepExecutor['executeSteps']>().mockResolvedValue(results),
    getCallStack: jest.fn<StepExecutor['getCallStack']>().mockReturnValue([]),
    getVariable: jest.fn<StepExecutor['getVariable']>().mockReturnValue(undefined),
    setVariable: jest.fn<StepExecutor['setVariable']>()
  };
}

describe('FunctionInvocationAction returned code/message', () => {
  it('exposes returned code and message alongside outputs', async () => {
    const exec = executorReturning([
      { code: 'Done', message: 'All good', value: { n: 1 }, returned: true }
    ]);
    const action = new FunctionInvocationAction(exec, { name: 'f', steps: [] });
    const result = await action.execute({});
    expect(result.value).toEqual({ n: 1, code: 'Done', message: 'All good' });
  });

  it('lets an explicit output named code/message win', async () => {
    const exec = executorReturning([
      { code: 'Done', message: 'All good', value: { code: 'Mine' }, returned: true }
    ]);
    const action = new FunctionInvocationAction(exec, { name: 'f', steps: [] });
    const result = await action.execute({});
    expect(result.value).toEqual({ code: 'Mine', message: 'All good' });
  });

  it('adds nothing when the function did not return', async () => {
    const exec = executorReturning([{ code: 'Success', message: 'x', value: { n: 1 } }]);
    const action = new FunctionInvocationAction(exec, { name: 'f', steps: [] });
    const result = await action.execute({});
    expect(result.value).toEqual({ n: 1 });
  });
});

describe('Engine.run code/message', () => {
  const base = { name: 't', description: 'd', owner: 'o' };

  it('reports returned code and message', async () => {
    const pb: Playbook = {
      ...base,
      steps: [{ action: 'return', config: { code: 'Merged', message: 'PR merged' } }]
    };
    const result = await new Engine().run(pb);
    expect(result.code).toBe('Merged');
    expect(result.message).toBe('PR merged');
  });

  it('defaults to Success on normal completion', async () => {
    const pb: Playbook = { ...base, steps: [{ action: 'var', config: { name: 'a', value: 1 } }] };
    const result = await new Engine().run(pb);
    expect(result.code).toBe('Success');
    expect(result.message).toBe('Playbook completed successfully');
  });

  it('reports error code and message on failure', async () => {
    const pb: Playbook = { ...base, steps: [{ action: 'no-such-action', config: {} }] };
    const result = await new Engine().run(pb);
    expect(result.status).toBe('failed');
    expect(result.code).toBe(result.error?.code);
    expect(result.message).toBe(result.error?.message);
  });

  it('exposes child playbook-style returned code via function step', async () => {
    const pb: Playbook = {
      ...base,
      steps: [
        { action: 'function', config: { name: 'f', steps: [{ action: 'return', config: { code: 'Fx', message: 'fm', ok: true } }] } },
        { name: 'r', action: 'f', config: {} },
        { action: 'return', config: { got: '${{ get("r").code }}/${{ get("r").message }}' } }
      ]
    };
    const result = await new Engine().run(pb);
    expect(result.outputs.got).toBe('Fx/fm');
  });

  it('exposes code and message when a function returns inside an if', async () => {
    const pb: Playbook = {
      ...base,
      steps: [
        {
          action: 'function',
          config: {
            name: 'f',
            steps: [
              { action: 'if', config: { condition: true, then: [{ action: 'return', config: { code: 'Early', message: 'em' } }] } },
              { action: 'return', config: { code: 'Late', message: 'lm' } }
            ]
          }
        },
        { name: 'r', action: 'f', config: {} },
        { action: 'return', config: { got: '${{ get("r").code }}/${{ get("r").message }}' } }
      ]
    };
    const result = await new Engine().run(pb);
    expect(result.outputs.got).toBe('Early/em');
  });
});

describe('withResultCode', () => {
  const base = {
    runId: 'r',
    status: 'completed' as const,
    outputs: {},
    duration: 0,
    stepsExecuted: 0,
    startTime: 't',
    endTime: 't'
  };
  const error = new CatalystError('boom', 'Boom', 'g');

  it('prefers the returned code and message over an error', () => {
    const r = withResultCode({ ...base, error }, { code: 'Merged', message: 'PR merged' });
    expect([r.code, r.message]).toEqual(['Merged', 'PR merged']);
  });

  it('falls back to the error code and message', () => {
    const r = withResultCode({ ...base, status: 'failed', error });
    expect([r.code, r.message]).toEqual(['Boom', 'boom']);
  });

  it('defaults to Success', () => {
    const r = withResultCode(base);
    expect([r.code, r.message]).toEqual(['Success', 'Playbook completed successfully']);
  });
});
