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
// @req FR:playbook-actions-git/labels.delete
// @req FR:playbook-actions-git/pr-lifecycle.get
// @req FR:playbook-actions-git/pr-lifecycle.plan
// @req FR:playbook-actions-git/pr-lifecycle.edit
// @req FR:playbook-actions-git/pr-lifecycle.merge

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
export { GitHubLabelDeleteAction } from './label-delete-action';
export { GitHubPRGetAction } from './pr-get-action';
export { GitHubPRPlanAction } from './pr-plan-action';
export { GitHubPREditAction } from './pr-edit-action';
export { GitHubPRMergeAction } from './pr-merge-action';

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
  GitHubLabelDeleteConfig,
  GitHubPRGetConfig,
  GitHubPRPlanConfig,
  GitHubPREditConfig,
  GitHubPRMergeConfig,
  PRSnapshot,
  PRPlan,
  LabelConfig,
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
