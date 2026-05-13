---
id: playbook-actions-git
title: Playbook Actions - Git
description: Git and GitHub action primitives — gitignore editing today; git CLI and GitHub repository/issue/pull-request automation across the feature.
dependencies:
  - playbook-definition
  - error-handling
  - playbook-actions-io
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

## Architecture Constraints

None

## External Dependencies

- **Node.js >= 18**: Runtime environment
- **GitHub API access**: Authentication and network connectivity to GitHub
