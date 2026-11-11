---
id: playbook-actions-git
title: Playbook Actions - Git
description: Git and GitHub action primitives — gitignore editing today; git CLI and GitHub repository/issue/pull-request automation across the feature.
dependencies:
  - playbook-definition
  - error-handling
  - playbook-actions-io
  - workflow-context
---

<!-- markdownlint-disable single-title -->

# Feature: Playbook Actions - Git

## Purpose

Playbooks need primitives for managing both local git state (gitignores today; git CLI operations like ls-files, rm --cached coming next) and remote GitHub state (repositories, issues, pull requests). This feature is the umbrella for the full git/GitHub ecosystem of playbook actions.

## Scenarios

### FR:common: Common Requirements for All GitHub Actions

Playbook author needs consistent behavior across all GitHub actions so that workflows interact with GitHub reliably and predictably.

- **FR:common.validation** (P2): All GitHub actions MUST validate configuration before execution
  - Missing required properties MUST throw CatalystError with code '{Action}ConfigInvalid'
  - Invalid property values MUST throw CatalystError with code '{Action}ConfigInvalid'
  - Provide clear guidance on what's required

- **FR:common.result-structure** (P1): All GitHub actions MUST return PlaybookActionResult with the following:
  > - @req FR:playbook-definition/types.action.interface
  - `code`: 'Success' if execution succeeded, error code otherwise
  - `message`: Human-readable execution status
  - `value`: Action-specific output (issue/PR/repository details)
  - `error`: CatalystError if execution failed, null otherwise

- **FR:common.template-interpolation** (P1): All GitHub actions MUST support `{{variable-name}}` template interpolation
  - Template engine performs interpolation BEFORE action execution
  - Actions receive config with variables already replaced

### FR:issues: Issue Management Actions

Playbook author needs to create GitHub issues and add comments from playbook workflows so that issue lifecycle can be managed programmatically.

- **FR:issues.create** (P1): System MUST provide `github-issue-create` action
  - Configuration interface:
    - `title` (string, required, primary): Issue title
    - `body` (string, optional): Issue body in markdown format
    - `labels` (string[], optional): Array of label names to apply
    - `assignees` (string[], optional): Array of GitHub usernames to assign
    - `repository` (string, optional): Repository in 'owner/repo' format (defaults to current repository)
  - Result value:
    - `number` (number): Issue number
    - `url` (string): Issue URL
    - `title` (string): Issue title
    - `state` (string): Issue state ('open' or 'closed')

- **FR:issues.comment** (P1): System MUST provide `github-issue-comment` action
  - Configuration interface:
    - `issue` (number | string, required, primary): Issue number
    - `body` (string, required): Comment body in markdown format
    - `repository` (string, optional): Repository in 'owner/repo' format (defaults to current repository)
  - Result value:
    - `id` (number): Comment ID
    - `url` (string): Comment URL

### FR:pull-requests: Pull Request Actions

Playbook author needs to manage pull request lifecycle programmatically so that PR creation, updates, and comments can be automated within workflows.

- **FR:pull-requests.create** (P1): System MUST provide `github-pr-create` action
  - Configuration interface:
    - `title` (string, required, primary): Pull request title
    - `head` (string, required): Branch name containing changes
    - `base` (string, required): Target branch name to merge into
    - `body` (string, optional): Pull request body in markdown format
    - `draft` (boolean, optional): Create as draft PR (default: false)
    - `repository` (string, optional): Repository in 'owner/repo' format (defaults to current repository)
  - Result value:
    - `number` (number): Pull request number
    - `url` (string): Pull request URL
    - `title` (string): Pull request title
    - `state` (string): Pull request state ('open', 'closed', or 'merged')
    - `head` (string): Source branch name
    - `base` (string): Target branch name

- **FR:pull-requests.comment** (P1): System MUST provide `github-pr-comment` action
  - Configuration interface:
    - `pr` (number | string, required, primary): Pull request number
    - `body` (string, required): Comment body in markdown format
    - `repository` (string, optional): Repository in 'owner/repo' format (defaults to current repository)
  - Result value:
    - `id` (number): Comment ID
    - `url` (string): Comment URL

### FR:repository: Repository Query Actions

Playbook author needs repository queries for feature workflow automation so that workflows can make decisions based on repository information.

- **FR:repository.info** (P1): System MUST provide `github-repo` action
  - Configuration interface:
    - `repository` (string, optional, primary): Repository in 'owner/repo' format (defaults to current repository)
  - Result value:
    - `owner` (string): Repository owner
    - `name` (string): Repository name
    - `defaultBranch` (string): Default branch name
    - `visibility` (string): Repository visibility ('public' or 'private')
    - `url` (string): Repository URL

### FR:labels: Label Management Actions

Playbook author needs to read and change repository labels so that playbooks can keep a repository's labels in sync without a bash shell.

- **FR:labels.list** (P1): Git action library MUST provide `github-label-list` action returning every label with its usage
  - Configuration interface:
    - `repository` (string, optional, primary): Repository in 'owner/repo' format (defaults to current repository)
  - Result value: array of labels, each with:
    - `name` (string): Label name
    - `color` (string): Hex color without `#`
    - `description` (string): Label description (empty when unset)
    - `usage` (number): Count of issues plus pull requests carrying the label
  - **FR:labels.list.paginate** (P1): Action MUST page through every label, not just the first page
- **FR:labels.create** (P1): Git action library MUST provide `github-label-create` action
  - Configuration interface:
    - `name` (string, required, primary): Label name
    - `color` (string, optional): Hex color, with or without `#`
    - `description` (string, optional): Label description
    - `repository` (string, optional): Repository in 'owner/repo' format (defaults to current repository)
  - Result value: `name`, `color`, `description`
- **FR:labels.edit** (P1): Git action library MUST provide `github-label-edit` action that changes a label in place, so issues and pull requests keep it
  - Configuration interface:
    - `name` (string, required, primary): Current label name
    - `newName` (string, optional): New label name
    - `color` (string, optional): Hex color, with or without `#`
    - `description` (string, optional): Label description
    - `repository` (string, optional): Repository in 'owner/repo' format (defaults to current repository)
  - Result value: `name` (after any rename), `color`, `description`
- **FR:labels.delete** (P1): Git action library MUST provide `github-label-delete` action that deletes a label without prompting
  - Configuration interface:
    - `name` (string, required, primary): Label name
    - `repository` (string, optional): Repository in 'owner/repo' format (defaults to current repository)
  - Result value: `name`
- **FR:labels.no-shell** (P1): Label actions MUST run `gh` without a shell, so they work on Windows without bash

### FR:github-pr-get: Pull Request Read

Playbook author needs a pull request's live state from its number alone so that a playbook can decide what to do without extra API calls.

- **FR:github-pr-get.@action** (P1): Interface: `github-pr-get`
- **FR:github-pr-get.input** (P1):
  - PR (number) — Required. PR number; primary property
  - Repository (string?) — Repository in 'owner/repo' format; defaults to the current repository
- **FR:github-pr-get.paginate** (P1): Action MUST page through every review thread, comment, and changed file, not just the first page
- **FR:github-pr-get.derived** (P1): Action MUST return each fact a playbook branches on as a separate field
  - **FR:github-pr-get.approved** (P1): Action MUST report a PR as approved when a human reviewer's latest review approves it and no reviewer's latest review requests changes
    - **FR:github-pr-get.approved.any-commit** (P1): Action MUST count an approval whatever commit it was given on, since GitHub dismisses stale approvals when the repository asks it to
  - **FR:github-pr-get.checks-passed** (P1): Action MUST report checks as passed when every check on the head commit passed or was skipped
  - **FR:github-pr-get.code-owner-approved** (P1): Action MUST report code-owner approval as given when, for each changed file that a user in `CODEOWNERS` owns, one of that file's owners approved the PR
  - **FR:github-pr-get.changes-requested** (P1): Action MUST report changes as requested when any reviewer's latest review requests changes
  - **FR:github-pr-get.awaiting-author** (P1): Action MUST count an unresolved thread as waiting on the author when its last comment isn't the author's, every comment is the author's, or its last comment carries 🧭
    - **FR:github-pr-get.awaiting-author.partial** (P1): Action MUST NOT treat a thread as the author's alone when it has more comments than the action read
  - **FR:github-pr-get.pending-code-owners** (P1): Action MUST report as pending every code owner, other than the author, whose latest review doesn't approve
- **FR:github-pr-get.no-shell** (P1): Action MUST run `gh` without a shell, for cross-platform support
- **FR:github-pr-get.output** (P1): Pull request (@req FR:$pull-request)

### FR:github-pr-edit: Pull Request Edit

Playbook author needs to change any editable property of a pull request so that a playbook can keep a PR in the state it wants.

- **FR:github-pr-edit.@action** (P1): Interface: `github-pr-edit`
- **FR:github-pr-edit.input** (P1):
  - PR (number) — Required. PR number; primary property
  - Title (string?), Body (string?), Base (string?) — New values
  - Milestone (string?) — Milestone title to set; Remove-Milestone (bool?) clears it
  - Assignees (string[]?) — Exact assignee list; unset leaves the assignees as they are
  - Add-Labels, Remove-Labels, Add-Assignees, Remove-Assignees, Add-Reviewers, Remove-Reviewers, Add-Projects, Remove-Projects (string[]?)
  - Repository (string?) — Repository in 'owner/repo' format; defaults to the current repository
- **FR:github-pr-edit.assignees** (P1): Action MUST add and remove assignees so the PR's assignees match Assignees exactly
- **FR:github-pr-edit.idempotent** (P1): Action MUST change only the properties, labels, and assignees that differ from the PR's current state
- **FR:github-pr-edit.no-shell** (P1): Action MUST run `gh` without a shell, for cross-platform support
- **FR:github-pr-edit.output** (P1): Pull request (@req FR:$pull-request)

### FR:github-pr-merge: Pull Request Merge

Playbook author needs to merge a pull request from its number alone, under the standard GitHub merge rules, so that a playbook can merge without re-implementing those rules.

- **FR:github-pr-merge.@action** (P1): Interface: `github-pr-merge`
- **FR:github-pr-merge.input** (P1):
  - PR (number) — Required. PR number; primary property
  - Method (string?) — `squash`, `merge`, or `rebase`; defaults to `squash`
  - SHA (string?) — Head commit the caller expects; the merge is refused when the PR head differs
  - Delete-Branch (bool?) — Delete the head branch after the merge; defaults to the repository's setting
  - Trailers (string[]?) — Git trailer lines for the merge commit, such as `Co-authored-by: Name <email>`
  - Repository (string?) — Repository in 'owner/repo' format; defaults to the current repository
- **FR:github-pr-merge.gates** (P1): Action MUST refuse the merge unless every standard merge rule holds
  - **FR:github-pr-merge.gates.open** (P1): Action MUST refuse a PR that is closed, merged, or a draft
  - **FR:github-pr-merge.gates.checks** (P1): Action MUST refuse a PR unless every check passes or is skipped
  - **FR:github-pr-merge.gates.code-owners** (P1): Action MUST refuse a PR without code-owner approval
    > - @req FR:github-pr-get.code-owner-approved
  - **FR:github-pr-merge.gates.changes-requested** (P1): Action MUST refuse a PR when a reviewer's latest review requests changes
    > - @req FR:github-pr-get.changes-requested
  - **FR:github-pr-merge.gates.threads** (P1): Action MUST refuse a PR with an unresolved review thread
  - **FR:github-pr-merge.gates.merge-state** (P1): Action MUST refuse a PR whose merge state isn't clean: in conflict, behind the base, or blocked
- **FR:github-pr-merge.head-sha** (P1): Action MUST merge only the head commit it read, failing the merge if a push lands in between
- **FR:github-pr-merge.delete-branch** (P2): Action MUST leave head-branch deletion to the repository's setting unless Delete-Branch is set
- **FR:github-pr-merge.trailers** (P1): Action MUST write only trailers in the body of a squash or merge commit
  - **FR:github-pr-merge.trailers.catalyst** (P1): Action MUST include the Catalyst trailer
    > - @req FR:workflow-context/commit.trailer
  - **FR:github-pr-merge.trailers.authors** (P1): Action MUST include one `Co-authored-by` trailer per commit author and co-author of the PR
  - **FR:github-pr-merge.trailers.extra** (P2): Action MUST include the given Trailers
  - **FR:github-pr-merge.trailers.unique** (P2): Action MUST list each person once
- **FR:github-pr-merge.no-bypass** (P1): Action MUST NOT skip a merge rule, bypass branch protection, or use admin merge
- **FR:github-pr-merge.refused** (P1): Action MUST return a refused merge as `Merged: false` with its Code and Message, never throw
- **FR:github-pr-merge.no-shell** (P1): Action MUST run `gh` without a shell, for cross-platform support
- **FR:github-pr-merge.output** (P1): Merge result (@req FR:$pr-merge-result)

### FR:errors: Error Handling

Playbook author needs graceful failure handling and actionable error messages so that GitHub operation failures are diagnosable and recoverable.

- **FR:errors.graceful-failure** (P2): All GitHub actions MUST handle failures gracefully
  > - @req FR:error-handling/catalyst-error
  - Map underlying errors to playbook-specific CatalystError codes
  - Error codes MUST follow pattern: `{Action}{ErrorType}`
  - Examples: `GitHubIssueCreateAuthenticationFailed`, `GitHubPRCreateNotFound`

- **FR:errors.actionable-messages** (P2): All error messages MUST include actionable guidance
  - Authentication errors: Provide steps to authenticate with GitHub CLI
  - Not found errors: Explain what resource wasn't found
  - Permission errors: Explain required permissions
  - Network errors: Suggest checking connectivity

- **FR:errors.access-validation** (P2): System MUST validate GitHub access before operations
  - Check authentication status before operations
  - Provide clear guidance if not authenticated or access denied

### FR:gitignore-edit: Gitignore Section Editing

Playbook author needs to add or remove patterns within a named section of a `.gitignore` file so that workflows can manage groups of related patterns (build outputs, generated artifacts, IDE caches) without disturbing other sections or duplicating entries.

- **FR:gitignore-edit.@action** (P1): Interface: `gitignore-edit`
- **FR:gitignore-edit.input** (P1):
  - Path (string) — Target `.gitignore` file path; supports template interpolation; primary property
  - Header (string) — Required. Section header (without leading `#`) under which the action's add/remove operations apply
  - Add (string[]?) — Patterns the section MUST contain
  - Remove (string[]?) — Patterns the section MUST NOT contain
- **FR:gitignore-edit.section-model** (P1): A section starts at `# {Header}` (case-insensitive match against the header text after `#`) and ends at the first of: next `#` comment line, blank line, or EOF
  - Lines inside the section between the header and the terminator are the section's patterns
  - Removing all patterns from a section MUST also delete the header line
- **FR:gitignore-edit.add** (P1): For each pattern in Add not already present in the matched section, append the pattern to the section. Atomic write is inherited from file-write.
  > - @req FR:playbook-actions-io/file.write-action.atomic-write
  - If the section does not exist, create it: write `# {Header}\n` followed by each Add pattern on its own line
  - If file does not exist, create it with the new section as its only contents
- **FR:gitignore-edit.remove** (P1): For each pattern in Remove present in the matched section, delete the matching line from the section
  - Removing a pattern that is NOT present in the section MUST be a no-op (idempotent)
  - When the section becomes empty as a result, delete the header line as well
- **FR:gitignore-edit.idempotent** (P1): When no Add patterns are missing AND no Remove patterns are present, the action MUST be a no-op (no write, file unchanged)
- **FR:gitignore-edit.errors** (P2): Action MUST surface failures via CatalystError. File-write error mapping is inherited from file-write.
  > - @req FR:error-handling/catalyst-error
  > - @req FR:playbook-actions-io/file.write-action.error-handling
  - File-write errors (FilePermissionDenied, FileInvalidPath, FileDiskFull) propagate as-is
  - Missing Path → `GitignoreEditConfigInvalid`
  - Missing Header → `GitignoreEditConfigInvalid`
  - Both Add and Remove missing/empty → `GitignoreEditConfigInvalid`
- **FR:gitignore-edit.output** (P1): Object with Path (string), Bytes-Written (number, 0 when no-op), Changed (bool — `true` if file was written, `false` if no-op)

### Non-functional Requirements

**NFR:performance**: Performance

- **NFR:performance.validation-speed**: Action configuration validation MUST complete in <10ms
- **NFR:performance.operation-speed**: GitHub operations SHOULD complete within 5 seconds under normal conditions
- **NFR:performance.timeouts**: System MUST enforce reasonable timeouts to prevent hanging

**NFR:reliability**: Reliability

- **NFR:reliability.no-token-leakage**: GitHub actions MUST NOT leak sensitive data (tokens) in error messages
- **NFR:reliability.actionable-errors**: Error messages MUST include actionable guidance for all error scenarios
- **NFR:reliability.resource-cleanup**: System MUST properly clean up resources on failure

**NFR:security**: Security

- **NFR:security.no-token-logging**: System MUST never log or expose authentication tokens
- **NFR:security.input-validation**: System MUST validate all user inputs before execution
- **NFR:security.no-sensitive-errors**: Error messages MUST NOT include sensitive information

## Data Model

- **FR:$pull-request** (P1): **`PRSnapshot`** — A pull request's live state, read by `github-pr-get` and returned by `github-pr-edit`
  - `number` (int), `title` (string), `url` (string), `author` (string) — Author login
  - `isDraft` (bool)
  - `state` (string)
    - Allowed: `OPEN`, `CLOSED`, `MERGED`
  - `headSha` (string), `headRef` (string), `baseRef` (string)
  - `labels` (string[]), `assignees` (string[])
  - `reviews` ({ `author` (string), `state` (string), `bot` (bool) }[]) — Latest review per reviewer
  - `checks` ({ `name` (string), `state` (string) }[]) — Latest run per check
    - Allowed state: `pass`, `fail`, `pending`, `skip`
  - `threads` ({ `resolved` (bool), `comments` ({ `author` (string), `body` (string) }[]) }[]) — Every review thread
  - `changedFiles` (string[])
  - `codeOwners` (string[]) — Users who own the changed files, per `CODEOWNERS`; teams are left out
  - `codeOwned` (bool) — `true` when `CODEOWNERS` covers a changed file
  - `mergeable` (string), `mergeStateStatus` (string) — As GitHub reports them
  - `approved` (bool) — Per FR:github-pr-get.approved
  - `pendingCodeOwners` (string[]) — Per FR:github-pr-get.pending-code-owners
  - `checksFailed` (bool) — A check on the head commit failed
  - `checksPassed` (bool) — Per FR:github-pr-get.checks-passed
  - `changesRequested` (bool) — Per FR:github-pr-get.changes-requested
  - `codeOwnerApproved` (bool) — Per FR:github-pr-get.code-owner-approved
  - `threadsUnresolved` (int)
  - `threadsAwaitingAuthor` (int) — Per FR:github-pr-get.awaiting-author
  - `viewer` (string) — Signed-in GitHub user login
  - `authoredByViewer` (bool) — The signed-in user authored the PR, ignoring case

- **FR:$pr-merge-result** (P1): **`PRMergeResult`** — The outcome of `github-pr-merge`
  - `merged` (bool)
  - `code` (string?) — Why the merge was refused; set only when not merged
    - Allowed: `PullRequestNotOpen`, `PullRequestDraft`, `ChecksNotPassing`, `CodeOwnerApprovalMissing`, `ThreadsUnresolved`, `MergeStateNotClean`, `HeadCommitChanged`, `MergeFailed`
  - `message` (string?) — Friendly explanation; set only when not merged

## Architecture Constraints

None

## External Dependencies

- **Node.js >= 18**: Runtime environment
- **GitHub API access**: Authentication and network connectivity to GitHub
