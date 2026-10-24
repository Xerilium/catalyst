/**
 * Git & GitHub Playbook Actions
 *
 * This module provides playbook actions for local git state management
 * (gitignore-edit) and remote GitHub operations (issues, pull requests,
 * repositories, labels).
 *
 * @module playbooks/actions/git
 */

// @req FR:playbook-actions-git/issues.create
// @req FR:playbook-actions-git/issues.comment
// @req FR:playbook-actions-git/pull-requests.create
// @req FR:playbook-actions-git/pull-requests.comment
// @req FR:playbook-actions-git/repository.info
// @req FR:playbook-actions-git/gitignore-edit.@action
// @req FR:playbook-actions-git/labels.list
// @req FR:playbook-actions-git/labels.create
// @req FR:playbook-actions-git/labels.edit

/**
 * Action Classes
 */
export { GitHubIssueCreateAction } from './issue-create-action';
export { GitHubIssueCommentAction } from './issue-comment-action';
export { GitHubPRCreateAction } from './pr-create-action';
export { GitHubPRCommentAction } from './pr-comment-action';
export { GitHubRepoAction } from './repo-action';
export { GitignoreEditAction } from './gitignore-edit-action';
export { GitHubLabelListAction } from './label-list-action';
export { GitHubLabelCreateAction } from './label-create-action';
export { GitHubLabelEditAction } from './label-edit-action';

/**
 * Configuration Interfaces
 */
export type {
  GitHubIssueCreateConfig,
  GitHubIssueCommentConfig,
  GitHubPRCreateConfig,
  GitHubPRCommentConfig,
  GitHubRepoConfig,
  GitignoreEditConfig,
  GitHubLabelListConfig,
  GitHubLabelCreateConfig,
  GitHubLabelEditConfig,
} from './types';

/**
 * Result Interfaces
 */
export type {
  GitHubIssueResult,
  GitHubPRResult,
  GitHubRepoResult,
  GitignoreEditResult,
  GitHubLabelResult,
} from './types';

/**
 * Data Type Interfaces
 */
export type {
  IssueData,
  PRData,
  CommentData,
  RepoData,
  LabelData,
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
