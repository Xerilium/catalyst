# Design Decisions: Playbook Actions - GitHub

## Feature consolidation
**Decision**: Merge all GitHub functionality into playbook-actions-github rather than maintaining a separate github-integration feature.

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
