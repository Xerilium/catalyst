# Design Decisions: Playbook Actions - GitHub

## Feature consolidation

**Decision**: Merge all GitHub functionality into playbook-actions-git rather than maintaining a separate github-integration feature.

**Date**: <!-- TODO: determine from git history -->

**Why**: Playbook actions are the only consumer of GitHub operations in Catalyst; the separate CLI interface (catalyst-github) was unused and added unnecessary complexity.

**Rejected**: github-integration as a separate feature — violated YAGNI and created a dependency between two features serving a single use case.

## Direct CLI execution in base class

**Decision**: Implement `GitHubActionBase` with direct `execSync` calls; actions inherit helpers from the base class.

**Date**: <!-- TODO: determine from git history -->

**Why**: No intermediate abstraction was needed; direct execution is simpler, testable, and follows the ShellActionBase pattern already established in playbook-actions-scripts.

**Rejected**: Intermediate abstraction layer — added indirection without benefit given the single-consumer design.

## Two-tier error mapping

**Decision**: Map CLI output errors to a `GitHubError` hierarchy first, then to action-specific `CatalystError` codes (e.g., `GitHubIssueCreateAuthenticationFailed`).

**Date**: <!-- TODO: determine from git history -->

**Why**: Action-specific error codes let playbooks apply targeted error policies (retry, continue, stop) and surface actionable remediation guidance to users.

## Repository context via `gh repo view`

**Decision**: Detect current repository by calling `gh repo view --json nameWithOwner` when no `repository` config is provided; cache the result.

**Date**: <!-- TODO: determine from git history -->

**Why**: GitHub CLI already handles context resolution across subdirectories and multiple remotes, avoiding reimplementation of that logic.

## Unit tests only (no integration tests)

**Decision**: Focus on unit tests with mocked `execSync`; integration tests are optional and CI-only.

**Date**: <!-- TODO: determine from git history -->

**Why**: Integration tests require an authenticated CLI and a live test repository, adding setup complexity without proportional value for this use case.

## Merge policy: tests run after code-owner sign-off

**Decision**: `github-pr-gates` checks code-owner sign-off (or its waiver) before it runs any test.

**Date**: 2026-11-16

**Why**: Matches the merge gate order: sign-off, then tests. A test run installs packages and drives a browser; running it on a PR that may never be approved is waste.

**Rejected**: Run the tests first, so failures show before review. Costs a full run on every unapproved PR.

## Merge policy: skip the code-owner gate when the author is the only owner

**Decision**: The human-approval gate applies only when `CODEOWNERS` names an owner other than the PR author. When the author is the only owner (a solo repository, such as `* @author`), the gate is skipped. A team or email owner counts as another owner.

**Date**: 2026-11-16

**Why**: The owner decided the gate exists to get sign-off from someone else who owns files. A solo repository has no one else, so requiring a second human only blocks it.

**Rejected**: Require a second human unless the inactivity waiver applies. Blocks every solo repository for days on each PR.

**Rejected**: Judge only the changed files. A repository where someone else owns any file keeps a reviewer on every PR, as before.

## Merge policy: console errors skip test-title lines

**Decision**: The Playwright console-error check skips lines with Playwright's `›` title separator and matches every other line.

**Date**: 2026-11-16

**Why**: A title like "logs no console.error" held passing runs. Playwright prints browser console output only when a test logs it, in no fixed shape, so matching every other line fails closed.

**Rejected**: Match only a fixed `console.error:` shape, which misses errors a test logs its own way. Reading the JSON reporter needs a reporter flag the repository's own script may not pass.
