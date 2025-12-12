---
id: playbook-actions-github
title: Playbook Actions - GitHub
author: "@flanakin"
description: "GitHub operations for playbook workflows including issue management, pull request operations, and repository queries"
dependencies:
  - playbook-definition
  - error-handling
---

# Feature: Playbook Actions - GitHub

## Problem

Playbooks need programmatic GitHub integration to automate repository workflows, manage issues and pull requests, and coordinate development operations. Without dedicated GitHub actions, playbooks cannot effectively orchestrate development workflows or implement GitHub-based automation patterns.

## Goals

- Enable playbook authors to automate GitHub workflows programmatically

## Scenario

- As a **playbook author**, I need to create GitHub issues from playbook workflows
  - Outcome: Issue creation actions support templates, labels, and assignees with proper validation

- As a **playbook author**, I need to manage pull request lifecycle programmatically
  - Outcome: PR actions enable creation, updates, and comments within automated workflows

- As a **playbook author**, I need repository queries for feature workflow automation
  - Outcome: Repository actions support information queries for workflow decisions

## Success Criteria

- 98% of GitHub operations complete successfully with proper error handling
- Error messages provide actionable guidance for all failure scenarios
- Action configuration validation completes in <10ms
- GitHub operations complete within 5 seconds under normal conditions (excluding network latency)

## Requirements

### Functional Requirements

**FR-1**: Common Requirements for All GitHub Actions

- **FR-1.1**: All GitHub actions MUST validate configuration before execution
  - Missing required properties MUST throw CatalystError with code '{Action}ConfigInvalid'
  - Invalid property values MUST throw CatalystError with code '{Action}ConfigInvalid'
  - Provide clear guidance on what's required

- **FR-1.2**: All GitHub actions MUST return PlaybookActionResult with the following:
  - `code`: 'Success' if execution succeeded, error code otherwise
  - `message`: Human-readable execution status
  - `value`: Action-specific output (issue/PR/repository details)
  - `error`: CatalystError if execution failed, null otherwise

- **FR-1.3**: All GitHub actions MUST support `{{variable-name}}` template interpolation
  - Template engine performs interpolation BEFORE action execution
  - Actions receive config with variables already replaced

**FR-2**: Issue Management Actions

- **FR-2.1**: System MUST provide `github-issue-create` action
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

- **FR-2.2**: System MUST provide `github-issue-comment` action
  - Configuration interface:
    - `issue` (number | string, required, primary): Issue number
    - `body` (string, required): Comment body in markdown format
    - `repository` (string, optional): Repository in 'owner/repo' format (defaults to current repository)
  - Result value:
    - `id` (number): Comment ID
    - `url` (string): Comment URL

**FR-3**: Pull Request Actions

- **FR-3.1**: System MUST provide `github-pr-create` action
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

- **FR-3.2**: System MUST provide `github-pr-comment` action
  - Configuration interface:
    - `pr` (number | string, required, primary): Pull request number
    - `body` (string, required): Comment body in markdown format
    - `repository` (string, optional): Repository in 'owner/repo' format (defaults to current repository)
  - Result value:
    - `id` (number): Comment ID
    - `url` (string): Comment URL

**FR-4**: Repository Query Actions

- **FR-4.1**: System MUST provide `github-repo` action
  - Configuration interface:
    - `repository` (string, optional, primary): Repository in 'owner/repo' format (defaults to current repository)
  - Result value:
    - `owner` (string): Repository owner
    - `name` (string): Repository name
    - `defaultBranch` (string): Default branch name
    - `visibility` (string): Repository visibility ('public' or 'private')
    - `url` (string): Repository URL

**FR-5**: Error Handling

- **FR-5.1**: All GitHub actions MUST handle failures gracefully
  - Map underlying errors to playbook-specific CatalystError codes
  - Error codes MUST follow pattern: `{Action}{ErrorType}`
  - Examples: `GitHubIssueCreateAuthenticationFailed`, `GitHubPRCreateNotFound`

- **FR-5.2**: All error messages MUST include actionable guidance
  - Authentication errors: Provide steps to authenticate with GitHub CLI
  - Not found errors: Explain what resource wasn't found
  - Permission errors: Explain required permissions
  - Network errors: Suggest checking connectivity

- **FR-5.3**: System MUST validate GitHub access before operations
  - Check authentication status before operations
  - Provide clear guidance if not authenticated or access denied

### Non-functional Requirements

**NFR-1**: Performance

- **NFR-1.1**: Action configuration validation MUST complete in <10ms
- **NFR-1.2**: GitHub operations SHOULD complete within 5 seconds under normal conditions
- **NFR-1.3**: System MUST enforce reasonable timeouts to prevent hanging

**NFR-2**: Reliability

- **NFR-2.1**: GitHub actions MUST NOT leak sensitive data (tokens) in error messages
- **NFR-2.2**: Error messages MUST include actionable guidance for all error scenarios
- **NFR-2.3**: System MUST properly clean up resources on failure

**NFR-3**: Security

- **NFR-3.1**: System MUST never log or expose authentication tokens
- **NFR-3.2**: System MUST validate all user inputs before execution
- **NFR-3.3**: Error messages MUST NOT include sensitive information

## Key Entities

**Entities owned by this feature:**

- **GitHubIssueCreateConfig**: Configuration for `github-issue-create` action
  - Properties: title, body, labels, assignees, repository

- **GitHubIssueCommentConfig**: Configuration for `github-issue-comment` action
  - Properties: issue, body, repository

- **GitHubPRCreateConfig**: Configuration for `github-pr-create` action
  - Properties: title, body, head, base, draft, repository

- **GitHubPRCommentConfig**: Configuration for `github-pr-comment` action
  - Properties: pr, body, repository

- **GitHubRepoConfig**: Configuration for `github-repo` action
  - Properties: repository

**Entities from other features:**

- **PlaybookAction** (playbook-definition): Base interface all actions implement
- **PlaybookActionResult** (playbook-definition): Standard result structure
- **CatalystError** (error-handling): Standard error class with code and guidance

## TypeScript Examples

### Creating a GitHub Issue

```typescript
import type { Playbook } from '@xerilium/catalyst/playbooks';

const createIssuePlaybook: Playbook = {
  name: 'create-feature-issue',
  description: 'Create a feature issue from template',
  owner: 'Engineer',
  inputs: [
    { name: 'feature-name', type: 'string', required: true },
    { name: 'feature-description', type: 'string', required: true },
  ],
  steps: [
    {
      name: 'create-issue',
      action: 'github-issue-create',
      config: {
        title: 'Feature: {{feature-name}}',
        body: '## Description\n\n{{feature-description}}',
        labels: ['feature', 'automated'],
        assignees: ['flanakin']
      }
    }
  ]
};

// Result value structure: { number, url, title, state }
```

### Adding a Comment to an Issue

```typescript
import type { Playbook } from '@xerilium/catalyst/playbooks';

const commentPlaybook: Playbook = {
  name: 'add-status-comment',
  description: 'Add status comment to issue',
  owner: 'Engineer',
  inputs: [
    { name: 'issue-number', type: 'number', required: true }
  ],
  steps: [
    {
      name: 'add-comment',
      action: 'github-issue-comment',
      config: {
        issue: '{{issue-number}}',
        body: 'Implementation has been completed. Ready for review.'
      }
    }
  ]
};
```

### Creating a Pull Request

```typescript
import type { Playbook } from '@xerilium/catalyst/playbooks';

const createPRPlaybook: Playbook = {
  name: 'create-feature-pr',
  description: 'Create PR for feature branch',
  owner: 'Engineer',
  inputs: [
    { name: 'feature-name', type: 'string', required: true },
    { name: 'branch-name', type: 'string', required: true }
  ],
  steps: [
    {
      name: 'create-pr',
      action: 'github-pr-create',
      config: {
        title: '[Feature] {{feature-name}}',
        body: '## Summary\n\nImplements {{feature-name}}',
        head: '{{branch-name}}',
        base: 'main',
        draft: false
      }
    }
  ]
};

// Result value structure: { number, url, title, state, head, base }
```

### Querying Repository Information

```typescript
import type { Playbook } from '@xerilium/catalyst/playbooks';

const repoInfoPlaybook: Playbook = {
  name: 'get-repo-info',
  description: 'Get current repository information',
  owner: 'Engineer',
  steps: [
    {
      name: 'repo-info',
      action: 'github-repo',
      config: {
        // repository is optional - defaults to current repo
      }
    }
  ]
};

// Result value structure: { name, owner, defaultBranch, visibility, url }
```

## Dependencies

**Internal Dependencies:**

- **playbook-definition**: Provides `PlaybookAction`, `PlaybookActionResult` interfaces
- **error-handling**: Provides `CatalystError` and `ErrorPolicy` framework

**External Dependencies:**

- **Node.js >= 18**: Runtime environment
- **GitHub API access**: Authentication and network connectivity to GitHub
