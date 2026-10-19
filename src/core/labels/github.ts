/**
 * Thin GitHub CLI adapter for repository labels
 */

import { execFileSync } from 'child_process';
import { CatalystError } from '../errors';
import type { LabelAdapter, NewLabel, RepoLabel } from './types';

/** Runs `gh` with the given arguments and returns stdout; throws on failure. */
export type GhRunner = (args: string[]) => string;

const UNAVAILABLE =
  /auth login|not logged in|not a git repository|none of the git remotes|could not resolve to a repository|no git remotes/i;

const LABELS_QUERY =
  'query($owner:String!,$name:String!,$after:String){repository(owner:$owner,name:$name){labels(first:100,after:$after){pageInfo{hasNextPage endCursor}nodes{name issues{totalCount}pullRequests{totalCount}}}}}';

const defaultRunner: GhRunner = args =>
  execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function isUnavailable(error: unknown): boolean {
  const e = error as { code?: string; message?: string; stderr?: unknown };
  return e.code === 'ENOENT' || UNAVAILABLE.test(`${e.message ?? ''} ${String(e.stderr ?? '')}`);
}

/**
 * @req FR:pr-labels/adapter.@function
 * @req FR:pr-labels/adapter.usage
 * @req FR:pr-labels/adapter.create
 * @req FR:pr-labels/adapter.rename
 * @req FR:pr-labels/adapter.unavailable
 */
export function createGhLabelAdapter(run: GhRunner = defaultRunner): LabelAdapter {
  const gh = (args: string[]): string => {
    try {
      return run(args);
    } catch (error) {
      if (isUnavailable(error)) {
        throw new CatalystError(
          'GitHub CLI is unavailable for this repository',
          'LabelGitHubUnavailable',
          'Install gh, run `gh auth login`, and run inside a clone with a GitHub remote',
          error as Error,
        );
      }
      throw error;
    }
  };

  return {
    async list() {
      const [owner, name] = gh(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'])
        .trim()
        .split('/');
      const labels: RepoLabel[] = [];
      let after: string | undefined;
      do {
        const args = [
          'api',
          'graphql',
          '-f',
          `query=${LABELS_QUERY}`,
          '-F',
          `owner=${owner}`,
          '-F',
          `name=${name}`,
        ];
        if (after) {
          args.push('-F', `after=${after}`);
        }
        const page = JSON.parse(gh(args)).data.repository.labels;
        for (const node of page.nodes) {
          labels.push({
            name: node.name,
            usage: node.issues.totalCount + node.pullRequests.totalCount,
          });
        }
        after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : undefined;
      } while (after);
      return labels;
    },

    async create(label: NewLabel) {
      gh([
        'label',
        'create',
        label.name,
        '--color',
        label.color,
        '--description',
        label.description,
      ]);
    },

    async rename(from: string, to: string) {
      gh(['label', 'edit', from, '--name', to]);
    },
  };
}
