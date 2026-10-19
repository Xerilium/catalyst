/**
 * Unit tests for the labels command (adapter is a fake)
 */

import {
  formatSetupResult,
  labelsPlanCommand,
  labelsResolveCommand,
  labelsSetupCommand,
} from '../../../../src/cli/commands/labels';
import type { LabelAdapter, RepoLabel } from '../../../../src/core/labels';

function adapter(labels: RepoLabel[]) {
  const created: string[] = [];
  const renamed: string[] = [];
  const fake: LabelAdapter = {
    list: async () => labels,
    create: async l => void created.push(l.name),
    rename: async (from, to) => void renamed.push(`${from}>${to}`),
  };
  return { fake, created, renamed };
}

describe('labels command', () => {
  let out: string[];
  beforeEach(() => {
    out = [];
    jest.spyOn(console, 'log').mockImplementation((msg: string) => void out.push(msg));
  });
  afterEach(() => jest.restoreAllMocks());

  // @req FR:pr-labels/setup.@cli
  it('sets up labels non-interactively and prints a summary', async () => {
    const { fake, created } = adapter([]);
    await labelsSetupCommand({ nonInteractive: true }, fake);
    expect(created).toContain('Status: WIP 🚧');
    expect(out.join('\n')).toMatch(/Created 8 label\(s\)/);
  });

  // @req FR:pr-labels/setup.@cli
  it('honors --style and --rename', async () => {
    const { fake, created, renamed } = adapter([{ name: 'Status: 🚧 WIP', usage: 3 }]);
    await labelsSetupCommand({ nonInteractive: true, style: 'simple', rename: true }, fake);
    expect(created).toContain('paused');
    expect(renamed).toEqual(['Status: 🚧 WIP>wip']);
  });

  // @req FR:pr-labels/setup.@cli
  it('rejects an invalid style', async () => {
    await expect(
      labelsSetupCommand({ style: 'fancy', nonInteractive: true }, adapter([]).fake),
    ).rejects.toThrow(/Invalid --style/);
  });

  // @req FR:pr-labels/setup.output
  it('prints JSON with --json and nothing with --quiet', async () => {
    await labelsSetupCommand({ nonInteractive: true, json: true }, adapter([]).fake);
    expect(JSON.parse(out[0]).style).toBe('key-value');
    out.length = 0;
    await labelsSetupCommand({ nonInteractive: true, quiet: true }, adapter([]).fake);
    expect(out).toEqual([]);
  });

  // @req FR:pr-labels/setup.rename.report
  it('formats pending renames, no-ops, and skips', () => {
    const pending = formatSetupResult({
      style: 'key-value',
      created: [],
      renamed: [],
      pendingRenames: [
        { id: 'wip', from: 'Status: 🚧 WIP', to: 'Status: WIP 🚧', reason: 'emoji-placement' },
      ],
    });
    expect(pending.join('\n')).toContain('Status: 🚧 WIP -> Status: WIP 🚧 (emoji-placement)');
    expect(
      formatSetupResult({ style: 'simple', created: [], renamed: [], pendingRenames: [] }),
    ).toEqual(['PR labels already standard (simple style)']);
    expect(
      formatSetupResult({
        style: 'simple',
        created: [],
        renamed: [],
        pendingRenames: [],
        skipped: 'no gh',
      })[0],
    ).toBe('Skipped PR label setup: no gh');
  });

  // @req FR:pr-labels/setup.skip
  it('prints a skip notice instead of failing', async () => {
    const { CatalystError } = await import('../../../../src/core/errors');
    const fake: LabelAdapter = {
      list: async () => {
        throw new CatalystError(
          'GitHub CLI is unavailable',
          'LabelGitHubUnavailable',
          'Run gh auth login',
        );
      },
      create: jest.fn(),
      rename: jest.fn(),
    };
    await labelsSetupCommand({ nonInteractive: true }, fake);
    expect(out.join('\n')).toContain('Skipped PR label setup');
  });

  // @req FR:pr-labels/plan.@cli
  // @req FR:pr-labels/plan.output.cli
  it('prints pattern and plan as JSON', async () => {
    await labelsPlanCommand(
      { json: true, style: 'key-value' },
      adapter([{ name: 'help wanted', usage: 0 }]).fake,
    );
    const parsed = JSON.parse(out[0]);
    expect(parsed.pattern).toMatchObject({ basis: 'low-use', needsChoice: true });
    expect(parsed.plan.renames[0]).toMatchObject({ from: 'help wanted', to: 'Help wanted ✨' });
    out.length = 0;
    await labelsPlanCommand({}, adapter([{ name: 'help wanted', usage: 0 }]).fake);
    expect(JSON.parse(out[0]).plan.renames).toEqual([]);
  });

  // @req FR:pr-labels/resolve.@cli
  // @req FR:pr-labels/resolve.output.cli
  it('prints the resolved name alone, or JSON', async () => {
    const { fake } = adapter([{ name: 'Status: 🚧 WIP', usage: 4 }]);
    await labelsResolveCommand('wip', {}, fake);
    expect(out).toEqual(['Status: 🚧 WIP']);
    await labelsResolveCommand('paused', { json: true, style: 'simple' }, fake);
    expect(JSON.parse(out[1])).toEqual({ id: 'paused', name: 'paused', exists: false });
  });
});
