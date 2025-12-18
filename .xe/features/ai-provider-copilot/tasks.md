---
id: ai-provider-copilot
title: AI Provider - GitHub Copilot Tasks
author: "@flanakin"
description: "Implementation tasks for GitHub Copilot AI provider"
---

<!-- markdownlint-disable single-title -->

# Tasks: AI Provider - GitHub Copilot

**Input**: Design documents from `.xe/features/ai-provider-copilot/`
**Prerequisites**: plan.md (required), spec.md (required)

## Step 1: Setup

- [ ] T001: Install GitHub CLI (manual, for testing)
  - @req FR:ai-provider-copilot/copilot.cli
  - Download and install from [GitHub CLI](https://cli.github.com/)
  - Run `gh auth login` to authenticate
  - Verify with `gh auth status`

- [ ] T002: Install GitHub Copilot extension (manual, for testing)
  - @req FR:ai-provider-copilot/copilot.auth.github
  - Run `gh extension install github/gh-copilot`
  - Requires active [GitHub Copilot](https://github.com/features/copilot) subscription
  - Verify with `gh copilot --help`

## Step 2: Test Suite - Provider Interface

- [x] T003: Create copilot-provider.test.ts with test structure
  - @req FR:ai-provider-copilot/copilot.interface
  - Create `tests/ai/providers/copilot-provider.test.ts`
  - Import CopilotProvider and test dependencies
  - Setup beforeEach/afterEach hooks for CLI mocking
  - Create helper function `createRequest()` for test requests

- [x] T004: Write tests for provider properties
  - @req FR:ai-provider-copilot/copilot.interface
  - Test `name` property equals `'copilot'`
  - Test `capabilities` array is empty (interactive-only)

- [x] T005: Write tests for isAvailable() method
  - @req FR:ai-provider-copilot/copilot.auth.available
  - Test returns true when all checks pass (CLI exists, authenticated, extension installed, access granted)
  - Test returns false when GitHub CLI not found
  - Test returns false when not authenticated
  - Test returns false when Copilot extension missing
  - Test returns false when no Copilot subscription

- [x] T006: Write tests for signIn() method
  - @req FR:ai-provider-copilot/copilot.auth.signin
  - Test prompts CLI installation when `gh` not found
  - Test triggers `gh auth login` when not authenticated
  - Test installs extension when missing
  - Test throws AIProviderUnavailable when no Copilot access
  - Test completes successfully when all prerequisites met

## Step 3: Test Suite - Execution

- [x] T007: Write tests for execute() success scenarios
  - @req FR:ai-provider-copilot/copilot.execute
  - Test successful prompt execution returns AIProviderResponse
  - Test systemPrompt and prompt combined correctly
  - Test response content extracted from CLI output
  - Test model field set to 'copilot' in response

- [x] T008: Write tests for execute() with CLI parameters
  - @req FR:ai-provider-copilot/copilot.cli
  - Test `gh copilot` command constructed correctly
  - Test prompt passed to CLI stdin
  - Test CLI stdout captured as response content

- [x] T009: Write tests for model handling
  - @req FR:ai-provider-copilot/copilot.models
  - Test model parameter accepted but not used (CLI limitation)
  - Test response model always returns 'copilot'

- [x] T010: Write tests for timeout and cancellation
  - @req FR:ai-provider-copilot/copilot.execute
  - Test inactivityTimeout terminates CLI process
  - Test abortSignal kills process immediately
  - Test timeout throws appropriate error

## Step 4: Test Suite - Token Usage

- [x] T011: Write tests for usage tracking
  - @req FR:ai-provider-copilot/copilot.usage.tokens
  - Test usage field undefined when CLI provides no data
  - Test usage estimation (optional) if heuristics implemented
  - Test response structure valid with undefined usage

## Step 5: Test Suite - Error Handling

- [x] T012: Write tests for CLI missing errors
  - @req FR:ai-provider-copilot/copilot.errors.cli-missing
  - Test throws AIProviderUnavailable when `gh` not found
  - Test error message indicates CLI missing
  - Test guidance suggests CLI installation

- [x] T013: Write tests for extension missing errors
  - @req FR:ai-provider-copilot/copilot.errors.extension-missing
  - Test throws AIProviderUnavailable when extension not installed
  - Test error message indicates extension missing
  - Test guidance suggests `gh extension install`

- [x] T014: Write tests for authentication errors
  - @req FR:ai-provider-copilot/copilot.errors.auth
  - Test throws AIProviderUnavailable when not authenticated
  - Test error message indicates authentication required
  - Test guidance suggests `gh auth login`

- [x] T015: Write tests for no access errors
  - @req FR:ai-provider-copilot/copilot.errors.no-access
  - Test throws AIProviderUnavailable when no Copilot subscription
  - Test error message indicates subscription required
  - Test guidance explains Copilot subscription requirement

- [x] T016: Write tests for CLI execution errors
  - @req FR:ai-provider-copilot/copilot.execute
  - Test stderr captured and included in error
  - Test CLI exit codes handled correctly
  - Test process errors thrown as CatalystError

## Step 6: Implementation - Provider Core

- [x] T017: Create copilot-provider.ts file structure
  - @req FR:ai-provider-copilot/copilot.interface
  - Create `src/ai/providers/copilot-provider.ts`
  - Import AIProvider interface and types
  - Import child_process for CLI execution
  - Define CopilotProvider class implementing AIProvider

- [x] T018: Implement provider properties
  - @req FR:ai-provider-copilot/copilot.interface
  - @req FR:ai-provider-copilot/copilot.commands
  - Set `name` property to `'copilot'`
  - Set `displayName` property to `'Copilot'`
  - Set `capabilities` to empty array
  - Set `commands` property with Copilot-specific configuration

- [x] T019: Implement isAvailable() method
  - @req FR:ai-provider-copilot/copilot.auth.available
  - @req FR:ai-provider-copilot/copilot.auth.github
  - Check GitHub CLI exists on PATH
  - Run `gh auth status` to verify authentication
  - Run `gh extension list` to verify Copilot extension
  - Attempt minimal Copilot invocation to verify access
  - Return true only if all checks pass

- [x] T020: Implement signIn() method
  - @req FR:ai-provider-copilot/copilot.auth.signin
  - Guide CLI installation if missing
  - Trigger `gh auth login` if not authenticated
  - Run `gh extension install github/gh-copilot` if missing
  - Throw AIProviderUnavailable if no subscription access

## Step 7: Implementation - Execution

- [x] T021: Implement execute() method - basic structure
  - @req FR:ai-provider-copilot/copilot.execute
  - @req FR:ai-provider-copilot/copilot.cli
  - Accept AIProviderRequest parameter
  - Return Promise<AIProviderResponse>
  - Construct combined prompt from systemPrompt and prompt
  - Spawn `gh copilot` child process

- [x] T022: Implement execute() method - CLI communication
  - @req FR:ai-provider-copilot/copilot.cli
  - Pass prompt to CLI stdin
  - Capture stdout for response content
  - Capture stderr for error handling
  - Wait for process completion

- [x] T023: Implement execute() method - response parsing
  - @req FR:ai-provider-copilot/copilot.execute
  - @req FR:ai-provider-copilot/copilot.models
  - Extract response content from CLI output
  - Construct AIProviderResponse object
  - Set model to 'copilot'
  - Set usage to undefined (CLI limitation)

- [x] T024: Implement execute() method - timeout support
  - @req FR:ai-provider-copilot/copilot.execute
  - Monitor inactivity using inactivityTimeout parameter
  - Kill process if no output within timeout
  - Throw timeout error with context

- [x] T025: Implement execute() method - cancellation support
  - @req FR:ai-provider-copilot/copilot.execute
  - Listen to abortSignal
  - Kill CLI process when signal fires
  - Clean up resources properly

## Step 8: Implementation - Error Handling

- [x] T026: Implement CLI missing error handling
  - @req FR:ai-provider-copilot/copilot.errors.cli-missing
  - Detect when `gh` command not found
  - Throw AIProviderUnavailable with installation guidance

- [x] T027: Implement extension missing error handling
  - @req FR:ai-provider-copilot/copilot.errors.extension-missing
  - Detect when Copilot extension not installed
  - Throw AIProviderUnavailable with extension install guidance

- [x] T028: Implement authentication error handling
  - @req FR:ai-provider-copilot/copilot.errors.auth
  - Detect when not authenticated with GitHub
  - Throw AIProviderUnavailable with login guidance

- [x] T029: Implement no access error handling
  - @req FR:ai-provider-copilot/copilot.errors.no-access
  - Detect when no Copilot subscription
  - Throw AIProviderUnavailable with subscription guidance

- [x] T030: Implement CLI execution error handling
  - @req FR:ai-provider-copilot/copilot.execute
  - Parse stderr for error details
  - Handle non-zero exit codes
  - Throw CatalystError with appropriate context

## Step 9: Integration and Validation

- [x] T031: Export CopilotProvider from providers index
  - @req FR:ai-provider-copilot/copilot.interface
  - Add export to `src/ai/providers/index.ts`
  - Ensure provider discoverable by factory

- [x] T032: Run provider catalog generation
  - @req FR:ai-provider-copilot/copilot.interface
  - Execute `npm run build` to regenerate provider-catalog.ts
  - Verify CopilotProvider included in AUTO-GENERATED catalog

- [x] T033: Run test suite
  - @req NFR:ai-provider-copilot/copilot.performance.instantiation
  - @req NFR:ai-provider-copilot/copilot.performance.auth-check
  - Execute `npm test` for all Copilot tests
  - Verify all tests pass
  - Confirm code coverage meets standards

- [ ] T034: Manual integration testing
  - @req FR:ai-provider-copilot/copilot.execute
  - @req FR:ai-provider-copilot/copilot.auth.signin
  - @req FR:ai-provider-copilot/copilot.errors
  - Test with actual GitHub CLI installed
  - Test authentication flow
  - Test successful prompt execution
  - Test error scenarios (no extension, not authenticated, etc.)

- [ ] T035: Update feature documentation
  - @req FR:ai-provider-copilot/copilot
  - Mark spec.md requirements as implemented
  - Document any implementation notes or deviations
  - Add usage examples to plan.md if needed

## Dependencies

**Task Dependencies:**

- T001-T002 (setup) are manual prerequisites for integration testing
- T003 (test structure) must complete before T004-T016
- T004-T016 (all tests) should complete before T017-T030 (TDD approach)
- T017 (file structure) must complete before T018-T030
- T018-T020 (provider core) must complete before T021-T025 (execution)
- T021 (basic structure) must complete before T022-T025
- T026-T030 (error handling) can run in parallel after T021
- T031 (export) must complete before T032 (catalog)
- T032 (catalog) must complete before T033 (tests)
- T033 (tests) must pass before T034 (manual testing)
- T035 (docs) runs last after validation

**Feature Dependencies:**

- **ai-provider**: Required for AIProvider interface and types
- **error-handling**: Required for CatalystError
