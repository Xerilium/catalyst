/**
 * Type definitions for GitHub resources and configurations
 * @module playbooks/actions/github/types
 */

// @req FR:playbook-actions-github/common.result-structure
// @req FR:playbook-actions-github/issues.create
// @req FR:playbook-actions-github/issues.comment
// @req FR:playbook-actions-github/pull-requests.create
// @req FR:playbook-actions-github/pull-requests.comment
// @req FR:playbook-actions-github/repository.info

/**
 * GitHub issue data
 */
export interface IssueData {
  /** Issue number */
  number: number;
  /** Issue URL */
  url: string;
  /** Issue title */
  title: string;
  /** Issue body (markdown) */
  body?: string;
  /** Issue state */
  state: 'open' | 'closed';
  /** Issue labels */
  labels?: string[];
  /** Issue assignees */
  assignees?: string[];
}

/**
 * GitHub pull request data
 */
export interface PRData {
  /** PR number */
  number: number;
  /** PR URL */
  url: string;
  /** PR title */
  title: string;
  /** PR body (markdown) */
  body?: string;
  /** PR state */
  state: 'open' | 'closed' | 'merged';
  /** Head branch name */
  head: string;
  /** Base branch name */
  base: string;
  /** Whether PR is a draft */
  draft?: boolean;
}

/**
 * GitHub comment data
 */
export interface CommentData {
  /** Comment ID */
  id: number;
  /** Comment URL */
  url: string;
  /** Comment body */
  body: string;
  /** Comment creation timestamp (ISO 8601) */
  createdAt: string;
}

/**
 * GitHub repository data
 */
export interface RepoData {
  /** Repository name */
  name: string;
  /** Repository owner */
  owner: string;
  /** Default branch name */
  defaultBranch: string;
  /** Repository visibility */
  visibility: 'public' | 'private' | 'internal';
  /** Repository URL */
  url: string;
}

/**
 * Configuration for creating a GitHub issue
 */
export interface GitHubIssueCreateConfig {
  /** Issue title (primary) */
  title: string;
  /** Issue body in markdown format */
  body?: string;
  /** Issue labels */
  labels?: string[];
  /** Issue assignees (usernames) */
  assignees?: string[];
  /** Target repository (owner/repo format, defaults to current repository) */
  repository?: string;
}

/**
 * Configuration for commenting on a GitHub issue
 */
export interface GitHubIssueCommentConfig {
  /** Issue number (primary) */
  issue: number;
  /** Comment body */
  body: string;
  /** Target repository (owner/repo format, defaults to current repository) */
  repository?: string;
}

/**
 * Configuration for creating a GitHub pull request
 */
export interface GitHubPRCreateConfig {
  /** PR title (primary) */
  title: string;
  /** PR body in markdown format */
  body?: string;
  /** Head branch (source branch) */
  head: string;
  /** Base branch (target branch) */
  base: string;
  /** Whether to create as draft PR */
  draft?: boolean;
  /** Target repository (owner/repo format, defaults to current repository) */
  repository?: string;
}

/**
 * Configuration for commenting on a GitHub pull request
 */
export interface GitHubPRCommentConfig {
  /** PR number (primary) */
  pr: number;
  /** Comment body */
  body: string;
  /** Target repository (owner/repo format, defaults to current repository) */
  repository?: string;
}

/**
 * Configuration for getting repository information
 */
export interface GitHubRepoConfig {
  /** Repository (owner/repo format, defaults to current repository) (primary) */
  repository?: string;
}

/**
 * Result for GitHub issue operations
 */
export interface GitHubIssueResult {
  /** Issue number */
  number: number;
  /** Issue URL */
  url: string;
  /** Issue title */
  title: string;
  /** Issue state */
  state: string;
}

/**
 * Result for GitHub pull request operations
 */
export interface GitHubPRResult {
  /** PR number */
  number: number;
  /** PR URL */
  url: string;
  /** PR title */
  title: string;
  /** PR state */
  state: string;
  /** Head branch name */
  head: string;
  /** Base branch name */
  base: string;
}

/**
 * Result for GitHub repository operations
 */
export interface GitHubRepoResult {
  /** Repository name */
  name: string;
  /** Repository owner */
  owner: string;
  /** Default branch name */
  defaultBranch: string;
  /** Repository visibility */
  visibility: string;
  /** Repository URL */
  url: string;
}
