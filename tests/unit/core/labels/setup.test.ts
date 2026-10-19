/**
 * Unit tests for label setup orchestration (adapter and prompt are fakes)
 */

import { CatalystError } from '../../../../src/core/errors';
import { LABEL_CATALOG } from '../../../../src/core/labels/catalog';
import { setupLabels, type Prompt } from '../../../../src/core/labels/setup';
import type { LabelAdapter, RepoLabel } from '../../../../src/core/labels/types';

const required = LABEL_CATALOG.filter(d => d.required);

function fakeAdapter(labels: RepoLabel[]) {
  const log = { created: [] as string[], renamed: [] as Array<[string, string]> };
  const adapter: LabelAdapter = {
    list: async () => labels,
    create: async label => void log.created.push(label.name),
    rename: async (from, to) => void log.renamed.push([from, to]),
  };
  return { adapter, log };
}

function fakePrompt(answers: { choose?: string; confirm?: boolean }) {
  const asked: string[] = [];
  const prompt: Prompt = {
    choose: async question => (asked.push(question), answers.choose ?? 'key-value'),
    confirm: async question => (asked.push(question), answers.confirm ?? false),
    close: () => undefined,
  };
  return { prompt, asked };
}

const unavailable = () =>
  new CatalystError(
    'GitHub CLI unavailable',
    'LabelGitHubUnavailable',
    'Install gh and run gh auth login',
  );

describe('setupLabels', () => {
  // @req FR:pr-labels/setup.@function
  // @req FR:pr-labels/setup.input
  // @req FR:pr-labels/setup.create
  it('creates every missing required label with color and description', async () => {
    const { adapter, log } = fakeAdapter([]);
    const created: Array<Record<string, string>> = [];
    adapter.create = async label => void created.push({ ...label });
    const result = await setupLabels(adapter, { nonInteractive: true });
    expect(result.created).toHaveLength(required.length);
    expect(created[0]).toEqual({
      name: expect.any(String),
      color: expect.stringMatching(/^[0-9a-f]{6}$/),
      description: expect.any(String),
    });
    expect(log.renamed).toEqual([]);
  });

  // @req FR:pr-labels/setup.style
  it('uses the style input over discovery', async () => {
    const { adapter, log } = fakeAdapter([{ name: 'bug', usage: 3 }]);
    await setupLabels(adapter, { style: 'simple', nonInteractive: true });
    expect(log.created).toContain('wip');
    expect(log.created).toContain('help wanted');
  });

  // @req FR:pr-labels/setup.style
  it('uses the discovered pattern when no style is given', async () => {
    const { adapter, log } = fakeAdapter([
      { name: 'wip', usage: 20 },
      { name: 'ready', usage: 9 },
    ]);
    const result = await setupLabels(adapter, { nonInteractive: true });
    expect(result.style).toBe('simple');
    expect(log.created).toContain('paused');
    expect(log.created).not.toContain('wip');
  });

  // @req FR:pr-labels/setup.rename
  it('applies renames when rename is set', async () => {
    const { adapter, log } = fakeAdapter([{ name: 'Status: 🚧 WIP', usage: 5 }]);
    const result = await setupLabels(adapter, { nonInteractive: true, rename: true });
    expect(log.renamed).toEqual([['Status: 🚧 WIP', 'Status: WIP 🚧']]);
    expect(result.renamed).toEqual([{ from: 'Status: 🚧 WIP', to: 'Status: WIP 🚧' }]);
    expect(result.pendingRenames).toEqual([]);
  });

  // @req FR:pr-labels/setup.rename
  it('applies renames after the user confirms', async () => {
    const { adapter, log } = fakeAdapter([{ name: 'Status: 🚧 WIP', usage: 5 }]);
    const { prompt, asked } = fakePrompt({ confirm: true });
    await setupLabels(adapter, { prompt });
    expect(asked.some(q => /rename/i.test(q))).toBe(true);
    expect(log.renamed).toHaveLength(1);
  });

  // @req FR:pr-labels/setup.rename.report
  it('lists renames the user declined as pending', async () => {
    const { adapter, log } = fakeAdapter([{ name: 'Status: 🚧 WIP', usage: 5 }]);
    const { prompt } = fakePrompt({ confirm: false });
    const result = await setupLabels(adapter, { prompt });
    expect(log.renamed).toEqual([]);
    expect(result.pendingRenames).toEqual([
      expect.objectContaining({ from: 'Status: 🚧 WIP', to: 'Status: WIP 🚧' }),
    ]);
  });

  // @req FR:pr-labels/setup.rename.report
  it('leaves renames pending without asking when non-interactive', async () => {
    const { adapter, log } = fakeAdapter([{ name: 'Status: 🚧 WIP', usage: 5 }]);
    const { prompt, asked } = fakePrompt({ confirm: true });
    const result = await setupLabels(adapter, { prompt, nonInteractive: true });
    expect(asked).toEqual([]);
    expect(log.renamed).toEqual([]);
    expect(result.pendingRenames).toHaveLength(1);
  });

  // @req FR:pr-labels/setup.idempotent
  it('changes nothing when every required label exists in the target form', async () => {
    const existing = required.map(d => ({
      name: d.group ? `${d.group}: ${d.value} ${d.emoji}` : `${d.value} ${d.emoji}`,
      usage: 3,
    }));
    const { adapter, log } = fakeAdapter(existing);
    const result = await setupLabels(adapter, { nonInteractive: true, rename: true });
    expect(result.created).toEqual([]);
    expect(result.renamed).toEqual([]);
    expect(log).toEqual({ created: [], renamed: [] });
  });

  // @req FR:pr-labels/setup.no-delete
  it('never deletes: the adapter has no delete operation', async () => {
    const { adapter } = fakeAdapter([]);
    expect(Object.keys(adapter).sort()).toEqual(['create', 'list', 'rename']);
  });

  // @req FR:pr-labels/setup.skip
  it('skips with a notice when GitHub is unavailable', async () => {
    const adapter: LabelAdapter = {
      list: async () => {
        throw unavailable();
      },
      create: jest.fn(),
      rename: jest.fn(),
    };
    const result = await setupLabels(adapter, { nonInteractive: true });
    expect(result.skipped).toContain('GitHub CLI unavailable');
    expect(adapter.create).not.toHaveBeenCalled();
  });

  // @req FR:pr-labels/setup.skip
  it('rethrows other errors', async () => {
    const adapter: LabelAdapter = {
      list: async () => {
        throw new Error('boom');
      },
      create: jest.fn(),
      rename: jest.fn(),
    };
    await expect(setupLabels(adapter, {})).rejects.toThrow('boom');
  });

  // @req FR:pr-labels/setup.output
  // @req FR:pr-labels/$setup-result
  it('returns the SetupResult shape', async () => {
    const { adapter } = fakeAdapter([]);
    const result = await setupLabels(adapter, { nonInteractive: true });
    expect(Object.keys(result).sort()).toEqual(['created', 'pendingRenames', 'renamed', 'style']);
  });
});

describe('pattern choice', () => {
  const simpleDefaults: RepoLabel[] = [{ name: 'help wanted', usage: 0 }];

  // @req FR:pr-labels/ask.trigger
  // @req FR:pr-labels/ask.cli
  it('asks once, offering key-value as the default, and uses the answer', async () => {
    const { adapter, log } = fakeAdapter(simpleDefaults);
    const { prompt, asked } = fakePrompt({ choose: 'simple' });
    const spy = jest.spyOn(prompt, 'choose');
    const result = await setupLabels(adapter, { prompt });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][1]).toEqual(['key-value', 'simple']);
    expect(spy.mock.calls[0][2]).toBe('key-value');
    expect(asked).toHaveLength(1);
    expect(result.style).toBe('simple');
    expect(log.created).toContain('wip');
  });

  // @req FR:pr-labels/ask.trigger
  it('does not ask when the style input is given', async () => {
    const { adapter } = fakeAdapter(simpleDefaults);
    const { prompt } = fakePrompt({});
    const choose = jest.spyOn(prompt, 'choose');
    await setupLabels(adapter, { prompt, style: 'key-value' });
    expect(choose).not.toHaveBeenCalled();
  });

  // @req FR:pr-labels/ask.trigger
  it('does not ask when the pattern is clear', async () => {
    const { adapter } = fakeAdapter([{ name: 'Status: WIP 🚧', usage: 12 }]);
    const { prompt, asked } = fakePrompt({});
    await setupLabels(adapter, { prompt });
    expect(asked).toEqual([]);
  });

  // @req FR:pr-labels/ask.trigger
  it('does not ask when no required label is missing and keeps the simple style', async () => {
    const all = required.map(d => ({ name: d.simple, usage: 0 }));
    const { adapter, log } = fakeAdapter(all);
    const { prompt, asked } = fakePrompt({});
    const result = await setupLabels(adapter, { prompt });
    expect(asked).toEqual([]);
    expect(result.style).toBe('simple');
    expect(log.created).toEqual([]);
  });

  // @req FR:pr-labels/ask.non-interactive
  it('uses key-value without asking when non-interactive', async () => {
    const { adapter, log } = fakeAdapter(simpleDefaults);
    const { prompt, asked } = fakePrompt({ choose: 'simple' });
    const result = await setupLabels(adapter, { prompt, nonInteractive: true });
    expect(asked).toEqual([]);
    expect(result.style).toBe('key-value');
    expect(log.created).toContain('Status: WIP 🚧');
  });

  // @req FR:pr-labels/ask.non-interactive
  it('uses key-value without asking when no terminal is available', async () => {
    const { adapter } = fakeAdapter(simpleDefaults);
    const result = await setupLabels(adapter, {});
    expect(result.style).toBe('key-value');
  });
});
