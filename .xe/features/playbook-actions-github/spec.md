---
id: playbook-actions-github
title: Playbook Actions - GitHub
description: GitHub action primitives for repository, issue, and pull-request workflow automation.
dependencies:
  - playbook-definition
  - error-handling
---

<!-- markdownlint-disable single-title -->

# Feature: Playbook Actions - GitHub

## Purpose

Playbooks need programmatic GitHub integration to automate repository workflows, manage issues and pull requests, and coordinate development operations. This feature enables playbook authors to automate GitHub workflows programmatically.

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

## Architecture Constraints

None

## External Dependencies

- **Node.js >= 18**: Runtime environment
- **GitHub API access**: Authentication and network connectivity to GitHub
