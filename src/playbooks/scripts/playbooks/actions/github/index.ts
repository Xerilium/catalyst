/**
 * GitHub Playbook Actions
 *
 * This module provides playbook actions for interacting with GitHub,
 * including creating issues and pull requests, adding comments, and
 * retrieving repository information.
 *
 * @module playbooks/actions/github
 */

/**
 * Action Classes
 */
export { GitHubIssueCreateAction } from './issue-create-action';
export { GitHubIssueCommentAction } from './issue-comment-action';
export { GitHubPRCreateAction } from './pr-create-action';
export { GitHubPRCommentAction } from './pr-comment-action';
export { GitHubRepoAction } from './repo-action';

/**
 * Configuration Interfaces
 */
export type {
  GitHubIssueCreateConfig,
  GitHubIssueCommentConfig,
  GitHubPRCreateConfig,
  GitHubPRCommentConfig,
  GitHubRepoConfig,
} from './types';

/**
 * Result Interfaces
 */
export type {
  GitHubIssueResult,
  GitHubPRResult,
  GitHubRepoResult,
} from './types';

/**
 * Data Type Interfaces
 */
export type {
  IssueData,
  PRData,
  CommentData,
  RepoData,
} from './types';

/**
 * Error Classes
 */
export {
  GitHubError,
  GitHubAuthError,
  GitHubNotFoundError,
  GitHubPermissionError,
  GitHubRateLimitError,
  GitHubNetworkError,
} from './errors';

/**
 * Base Class (for extensibility)
 */
export { GitHubActionBase } from './base';
