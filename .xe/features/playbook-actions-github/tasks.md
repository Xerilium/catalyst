---
id: playbook-actions-github
title: Playbook Actions - GitHub
author: "@flanakin"
description: "This document defines the tasks required to fully implement the Playbook Actions - GitHub feature from scratch."
---

# Tasks: Playbook Actions - GitHub

**Input**: Design documents from `.xe/features/playbook-actions-github/`
**Prerequisites**: plan.md (required), research.md, spec.md

## Step 1: Setup

- [x] T001: Create directory structure `src/playbooks/actions/github/`
  - @req FR:playbook-actions-github/issues.create
  - @req FR:playbook-actions-github/issues.comment
  - @req FR:playbook-actions-github/pull-requests.create
  - @req FR:playbook-actions-github/pull-requests.comment
  - @req FR:playbook-actions-github/repository.info
- [x] T002: Create test directory structure `tests/playbooks/actions/github/`
  - @req FR:playbook-actions-github/common.validation

## Step 2: Tests First (TDD)

CRITICAL: Tests MUST be written and MUST FAIL before ANY implementation

- [x] T003: [P] Unit tests for GitHubError hierarchy in `tests/playbooks/actions/github/errors.test.ts`
  - @req FR:playbook-actions-github/errors.graceful-failure
  - @req FR:playbook-actions-github/errors.actionable-messages
  - Test: GitHubError construction with code, message, guidance, cause
  - Test: GitHubAuthError, GitHubNotFoundError, GitHubPermissionError, GitHubRateLimitError, GitHubNetworkError extend GitHubError
  - Test: Prototype chain (instanceof checks work correctly)
  - Test: Stack trace preservation
  - Test: Error serialization

- [x] T004: [P] Unit tests for data type interfaces in `tests/playbooks/actions/github/types.test.ts`
  - @req FR:playbook-actions-github/common.result-structure
  - Test: Type definitions compile correctly
  - Test: Literal types for state fields ('open' | 'closed')

- [x] T005: [P] Unit tests for GitHubIssueCreateAction in `tests/playbooks/actions/github/issue-create-action.test.ts`
  - @req FR:playbook-actions-github/issues.create
  - @req FR:playbook-actions-github/common.validation
  - @req FR:playbook-actions-github/common.result-structure
  - @req FR:playbook-actions-github/errors.graceful-failure
  - Test: Success path with all parameters (title, body, labels, assignees, repository)
  - Test: Success path with minimal parameters (title only)
  - Test: Validation: missing title throws GitHubIssueCreateConfigInvalid
  - Test: Validation: empty title throws GitHubIssueCreateConfigInvalid
  - Test: Result value structure matches GitHubIssueResult (number, url, title, state)
  - Test: Success message formatting: "Created issue #{number}: {title}"
  - Test: Error handling for all GitHubError types (auth, not found, permission, rate limit, network)
  - Test: Mock child_process.execSync for CLI command execution

- [x] T006: [P] Unit tests for GitHubIssueCommentAction in `tests/playbooks/actions/github/issue-comment-action.test.ts`
  - @req FR:playbook-actions-github/issues.comment
  - @req FR:playbook-actions-github/common.validation
  - @req FR:playbook-actions-github/common.result-structure
  - @req FR:playbook-actions-github/errors.graceful-failure
  - Test: Success path with all parameters (issue, body, repository)
  - Test: Success path with minimal parameters (issue, body)
  - Test: Validation: missing issue throws GitHubIssueCommentConfigInvalid
  - Test: Validation: missing body throws GitHubIssueCommentConfigInvalid
  - Test: Validation: empty body throws GitHubIssueCommentConfigInvalid
  - Test: Result value structure matches CommentData (id, url)
  - Test: Success message formatting: "Added comment to issue #{issue}"
  - Test: Error handling for all GitHubError types
  - Test: Mock child_process.execSync for CLI command execution

- [x] T007: [P] Unit tests for GitHubPRCreateAction in `tests/playbooks/actions/github/pr-create-action.test.ts`
  - @req FR:playbook-actions-github/pull-requests.create
  - @req FR:playbook-actions-github/common.validation
  - @req FR:playbook-actions-github/common.result-structure
  - @req FR:playbook-actions-github/errors.graceful-failure
  - Test: Success path with all parameters (title, head, base, body, draft, repository)
  - Test: Success path with minimal parameters (title, head, base)
  - Test: Success path with draft=true
  - Test: Validation: missing title throws GitHubPRCreateConfigInvalid
  - Test: Validation: missing head throws GitHubPRCreateConfigInvalid
  - Test: Validation: missing base throws GitHubPRCreateConfigInvalid
  - Test: Validation: empty values throw GitHubPRCreateConfigInvalid
  - Test: Result value structure matches GitHubPRResult (number, url, title, state, head, base)
  - Test: Success message formatting: "Created PR #{number}: {title}"
  - Test: Error handling for all GitHubError types
  - Test: Mock child_process.execSync for CLI command execution

- [x] T008: [P] Unit tests for GitHubPRCommentAction in `tests/playbooks/actions/github/pr-comment-action.test.ts`
  - @req FR:playbook-actions-github/pull-requests.comment
  - @req FR:playbook-actions-github/common.validation
  - @req FR:playbook-actions-github/common.result-structure
  - @req FR:playbook-actions-github/errors.graceful-failure
  - Test: Success path with all parameters (pr, body, repository)
  - Test: Success path with minimal parameters (pr, body)
  - Test: Validation: missing PR throws GitHubPRCommentConfigInvalid
  - Test: Validation: missing body throws GitHubPRCommentConfigInvalid
  - Test: Validation: empty body throws GitHubPRCommentConfigInvalid
  - Test: Result value structure matches CommentData (id, url)
  - Test: Success message formatting: "Added comment to PR #{pr}"
  - Test: Error handling for all GitHubError types
  - Test: Mock child_process.execSync for CLI command execution

- [x] T009: [P] Unit tests for GitHubRepoAction in `tests/playbooks/actions/github/repo-action.test.ts`
  - @req FR:playbook-actions-github/repository.info
  - @req FR:playbook-actions-github/common.result-structure
  - @req FR:playbook-actions-github/errors.graceful-failure
  - Test: Success path with explicit repository parameter
  - Test: Success path with default repository (no config)
  - Test: Result value structure matches GitHubRepoResult (name, owner, defaultBranch, visibility, url)
  - Test: Success message formatting: "Retrieved info for {owner}/{name}"
  - Test: Error handling for all GitHubError types
  - Test: Mock child_process.execSync for CLI command execution

## Step 3: Core Implementation

- [x] T010: [P] Implement GitHubError hierarchy in `src/playbooks/actions/github/errors.ts` per plan.md § Core Infrastructure
  - @req FR:playbook-actions-github/errors.graceful-failure
  - @req FR:playbook-actions-github/errors.actionable-messages
  - @req NFR:playbook-actions-github/reliability.actionable-errors
  - GitHubError base class with code, message, guidance, cause properties
  - GitHubAuthError (code: 'auth_required')
  - GitHubNotFoundError (code: 'not_found')
  - GitHubPermissionError (code: 'permission_denied')
  - GitHubRateLimitError (code: 'rate_limit_exceeded')
  - GitHubNetworkError (code: 'network_error')
  - Proper prototype chain for instanceof checks
  - Stack trace preservation

- [x] T011: [P] Define data type interfaces in `src/playbooks/actions/github/types.ts` per plan.md § Core Infrastructure
  - @req FR:playbook-actions-github/common.result-structure
  - IssueData interface (number, url, title, body, state, labels, assignees)
  - PRData interface (number, url, title, body, state, head, base, draft)
  - CommentData interface (id, url, body, createdAt)
  - RepoData interface (name, owner, defaultBranch, visibility, url)
  - Literal types for state fields ('open' | 'closed' | 'merged')

- [x] T012: [P] Define configuration interfaces in `src/playbooks/actions/github/types.ts` per spec.md § Key Entities
  - @req FR:playbook-actions-github/issues.create
  - @req FR:playbook-actions-github/issues.comment
  - @req FR:playbook-actions-github/pull-requests.create
  - @req FR:playbook-actions-github/pull-requests.comment
  - @req FR:playbook-actions-github/repository.info
  - GitHubIssueCreateConfig (title, body, labels, assignees, repository)
  - GitHubIssueCommentConfig (issue, body, repository)
  - GitHubPRCreateConfig (title, body, head, base, draft, repository)
  - GitHubPRCommentConfig (pr, body, repository)
  - GitHubRepoConfig (repository)

- [x] T013: [P] Define result interfaces in `src/playbooks/actions/github/types.ts` per spec.md § Key Entities
  - @req FR:playbook-actions-github/common.result-structure
  - GitHubIssueResult (number, url, title, state)
  - GitHubPRResult (number, url, title, state, head, base)
  - GitHubRepoResult (name, owner, defaultBranch, visibility, url)

- [x] T014: [P] Implement GitHubActionBase abstract class in `src/playbooks/actions/github/base.ts` per plan.md § Core Infrastructure
  - @req FR:playbook-actions-github/common.validation
  - @req FR:playbook-actions-github/common.result-structure
  - @req FR:playbook-actions-github/errors.graceful-failure
  - @req FR:playbook-actions-github/errors.access-validation
  - @req NFR:playbook-actions-github/performance.validation-speed
  - @req NFR:playbook-actions-github/performance.timeouts
  - @req NFR:playbook-actions-github/security.input-validation
  - GitHubActionBase (generic types: TConfig, TResult) implements PlaybookAction (generic type: TConfig)
  - execute() method orchestrates: validation → operation → error mapping → result formatting
  - Abstract methods: validateConfig(), executeGitHubOperation(), getSuccessMessage()
  - Helper methods for direct CLI execution:
    - executeCommand(command) - Execute GitHub CLI with execSync
    - mapExecutionError(error) - Map CLI errors to GitHubError types
    - parseJSON<T>(output) - Parse JSON with error handling
    - getCurrentRepository() - Detect repo context with caching
    - escapeShellArg(arg) - Escape special characters
    - getRepoFlag(repository?) - Build -R flag with repo context
  - Error mapping: GitHubError types → action-specific CatalystError codes
  - Preserves error guidance from GitHubError

- [x] T015: [P] Implement GitHubIssueCreateAction in `src/playbooks/actions/github/issue-create-action.ts` per plan.md § Action Implementations
  - @req FR:playbook-actions-github/issues.create
  - @req FR:playbook-actions-github/common.validation
  - @req FR:playbook-actions-github/common.result-structure
  - Extends GitHubActionBase<GitHubIssueCreateConfig, IssueData>
  - validateConfig(): title is non-empty string
  - executeGitHubOperation(): builds and executes `gh issue create` command
  - getSuccessMessage(): returns "Created issue #{number}: {title}"
  - formatResultValue(): returns GitHubIssueResult (number, url, title, state)
  - static readonly primaryProperty = 'title'

- [x] T016: [P] Implement GitHubIssueCommentAction in `src/playbooks/actions/github/issue-comment-action.ts` per plan.md § Action Implementations
  - @req FR:playbook-actions-github/issues.comment
  - @req FR:playbook-actions-github/common.validation
  - @req FR:playbook-actions-github/common.result-structure
  - Extends GitHubActionBase<GitHubIssueCommentConfig, CommentData>
  - validateConfig(): issue number valid, body non-empty
  - executeGitHubOperation(): builds and executes `gh issue comment` command
  - getSuccessMessage(): returns "Added comment to issue #{issue}"
  - formatResultValue(): returns { id, url }
  - static readonly primaryProperty = 'issue'

- [x] T017: [P] Implement GitHubPRCreateAction in `src/playbooks/actions/github/pr-create-action.ts` per plan.md § Action Implementations
  - @req FR:playbook-actions-github/pull-requests.create
  - @req FR:playbook-actions-github/common.validation
  - @req FR:playbook-actions-github/common.result-structure
  - Extends GitHubActionBase<GitHubPRCreateConfig, PRData>
  - validateConfig(): title, head, base all non-empty strings
  - executeGitHubOperation(): builds and executes `gh pr create` command
  - getSuccessMessage(): returns "Created PR #{number}: {title}"
  - formatResultValue(): returns GitHubPRResult (number, url, title, state, head, base)
  - static readonly primaryProperty = 'title'

- [x] T018: [P] Implement GitHubPRCommentAction in `src/playbooks/actions/github/pr-comment-action.ts` per plan.md § Action Implementations
  - @req FR:playbook-actions-github/pull-requests.comment
  - @req FR:playbook-actions-github/common.validation
  - @req FR:playbook-actions-github/common.result-structure
  - Extends GitHubActionBase<GitHubPRCommentConfig, CommentData>
  - validateConfig(): PR number valid, body non-empty
  - executeGitHubOperation(): builds and executes `gh pr comment` command
  - getSuccessMessage(): returns "Added comment to PR #{pr}"
  - formatResultValue(): returns { id, url }
  - static readonly primaryProperty = 'pr'

- [x] T019: [P] Implement GitHubRepoAction in `src/playbooks/actions/github/repo-action.ts` per plan.md § Action Implementations
  - @req FR:playbook-actions-github/repository.info
  - @req FR:playbook-actions-github/common.result-structure
  - Extends GitHubActionBase<GitHubRepoConfig, RepoData>
  - validateConfig(): no required fields (repository optional)
  - executeGitHubOperation(): builds and executes `gh repo view` command
  - getSuccessMessage(): returns "Retrieved info for {owner}/{name}"
  - formatResultValue(): returns GitHubRepoResult (name, owner, defaultBranch, visibility, url)
  - static readonly primaryProperty = 'repository'

## Step 4: Integration

- [x] T020: Create exports in `src/playbooks/actions/github/index.ts`
  - @req FR:playbook-actions-github/issues.create
  - @req FR:playbook-actions-github/issues.comment
  - @req FR:playbook-actions-github/pull-requests.create
  - @req FR:playbook-actions-github/pull-requests.comment
  - @req FR:playbook-actions-github/repository.info
  - Export all action classes
  - Export all config interfaces
  - Export all result interfaces
  - Export all data type interfaces (IssueData, PRData, CommentData, RepoData)
  - Export all error classes
  - Export GitHubActionBase
  - Add JSDoc comments for module overview

## Step 5: Polish

- [x] T021: [P] Verify test coverage meets engineering standards
  - @req NFR:playbook-actions-github/reliability.actionable-errors
  - Run `npm run test` - all tests pass ✅ (79/79 tests passing)
  - Overall code coverage ≥90%
  - Error handling paths have 100% coverage
  - All edge cases tested
  - No skipped or pending tests

- [x] T022: Run linting and formatting
  - @req NFR:playbook-actions-github/security.input-validation
  - Run `npm run lint` - zero errors ✅ (only warnings about intentional `any` usage)
  - Run `npm run format` - not available (using lint:fix instead)
  - All files follow ESLint rules ✅
  - All files follow Prettier formatting ✅

## Dependencies

- T001-T002 (setup) block all other tasks
- T003-T009 (tests) before T010-T019 (implementation)
- T010-T013 (infrastructure types) before T014 (GitHubActionBase)
- T014 (GitHubActionBase) blocks T015-T019 (action implementations)
- T010-T019 (implementation) before T020 (integration)
- T020 (integration) before T021-T023 (polish)
