---
id: ai-provider-copilot
title: AI Provider - GitHub Copilot Tasks
author: "@flanakin"
description: "Implementation tasks for GitHub Copilot AI provider"
---

# Tasks: AI Provider - GitHub Copilot

**Input**: Design documents from `.xe/features/ai-provider-copilot/`
**Prerequisites**: plan.md (required), spec.md (required)

## Step 1: Setup

- [ ] T001: Create feature documentation structure
  - Create `.xe/features/ai-provider-copilot/` directory
  - Create `spec.md` with provider requirements
  - Create `plan.md` with implementation approach
  - Create `tasks.md` (this file)

## Step 2: Test Suite - Provider Interface

- [ ] T002: Create copilot-provider.test.ts with test structure
  - @req FR:copilot.interface
  - Create `tests/ai/providers/copilot-provider.test.ts`
  - Import CopilotProvider and test dependencies
  - Setup beforeEach/afterEach hooks for CLI mocking
  - Create helper function `createRequest()` for test requests

- [ ] T003: Write tests for provider properties
  - @req FR:copilot.interface
  - Test `name` property equals `'copilot'`
  - Test `capabilities` array is empty (interactive-only)

- [ ] T004: Write tests for isAvailable() method
  - @req FR:copilot.auth.available
  - Test returns true when all checks pass (CLI exists, authenticated, extension installed, access granted)
  - Test returns false when GitHub CLI not found
  - Test returns false when not authenticated
  - Test returns false when Copilot extension missing
  - Test returns false when no Copilot subscription

- [ ] T005: Write tests for signIn() method
  - @req FR:copilot.auth.signin
  - Test prompts CLI installation when `gh` not found
  - Test triggers `gh auth login` when not authenticated
  - Test installs extension when missing
  - Test throws AIProviderUnavailable when no Copilot access
  - Test completes successfully when all prerequisites met

## Step 3: Test Suite - Execution

- [ ] T006: Write tests for execute() success scenarios
  - @req FR:copilot.execute
  - Test successful prompt execution returns AIProviderResponse
  - Test systemPrompt and prompt combined correctly
  - Test response content extracted from CLI output
  - Test model field set to 'copilot' in response

- [ ] T007: Write tests for execute() with CLI parameters
  - @req FR:copilot.cli
  - Test `gh copilot` command constructed correctly
  - Test prompt passed to CLI stdin
  - Test CLI stdout captured as response content

- [ ] T008: Write tests for model handling
  - @req FR:copilot.models
  - Test model parameter accepted but not used (CLI limitation)
  - Test response model always returns 'copilot'

- [ ] T009: Write tests for timeout and cancellation
  - @req FR:copilot.execute
  - Test inactivityTimeout terminates CLI process
  - Test abortSignal kills process immediately
  - Test timeout throws appropriate error

## Step 4: Test Suite - Token Usage

- [ ] T010: Write tests for usage tracking
  - @req FR:copilot.usage.tokens
  - Test usage field undefined when CLI provides no data
  - Test usage estimation (optional) if heuristics implemented
  - Test response structure valid with undefined usage

## Step 5: Test Suite - Error Handling

- [ ] T011: Write tests for CLI missing errors
  - @req FR:copilot.errors.cli-missing
  - Test throws AIProviderUnavailable when `gh` not found
  - Test error message indicates CLI missing
  - Test guidance suggests CLI installation

- [ ] T012: Write tests for extension missing errors
  - @req FR:copilot.errors.extension-missing
  - Test throws AIProviderUnavailable when extension not installed
  - Test error message indicates extension missing
  - Test guidance suggests `gh extension install`

- [ ] T013: Write tests for authentication errors
  - @req FR:copilot.errors.auth
  - Test throws AIProviderUnavailable when not authenticated
  - Test error message indicates authentication required
  - Test guidance suggests `gh auth login`

- [ ] T014: Write tests for no access errors
  - @req FR:copilot.errors.no-access
  - Test throws AIProviderUnavailable when no Copilot subscription
  - Test error message indicates subscription required
  - Test guidance explains Copilot subscription requirement

- [ ] T015: Write tests for CLI execution errors
  - @req FR:copilot.execute
  - Test stderr captured and included in error
  - Test CLI exit codes handled correctly
  - Test process errors thrown as CatalystError

## Step 6: Implementation - Provider Core

- [ ] T016: Create copilot-provider.ts file structure
  - @req FR:copilot.interface
  - Create `src/ai/providers/copilot-provider.ts`
  - Import AIProvider interface and types
  - Import child_process for CLI execution
  - Define CopilotProvider class implementing AIProvider

- [ ] T017: Implement provider properties
  - @req FR:copilot.interface
  - Set `name` property to `'copilot'`
  - Set `capabilities` to empty array

- [ ] T018: Implement isAvailable() method
  - @req FR:copilot.auth.available
  - @req FR:copilot.auth.github
  - Check GitHub CLI exists on PATH
  - Run `gh auth status` to verify authentication
  - Run `gh extension list` to verify Copilot extension
  - Attempt minimal Copilot invocation to verify access
  - Return true only if all checks pass

- [ ] T019: Implement signIn() method
  - @req FR:copilot.auth.signin
  - Guide CLI installation if missing
  - Trigger `gh auth login` if not authenticated
  - Run `gh extension install github/gh-copilot` if missing
  - Throw AIProviderUnavailable if no subscription access

## Step 7: Implementation - Execution

- [ ] T020: Implement execute() method - basic structure
  - @req FR:copilot.execute
  - @req FR:copilot.cli
  - Accept AIProviderRequest parameter
  - Return Promise<AIProviderResponse>
  - Construct combined prompt from systemPrompt and prompt
  - Spawn `gh copilot` child process

- [ ] T021: Implement execute() method - CLI communication
  - @req FR:copilot.cli
  - Pass prompt to CLI stdin
  - Capture stdout for response content
  - Capture stderr for error handling
  - Wait for process completion

- [ ] T022: Implement execute() method - response parsing
  - @req FR:copilot.execute
  - @req FR:copilot.models
  - Extract response content from CLI output
  - Construct AIProviderResponse object
  - Set model to 'copilot'
  - Set usage to undefined (CLI limitation)

- [ ] T023: Implement execute() method - timeout support
  - @req FR:copilot.execute
  - Monitor inactivity using inactivityTimeout parameter
  - Kill process if no output within timeout
  - Throw timeout error with context

- [ ] T024: Implement execute() method - cancellation support
  - @req FR:copilot.execute
  - Listen to abortSignal
  - Kill CLI process when signal fires
  - Clean up resources properly

## Step 8: Implementation - Error Handling

- [ ] T025: Implement CLI missing error handling
  - @req FR:copilot.errors.cli-missing
  - Detect when `gh` command not found
  - Throw AIProviderUnavailable with installation guidance

- [ ] T026: Implement extension missing error handling
  - @req FR:copilot.errors.extension-missing
  - Detect when Copilot extension not installed
  - Throw AIProviderUnavailable with extension install guidance

- [ ] T027: Implement authentication error handling
  - @req FR:copilot.errors.auth
  - Detect when not authenticated with GitHub
  - Throw AIProviderUnavailable with login guidance

- [ ] T028: Implement no access error handling
  - @req FR:copilot.errors.no-access
  - Detect when no Copilot subscription
  - Throw AIProviderUnavailable with subscription guidance

- [ ] T029: Implement CLI execution error handling
  - @req FR:copilot.execute
  - Parse stderr for error details
  - Handle non-zero exit codes
  - Throw CatalystError with appropriate context

## Step 9: Integration and Validation

- [ ] T030: Export CopilotProvider from providers index
  - Add export to `src/ai/providers/index.ts`
  - Ensure provider discoverable by factory

- [ ] T031: Run provider catalog generation
  - Execute `npm run build` to regenerate provider-catalog.ts
  - Verify CopilotProvider included in AUTO-GENERATED catalog

- [ ] T032: Run test suite
  - @req NFR:copilot.performance.instantiation
  - @req NFR:copilot.performance.auth-check
  - Execute `npm test` for all Copilot tests
  - Verify all tests pass
  - Confirm code coverage meets standards

- [ ] T033: Manual integration testing
  - Test with actual GitHub CLI installed
  - Test authentication flow
  - Test successful prompt execution
  - Test error scenarios (no extension, not authenticated, etc.)

- [ ] T034: Update feature documentation
  - Mark spec.md requirements as implemented
  - Document any implementation notes or deviations
  - Add usage examples to plan.md if needed

## Dependencies

**Task Dependencies:**

- T001 (setup) must complete before all other tasks
- T002 (test structure) must complete before T003-T015
- T003-T015 (all tests) should complete before T016-T029 (TDD approach)
- T016 (file structure) must complete before T017-T029
- T017-T019 (provider core) must complete before T020-T024 (execution)
- T020 (basic structure) must complete before T021-T024
- T025-T029 (error handling) can run in parallel after T020
- T030 (export) must complete before T031 (catalog)
- T031 (catalog) must complete before T032 (tests)
- T032 (tests) must pass before T033 (manual testing)
- T034 (docs) runs last after validation

**Feature Dependencies:**

- **ai-provider**: Required for AIProvider interface and types
- **error-handling**: Required for CatalystError
