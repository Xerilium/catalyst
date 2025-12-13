---
id: playbook-actions-github
title: Playbook Actions - GitHub
author: "@flanakin"
description: "Implementation plan for GitHub-specific playbook actions"
dependencies:
  - playbook-definition
  - error-handling
---

# Implementation Plan: Playbook Actions - GitHub

**Spec**: [Feature spec](./spec.md)

---

## Summary

This feature implements GitHub-specific playbook actions that directly execute GitHub CLI commands. Each action is self-contained and handles its own GitHub operations, following the YAGNI principle.

Each action follows the `PlaybookAction` interface pattern from playbook-definition, with TypeScript configuration interfaces for type safety.

**Design rationale**: Direct GitHub CLI execution in each action simplifies the architecture and eliminates unnecessary abstraction layers. See [research.md](./research.md) for detailed analysis.

---

## Technical Context

This feature implements GitHub playbook actions with direct GitHub CLI integration.

**Feature-specific technical details:**

- **Primary Components**:
  - GitHubActionBase abstract class with GitHub CLI execution helpers
  - 5 GitHub action implementations (issue create/comment, PR create/comment, repo info)
  - Error types hierarchy (GitHubError, GitHubAuthError, etc.)
  - Data types for GitHub resources (IssueData, PRData, etc.)

- **Data Structures**:
  - TypeScript config interfaces (GitHubIssueCreateConfig, GitHubPRCreateConfig, etc.)
  - Result interfaces (GitHubIssueResult, GitHubPRResult, etc.)

- **Dependencies**:
  - playbook-definition (PlaybookAction interface)
  - error-handling (CatalystError)
  - GitHub CLI (`gh` command)
  - Node.js child_process (execSync)

- **Configuration**: No framework configuration - actions execute GitHub CLI directly, which handles authentication

- **Performance Goals**:
  - <50ms execution overhead per action (excluding GitHub CLI execution time)
  - <10ms config validation
  - <200ms GitHub CLI execution overhead (excluding network latency)
  - 5-second timeout for all GitHub CLI commands

- **Testing Framework**: Jest with mocked execSync for unit tests

- **Key Constraints**: Requires GitHub CLI (`gh`) installed and authenticated

---

## Project Structure

```
src/playbooks/actions/github/
  ├── base.ts                   # GitHubActionBase with CLI execution
  ├── errors.ts                 # GitHubError hierarchy
  ├── types.ts                  # Data types (IssueData, PRData, etc.)
  ├── issue-create-action.ts    # Issue create action
  ├── issue-comment-action.ts   # Issue comment action
  ├── pr-create-action.ts       # PR create action
  ├── pr-comment-action.ts      # PR comment action
  ├── repo-action.ts            # Repository info action
  └── index.ts                  # Public exports

tests/playbooks/actions/github/
  ├── errors.test.ts                # Error hierarchy tests
  ├── types.test.ts                 # Type interface tests
  ├── issue-create-action.test.ts
  ├── issue-comment-action.test.ts
  ├── pr-create-action.test.ts
  ├── pr-comment-action.test.ts
  └── repo-action.test.ts
```

---

## Data Model

### Configuration Entities

- **GitHubIssueCreateConfig**: title, body, labels, assignees, repository
- **GitHubIssueCommentConfig**: issue, body, repository
- **GitHubPRCreateConfig**: title, body, head, base, draft, repository
- **GitHubPRCommentConfig**: pr, body, repository
- **GitHubRepoConfig**: repository

### Result Entities

- **GitHubIssueResult**: number, url, title, state
- **GitHubPRResult**: number, url, title, state, head, base
- **GitHubRepoResult**: name, owner, defaultBranch, visibility, url

### Core Entities

- **GitHubError**: Base error with code, message, guidance, cause
- **Specialized Errors**: GitHubAuthError, GitHubNotFoundError, GitHubPermissionError, GitHubRateLimitError, GitHubNetworkError
- **Data Types**: IssueData, PRData, CommentData, RepoData (full GitHub resource metadata)

---

## Implementation Approach

### 1. Core Infrastructure

**Error Types (errors.ts)**

Build error hierarchy for structured error handling:
1. GitHubError base class with code, message, guidance, cause properties
2. Specialized error types for different failure modes
3. Proper prototype chain setup for instanceof checks
4. Stack trace preservation

**Data Types (types.ts)**

Define interfaces for GitHub resources:
1. IssueData, PRData, CommentData, RepoData with all properties
2. Use literal types for state fields ('open' | 'closed')
3. Mark optional vs required properties clearly

**Base Class with GitHub CLI Execution (base.ts)**

GitHubActionBase provides:

1. **Command Execution**:
   - `executeCommand(command)` uses child_process.execSync
   - Captures stdout/stderr separately
   - Enforces 5-second default timeout
   - Returns trimmed output string

2. **Error Mapping**:
   - `mapExecutionError(error)` parses CLI error messages
   - Maps to appropriate GitHubError subclass
   - Preserves error details with actionable guidance

3. **Helper Methods**:
   - `parseJSON<T>(output)` - Parse JSON with error handling
   - `getCurrentRepository()` - Detect repo context with caching
   - `escapeShellArg(arg)` - Escape special characters
   - `getRepoFlag(repository?)` - Build -R flag with repo context

4. **Execution Flow**:
   - `execute()` orchestrates: validation → operation → error mapping → result formatting
   - Catches and maps GitHubError types to CatalystError codes
   - Returns PlaybookActionResult

### 2. Action Implementations

Each action extends GitHubActionBase and implements:

**Issue Actions**

1. **GitHubIssueCreateAction**:
   - Validate: title is non-empty string
   - Execute: Build `gh issue create` command with params
   - Parse JSON response to IssueData
   - Success: "Created issue #{number}: {title}"

2. **GitHubIssueCommentAction**:
   - Validate: issue number valid, body non-empty
   - Execute: `gh issue comment {issue} --body {body}`
   - Parse JSON response to CommentData
   - Success: "Added comment to issue #{issue}"

**PR Actions**

1. **GitHubPRCreateAction**:
   - Validate: title, head, base all non-empty strings
   - Execute: `gh pr create --title {title} --head {head} --base {base}`
   - Parse JSON response to PRData
   - Success: "Created PR #{number}: {title}"

2. **GitHubPRCommentAction**:
   - Validate: PR number valid, body non-empty
   - Execute: `gh pr comment {pr} --body {body}`
   - Parse JSON response to CommentData
   - Success: "Added comment to PR #{pr}"

**Repository Action**

1. **GitHubRepoAction**:
   - Validate: No required fields (repository optional)
   - Execute: `gh repo view --json name,owner,defaultBranchRef,visibility,url`
   - Parse JSON response to RepoData
   - Success: "Retrieved info for {owner}/{name}"

### 3. Testing Strategy

**Unit Tests for Actions**

Test with mocked child_process.execSync:
1. Mock execSync to return JSON responses for different commands
2. Test success paths with valid configurations
3. Test validation with invalid configurations
4. Test error handling for auth, not found, permission, rate limit, network errors
5. Verify result value structure matches expected format
6. Target 90% code coverage

**Error Hierarchy Tests**

Test GitHubError types:
1. Test construction with code, message, guidance, cause
2. Test prototype chain (instanceof checks)
3. Test stack trace preservation
4. Test error serialization

**Type Tests**

Test TypeScript interface compilation:
1. Test all data types compile correctly
2. Test literal types for state fields
3. Test configuration interfaces
4. Test result interfaces

---

## Usage Examples

### Creating a GitHub Issue

```typescript
const action = new GitHubIssueCreateAction();
const result = await action.execute({
  title: 'Bug: Application crashes on startup',
  body: 'Detailed description...',
  labels: ['bug', 'priority:high'],
});

// result.code === 'Success'
// result.value === { number: 123, url: '...', title: '...', state: 'open' }
```

### Creating a Pull Request

```typescript
const action = new GitHubPRCreateAction();
const result = await action.execute({
  title: 'feat: Add new feature',
  head: 'feature-branch',
  base: 'main',
  draft: false,
});
```

### Error Handling

```typescript
const result = await action.execute(config);

if (result.code !== 'Success') {
  // result.error is CatalystError
  console.log(result.error.message);  // User-facing error message
  console.log(result.error.guidance); // Actionable guidance
}
```
