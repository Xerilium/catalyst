/**
 * Unit tests for the gh-backed label adapter (gh is injected; no network)
 */

import { CatalystError } from '../../../../src/core/errors';
import { createGhLabelAdapter, type GhRunner } from '../../../../src/core/labels/github';

function page(nodes: Array<[string, number, number]>, next?: string) {
  return JSON.stringify({
    data: {
      repository: {
        labels: {
          pageInfo: { hasNextPage: !!next, endCursor: next ?? null },
          nodes: nodes.map(([name, issues, prs]) => ({
            name,
            issues: { totalCount: issues },
            pullRequests: { totalCount: prs },
          })),
        },
      },
    },
  });
}

describe('gh label adapter', () => {
  // @req FR:pr-labels/adapter.@function
  // @req FR:pr-labels/adapter.usage
  // @req FR:pr-labels/$repo-label
  it('reads all labels across pages with issue plus PR usage', async () => {
    const calls: string[][] = [];
    const run: GhRunner = args => {
      calls.push(args);
      if (args[0] === 'repo') return 'acme/widgets\n';
      return args.includes('after=CUR1')
        ? page([['wip', 0, 1]])
        : page([['Status: WIP 🚧', 3, 4]], 'CUR1');
    };
    const labels = await createGhLabelAdapter(run).list();
    expect(labels).toEqual([
      { name: 'Status: WIP 🚧', usage: 7 },
      { name: 'wip', usage: 1 },
    ]);
    expect(calls.filter(c => c[0] === 'api')).toHaveLength(2);
    expect(calls[1]).toEqual(expect.arrayContaining(['owner=acme', 'name=widgets']));
  });

  // @req FR:pr-labels/adapter.create
  it('creates a label with color and description', async () => {
    const calls: string[][] = [];
    await createGhLabelAdapter(args => (calls.push(args), '')).create({
      name: 'Status: WIP 🚧',
      color: 'fbca04',
      description: 'Work in progress',
    });
    expect(calls).toEqual([
      [
        'label',
        'create',
        'Status: WIP 🚧',
        '--color',
        'fbca04',
        '--description',
        'Work in progress',
      ],
    ]);
  });

  // @req FR:pr-labels/adapter.rename
  it('renames in place with gh label edit', async () => {
    const calls: string[][] = [];
    await createGhLabelAdapter(args => (calls.push(args), '')).rename(
      'Status: 🚧 WIP',
      'Status: WIP 🚧',
    );
    expect(calls).toEqual([['label', 'edit', 'Status: 🚧 WIP', '--name', 'Status: WIP 🚧']]);
  });

  // @req FR:pr-labels/adapter.unavailable
  it.each([
    ['gh missing', Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' })],
    [
      'unauthenticated',
      Object.assign(new Error('failed'), {
        stderr: 'To get started with GitHub CLI, please run:  gh auth login',
      }),
    ],
    ['not a repo', Object.assign(new Error('failed'), { stderr: 'fatal: not a git repository' })],
    [
      'no remote',
      Object.assign(new Error('failed'), {
        stderr:
          'none of the git remotes configured for this repository point to a known GitHub host',
      }),
    ],
  ])('fails with LabelGitHubUnavailable when %s', async (_name, failure) => {
    const adapter = createGhLabelAdapter(() => {
      throw failure;
    });
    await expect(adapter.list()).rejects.toMatchObject({
      code: 'LabelGitHubUnavailable',
      guidance: expect.stringContaining('gh'),
    });
    await expect(adapter.list()).rejects.toBeInstanceOf(CatalystError);
  });

  // @req FR:pr-labels/adapter.unavailable
  it('does not mask unrelated failures', async () => {
    const boom = new Error('label already exists');
    const adapter = createGhLabelAdapter(() => {
      throw boom;
    });
    await expect(adapter.create({ name: 'x', color: '000000', description: '' })).rejects.toBe(
      boom,
    );
  });
});
