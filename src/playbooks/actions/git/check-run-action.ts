/**
 * GitHub check run write action
 * @module playbooks/actions/git/check-run-action
 */

import { GitHubActionBase } from './base';
import type { GitHubCheckRunConfig } from './types';
import { CatalystError } from '@core/errors';

const CONCLUSIONS = ['success', 'failure', 'neutral'];

/** What the action did, for the result and its message */
interface CheckRunOutcome {
  /** `created`, `updated`, `unchanged`, or `planned` for a dry run */
  action: 'created' | 'updated' | 'unchanged' | 'planned';
  name: string;
  conclusion: string;
}

/**
 * Action to publish a completed check run on a commit, so branch protection can require it
 *
 * Only a GitHub App token may write check runs, and `GITHUB_TOKEN` is one; a user's token is not.
 * When `CATALYST_CHECKS_TOKEN` is set, `gh` uses it instead of `GH_TOKEN` for this action.
 */
// @req FR:playbook-actions-git/github-check-run.@action
// @req FR:playbook-actions-git/github-check-run.no-shell
export class GitHubCheckRunAction extends GitHubActionBase<GitHubCheckRunConfig, CheckRunOutcome> {
  static readonly actionType = 'github-check-run';

  static readonly primaryProperty = 'name';

  protected executeGh(args: string[]): string {
    const token = process.env.CATALYST_CHECKS_TOKEN;
    if (!token) {
      return super.executeGh(args);
    }
    const previous = process.env.GH_TOKEN;
    process.env.GH_TOKEN = token;
    try {
      return super.executeGh(args);
    } finally {
      if (previous === undefined) {
        delete process.env.GH_TOKEN;
      } else {
        process.env.GH_TOKEN = previous;
      }
    }
  }

  // @req FR:playbook-actions-git/github-check-run.input
  // @req FR:playbook-actions-git/common.validation
  protected validateConfig(config: GitHubCheckRunConfig): void {
    const invalid = (message: string, guidance: string) =>
      new CatalystError(message, 'GitHubCheckRunConfigInvalid', guidance);
    if (!config?.name || typeof config.name !== 'string' || !config.name.trim()) {
      throw invalid('Check name is required', 'Provide the check name');
    }
    if (!/^[0-9a-f]{7,40}$/i.test(config.sha ?? '')) {
      throw invalid('Commit sha is not valid', 'Pass the head commit of the PR');
    }
    if (!CONCLUSIONS.includes(config.conclusion)) {
      throw invalid(`Unknown conclusion: ${config.conclusion}`, `Use one of: ${CONCLUSIONS.join(', ')}`);
    }
  }

  // @req FR:playbook-actions-git/github-check-run.upsert
  // @req FR:playbook-actions-git/github-check-run.idempotent
  // @req FR:playbook-actions-git/github-check-run.dry-run
  protected async executeGitHubOperation(config: GitHubCheckRunConfig): Promise<CheckRunOutcome> {
    const repository = config.repository || (await this.getCurrentRepository());
    const title = config.title ?? config.name;
    const summary = config.summary ?? title;
    const base = { name: config.name, conclusion: config.conclusion };

    if (config.dryRun) {
      return { ...base, action: 'planned' };
    }

    const existing = (
      JSON.parse(
        this.executeGh(['api', `repos/${repository}/commits/${config.sha}/check-runs?check_name=${encodeURIComponent(config.name)}`]),
      ) as { check_runs?: { id: number; name: string; conclusion?: string; output?: { summary?: string } }[] }
    ).check_runs?.find((c) => c.name === config.name);

    if (existing && existing.conclusion === config.conclusion && (existing.output?.summary ?? '') === summary) {
      return { ...base, action: 'unchanged' };
    }

    const fields = [
      '-f', `name=${config.name}`,
      '-f', 'status=completed',
      '-f', `conclusion=${config.conclusion}`,
      '-f', `output[title]=${title}`,
      '-f', `output[summary]=${summary}`,
    ];
    this.executeGh(
      existing
        ? ['api', '-X', 'PATCH', `repos/${repository}/check-runs/${existing.id}`, ...fields]
        : ['api', '-X', 'POST', `repos/${repository}/check-runs`, ...fields, '-f', `head_sha=${config.sha}`],
    );
    return { ...base, action: existing ? 'updated' : 'created' };
  }

  protected getSuccessMessage(data: CheckRunOutcome): string {
    const what = `${data.name} (${data.conclusion})`;
    return data.action === 'planned' ? `Would write check run ${what}` : data.action === 'unchanged' ? `Check run ${what} already up to date` : `Wrote check run ${what}`;
  }
}
