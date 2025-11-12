/**
 * MockGitHubClient - In-memory implementation for testing
 */

import type { GitHubClient } from './client';
import {
  Result,
  success,
  failure,
  GitHubNotFoundError,
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

export class MockGitHubClient implements GitHubClient {
  private issues = new Map<number, IssueWithComments>();
  private prs = new Map<number, PullRequest>();
  private prComments = new Map<number, PRComment[]>();
  private prReviews = new Map<number, PRReview[]>();
  private labels = new Map<string, Label>();
  private repository: Repository = {
    owner: 'test-owner',
    name: 'test-repo',
    defaultBranch: 'main',
    description: 'Test repository',
    homepage: null,
    topics: [],
    url: 'https://github.com/test-owner/test-repo',
  };
  private authenticated = true;
  private nextIssueId = 1;
  private nextPRId = 1;
  private nextCommentId = 1;
  private nextReviewId = 1;

  // Issue Operations
  async findIssue(pattern: string, repo?: string): Promise<Result<Issue[]>> {
    const results: Issue[] = [];
    for (const issue of this.issues.values()) {
      if (issue.title.includes(pattern) || issue.body.includes(pattern)) {
        const { comments, ...issueData } = issue;
        results.push(issueData);
      }
    }
    return success(results);
  }

  async getIssue(issueNumber: number): Promise<Result<Issue>> {
    const issue = this.issues.get(issueNumber);
    if (!issue) {
      return failure(new GitHubNotFoundError(`Issue #${issueNumber} not found`, 'Check issue number'));
    }
    const { comments, ...issueData } = issue;
    return success(issueData);
  }

  async getIssueWithComments(issueNumber: number): Promise<Result<IssueWithComments>> {
    const issue = this.issues.get(issueNumber);
    if (!issue) {
      return failure(new GitHubNotFoundError(`Issue #${issueNumber} not found`, 'Check issue number'));
    }
    return success(issue);
  }

  async listIssues(options: ListIssuesOptions = {}): Promise<Result<Issue[]>> {
    let results = Array.from(this.issues.values());

    if (options.state) {
      results = results.filter(i => i.state === options.state);
    }
    if (options.labels) {
      results = results.filter(i => options.labels!.some(l => i.labels.includes(l)));
    }
    if (options.author) {
      results = results.filter(i => i.author === options.author);
    }
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return success(results.map(({ comments, ...issue }) => issue));
  }

  async createIssue(options: CreateIssueOptions): Promise<Result<Issue>> {
    const issue: IssueWithComments = {
      number: this.nextIssueId++,
      title: options.title,
      body: options.body,
      state: 'open',
      author: 'test-user',
      labels: options.labels || [],
      assignees: options.assignees || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      url: `https://github.com/test-owner/test-repo/issues/${this.nextIssueId - 1}`,
      comments: [],
    };

    this.issues.set(issue.number, issue);
    const { comments, ...issueData } = issue;
    return success(issueData);
  }

  async updateIssue(issueNumber: number, options: UpdateIssueOptions): Promise<Result<Issue>> {
    const issue = this.issues.get(issueNumber);
    if (!issue) {
      return failure(new GitHubNotFoundError(`Issue #${issueNumber} not found`, 'Check issue number'));
    }

    if (options.title) issue.title = options.title;
    if (options.body) issue.body = options.body;
    if (options.state) issue.state = options.state;
    if (options.labels) issue.labels = options.labels;
    if (options.assignees) issue.assignees = options.assignees;
    issue.updatedAt = new Date().toISOString();

    const { comments, ...issueData } = issue;
    return success(issueData);
  }

  async addIssueComment(issueNumber: number, body: string): Promise<Result<IssueComment>> {
    const issue = this.issues.get(issueNumber);
    if (!issue) {
      return failure(new GitHubNotFoundError(`Issue #${issueNumber} not found`, 'Check issue number'));
    }

    const comment: IssueComment = {
      id: this.nextCommentId++,
      author: 'test-user',
      body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      url: `https://github.com/test-owner/test-repo/issues/${issueNumber}#comment-${this.nextCommentId - 1}`,
    };

    issue.comments.push(comment);
    return success(comment);
  }

  async closeIssue(issueNumber: number, reason?: string): Promise<Result<Issue>> {
    return this.updateIssue(issueNumber, { state: 'closed' });
  }

  // PR Operations
  async findPRs(pattern: string): Promise<Result<PullRequest[]>> {
    const results: PullRequest[] = [];
    for (const pr of this.prs.values()) {
      if (pr.title.includes(pattern) || pr.body.includes(pattern)) {
        results.push(pr);
      }
    }
    return success(results);
  }

  async getPR(prNumber: number): Promise<Result<PullRequest>> {
    const pr = this.prs.get(prNumber);
    if (!pr) {
      return failure(new GitHubNotFoundError(`PR #${prNumber} not found`, 'Check PR number'));
    }
    return success(pr);
  }

  async getPRFeature(prNumber: number): Promise<Result<FeatureInfo>> {
    const pr = this.prs.get(prNumber);
    if (!pr) {
      return failure(new GitHubNotFoundError(`PR #${prNumber} not found`, 'Check PR number'));
    }

    const match = pr.headBranch.match(/^xe\/(.+)$/);
    return success({
      featureId: match ? match[1] : null,
      hasSpecFile: false,
      hasPlanFile: false,
      hasTasksFile: false,
    });
  }

  async listPRs(options: ListPRsOptions = {}): Promise<Result<PullRequest[]>> {
    let results = Array.from(this.prs.values());

    if (options.state) {
      results = results.filter(pr => pr.state === options.state);
    }
    if (options.labels) {
      results = results.filter(pr => options.labels!.some(l => pr.labels.includes(l)));
    }
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return success(results);
  }

  async getPRComments(prNumber: number): Promise<Result<PRComment[]>> {
    const comments = this.prComments.get(prNumber) || [];
    return success(comments);
  }

  async addPRComment(prNumber: number, body: string): Promise<Result<PRComment>> {
    const comment: PRComment = {
      id: this.nextCommentId++,
      author: 'test-user',
      body,
      path: null,
      line: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      url: `https://github.com/test-owner/test-repo/pull/${prNumber}#comment-${this.nextCommentId - 1}`,
    };

    const comments = this.prComments.get(prNumber) || [];
    comments.push(comment);
    this.prComments.set(prNumber, comments);

    return success(comment);
  }

  async findPRThreads(prNumber: number): Promise<Result<PRThread[]>> {
    return success([]);
  }

  async replyToThread(prNumber: number, threadId: number, body: string): Promise<Result<PRComment>> {
    return this.addPRComment(prNumber, body);
  }

  async getPRReviews(prNumber: number): Promise<Result<PRReview[]>> {
    const reviews = this.prReviews.get(prNumber) || [];
    return success(reviews);
  }

  async submitPRReview(prNumber: number, options: SubmitReviewOptions): Promise<Result<PRReview>> {
    const review: PRReview = {
      id: this.nextReviewId++,
      author: 'test-user',
      state: options.status,
      body: options.body || '',
      submittedAt: new Date().toISOString(),
      url: `https://github.com/test-owner/test-repo/pull/${prNumber}#review-${this.nextReviewId - 1}`,
    };

    const reviews = this.prReviews.get(prNumber) || [];
    reviews.push(review);
    this.prReviews.set(prNumber, reviews);

    return success(review);
  }

  async dismissPRReview(prNumber: number, reviewId: number): Promise<Result<void>> {
    return success(undefined);
  }

  // Repository Operations
  async getRepositoryInfo(): Promise<Result<Repository>> {
    return success(this.repository);
  }

  async setBranchProtection(branch: string, options: BranchProtectionOptions): Promise<Result<void>> {
    return success(undefined);
  }

  async createLabel(name: string, color: string, description?: string): Promise<Result<Label>> {
    const label: Label = { name, color, description: description || '' };
    this.labels.set(name, label);
    return success(label);
  }

  async updateLabel(name: string, options: Partial<Label>): Promise<Result<Label>> {
    const label = this.labels.get(name);
    if (!label) {
      return failure(new GitHubNotFoundError(`Label "${name}" not found`, 'Check label name'));
    }

    const updated = { ...label, ...options };
    this.labels.set(name, updated);
    return success(updated);
  }

  async deleteLabel(name: string): Promise<Result<void>> {
    this.labels.delete(name);
    return success(undefined);
  }

  async setRepositoryProperties(options: Partial<Repository>): Promise<Result<void>> {
    this.repository = { ...this.repository, ...options };
    return success(undefined);
  }

  async setMergeSettings(options: MergeSettingsOptions): Promise<Result<void>> {
    return success(undefined);
  }

  // Authentication
  async checkAuth(): Promise<Result<boolean>> {
    return success(this.authenticated);
  }

  async authenticate(options?: { install?: boolean; force?: boolean }): Promise<Result<void>> {
    this.authenticated = true;
    return success(undefined);
  }
}
