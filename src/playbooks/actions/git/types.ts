/**
 * Type definitions for GitHub resources and configurations
 * @module playbooks/actions/git/types
 */

// @req FR:playbook-actions-git/common.result-structure
// @req FR:playbook-actions-git/issues.create
// @req FR:playbook-actions-git/issues.comment
// @req FR:playbook-actions-git/pull-requests.create
// @req FR:playbook-actions-git/pull-requests.comment
// @req FR:playbook-actions-git/repository.info

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


/**
 * Configuration for gitignore-edit action
 * @req FR:playbook-actions-git/gitignore-edit.@action
 * @req FR:playbook-actions-git/gitignore-edit.input
 */
export interface GitignoreEditConfig {
  /** Target `.gitignore` file path (supports template interpolation) */
  path: string;

  /** Section header (without leading `#`) under which add/remove apply */
  header: string;

  /** Patterns the section MUST contain */
  add?: string[];

  /** Patterns the section MUST NOT contain */
  remove?: string[];
}

/**
 * Gitignore-edit result structure included in action result value
 * @req FR:playbook-actions-git/gitignore-edit.output
 */
export interface GitignoreEditResult {
  /** Path where file was written (or would have been) */
  path: string;

  /** Number of bytes written (0 when no-op) */
  bytesWritten: number;

  /** `true` if file was written, `false` if no-op */
  changed: boolean;
}

/**
 * Repository label with how many issues and pull requests carry it
 * @req FR:playbook-actions-git/labels.list
 */
export interface LabelData {
  /** Label name */
  name: string;
  /** Hex color without `#` */
  color: string;
  /** Label description (empty when unset) */
  description: string;
  /** Issues plus pull requests carrying the label */
  usage: number;
}

/**
 * Configuration for listing repository labels
 * @req FR:playbook-actions-git/labels.list
 */
export interface GitHubLabelListConfig {
  /** Repository (owner/repo format, defaults to current repository) (primary) */
  repository?: string;
}

/**
 * Configuration for creating a label
 * @req FR:playbook-actions-git/labels.create
 */
export interface GitHubLabelCreateConfig {
  /** Label name (primary) */
  name: string;
  /** Hex color, with or without `#` */
  color?: string;
  /** Label description */
  description?: string;
  /** Target repository (owner/repo format, defaults to current repository) */
  repository?: string;
}

/**
 * Configuration for editing a label in place
 * @req FR:playbook-actions-git/labels.edit
 */
export interface GitHubLabelEditConfig {
  /** Current label name (primary) */
  name: string;
  /** New label name */
  newName?: string;
  /** Hex color, with or without `#` */
  color?: string;
  /** Label description */
  description?: string;
  /** Target repository (owner/repo format, defaults to current repository) */
  repository?: string;
}

/**
 * Configuration for deleting a label
 * @req FR:playbook-actions-git/labels.delete
 */
export interface GitHubLabelDeleteConfig {
  /** Label name (primary) */
  name: string;
  /** Target repository (owner/repo format, defaults to current repository) */
  repository?: string;
}

/**
 * Result for label create and edit operations
 * @req FR:playbook-actions-git/labels.create
 * @req FR:playbook-actions-git/labels.edit
 */
export interface GitHubLabelResult {
  /** Label name (after any rename) */
  name: string;
  /** Hex color without `#` */
  color?: string;
  /** Label description */
  description?: string;
}

/**
 * Label naming config (`labels` in `.xe/config/catalyst.json`)
 * @req FR:playbook-actions-git/pr-lifecycle.plan
 */
export interface LabelConfig {
  style?: 'simple' | 'standard' | string;
  names?: Record<string, string>;
}

/**
 * Live state of a pull request
 * @req FR:playbook-actions-git/pr-lifecycle.get
 */
export interface PRSnapshot {
  author: string;
  isDraft: boolean;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  headSha: string;
  baseRef?: string;
  labels: string[];
  assignees: string[];
  /** Latest review per reviewer */
  reviews: { author: string; state: string; bot: boolean }[];
  /** Latest run per check: pass, fail, pending, or skip (skipped/cancelled) */
  checks: { name: string; state: 'pass' | 'fail' | 'pending' | 'skip' }[];
  threads: { resolved: boolean; comments: { author: string; body: string }[] }[];
  changedFiles: string[];
  /** Users who own the changed files, per CODEOWNERS */
  codeOwners: string[];
  /** True when CODEOWNERS covers a changed file */
  signOffRequired: boolean;
  /** SHA on the `☑️ Finalized at {sha}` comment */
  certifiedSha?: string;
  mergeable?: string;
}

/** @req FR:playbook-actions-git/pr-lifecycle.get */
export interface GitHubPRGetConfig {
  /** PR number (primary) */
  pr: number;
  repository?: string;
}

/** @req FR:playbook-actions-git/pr-lifecycle.plan */
export interface GitHubPRPlanConfig {
  /** Result of github-pr-get (primary) */
  snapshot: PRSnapshot;
  labels?: LabelConfig;
  /** Label names that exist in the repository */
  present?: string[];
}

/** @req FR:playbook-actions-git/pr-lifecycle.plan */
export interface PRPlan {
  addLabels: string[];
  removeLabels: string[];
  addAssignees: string[];
  removeAssignees: string[];
  merge: boolean;
  reason?: string;
}

/** @req FR:playbook-actions-git/pr-lifecycle.edit */
export interface GitHubPREditConfig {
  /** PR number (primary) */
  pr: number;
  addLabels?: string[];
  removeLabels?: string[];
  addAssignees?: string[];
  removeAssignees?: string[];
  repository?: string;
}

/** @req FR:playbook-actions-git/pr-lifecycle.merge */
export interface GitHubPRMergeConfig {
  /** PR number (primary) */
  pr: number;
  /** Head commit to merge */
  sha: string;
  repository?: string;
}
