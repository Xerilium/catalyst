/**
 * GitHubAdapter - Concrete implementation using GitHub CLI
 * Implements GitHubClient interface with gh CLI wrapper
 */

import { execSync } from 'child_process';
import type { GitHubClient } from './client';
import {
  Result,
  success,
  failure,
  GitHubError,
  GitHubAuthError,
  GitHubNotFoundError,
  GitHubNetworkError,
  type Issue,
  type IssueWithComments,
  type IssueComment,
  type PullRequest,
  type PRComment,
  type PRThread,
  type PRReview,
  type Repository,
  type Label,
  type FeatureInfo,
  type CreateIssueOptions,
  type UpdateIssueOptions,
  type ListIssuesOptions,
  type ListPRsOptions,
  type SubmitReviewOptions,
  type BranchProtectionOptions,
  type MergeSettingsOptions,
} from './types';

const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Production implementation using gh CLI
 */
export class GitHubAdapter implements GitHubClient {
  /**
   * Execute gh CLI command with error handling and timeout
   */
  private runCommand(command: string, timeout: number = DEFAULT_TIMEOUT): string {
    try {
      const result = execSync(command, {
        encoding: 'utf-8',
        timeout,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return result.trim();
    } catch (error) {
      throw this.handleCLIError(error as Error);
    }
  }

  /**
   * Parse JSON response with error recovery
   */
  private parseJSON<T>(json: string): T {
    try {
      return JSON.parse(json);
    } catch (error) {
      throw new GitHubError(
        'Failed to parse GitHub CLI response',
        'PARSE_ERROR',
        'This may indicate a CLI version mismatch. Try: gh version',
        error as Error
      );
    }
  }

  /**
   * Map CLI errors to typed GitHubError instances
   */
  private handleCLIError(error: Error): GitHubError {
    const message = error.message.toLowerCase();

    // Auth errors
    if (message.includes('auth login') || message.includes('not logged in')) {
      return new GitHubAuthError(
        'GitHub CLI not authenticated',
        'Run: catalyst-github auth',
        error
      );
    }

    // Not found errors
    if (message.includes('not found') || message.includes('could not resolve')) {
      return new GitHubNotFoundError(
        'Resource not found',
        'Verify the ID or number is correct',
        error
      );
    }

    // Network errors
    if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      return new GitHubNetworkError(
        'Network error occurred',
        'Check your internet connection and try again',
        error
      );
    }

    // Rate limit
    if (message.includes('rate limit')) {
      return new GitHubError(
        'API rate limit exceeded',
        'RATE_LIMIT',
        'Wait a few minutes and try again',
        error
      );
    }

    // Generic error
    return new GitHubError(
      error.message,
      'UNKNOWN_ERROR',
      'Check the error message for details',
      error
    );
  }

  /**
   * Get repository owner/name from git remote
   */
  private getRepository(): { owner: string; name: string } {
    try {
      const remote = this.runCommand('git config --get remote.origin.url');
      const match = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      if (!match) {
        throw new Error('Could not parse repository from git remote');
      }
      return { owner: match[1], name: match[2] };
    } catch (error) {
      throw new GitHubError(
        'Failed to detect repository',
        'REPO_DETECTION_FAILED',
        'Ensure you are in a git repository with a GitHub remote',
        error as Error
      );
    }
  }

  // Issue Operations (T060-T067)
  async findIssue(pattern: string, repo?: string): Promise<Result<Issue[]>> {
    try {
      const repoArg = repo || `${this.getRepository().owner}/${this.getRepository().name}`;
      const output = this.runCommand(`gh issue list --repo ${repoArg} --search "${pattern}" --json number,title,state,author,labels,assignees,createdAt,updatedAt,url,body`);
      const data = this.parseJSON<any[]>(output);

      const issues: Issue[] = data.map(issue => ({
        number: issue.number,
        title: issue.title,
        body: issue.body || '',
        state: issue.state,
        author: issue.author?.login || '',
        labels: (issue.labels || []).map((l: any) => l.name),
        assignees: (issue.assignees || []).map((a: any) => a.login),
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        url: issue.url,
      }));

      return success(issues);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async getIssue(issueNumber: number): Promise<Result<Issue>> {
    try {
      const output = this.runCommand(`gh issue view ${issueNumber} --json number,title,body,state,author,labels,assignees,createdAt,updatedAt,url`);
      const data = this.parseJSON<any>(output);

      const issue: Issue = {
        number: data.number,
        title: data.title,
        body: data.body || '',
        state: data.state,
        author: data.author?.login || '',
        labels: (data.labels || []).map((l: any) => l.name),
        assignees: (data.assignees || []).map((a: any) => a.login),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        url: data.url,
      };

      return success(issue);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async getIssueWithComments(issueNumber: number): Promise<Result<IssueWithComments>> {
    try {
      const output = this.runCommand(`gh issue view ${issueNumber} --json number,title,body,state,author,labels,assignees,createdAt,updatedAt,url,comments`);
      const data = this.parseJSON<any>(output);

      const issue: IssueWithComments = {
        number: data.number,
        title: data.title,
        body: data.body || '',
        state: data.state,
        author: data.author?.login || '',
        labels: (data.labels || []).map((l: any) => l.name),
        assignees: (data.assignees || []).map((a: any) => a.login),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        url: data.url,
        comments: ((data.comments?.nodes || data.comments) || []).map((c: any) => ({
          id: c.id,
          author: c.author?.login || '',
          body: c.body,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          url: c.url,
        })),
      };

      return success(issue);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async listIssues(options: ListIssuesOptions = {}): Promise<Result<Issue[]>> {
    try {
      let cmd = 'gh issue list --json number,title,body,state,author,labels,assignees,createdAt,updatedAt,url';

      if (options.state) cmd += ` --state ${options.state}`;
      if (options.labels) cmd += ` --label ${options.labels.join(',')}`;
      if (options.assignee) cmd += ` --assignee ${options.assignee}`;
      if (options.author) cmd += ` --author ${options.author}`;
      if (options.limit) cmd += ` --limit ${options.limit}`;

      const output = this.runCommand(cmd);
      const data = this.parseJSON<any[]>(output);

      const issues: Issue[] = data.map(issue => ({
        number: issue.number,
        title: issue.title,
        body: issue.body || '',
        state: issue.state,
        author: issue.author?.login || '',
        labels: (issue.labels || []).map((l: any) => l.name),
        assignees: (issue.assignees || []).map((a: any) => a.login),
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        url: issue.url,
      }));

      return success(issues);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async createIssue(options: CreateIssueOptions): Promise<Result<Issue>> {
    try {
      let cmd = `gh issue create --title "${options.title}" --body "${options.body}"`;

      if (options.labels) cmd += ` --label ${options.labels.join(',')}`;
      if (options.assignees) cmd += ` --assignee ${options.assignees.join(',')}`;
      if (options.milestone) cmd += ` --milestone "${options.milestone}"`;

      const output = this.runCommand(cmd);
      const issueNumber = parseInt(output.match(/\/issues\/(\d+)/)?.[1] || '0');

      return await this.getIssue(issueNumber);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async updateIssue(issueNumber: number, options: UpdateIssueOptions): Promise<Result<Issue>> {
    try {
      let cmd = `gh issue edit ${issueNumber}`;

      if (options.title) cmd += ` --title "${options.title}"`;
      if (options.body) cmd += ` --body "${options.body}"`;
      if (options.state) cmd += ` --state ${options.state}`;
      if (options.labels) cmd += ` --add-label ${options.labels.join(',')}`;
      if (options.assignees) cmd += ` --add-assignee ${options.assignees.join(',')}`;

      this.runCommand(cmd);
      return await this.getIssue(issueNumber);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async addIssueComment(issueNumber: number, body: string): Promise<Result<IssueComment>> {
    try {
      this.runCommand(`gh issue comment ${issueNumber} --body "${body}"`);

      // Get the latest comment
      const issueResult = await this.getIssueWithComments(issueNumber);
      if (!issueResult.success) return failure(issueResult.error);

      const latestComment = issueResult.data.comments[issueResult.data.comments.length - 1];
      return success(latestComment);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async closeIssue(issueNumber: number, reason?: string): Promise<Result<Issue>> {
    try {
      let cmd = `gh issue close ${issueNumber}`;
      if (reason) cmd += ` --reason ${reason}`;

      this.runCommand(cmd);
      return await this.getIssue(issueNumber);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  // PR Operations (T068-T078) - to be implemented
  async findPRs(pattern: string): Promise<Result<PullRequest[]>> {
    throw new Error('Not implemented');
  }

  async getPR(prNumber: number): Promise<Result<PullRequest>> {
    throw new Error('Not implemented');
  }

  async getPRFeature(prNumber: number): Promise<Result<FeatureInfo>> {
    throw new Error('Not implemented');
  }

  async listPRs(options?: ListPRsOptions): Promise<Result<PullRequest[]>> {
    throw new Error('Not implemented');
  }

  async getPRComments(prNumber: number): Promise<Result<PRComment[]>> {
    throw new Error('Not implemented');
  }

  async addPRComment(prNumber: number, body: string): Promise<Result<PRComment>> {
    throw new Error('Not implemented');
  }

  async findPRThreads(prNumber: number): Promise<Result<PRThread[]>> {
    throw new Error('Not implemented');
  }

  async replyToThread(prNumber: number, threadId: number, body: string): Promise<Result<PRComment>> {
    throw new Error('Not implemented');
  }

  async getPRReviews(prNumber: number): Promise<Result<PRReview[]>> {
    throw new Error('Not implemented');
  }

  async submitPRReview(prNumber: number, options: SubmitReviewOptions): Promise<Result<PRReview>> {
    throw new Error('Not implemented');
  }

  async dismissPRReview(prNumber: number, reviewId: number): Promise<Result<void>> {
    throw new Error('Not implemented');
  }

  // Repository Operations (T079-T085) - to be implemented
  async getRepositoryInfo(): Promise<Result<Repository>> {
    throw new Error('Not implemented');
  }

  async setBranchProtection(branch: string, options: BranchProtectionOptions): Promise<Result<void>> {
    throw new Error('Not implemented');
  }

  async createLabel(name: string, color: string, description?: string): Promise<Result<Label>> {
    throw new Error('Not implemented');
  }

  async updateLabel(name: string, options: Partial<Label>): Promise<Result<void>> {
    throw new Error('Not implemented');
  }

  async deleteLabel(name: string): Promise<Result<void>> {
    throw new Error('Not implemented');
  }

  async setRepositoryProperties(options: Partial<Repository>): Promise<Result<void>> {
    throw new Error('Not implemented');
  }

  async setMergeSettings(options: MergeSettingsOptions): Promise<Result<void>> {
    throw new Error('Not implemented');
  }

  // Authentication (T086-T087) - to be implemented
  async checkAuth(): Promise<Result<boolean>> {
    throw new Error('Not implemented');
  }

  async authenticate(options?: { install?: boolean; force?: boolean }): Promise<Result<void>> {
    throw new Error('Not implemented');
  }
}
