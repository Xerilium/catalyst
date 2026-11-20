---
id: playbook-actions-git
title: Playbook Actions - Git
description: Git and GitHub action primitives — gitignore editing today; git CLI and GitHub repository/issue/pull-request automation across the feature.
dependencies:
  - config-settings
  - error-handling
  - github-provider
  - playbook-actions-io
  - playbook-definition
  - repo-labels
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
- **FR:github-pr-get.@json** (P2): Interface: `.xe/config/catalyst.json`, keys `pull-requests.long-lived-branches` (string[]) and `pull-requests.reconcile.skip-checks` (string[])
  > - @req FR:config-settings/catalog.file.long-lived-branches
  > - @req FR:config-settings/catalog.file.skip-checks
- **FR:github-pr-get.input** (P1):
  - PR (number) — Required. PR number; primary property
  - Skip-Checks (string[]? or comma-separated string?) — Names of checks to ignore
  - Repository (string?) — Repository in 'owner/repo' format; defaults to the current repository
- **FR:github-pr-get.paginate** (P1): Action MUST page through every review thread, comment, and changed file, not just the first page
- **FR:github-pr-get.derived** (P1): Action MUST return each fact a playbook branches on as a separate field
  - **FR:github-pr-get.approved** (P1): Action MUST report a PR as approved when GitHub says its approvals meet the base branch's review rules
    - Review rules set how many approvals and code-owner approvals a PR needs
    - **FR:github-pr-get.approved.default** (P1): Action MUST report a PR with no review rule as approved when a human approves and no reviewer requests changes
    - **FR:github-pr-get.approved.any-commit** (P1): Action MUST count an approval given on any commit
      - GitHub dismisses stale approvals when the repository asks it to
  - **FR:github-pr-get.review-required** (P1): Action MUST report whether the repository's rules for the base branch require a review
  - **FR:github-pr-get.checks-passed** (P1): Action MUST report checks as passed when every check on the head commit passed or was skipped
    - **FR:github-pr-get.checks-passed.cancelled** (P1): Action MUST count a cancelled check as failed, as GitHub does for a required check
    - **FR:github-pr-get.checks-passed.none** (P1): Action MUST report checks as not passed when a PR workflow has no check on the head commit
      - A workflow runs on the PR when a `pull_request` or `pull_request_target` trigger matches its base branch and changed files, or a `push` trigger matches its head branch
    - **FR:github-pr-get.checks-passed.none.unreadable** (P1): Action MUST report checks as not passed when the head has no check and a workflow is unreadable
    - **FR:github-pr-get.checks-passed.none.dynamic** (P1): Action MUST consider only workflows with a file under `.github/workflows/`, since dynamic workflows (Dependabot, Copilot) have none
    - **FR:github-pr-get.checks-passed.none.types** (P1): Action MUST count a pull request trigger only when its activity types are unset or include `opened`, `synchronize`, or `reopened`
    - **FR:github-pr-get.checks-passed.workflow** (P1): Action MUST track each check by its workflow and job name
  - **FR:github-pr-get.code-owner-approved** (P1): Action MUST report code-owner approval when every changed file owned by a non-author user has an owner's approval
  - **FR:github-pr-get.changes-requested** (P1): Action MUST report changes as requested when any reviewer's latest review requests changes
  - **FR:github-pr-get.awaiting-author** (P1): Action MUST count an unresolved thread as waiting on the author when its last comment isn't the author's
    - **FR:github-pr-get.awaiting-author.self** (P1): Action MUST count a thread with only the author's comments as waiting on the author
    - **FR:github-pr-get.awaiting-author.marker** (P1): Action MUST count a thread whose last comment carries 🧭 as waiting on the author
    - **FR:github-pr-get.awaiting-author.partial** (P1): Action MUST count a thread as having only the author's comments only when it read every comment in the thread
  - **FR:github-pr-get.pending-code-owners** (P1): Action MUST report as pending every code owner, other than the author, whose latest review doesn't approve
  - **FR:github-pr-get.owned-by-others** (P1): Action MUST report whether a changed file has an owner other than the PR author, ignoring case
    - A team or email owner is never the author
  - **FR:github-pr-get.code-owners** (P1): Action MUST report the same code owners for each changed file that GitHub would request a review from
    > - @req FR:github-provider/codeowners
    - **FR:github-pr-get.code-owners.read-error** (P1): Action MUST fail when `CODEOWNERS` can't be read for any reason other than not being found
  - **FR:github-pr-get.viewer** (P2): Action MUST report an empty signed-in user, not fail, when the token can't read it
    - App and `GITHUB_TOKEN` tokens can't read the user
  - **FR:github-pr-get.hash-commands** (P2): Action MUST report each user's latest comment for each hash command
    - A comment is a top-level comment, a submitted review, or an inline review comment
    - Inline review comments include file-level comments and thread replies
    - A hash command is a lowercase `#` hashtag on a line of its own, outside quotes and code, in a comment that isn't an agent's
    - **FR:github-pr-get.hash-commands.top-level** (P2): Action MUST count `#autopilot` only in a top-level comment or submitted review, never inline
    - **FR:github-pr-get.hash-commands.latest** (P2): Action MUST report the latest comment from anyone for each hash command
  - **FR:github-pr-get.author-commented** (P2): Action MUST report when the author last posted a top-level comment, submitted a review, or replied in the inline thread of the latest `#needs-info` command
  - **FR:github-pr-get.labels-removed** (P2): Action MUST report when each label was last removed
  - **FR:github-pr-get.ready-at** (P2): Action MUST report when the PR was last marked ready for review
  - **FR:github-pr-get.head-long-lived** (P2): Action MUST report whether the head branch is long-lived
  - **FR:github-pr-get.base-gone** (P2): Action MUST report the base branch as gone when it no longer exists and isn't long-lived
    - A long-lived branch is the repository's default branch or one listed in `pull-requests.long-lived-branches`
    > - @req FR:github-pr-get.@json
    - **FR:github-pr-get.base-gone.unread** (P2): Action MUST report the base branch as present when it can't tell whether the branch exists
    - **FR:github-pr-get.base-gone.config** (P2): Action MUST read the settings of a deleted base branch from the branch's last commit
  - **FR:github-pr-get.same-repository** (P2): Action MUST report whether the head branch is in the PR's own repository
  - **FR:github-pr-get.skip-checks** (P2): Action MUST leave out of every check fact a check named in Skip-Checks or in `pull-requests.reconcile.skip-checks`
    > - @req FR:github-pr-get.@json
    - **FR:github-pr-get.skip-checks.no-steps** (P2): Action MUST also leave out a failed GitHub Actions job that ran no steps
    - **FR:github-pr-get.skip-checks.report** (P2): Action MUST report the name of each check it leaves out
    - **FR:github-pr-get.skip-checks.config** (P2): Action MUST read both settings from the PR's base branch, never its head
      > - @req FR:github-pr-get.@json
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
  - Dry-Run (bool?) — Report the changes without making them; defaults to `false`
  - Repository (string?) — Repository in 'owner/repo' format; defaults to the current repository
- **FR:github-pr-edit.dry-run** (P2): Action MUST return each change it would make as `changes`, instead of making it, when Dry-Run is set
  - **FR:github-pr-edit.dry-run.projected** (P2): Action MUST return the labels and assignees as the edit would leave them when Dry-Run is set
- **FR:github-pr-edit.assignees** (P1): Action MUST add and remove assignees until the PR's assignees match Assignees exactly
- **FR:github-pr-edit.idempotent** (P1): Action MUST change only the properties, labels, and assignees that differ from the PR's current state
- **FR:github-pr-edit.no-shell** (P1): Action MUST run `gh` without a shell, for cross-platform support
- **FR:github-pr-edit.output** (P1): Pull request (@req FR:$pull-request), with `changes` (string) set only on a dry run

### FR:github-pr-merge: Pull Request Merge

Playbook author needs to merge a pull request from its number alone, under the standard GitHub merge rules, so that a playbook can merge without re-implementing those rules.

- **FR:github-pr-merge.@action** (P1): Interface: `github-pr-merge`
- **FR:github-pr-merge.input** (P1):
  - PR (number) — Required. PR number; primary property
  - Method (string?) — `squash`, `merge`, or `rebase`; defaults to `squash`
  - SHA (string?) — Head commit the caller expects; the merge is refused when the PR head differs
  - Delete-Branch (bool?) — Delete the head branch after the merge; defaults to the repository's setting
  - Code-Owner-Waived (bool?) — Skip the code-owner rule; set only by a caller that applied an approval waiver
  - Trailers (string[]?) — Git trailer lines for the merge commit, such as `Co-authored-by: Name <email>`
  - Hold-Labels (string[]?) — Labels that stop the merge; checked on every attempt
  - Retries (number?) — Most attempts, first included; defaults to `3`
  - Retry-Delay-Seconds (number?) — Wait between attempts; defaults to `5`
  - Dry-Run (bool?) — Report whether the PR would merge without merging it; defaults to `false`
  - Skip-Checks (string[]? or comma-separated string?) — Names of checks to ignore
  - Repository (string?) — Repository in 'owner/repo' format; defaults to the current repository
- **FR:github-pr-merge.gates** (P1): Action MUST refuse the merge unless every standard merge rule holds
  - **FR:github-pr-merge.gates.open** (P1): Action MUST refuse a PR that isn't open
  - **FR:github-pr-merge.gates.draft** (P1): Action MUST refuse a draft PR
  - **FR:github-pr-merge.gates.checks** (P1): Action MUST refuse a PR unless every check passes or is skipped
  - **FR:github-pr-merge.gates.code-owners** (P1): Action MUST refuse a PR without code-owner approval when code owners are configured for files changed in the PR
    > - @req FR:github-pr-get.code-owner-approved
  - **FR:github-pr-merge.gates.changes-requested** (P1): Action MUST refuse a PR when a reviewer's latest review requests changes
    > - @req FR:github-pr-get.changes-requested
  - **FR:github-pr-merge.gates.threads** (P1): Action MUST refuse a PR with an unresolved review thread
  - **FR:github-pr-merge.gates.merge-state** (P1): Action MUST refuse a PR unless GitHub reports its merge state as `CLEAN`, `HAS_HOOKS`, or `UNSTABLE`
    - A PR that conflicts with its base is `DIRTY`
- **FR:github-pr-merge.head-sha** (P1): Action MUST merge only the head commit it read, failing the merge if a push lands in between
- **FR:github-pr-merge.delete-branch** (P2): Action MUST leave head-branch deletion to the repository's setting unless Delete-Branch is set
- **FR:github-pr-merge.trailers** (P1): Action MUST write only trailers in the body of a squash or merge commit
  - **FR:github-pr-merge.trailers.catalyst** (P1): Action MUST include the Catalyst trailer
    > - @req FR:workflow-context/commit.trailer
  - **FR:github-pr-merge.trailers.authors** (P1): Action MUST include one `Co-authored-by` trailer per commit author and co-author of the PR
  - **FR:github-pr-merge.trailers.extra** (P2): Action MUST include the given Trailers
  - **FR:github-pr-merge.trailers.unique** (P2): Action MUST list each person once
- **FR:github-pr-merge.hold-labels** (P1): Action MUST refuse a PR that has any of the Hold-Labels
  > - @req FR:repo-labels/catalog.paused
  > - @req FR:repo-labels/catalog.wip
- **FR:github-pr-merge.retry** (P1): Action MUST try again, up to Retries attempts, when GitHub hasn't settled or the base branch moved
  - **FR:github-pr-merge.retry.unknown** (P1): Action MUST retry when GitHub reports the merge state as `UNKNOWN`
  - **FR:github-pr-merge.retry.server** (P1): Action MUST retry when `gh` reports an HTTP 5xx status
  - **FR:github-pr-merge.retry.base-race** (P1): Action MUST retry when GitHub says the base branch was modified
  - **FR:github-pr-merge.retry.conflict** (P1): Action MUST report an HTTP 409 as a failed merge without another attempt
  - **FR:github-pr-merge.retry.recheck** (P1): Action MUST read the PR again and apply every merge rule and Hold-Label before each attempt
  - **FR:github-pr-merge.retry.read** (P1): Action MUST retry a failed PR read when the failure is one it retries for a merge
- **FR:github-pr-merge.already-merged** (P1): Action MUST report a PR that is already merged as merged
- **FR:github-pr-merge.dry-run** (P2): Action MUST return `PullRequestWouldMerge`, instead of merging, when Dry-Run is set and every rule holds
- **FR:github-pr-merge.skip-checks** (P2): Action MUST ignore the checks named in Skip-Checks on every read of the PR
  > - @req FR:github-pr-get.skip-checks
- **FR:github-pr-merge.no-bypass** (P1): Action MUST NOT skip a merge rule, bypass branch protection, or use admin merge
- **FR:github-pr-merge.refused** (P1): Action MUST return a refused merge as `Merged: false` with its Code and Message, never throw
- **FR:github-pr-merge.no-shell** (P1): Action MUST run `gh` without a shell, for cross-platform support
- **FR:github-pr-merge.output** (P1): Merge result (@req FR:$pr-merge-result)

### FR:github-pr-list: Pull Request List

Playbook author needs the open pull requests of a repository, or the one for the current branch, so that a playbook can act on several PRs or find its own.

- **FR:github-pr-list.@action** (P1): Interface: `github-pr-list`
- **FR:github-pr-list.input** (P1):
  - State (string?) — `open`, `closed`, or `all`; defaults to `open`
  - Base (string?) — Only PRs into this branch
  - Head (string?) — Only PRs from this branch
  - Current-Branch (bool?) — Only the PR for the checked-out branch; defaults to `false`
  - Repository (string?) — Repository in 'owner/repo' format; defaults to the current repository
- **FR:github-pr-list.paginate** (P1): Action MUST return every matching PR, not just the first page
- **FR:github-pr-list.current-branch** (P2): Action MUST return an empty list, not fail, when the checked-out branch has no PR
- **FR:github-pr-list.no-shell** (P1): Action MUST run `gh` without a shell, for cross-platform support
- **FR:github-pr-list.output** (P1): PRs (@req FR:$pr-list-item), oldest first

### FR:github-check-run: Check Run Write

Playbook author needs to publish a pass or fail result on a commit so that branch protection can require it.

- **FR:github-check-run.@action** (P1): Interface: `github-check-run`
- **FR:github-check-run.input** (P1):
  - Name (string) — Required. Check name; primary property
  - SHA (string) — Required. Commit to attach the check to
  - Conclusion (string) — Required. `success`, `failure`, or `neutral`
  - Title (string?), Summary (string?) — Shown on the check; Summary defaults to Title
  - Dry-Run (bool?) — Report the check without writing it; defaults to `false`
  - Repository (string?) — Repository in 'owner/repo' format; defaults to the current repository
- **FR:github-check-run.upsert** (P1): Action MUST update the commit's existing check run of that name instead of adding another
  - **FR:github-check-run.upsert.app** (P1): Action MUST update only a check run that GitHub Actions wrote
- **FR:github-check-run.idempotent** (P2): Action MUST skip the write when the existing check run's conclusion and summary already match
- **FR:github-check-run.dry-run** (P2): Action MUST report the check it would write, instead of writing it, when Dry-Run is set
- **FR:github-check-run.token** (P1): Action MUST run `gh` with `CATALYST_CHECKS_TOKEN` as its token when that variable is set
  > - @req FR:config-settings/catalog.env.checks-token
- **FR:github-check-run.no-shell** (P1): Action MUST run `gh` without a shell, for cross-platform support

### FR:github-pr-gates: Pull Request Merge Policy

Playbook author needs the Autopilot merge policy checked from a pull request's number alone, so that a playbook can hold a PR that breaks a policy gate the standard merge rules don't cover.

- **FR:github-pr-gates.@action** (P1): Interface: `github-pr-gates`
- **FR:github-pr-gates.input** (P1):
  - PR (number) — Required. PR number; primary property
  - Tests (bool?) — Run the repository's tests on the PR's head commit; defaults to `false`
  - Repository (string?) — Repository in 'owner/repo' format; defaults to the current repository
  - Snapshot (object?) — The PR as `github-pr-get` returns it
  - **FR:github-pr-gates.input.snapshot** (P2): Action MUST check the Snapshot it is given instead of reading the PR again
- **FR:github-pr-gates.order** (P1): Action MUST check the gates in the order below and stop at the first failure
- **FR:github-pr-gates.config** (P1): Action MUST read `pull-requests.merge` from `.xe/config/catalyst.json` on the PR's base branch, never its head
  - **FR:github-pr-gates.config.keys** (P1): Action MUST read `never` (string[]), `approval-waiver-days` (object of repository to days), and `strict-check` (bool)
    > - @req FR:config-settings/catalog.file.merge-never
    > - @req FR:config-settings/catalog.file.merge-waiver-days
    > - @req FR:config-settings/catalog.file.merge-strict-check
  - **FR:github-pr-gates.config.default** (P1): Action MUST treat a missing key as an empty list, an empty object, or `false`
  - **FR:github-pr-gates.config.match** (P2): Action MUST match each repository entry as `owner/repo`, where `*` stands for any owner or any repository
  - **FR:github-pr-gates.config.invalid** (P1): Action MUST fail the gates when the config exists but is not valid JSON
- **FR:github-pr-gates.excluded** (P1): Action MUST fail the gates for a repository on the never-merge list
- **FR:github-pr-gates.code-owners** (P1): Action MUST fail the gates without a human approval when anyone but the author owns a changed file
  > - @req FR:github-pr-get.owned-by-others
  - **FR:github-pr-gates.code-owners.author** (P1): Action MUST pass this gate when no changed file has an owner other than the author
  - **FR:github-pr-gates.code-owners.file** (P1): Action MUST also fail the gates when a changed file's owners did not approve
    > - @req FR:github-pr-get.code-owner-approved
- **FR:github-pr-gates.waiver** (P1): Action MUST skip both code-owner gates for a published PR in a waiver repository inactive for the listed days
  - **FR:github-pr-gates.waiver.activity** (P1): Action MUST count a commit, a review, or a comment by anyone but a bot as activity
    - **FR:github-pr-gates.waiver.activity.ready** (P1): Action MUST count marking the PR ready for review as activity
  - **FR:github-pr-gates.waiver.unread** (P1): Action MUST apply no waiver when it can't read the PR's activity
  - **FR:github-pr-gates.waiver.output** (P1): Action MUST report whether the waiver applied
- **FR:github-pr-gates.required-checks** (P1): Action MUST fail the gates when a required check is pending, failed, cancelled, or skipped
  - **FR:github-pr-gates.required-checks.source** (P1): Action MUST read the required checks from `gh pr checks --required`, never guess
  - **FR:github-pr-gates.required-checks.optional** (P2): Action MUST ignore a skipped check that is not required
- **FR:github-pr-gates.tests** (P1): Action MUST run the repository's tests only when Tests is set
  - **FR:github-pr-gates.tests.after-code-owners** (P1): Action MUST run them only after the code-owner gates pass or are waived
  - **FR:github-pr-gates.tests.worktree** (P1): Action MUST run them in a fresh worktree of the head commit
    - **FR:github-pr-gates.tests.worktree.cleanup** (P1): Action MUST remove the worktree after the tests
  - **FR:github-pr-gates.tests.no-token** (P1): Action MUST run the tests without any GitHub token (`CATALYST_CHECKS_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN`) when it runs in GitHub Actions
    - The token can merge PRs, and the code under test comes from the PR, so it must not read the token
  - **FR:github-pr-gates.tests.install** (P1): Action MUST install dependencies with the repository's own package manager, never creating another manager's lockfile
    - **FR:github-pr-gates.tests.install.yarn-berry** (P1): Action MUST install with `--immutable` instead of `--frozen-lockfile` when the `packageManager` field names Yarn 2 or later
  - **FR:github-pr-gates.tests.fork** (P1): Action MUST fail the gates instead of running a fork PR's code
  - **FR:github-pr-gates.tests.no-shell** (P1): Action MUST run `gh` and `git` without a shell
- **FR:github-pr-gates.playwright** (P1): Action MUST fail the gates when the repository has Playwright tests and they fail or log a console error
  - **FR:github-pr-gates.playwright.detect** (P1): Action MUST treat a repository as having Playwright tests when it has a `playwright.config.*` file or a `@playwright/test` dependency
  - **FR:github-pr-gates.playwright.command** (P2): Action MUST run the `test:e2e`, `e2e`, or `playwright` script, else `npx playwright test`
  - **FR:github-pr-gates.playwright.console** (P1): Action MUST treat a `console.error` or an uncaught page error in the output as a failure
    - **FR:github-pr-gates.playwright.console.titles** (P2): Action MUST skip a line that names a test, marked by Playwright's `›` title separator
- **FR:github-pr-gates.catalyst-check** (P1): Action MUST fail the gates when the repository has `@xerilium/catalyst` installed and `npx catalyst check` returns an error
  - **FR:github-pr-gates.catalyst-check.detect** (P1): Action MUST treat Catalyst as installed when `@xerilium/catalyst` is in the `dependencies` or `devDependencies` of `package.json`
  - **FR:github-pr-gates.catalyst-check.strict** (P2): Action MUST also fail the gates on a warning when `strict-check` is `true`
- **FR:github-pr-gates.verified** (P1): Action MUST fail the gates with the code `NotVerified` when Tests is not set
  - **FR:github-pr-gates.verified.unrun** (P1): Action MUST fail the gates with the code `NotVerified` when it can't prepare the PR for its tests
- **FR:github-pr-gates.refused** (P1): Action MUST return a failed gate as `Pass: false` with its Gate, Code, and Message, never throw
- **FR:github-pr-gates.output** (P1): Gates result (@req FR:$pr-gates-result)

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

- **FR:$pull-request** (P1): **`PRSnapshot`** — A pull request's live state
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
  - `codeOwners` (string[]) — Users other than the author who own the changed files, per `CODEOWNERS`; teams are left out
  - `codeOwned` (bool) — `true` when `CODEOWNERS` covers a changed file
  - `codeOwnersConfigured` (bool) — `true` when a `CODEOWNERS` file has at least one owner rule
  - `codeOwnedByOthers` (bool) — Per FR:github-pr-get.owned-by-others
  - `mergeable` (string), `mergeStateStatus` (string) — As GitHub reports them
  - `reviewDecision` (string) — As GitHub reports it; empty when the repository sets no review rule
  - `approved` (bool) — Per FR:github-pr-get.approved
  - `reviewRequired` (bool) — Per FR:github-pr-get.review-required
  - `pendingCodeOwners` (string[]) — Per FR:github-pr-get.pending-code-owners
  - `checksFailed` (bool) — A check on the head commit failed
  - `checksPassed` (bool) — Per FR:github-pr-get.checks-passed
  - `changesRequested` (bool) — Per FR:github-pr-get.changes-requested
  - `codeOwnerApproved` (bool) — Per FR:github-pr-get.code-owner-approved
  - `threadsUnresolved` (int)
  - `threadsAwaitingAuthor` (int) — Per FR:github-pr-get.awaiting-author
  - `viewer` (string) — Signed-in GitHub user login; empty per FR:github-pr-get.viewer
  - `authoredByViewer` (bool) — The signed-in user authored the PR, ignoring case
  - `hashCommands` (Record<string, Record<string, { `url` (string), `at` (string) }>>) — Per FR:github-pr-get.hash-commands; lowercase hashtag without `#`, then user login, to the latest comment that holds it
  - `latestHashCommands` (Record<string, { `user` (string), `url` (string), `at` (string) }>) — Per FR:github-pr-get.hash-commands.latest; lowercase hashtag without `#` to the latest comment from anyone that holds it
  - `authorCommentedAt` (string) — Per FR:github-pr-get.author-commented; empty when the author hasn't commented
  - `labelsRemovedAt` (Record<string, string>) — Per FR:github-pr-get.labels-removed; label name to time
  - `readyAt` (string) — Per FR:github-pr-get.ready-at; empty when never marked ready
  - `baseGone` (bool) — Per FR:github-pr-get.base-gone
  - `headLongLived` (bool) — Per FR:github-pr-get.head-long-lived
  - `sameRepository` (bool) — Per FR:github-pr-get.same-repository
  - `skippedChecks` (string[]) — Per FR:github-pr-get.skip-checks.report

- **FR:$pr-list-item** (P1): **`PRListItem`** — One pull request in a list
  - `number` (int), `title` (string)
  - `headRef` (string) — Head branch name
  - `baseRef` (string) — Base branch name
  - `state` (string)

- **FR:$pr-merge-result** (P1): **`PRMergeResult`** — The outcome of `github-pr-merge`
  - `merged` (bool)
  - `code` (string?) — Why the merge was refused; set only when not merged
    - Allowed: `PullRequestNotOpen`, `PullRequestNotPublished`, `PullRequestHeadChanged`, `PullRequestChecksNotPassing`, `PullRequestNotCodeOwnerApproved`, `PullRequestChangesRequested`, `PullRequestHasUnresolvedThreads`, `PullRequestNotMergeable`, `PullRequestMergeFailed`, `PullRequestHeld`, `PullRequestWouldMerge`
  - `message` (string?) — Friendly explanation; set only when not merged

- **FR:$pr-gates-result** (P1): **`PRGatesResult`** — The outcome of `github-pr-gates`
  - `pass` (bool)
  - `gate` (string?) — The gate that failed; set only when not passed
    - Allowed: `excluded`, `config`, `code-owners`, `required-checks`, `playwright`, `catalyst-check`, `verified`
  - `code` (string?) — Why the gate failed
    - Allowed: `RepositoryExcluded`, `MergeConfigInvalid`, `CodeOwnerApprovalMissing`, `RequiredCheckNotPassing`, `PlaywrightFailed`, `CatalystCheckFailed`, `ForkNotRun`, `NotVerified`
  - `message` (string?) — Friendly explanation; set only when not passed
  - `waived` (bool) — `true` when the approval waiver applied

## Architecture Constraints

None

## External Dependencies

- **Node.js >= 18**: Runtime environment
- **GitHub API access**: Authentication and network connectivity to GitHub
