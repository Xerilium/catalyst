/**
 * GitHubClient interface - Abstract contract for all GitHub operations
 * Enables dependency injection for testing
 */

import type {
  Result,
  Issue,
  IssueWithComments,
  IssueComment,
  PullRequest,
  PRComment,
  PRThread,
  PRReview,
  Repository,
  Label,
  FeatureInfo,
  CreateIssueOptions,
  UpdateIssueOptions,
  ListIssuesOptions,
  ListPRsOptions,
  SubmitReviewOptions,
  BranchProtectionOptions,
  MergeSettingsOptions,
} from './types';

/**
 * Abstract interface defining all GitHub operations
 * Implementations: GitHubAdapter (production), MockGitHubClient (testing)
 */
export interface GitHubClient {
  // Issue Operations
  findIssue(pattern: string, repo?: string): Promise<Result<Issue[]>>;
  getIssue(issueNumber: number): Promise<Result<Issue>>;
  getIssueWithComments(issueNumber: number): Promise<Result<IssueWithComments>>;
  listIssues(options?: ListIssuesOptions): Promise<Result<Issue[]>>;
  createIssue(options: CreateIssueOptions): Promise<Result<Issue>>;
  updateIssue(issueNumber: number, options: UpdateIssueOptions): Promise<Result<Issue>>;
  addIssueComment(issueNumber: number, body: string): Promise<Result<IssueComment>>;
  closeIssue(issueNumber: number, reason?: string): Promise<Result<Issue>>;

  // PR Operations
  findPRs(pattern: string): Promise<Result<PullRequest[]>>;
  getPR(prNumber: number): Promise<Result<PullRequest>>;
  getPRFeature(prNumber: number): Promise<Result<FeatureInfo>>;
  listPRs(options?: ListPRsOptions): Promise<Result<PullRequest[]>>;
  getPRComments(prNumber: number): Promise<Result<PRComment[]>>;
  addPRComment(prNumber: number, body: string): Promise<Result<PRComment>>;
  findPRThreads(prNumber: number): Promise<Result<PRThread[]>>;
  replyToThread(prNumber: number, threadId: number, body: string): Promise<Result<PRComment>>;
  getPRReviews(prNumber: number): Promise<Result<PRReview[]>>;
  submitPRReview(prNumber: number, options: SubmitReviewOptions): Promise<Result<PRReview>>;
  dismissPRReview(prNumber: number, reviewId: number): Promise<Result<void>>;

  // Repository Operations
  getRepositoryInfo(): Promise<Result<Repository>>;
  setBranchProtection(branch: string, options: BranchProtectionOptions): Promise<Result<void>>;
  createLabel(name: string, color: string, description?: string): Promise<Result<Label>>;
  updateLabel(name: string, options: Partial<Label>): Promise<Result<Label>>;
  deleteLabel(name: string): Promise<Result<void>>;
  setRepositoryProperties(options: Partial<Repository>): Promise<Result<void>>;
  setMergeSettings(options: MergeSettingsOptions): Promise<Result<void>>;

  // Authentication
  checkAuth(): Promise<Result<boolean>>;
  authenticate(options?: { install?: boolean; force?: boolean }): Promise<Result<void>>;
}
