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
 * Live state of a pull request
 * @req FR:playbook-actions-git/$pull-request
 */
export interface PRSnapshot {
  number: number;
  title: string;
  url: string;
  author: string;
  isDraft: boolean;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  headSha: string;
  headRef: string;
  baseRef: string;
  labels: string[];
  assignees: string[];
  /** Latest review per reviewer */
  reviews: { author: string; state: string; bot: boolean }[];
  /** Latest run per check: pass, fail, pending, or skip (skipped/cancelled) */
  checks: { name: string; state: 'pass' | 'fail' | 'pending' | 'skip' }[];
  threads: { resolved: boolean; comments: { author: string; body: string }[] }[];
  changedFiles: string[];
  /** Users who own the changed files, per CODEOWNERS; teams are left out */
  codeOwners: string[];
  /** True when CODEOWNERS covers a changed file */
  codeOwned: boolean;
  mergeable: string;
  mergeStateStatus: string;
  /** GitHub's review decision; empty when the repository sets no review rule */
  reviewDecision: string;
  /** Approvals meet the repository's review rules; with none, a human approved and no one requested changes */
  approved: boolean;
  /** The repository's rules for the base branch require a review */
  reviewRequired: boolean;
  /** Code owners whose latest review doesn't approve */
  pendingCodeOwners: string[];
  /** A reviewer's latest review requests changes */
  changesRequested: boolean;
  /** Every changed file that a user in CODEOWNERS owns has an owner who approved */
  codeOwnerApproved: boolean;
  /** A check on the head commit failed */
  checksFailed: boolean;
  /** Every check on the head commit passed or was skipped */
  checksPassed: boolean;
  /** Unresolved review threads */
  threadsUnresolved: number;
  /** Unresolved threads waiting on the author: the last comment isn't the author's, every comment is, or the last carries 🧭 */
  threadsAwaitingAuthor: number;
  /** Signed-in GitHub user login */
  viewer: string;
  /** The signed-in user authored the PR, ignoring case */
  authoredByViewer: boolean;
  /** The author's latest `#autopilot` line in a review or PR comment, or null */
  autopilotRequest: { url: string; at: string } | null;
  /** When each label was last removed, by label name */
  labelsRemovedAt: Record<string, string>;
}

/** Configuration for reading a pull request */
export interface GitHubPRGetConfig {
  /** PR number (primary) */
  pr: number;
  repository?: string;
}

/** Configuration for editing a pull request */
export interface GitHubPREditConfig {
  /** PR number (primary) */
  pr: number;
  title?: string;
  body?: string;
  base?: string;
  /** Milestone title to set */
  milestone?: string;
  removeMilestone?: boolean;
  addLabels?: (string | null)[];
  removeLabels?: (string | null)[];
  /** Exact assignee list; the action adds and removes assignees to match */
  assignees?: (string | null)[] | null;
  addAssignees?: (string | null)[];
  removeAssignees?: (string | null)[];
  addReviewers?: (string | null)[];
  removeReviewers?: (string | null)[];
  addProjects?: (string | null)[];
  removeProjects?: (string | null)[];
  repository?: string;
}

/** Configuration for merging a pull request */
export interface GitHubPRMergeConfig {
  /** PR number (primary) */
  pr: number;
  /** Merge method; defaults to squash */
  method?: 'squash' | 'merge' | 'rebase';
  /** Head commit the caller expects; the merge is refused when the PR head differs */
  sha?: string;
  /** Delete the head branch after the merge; unset leaves it to the repository's setting */
  deleteBranch?: boolean;
  /** Git trailer lines to add to the merge commit, after the PR commits' co-authors */
  trailers?: string[];
  repository?: string;
}

/**
 * Result of a merge attempt
 * @req FR:playbook-actions-git/$pr-merge-result
 */
export interface PRMergeResult {
  merged: boolean;
  /** Why the merge was refused, when it was */
  code?: string;
  /** Friendly explanation of the refusal */
  message?: string;
}
