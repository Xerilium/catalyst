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

  // PR Operations (T068-T078)
  async findPRs(pattern: string): Promise<Result<PullRequest[]>> {
    try {
      const output = this.runCommand(`gh pr list --search "${pattern}" --json number,title,body,state,headRefName,baseRefName,author,labels,assignees,createdAt,updatedAt,mergedAt,url`);
      const data = this.parseJSON<any[]>(output);

      const prs: PullRequest[] = data.map(pr => ({
        number: pr.number,
        title: pr.title,
        body: pr.body || '',
        state: pr.state,
        author: pr.author?.login || '',
        labels: (pr.labels || []).map((l: any) => l.name),
        assignees: (pr.assignees || []).map((a: any) => a.login),
        headBranch: pr.headRefName,
        baseBranch: pr.baseRefName,
        createdAt: pr.createdAt,
        updatedAt: pr.updatedAt,
        mergedAt: pr.mergedAt,
        url: pr.url,
      }));

      return success(prs);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async getPR(prNumber: number): Promise<Result<PullRequest>> {
    try {
      const output = this.runCommand(`gh pr view ${prNumber} --json number,title,body,state,headRefName,baseRefName,author,labels,assignees,createdAt,updatedAt,mergedAt,url`);
      const data = this.parseJSON<any>(output);

      const pr: PullRequest = {
        number: data.number,
        title: data.title,
        body: data.body || '',
        state: data.state,
        author: data.author?.login || '',
        labels: (data.labels || []).map((l: any) => l.name),
        assignees: (data.assignees || []).map((a: any) => a.login),
        headBranch: data.headRefName,
        baseBranch: data.baseRefName,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        mergedAt: data.mergedAt,
        url: data.url,
      };

      return success(pr);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async getPRFeature(prNumber: number): Promise<Result<FeatureInfo>> {
    try {
      const prResult = await this.getPR(prNumber);
      if (!prResult.success) return failure(prResult.error);

      const pr = prResult.data;
      const branchMatch = pr.headBranch.match(/^xe\/(.+)$/);
      const featureId = branchMatch ? branchMatch[1] : null;

      let hasSpecFile = false;
      let hasPlanFile = false;
      let hasTasksFile = false;

      if (featureId) {
        try {
          this.runCommand(`test -f .xe/features/${featureId}/spec.md && echo "true" || echo "false"`);
          hasSpecFile = true;
        } catch {}

        try {
          this.runCommand(`test -f .xe/features/${featureId}/plan.md && echo "true" || echo "false"`);
          hasPlanFile = true;
        } catch {}

        try {
          this.runCommand(`test -f .xe/features/${featureId}/tasks.md && echo "true" || echo "false"`);
          hasTasksFile = true;
        } catch {}
      }

      return success({ featureId, hasSpecFile, hasPlanFile, hasTasksFile });
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async listPRs(options: ListPRsOptions = {}): Promise<Result<PullRequest[]>> {
    try {
      let cmd = 'gh pr list --json number,title,body,state,headRefName,baseRefName,author,labels,assignees,createdAt,updatedAt,mergedAt,url';

      if (options.state) cmd += ` --state ${options.state}`;
      if (options.labels) cmd += ` --label ${options.labels.join(',')}`;
      if (options.baseBranch) cmd += ` --base ${options.baseBranch}`;
      if (options.limit) cmd += ` --limit ${options.limit}`;

      const output = this.runCommand(cmd);
      const data = this.parseJSON<any[]>(output);

      const prs: PullRequest[] = data.map(pr => ({
        number: pr.number,
        title: pr.title,
        body: pr.body || '',
        state: pr.state,
        author: pr.author?.login || '',
        labels: (pr.labels || []).map((l: any) => l.name),
        assignees: (pr.assignees || []).map((a: any) => a.login),
        headBranch: pr.headRefName,
        baseBranch: pr.baseRefName,
        createdAt: pr.createdAt,
        updatedAt: pr.updatedAt,
        mergedAt: pr.mergedAt,
        url: pr.url,
      }));

      return success(prs);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async getPRComments(prNumber: number): Promise<Result<PRComment[]>> {
    try {
      const repo = this.getRepository();
      const output = this.runCommand(`gh api repos/${repo.owner}/${repo.name}/pulls/${prNumber}/comments --jq '.[] | {id, user: .user.login, body, path, line: .line, created_at, updated_at, html_url}'`);
      const lines = output.split('\n').filter(l => l.trim());
      const comments: PRComment[] = lines.map(line => {
        const data = this.parseJSON<any>(line);
        return {
          id: data.id,
          author: data.user,
          body: data.body,
          path: data.path || null,
          line: data.line || null,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          url: data.html_url,
        };
      });

      return success(comments);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async addPRComment(prNumber: number, body: string): Promise<Result<PRComment>> {
    try {
      this.runCommand(`gh pr comment ${prNumber} --body "${body}"`);

      const commentsResult = await this.getPRComments(prNumber);
      if (!commentsResult.success) return failure(commentsResult.error);

      const latestComment = commentsResult.data[commentsResult.data.length - 1];
      return success(latestComment);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async findPRThreads(prNumber: number): Promise<Result<PRThread[]>> {
    try {
      const repo = this.getRepository();
      const output = this.runCommand(`gh api repos/${repo.owner}/${repo.name}/pulls/${prNumber}/comments --jq '[.[] | {id, in_reply_to_id, path, line, body, user: .user.login}]'`);
      const data = this.parseJSON<any[]>(output);

      // Group comments into threads
      const threadMap = new Map<number, any[]>();
      data.forEach(comment => {
        const rootId = comment.in_reply_to_id || comment.id;
        if (!threadMap.has(rootId)) threadMap.set(rootId, []);
        threadMap.get(rootId)!.push(comment);
      });

      const threads: PRThread[] = Array.from(threadMap.entries()).map(([rootId, comments]) => ({
        id: rootId,
        rootCommentId: rootId,
        resolved: false, // Would need additional API call to determine
        path: comments[0].path || null,
        line: comments[0].line || null,
        comments: comments.map(c => ({
          id: c.id,
          author: c.user,
          body: c.body,
          path: c.path || null,
          line: c.line || null,
          createdAt: '',
          updatedAt: '',
          url: '',
        })),
      }));

      return success(threads);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async replyToThread(prNumber: number, threadId: number, body: string): Promise<Result<PRComment>> {
    try {
      const repo = this.getRepository();
      const output = this.runCommand(`gh api repos/${repo.owner}/${repo.name}/pulls/${prNumber}/comments/${threadId}/replies -f body="${body}" --jq '{id, user: .user.login, body, created_at, updated_at, html_url}'`);
      const data = this.parseJSON<any>(output);

      const comment: PRComment = {
        id: data.id,
        author: data.user,
        body: data.body,
        path: null,
        line: null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        url: data.html_url,
      };

      return success(comment);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async getPRReviews(prNumber: number): Promise<Result<PRReview[]>> {
    try {
      const output = this.runCommand(`gh pr view ${prNumber} --json reviews --jq '.reviews[] | {id, author: .author.login, state, body, submittedAt, html_url}'`);
      const lines = output.split('\n').filter(l => l.trim());

      const reviews: PRReview[] = lines.map(line => {
        const data = this.parseJSON<any>(line);
        return {
          id: data.id,
          author: data.author,
          state: data.state,
          body: data.body || '',
          submittedAt: data.submittedAt,
          url: data.html_url,
        };
      });

      return success(reviews);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async submitPRReview(prNumber: number, options: SubmitReviewOptions): Promise<Result<PRReview>> {
    try {
      const statusMap = { APPROVE: 'approve', REQUEST_CHANGES: 'request-changes', COMMENT: 'comment' };
      let cmd = `gh pr review ${prNumber} --${statusMap[options.status]}`;
      if (options.body) cmd += ` --body "${options.body}"`;

      this.runCommand(cmd);

      const reviewsResult = await this.getPRReviews(prNumber);
      if (!reviewsResult.success) return failure(reviewsResult.error);

      const latestReview = reviewsResult.data[reviewsResult.data.length - 1];
      return success(latestReview);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async dismissPRReview(prNumber: number, reviewId: number): Promise<Result<void>> {
    try {
      const repo = this.getRepository();
      this.runCommand(`gh api repos/${repo.owner}/${repo.name}/pulls/${prNumber}/reviews/${reviewId}/dismissals -f message="Dismissed"`);
      return success(undefined);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  // Repository Operations (T079-T085)
  async getRepositoryInfo(): Promise<Result<Repository>> {
    try {
      const repo = this.getRepository();
      const output = this.runCommand(`gh repo view ${repo.owner}/${repo.name} --json owner,name,defaultBranchRef,description,homepageUrl,repositoryTopics,url`);
      const data = this.parseJSON<any>(output);

      const repository: Repository = {
        owner: data.owner.login,
        name: data.name,
        defaultBranch: data.defaultBranchRef.name,
        description: data.description || '',
        homepage: data.homepageUrl || null,
        topics: (data.repositoryTopics?.nodes || []).map((t: any) => t.topic.name),
        url: data.url,
      };

      return success(repository);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async setBranchProtection(branch: string, options: BranchProtectionOptions): Promise<Result<void>> {
    try {
      const repo = this.getRepository();
      let cmd = `gh api repos/${repo.owner}/${repo.name}/branches/${branch}/protection -X PUT`;

      const protection: any = {
        required_status_checks: null,
        enforce_admins: options.enforceAdmins || false,
        required_pull_request_reviews: null,
        restrictions: null,
      };

      if (options.requirePR) {
        protection.required_pull_request_reviews = {
          required_approving_review_count: options.requiredReviews || 1,
        };
      }

      if (options.requireStatusChecks) {
        protection.required_status_checks = {
          strict: true,
          contexts: options.requireStatusChecks,
        };
      }

      cmd += ` -f "protection=${JSON.stringify(protection)}"`;
      this.runCommand(cmd);
      return success(undefined);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async createLabel(name: string, color: string, description?: string): Promise<Result<Label>> {
    try {
      let cmd = `gh label create "${name}" --color ${color}`;
      if (description) cmd += ` --description "${description}"`;

      this.runCommand(cmd);

      const label: Label = { name, color, description: description || '' };
      return success(label);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async updateLabel(name: string, options: Partial<Label>): Promise<Result<Label>> {
    try {
      let cmd = `gh label edit "${name}"`;

      if (options.name) cmd += ` --name "${options.name}"`;
      if (options.color) cmd += ` --color ${options.color}`;
      if (options.description) cmd += ` --description "${options.description}"`;

      this.runCommand(cmd);

      const label: Label = {
        name: options.name || name,
        color: options.color || '',
        description: options.description || '',
      };
      return success(label);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async deleteLabel(name: string): Promise<Result<void>> {
    try {
      this.runCommand(`gh label delete "${name}" --yes`);
      return success(undefined);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async setRepositoryProperties(options: Partial<Repository>): Promise<Result<void>> {
    try {
      const repo = this.getRepository();
      let cmd = `gh repo edit ${repo.owner}/${repo.name}`;

      if (options.description) cmd += ` --description "${options.description}"`;
      if (options.homepage) cmd += ` --homepage "${options.homepage}"`;

      this.runCommand(cmd);

      if (options.topics) {
        const topicsCmd = `gh api repos/${repo.owner}/${repo.name}/topics -X PUT -f names='${JSON.stringify(options.topics)}'`;
        this.runCommand(topicsCmd);
      }

      return success(undefined);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  async setMergeSettings(options: MergeSettingsOptions): Promise<Result<void>> {
    try {
      const repo = this.getRepository();
      let cmd = `gh repo edit ${repo.owner}/${repo.name}`;

      if (options.allowSquash !== undefined) cmd += ` --allow-squash-merge=${options.allowSquash}`;
      if (options.allowMerge !== undefined) cmd += ` --allow-merge-commit=${options.allowMerge}`;
      if (options.allowRebase !== undefined) cmd += ` --allow-rebase-merge=${options.allowRebase}`;
      if (options.deleteBranchOnMerge !== undefined) cmd += ` --delete-branch-on-merge=${options.deleteBranchOnMerge}`;

      this.runCommand(cmd);
      return success(undefined);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }

  // Authentication (T086-T087)
  async checkAuth(): Promise<Result<boolean>> {
    try {
      this.runCommand('gh auth status');
      return success(true);
    } catch (error) {
      const message = (error as Error).message.toLowerCase();
      if (message.includes('not logged in') || message.includes('auth')) {
        return success(false);
      }
      return failure(error as GitHubError);
    }
  }

  async authenticate(options: { install?: boolean; force?: boolean } = {}): Promise<Result<void>> {
    try {
      // Always check if gh is installed before attempting auth
      try {
        this.runCommand('which gh');
      } catch {
        const errorMessage = options.install
          ? 'GitHub CLI not installed. Install it from: https://cli.github.com/'
          : 'GitHub CLI not installed. Run `catalyst-github auth --install` for installation help, or install manually: https://cli.github.com/';

        throw new GitHubError(
          errorMessage,
          'CLI_NOT_INSTALLED',
          errorMessage
        );
      }

      let cmd = 'gh auth login --web';
      if (options.force) cmd += ' --force';

      this.runCommand(cmd);
      return success(undefined);
    } catch (error) {
      return failure(error as GitHubError);
    }
  }
}
