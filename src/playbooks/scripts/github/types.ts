/**
 * TypeScript type definitions for GitHub entities and operations
 */

import { CatalystError, AuthError, NotFoundError, NetworkError } from '../../../ts/errors';

/**
 * Result wrapper for GitHub operations
 * Provides explicit success/failure state with typed data or error
 */
export type Result<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: CatalystError };

/**
 * Helper to create success result
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data, error: null };
}

/**
 * Helper to create failure result
 */
export function failure<T>(error: GitHubError): Result<T> {
  return { success: false, data: null, error };
}

/**
 * GitHub Issue representation
 */
export interface Issue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  author: string;
  labels: string[];
  assignees: string[];
  createdAt: string;
  updatedAt: string;
  url: string;
}

/**
 * GitHub Issue Comment representation
 */
export interface IssueComment {
  id: number;
  author: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  url: string;
}

/**
 * GitHub Issue with all comments
 */
export interface IssueWithComments extends Issue {
  comments: IssueComment[];
}

/**
 * GitHub Pull Request representation
 */
export interface PullRequest {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  labels: string[];
  assignees: string[];
  headBranch: string;
  baseBranch: string;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  url: string;
}

/**
 * GitHub PR Comment representation
 */
export interface PRComment {
  id: number;
  author: string;
  body: string;
  path: string | null;
  line: number | null;
  createdAt: string;
  updatedAt: string;
  url: string;
}

/**
 * GitHub PR Comment Thread representation
 */
export interface PRThread {
  id: number;
  rootCommentId: number;
  resolved: boolean;
  path: string | null;
  line: number | null;
  comments: PRComment[];
}

/**
 * GitHub PR Review representation
 */
export interface PRReview {
  id: number;
  author: string;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
  body: string;
  submittedAt: string;
  url: string;
}

/**
 * GitHub Repository information
 */
export interface Repository {
  owner: string;
  name: string;
  defaultBranch: string;
  description: string;
  homepage: string | null;
  topics: string[];
  url: string;
}

/**
 * GitHub Label representation
 */
export interface Label {
  name: string;
  description: string;
  color: string;
}

/**
 * Options for creating GitHub issues
 */
export interface CreateIssueOptions {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
  milestone?: string;
}

/**
 * Options for updating GitHub issues
 */
export interface UpdateIssueOptions {
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  labels?: string[];
  assignees?: string[];
}

/**
 * Options for listing GitHub issues
 */
export interface ListIssuesOptions {
  state?: 'open' | 'closed' | 'all';
  labels?: string[];
  assignee?: string;
  author?: string;
  limit?: number;
}

/**
 * Options for listing GitHub PRs
 */
export interface ListPRsOptions {
  state?: 'open' | 'closed' | 'merged' | 'all';
  labels?: string[];
  baseBranch?: string;
  limit?: number;
}

/**
 * Options for submitting PR review
 */
export interface SubmitReviewOptions {
  status: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  body?: string;
}

/**
 * Options for configuring branch protection
 */
export interface BranchProtectionOptions {
  requirePR: boolean;
  requiredReviews?: number;
  requireStatusChecks?: string[];
  enforceAdmins?: boolean;
}

/**
 * Options for configuring merge settings
 */
export interface MergeSettingsOptions {
  allowSquash?: boolean;
  allowMerge?: boolean;
  allowRebase?: boolean;
  deleteBranchOnMerge?: boolean;
}

/**
 * GitHub-specific error wrapper - extends CatalystError
 * @deprecated Use CatalystError or specific error types directly
 */
export class GitHubError extends CatalystError {
  /** @deprecated Use 'guidance' property instead */
  public get remediation(): string {
    return this.guidance;
  }

  constructor(message: string, code: string, remediation: string, cause?: Error) {
    super(message, code, remediation, cause);
    this.name = 'GitHubError';
  }
}

/**
 * GitHub authentication error
 * @deprecated Use AuthError from src/ts/errors
 */
export class GitHubAuthError extends AuthError {
  /** @deprecated Use 'guidance' property instead */
  public get remediation(): string {
    return this.guidance;
  }

  constructor(message: string, remediation: string, cause?: Error) {
    super(message, remediation, cause);
    this.name = 'GitHubAuthError';
  }
}

/**
 * GitHub resource not found error
 * @deprecated Use NotFoundError from src/ts/errors
 */
export class GitHubNotFoundError extends NotFoundError {
  /** @deprecated Use 'guidance' property instead */
  public get remediation(): string {
    return this.guidance;
  }

  constructor(message: string, remediation: string, cause?: Error) {
    super(message, remediation, cause);
    this.name = 'GitHubNotFoundError';
  }
}

/**
 * GitHub network error
 * @deprecated Use NetworkError from src/ts/errors
 */
export class GitHubNetworkError extends NetworkError {
  /** @deprecated Use 'guidance' property instead */
  public get remediation(): string {
    return this.guidance;
  }

  constructor(message: string, remediation: string, cause?: Error) {
    super(message, remediation, cause);
    this.name = 'GitHubNetworkError';
  }
}

/**
 * GitHub rate limit error
 */
export class GitHubRateLimitError extends CatalystError {
  /** @deprecated Use 'guidance' property instead */
  public get remediation(): string {
    return this.guidance;
  }

  constructor(message: string, remediation: string, cause?: Error) {
    super(message, 'RATE_LIMIT', remediation, cause);
    this.name = 'GitHubRateLimitError';
  }
}

/**
 * GitHub permission error
 */
export class GitHubPermissionError extends CatalystError {
  /** @deprecated Use 'guidance' property instead */
  public get remediation(): string {
    return this.guidance;
  }

  constructor(message: string, remediation: string, cause?: Error) {
    super(message, 'PERMISSION_ERROR', remediation, cause);
    this.name = 'GitHubPermissionError';
  }
}

/**
 * Template frontmatter metadata
 */
export interface TemplateFrontmatter {
  title?: string;
  labels?: string[];
  assignees?: string[];
  milestone?: string;
}

/**
 * Parsed issue template
 */
export interface IssueTemplate {
  frontmatter: TemplateFrontmatter;
  body: string;
}

/**
 * Feature information extracted from PR
 */
export interface FeatureInfo {
  featureId: string | null;
  hasSpecFile: boolean;
  hasPlanFile: boolean;
  hasTasksFile: boolean;
}
