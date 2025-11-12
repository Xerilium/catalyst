---
id: github-integration
title: GitHub Integration
author: "@flanakin"
description: "This document defines the tasks required to fully implement the GitHub Integration feature from scratch."
---

# Tasks: GitHub Integration

**Input**: Design documents from `.xe/features/github-integration/`
**Prerequisites**: plan.md (required), spec.md, research.md

## Step 1: Setup

- [ ] T001: Create project structure with src/playbooks/scripts/github/ directory for modular organization
- [ ] T002: Create bin/catalyst-github.js CLI executable shim with proper shebang and permissions
- [ ] T003: [P] Add TypeScript types for all GitHub entities (Issue, PR, Comment, Thread, Repository, etc.)
- [ ] T004: [P] Configure Jest test structure with tests/unit/github/ and tests/integration/github/ directories

## Step 2: Tests First (TDD)

**CRITICAL: Tests MUST be written and MUST FAIL before ANY implementation**

### Type and Error Tests

- [ ] T005: [P] Unit test for Result<T> type guards in tests/unit/github/types.test.ts
- [ ] T006: [P] Unit test for GitHubError hierarchy in tests/unit/github/errors.test.ts

### Adapter Tests (Mock execSync)

- [ ] T007: [P] Unit test for GitHubAdapter.findIssue() in tests/unit/github/adapter-issues.test.ts
- [ ] T008: [P] Unit test for GitHubAdapter.getIssue() in tests/unit/github/adapter-issues.test.ts
- [ ] T009: [P] Unit test for GitHubAdapter.getIssueWithComments() in tests/unit/github/adapter-issues.test.ts
- [ ] T010: [P] Unit test for GitHubAdapter.listIssues() in tests/unit/github/adapter-issues.test.ts
- [ ] T011: [P] Unit test for GitHubAdapter.createIssue() in tests/unit/github/adapter-issues.test.ts
- [ ] T012: [P] Unit test for GitHubAdapter.updateIssue() in tests/unit/github/adapter-issues.test.ts
- [ ] T013: [P] Unit test for GitHubAdapter.addIssueComment() in tests/unit/github/adapter-issues.test.ts
- [ ] T014: [P] Unit test for GitHubAdapter.closeIssue() in tests/unit/github/adapter-issues.test.ts
- [ ] T015: [P] Unit test for GitHubAdapter.findPRs() in tests/unit/github/adapter-prs.test.ts
- [ ] T016: [P] Unit test for GitHubAdapter.getPR() in tests/unit/github/adapter-prs.test.ts
- [ ] T017: [P] Unit test for GitHubAdapter.getPRFeature() in tests/unit/github/adapter-prs.test.ts
- [ ] T018: [P] Unit test for GitHubAdapter.listPRs() in tests/unit/github/adapter-prs.test.ts
- [ ] T019: [P] Unit test for GitHubAdapter.getPRComments() in tests/unit/github/adapter-prs.test.ts
- [ ] T020: [P] Unit test for GitHubAdapter.addPRComment() in tests/unit/github/adapter-prs.test.ts
- [ ] T021: [P] Unit test for GitHubAdapter.findPRThreads() in tests/unit/github/adapter-prs.test.ts
- [ ] T022: [P] Unit test for GitHubAdapter.replyToThread() in tests/unit/github/adapter-prs.test.ts
- [ ] T023: [P] Unit test for GitHubAdapter.getPRReviews() in tests/unit/github/adapter-prs.test.ts
- [ ] T024: [P] Unit test for GitHubAdapter.submitPRReview() in tests/unit/github/adapter-prs.test.ts
- [ ] T025: [P] Unit test for GitHubAdapter.dismissPRReview() in tests/unit/github/adapter-prs.test.ts
- [ ] T026: [P] Unit test for GitHubAdapter.getRepositoryInfo() in tests/unit/github/adapter-repo.test.ts
- [ ] T027: [P] Unit test for GitHubAdapter.setBranchProtection() in tests/unit/github/adapter-repo.test.ts
- [ ] T028: [P] Unit test for GitHubAdapter.createLabel() in tests/unit/github/adapter-repo.test.ts
- [ ] T029: [P] Unit test for GitHubAdapter.updateLabel() in tests/unit/github/adapter-repo.test.ts
- [ ] T030: [P] Unit test for GitHubAdapter.deleteLabel() in tests/unit/github/adapter-repo.test.ts
- [ ] T031: [P] Unit test for GitHubAdapter.setRepositoryProperties() in tests/unit/github/adapter-repo.test.ts
- [ ] T032: [P] Unit test for GitHubAdapter.setMergeSettings() in tests/unit/github/adapter-repo.test.ts
- [ ] T033: [P] Unit test for GitHubAdapter.checkAuth() in tests/unit/github/adapter-auth.test.ts
- [ ] T034: [P] Unit test for GitHubAdapter.authenticate() in tests/unit/github/adapter-auth.test.ts

### CLI Parser Tests

- [ ] T035: [P] Unit test for CLI command routing in tests/unit/github/cli.test.ts
- [ ] T036: [P] Unit test for CLI argument parsing in tests/unit/github/cli.test.ts
- [ ] T037: [P] Unit test for CLI flag parsing in tests/unit/github/cli.test.ts
- [ ] T038: [P] Unit test for CLI help system in tests/unit/github/cli.test.ts
- [ ] T039: [P] Unit test for CLI output formatting (JSON vs text) in tests/unit/github/cli.test.ts

### Template Tests

- [ ] T040: [P] Unit test for readIssueTemplate() in tests/unit/github/templates.test.ts
- [ ] T041: [P] Unit test for parseTemplateFrontmatter() in tests/unit/github/templates.test.ts
- [ ] T042: [P] Unit test for replaceTemplatePlaceholders() in tests/unit/github/templates.test.ts
- [ ] T043: [P] Unit test for createIssueFromTemplate() in tests/unit/github/templates.test.ts

### Error Handling Tests

- [ ] T044: [P] Unit test for CLI error detection patterns in tests/unit/github/error-detection.test.ts
- [ ] T045: [P] Unit test for retry logic with transient errors in tests/unit/github/retry.test.ts
- [ ] T046: [P] Unit test for timeout handling in tests/unit/github/timeout.test.ts

## Step 3: Core Implementation

### Type Definitions and Errors

- [ ] T047: Create Result<T> type with success() and failure() helpers in src/playbooks/scripts/github/types.ts
- [ ] T048: Create GitHubError base class with message, code, remediation, cause in src/playbooks/scripts/github/errors.ts
- [ ] T049: [P] Create GitHubAuthError class in src/playbooks/scripts/github/errors.ts
- [ ] T050: [P] Create GitHubNotFoundError class in src/playbooks/scripts/github/errors.ts
- [ ] T051: [P] Create GitHubNetworkError class in src/playbooks/scripts/github/errors.ts
- [ ] T052: [P] Create GitHubRateLimitError class in src/playbooks/scripts/github/errors.ts
- [ ] T053: [P] Create GitHubPermissionError class in src/playbooks/scripts/github/errors.ts

### Interface and Adapter Foundation

- [ ] T054: Create GitHubClient interface with all method signatures in src/playbooks/scripts/github/client.ts
- [ ] T055: Create GitHubAdapter class skeleton implementing GitHubClient in src/playbooks/scripts/github/adapter.ts
- [ ] T056: Implement private runCommand() helper in GitHubAdapter with error handling and timeout
- [ ] T057: Implement private parseJSON<T>() helper in GitHubAdapter with error recovery
- [ ] T058: Implement private handleCLIError() helper that maps CLI errors to GitHubError types
- [ ] T059: Implement private getRepository() helper that extracts owner/name from git remote

### Issue Operations

- [ ] T060: Implement GitHubAdapter.findIssue() per plan.md § Issue Operations
- [ ] T061: Implement GitHubAdapter.getIssue() per plan.md § Issue Operations
- [ ] T062: Implement GitHubAdapter.getIssueWithComments() per plan.md § Issue Operations
- [ ] T063: Implement GitHubAdapter.listIssues() per plan.md § Issue Operations
- [ ] T064: Implement GitHubAdapter.createIssue() per plan.md § Issue Operations
- [ ] T065: Implement GitHubAdapter.updateIssue() per plan.md § Issue Operations
- [ ] T066: Implement GitHubAdapter.addIssueComment() per plan.md § Issue Operations
- [ ] T067: Implement GitHubAdapter.closeIssue() per plan.md § Issue Operations

### PR Operations

- [ ] T068: Implement GitHubAdapter.findPRs() per plan.md § PR Operations
- [ ] T069: Implement GitHubAdapter.getPR() per plan.md § PR Operations
- [ ] T070: Implement GitHubAdapter.getPRFeature() per plan.md § PR Operations with dynamic repository detection
- [ ] T071: Implement GitHubAdapter.listPRs() per plan.md § PR Operations
- [ ] T072: Implement GitHubAdapter.getPRComments() per plan.md § PR Operations
- [ ] T073: Implement GitHubAdapter.addPRComment() per plan.md § PR Operations
- [ ] T074: Implement GitHubAdapter.findPRThreads() per plan.md § PR Operations with dynamic repository detection
- [ ] T075: Implement GitHubAdapter.replyToThread() with thread ID to comment ID mapping per plan.md § PR Operations
- [ ] T076: Implement GitHubAdapter.getPRReviews() per plan.md § PR Operations
- [ ] T077: Implement GitHubAdapter.submitPRReview() per plan.md § PR Operations
- [ ] T078: Implement GitHubAdapter.dismissPRReview() per plan.md § PR Operations

### Repository Operations

- [ ] T079: Implement GitHubAdapter.getRepositoryInfo() with full metadata (owner, name, branch, description)
- [ ] T080: Implement GitHubAdapter.setBranchProtection() per plan.md § Repository Settings
- [ ] T081: Implement GitHubAdapter.createLabel() per plan.md § Repository Settings
- [ ] T082: Implement GitHubAdapter.updateLabel() per plan.md § Repository Settings
- [ ] T083: Implement GitHubAdapter.deleteLabel() per plan.md § Repository Settings
- [ ] T084: Implement GitHubAdapter.setRepositoryProperties() per plan.md § Repository Settings
- [ ] T085: Implement GitHubAdapter.setMergeSettings() per plan.md § Repository Settings

### Authentication

- [ ] T086: Implement GitHubAdapter.checkAuth() per plan.md § Authentication
- [ ] T087: Implement GitHubAdapter.authenticate() with install and force flags per plan.md § Authentication

### Template Operations

- [ ] T088: [P] Implement readIssueTemplate() in src/playbooks/scripts/github/templates.ts
- [ ] T089: [P] Implement parseTemplateFrontmatter() in src/playbooks/scripts/github/templates.ts
- [ ] T090: [P] Implement replaceTemplatePlaceholders() in src/playbooks/scripts/github/templates.ts
- [ ] T091: Implement createIssueFromTemplate() integrating template functions with createIssue()

### Mock Implementation

- [ ] T092: Create MockGitHubClient class implementing GitHubClient interface in src/playbooks/scripts/github/mock.ts
- [ ] T093: Implement in-memory data stores (Maps) for issues, PRs, comments in MockGitHubClient
- [ ] T094: [P] Implement all MockGitHubClient issue operations with in-memory CRUD
- [ ] T095: [P] Implement all MockGitHubClient PR operations with in-memory CRUD
- [ ] T096: [P] Implement all MockGitHubClient repository operations with in-memory state

## Step 4: Integration

### CLI Interface

- [ ] T097: Create CLI command parser with command routing structure in src/playbooks/scripts/github/cli.ts
- [ ] T098: Implement command routing for all issue commands per plan.md § CLI Command Structure
- [ ] T099: Implement command routing for all PR commands per plan.md § CLI Command Structure
- [ ] T100: Implement command routing for all repository commands per plan.md § CLI Command Structure
- [ ] T101: Implement command routing for auth commands per plan.md § CLI Command Structure
- [ ] T102: Implement output formatting (JSON vs plain text) based on --json flag
- [ ] T103: Implement help system with --help flag support for all commands
- [ ] T104: Implement error formatting to stderr with actionable remediation

### CLI Executable

- [ ] T105: Create bin/catalyst-github.js executable that imports and invokes CLI parser
- [ ] T106: Add bin entry to package.json pointing to catalyst-github.js
- [ ] T107: Test npx catalyst-github command invocation

### Error Handling and Retries

- [ ] T108: Implement retry logic with exponential backoff for transient errors
- [ ] T109: Implement rate limit handling with retry-after support
- [ ] T110: Implement timeout protection for all execSync calls
- [ ] T111: Add error logging with structured error information

## Step 5: Polish

### Testing and Validation

- [ ] T116: Run all unit tests and verify 90% code coverage target achieved
- [ ] T117: [P] Add edge case tests for empty results, malformed JSON, network timeouts
- [ ] T118: [P] Add integration tests for issue operations (optional, requires gh CLI)
- [ ] T119: [P] Add integration tests for PR operations (optional, requires gh CLI)
- [ ] T120: Verify MockGitHubClient works correctly in playbook tests

### Documentation

- [ ] T121: [P] Update README with catalyst-github CLI usage examples
- [ ] T122: [P] Add JSDoc comments to all public interfaces and classes
- [ ] T123: [P] Document error types and remediation strategies

### Code Quality

- [ ] T124: Run npm run format to format all code
- [ ] T125: Run npm run lint and fix any linting issues
- [ ] T126: Remove code duplication and refactor common patterns
- [ ] T127: Verify all hard-coded repository references removed
- [ ] T128: Review engineering principles compliance per .xe/engineering.md

### Final Validation

- [ ] T129: Test all CLI commands manually with real GitHub repository
- [ ] T130: Verify error messages provide actionable remediation
- [ ] T131: Test authentication flow with --install and --force flags
- [ ] T132: Run full test suite and confirm all tests pass

## Dependencies

**Dependency Rules:**

- Step 1 (Setup) must complete before all other steps
- Step 2 (Tests) must complete before Step 3 (Implementation)
- Tests marked [P] can run in parallel within their category (Adapter tests, CLI tests, etc.)
- Core implementation tasks can be parallelized within categories:
  - Type definitions and errors (T047-T053) can run in parallel after T048
  - Issue operations (T060-T067) can run in parallel after T059
  - PR operations (T068-T078) can run in parallel after T059
  - Repository operations (T079-T085) can run in parallel after T059
  - Template operations (T088-T090) can run in parallel
  - Mock operations (T094-T096) can run in parallel after T093
- Step 4 (Integration) depends on Step 3 completion
- CLI interface tasks (T097-T104) must complete before CLI executable (T105-T107)
- Error handling (T108-T111) must complete before validation
- Step 5 (Polish) depends on Step 4 completion
- Final validation (T129-T132) must complete after all other polish tasks

**Critical Paths:**

1. Setup → Tests → Types/Errors → Adapter Foundation → Issue/PR/Repo Operations → CLI → Validation
2. Mock implementation can proceed in parallel with Adapter once interface is defined (T054)
3. Template operations can proceed independently once types are defined
4. Testing throughout ensures quality at each step
