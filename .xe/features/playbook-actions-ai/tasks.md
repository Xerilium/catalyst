---
id: playbook-actions-ai
title: Playbook Actions - AI
author: "@flanakin"
description: "Implementation tasks for ai-prompt action"
---

# Tasks: Playbook Actions - AI

**Input**: Design documents from `.xe/features/playbook-actions-ai/`
**Prerequisites**: plan.md (required), research.md, spec.md

## Step 1: Setup

- [x] T001: Create project structure per implementation plan
  - Create `src/playbooks/actions/ai/` directory
  - Create `tests/actions/ai/` directory
  - Verify directories created correctly

## Step 2: Tests First (TDD)

**CRITICAL: Tests MUST be written and MUST FAIL before ANY implementation**

- [x] T002: [P] Contract test for role mapping in `tests/actions/ai/roles.test.ts`
  - @req ai-prompt.role
  - @req ai-prompt.role.name
  - @req ai-prompt.role.custom
  - @req ai-prompt.role.default
  - Test known role "Product Manager" maps to system prompt
  - Test known role "Engineer" maps to system prompt
  - Test known role "Architect" maps to system prompt
  - Test case-insensitive matching ("product manager", "ENGINEER")
  - Test custom role (non-matching) used directly as system prompt
  - Test empty role defaults to playbook owner
  - Test undefined role defaults to playbook owner
  - All tests must fail initially

- [x] T003: [P] Contract test for context assembly in `tests/actions/ai/context.test.ts`
  - @req ai-prompt.context
  - @req ai-prompt.context.detection
  - @req ai-prompt.context.files
  - @req ai-prompt.context.instruction
  - Test empty context returns empty instruction
  - Test single context value creates temp file
  - Test multiple context values create multiple temp files
  - Test string values written as-is
  - Test object values JSON-stringified
  - Test cleanup files list populated
  - Test instruction block format matches spec
  - Test file path detection (added)
  - All tests must fail initially

- [x] T004: [P] Contract test for return instruction in `tests/actions/ai/context.test.ts` (combined with T003)
  - @req ai-prompt.return
  - @req ai-prompt.return.empty
  - @req ai-prompt.return.file
  - Test empty return returns null outputFile
  - Test undefined return returns null outputFile
  - Test valid return creates instruction with file path
  - Test instruction block format matches spec
  - All tests must fail initially

- [x] T007: [P] Contract test for AIPromptAction in `tests/actions/ai/ai-prompt-action.test.ts`
  - @req ai-prompt.config
  - @req ai-prompt.metadata
  - @req ai-prompt.validation
  - @req ai-prompt.result
  - @req ai-prompt.role
  - @req ai-prompt.context
  - @req ai-prompt.return
  - @req ai-prompt.timeout.default
  - Test valid execution with mock provider
  - Test missing prompt throws AIPromptMissing
  - Test empty prompt throws AIPromptEmpty
  - Test invalid timeout throws InvalidAITimeout
  - Test unknown provider throws AIProviderNotFound
  - Test role resolution (known role, custom, default from owner)
  - Test context assembly integration
  - Test return value extraction from output file
  - Test cleanup of temp files on success
  - Test cleanup of temp files on error
  - All tests must fail initially

- [x] T008: [P] Integration test in `tests/actions/ai/integration.test.ts`
  - @req ai-prompt.config
  - @req ai-prompt.result
  - @req ai-prompt.context
  - @req ai-prompt.context.position
  - @req ai-prompt.timeout.default
  - @req ai-prompt.provider-resolution
  - @req ai-prompt.role.default
  - Test full action execution flow with mock provider
  - Test context files created and cleaned up
  - Test output file created and cleaned up
  - Test error propagation from provider
  - All tests must fail initially

## Step 3: Core Implementation

- [x] T010: [P] Action type definitions in `src/playbooks/actions/ai/types.ts`
  - @req ai-prompt.config
  - Define AIPromptConfig interface
  - Add JSDoc comments for all properties (used for schema generation)

- [x] T011: [P] Error factories in `src/playbooks/actions/ai/errors.ts`
  - @req ai-prompt.validation.prompt-missing
  - @req ai-prompt.validation.prompt-empty
  - @req ai-prompt.validation.timeout-invalid
  - @req ai-prompt.timeout.error
  - @req provider.factory
  - Create AIPromptErrors factory functions (promptMissing, promptEmpty, timeoutInvalid, timeout)
  - Create AIProviderErrors factory functions (notFound, unavailable)
  - Each factory returns CatalystError with consistent code/guidance

- [x] T012: Implement role mapping in `src/playbooks/actions/ai/roles.ts`
  - @req ai-prompt.role
  - @req ai-prompt.role.name
  - @req ai-prompt.role.custom
  - @req ai-prompt.role.default
  - Define ROLE_MAPPINGS constant with Product Manager, Engineer, Architect
  - Implement resolveSystemPrompt(role, playbookOwner) function
  - Handle case-insensitive matching
  - Handle custom roles (non-matching)
  - Handle default from playbook owner

- [x] T013: Implement context assembly in `src/playbooks/actions/ai/context.ts`
  - @req ai-prompt.context
  - @req ai-prompt.context.detection
  - @req ai-prompt.context.files
  - @req ai-prompt.context.instruction
  - Implement assembleContext(context) async function
  - Create temp files for each context value (or use existing file if path exists)
  - Generate instruction block per spec
  - Return cleanup file list
  - Handle empty/undefined context

- [x] T014: Implement return instruction in `src/playbooks/actions/ai/context.ts`
  - @req ai-prompt.return
  - @req ai-prompt.return.empty
  - @req ai-prompt.return.file
  - Implement assembleReturnInstruction(returnDesc) function
  - Create temp output file path
  - Generate instruction block per spec
  - Return null outputFile for empty/undefined return

- [x] T018: Implement AIPromptAction in `src/playbooks/actions/ai/ai-prompt-action.ts`
  - @req ai-prompt.config
  - @req ai-prompt.metadata
  - @req ai-prompt.validation
  - @req ai-prompt.role
  - @req ai-prompt.context.position
  - @req ai-prompt.provider-resolution
  - @req ai-prompt.return
  - @req ai-prompt.result
  - @req ai-prompt.timeout.default
  - Implement PlaybookAction<AIPromptConfig> interface
  - Add static actionType = 'ai-prompt'
  - Add static primaryProperty = 'prompt'
  - Implement execute() method per plan.md algorithm:
    1. Validate configuration
    2. Resolve system prompt from role
    3. Assemble context files
    4. Assemble return instruction
    5. Build final prompt
    6. Create provider
    7. Execute AI request
    8. Extract return value from output file
    9. Cleanup temp files
    10. Return PlaybookActionResult

- [x] T019: Public API exports in `src/playbooks/actions/ai/index.ts`
  - Export AIPromptAction class
  - Export AIPromptConfig type
  - Export error factories

## Step 4: Integration

- [x] T020: Register action in build system
  - Ensure AIPromptAction is discovered by generate-action-registry.ts script
  - Verify ACTION_REGISTRY includes ai-prompt action with metadata
  - Verify primaryProperty and configSchema generated correctly

- [x] T021: Verify action integration
  - Action implements PlaybookAction interface correctly
  - Provider factory works with action
  - Context and return file handling works end-to-end
  - Error codes match spec

## Step 5: Polish

- [ ] T022: [P] Performance tests in `tests/actions/ai/performance.test.ts`
  - Test provider instantiation <10ms
  - Test action overhead <100ms (excluding AI response)

- [ ] T023: Edge case tests
  - Test large context values (>1MB)
  - Test many context entries (100+)
  - Test special characters in context names
  - Test null/undefined values in context
  - Test concurrent action executions

- [ ] T024: [P] Write user documentation in `docs/playbooks/actions/ai-prompt.md`
  - Overview section
  - Basic usage with examples
  - Roles section (known roles, custom, default)
  - Context section with examples
  - Return values section with examples
  - Advanced configuration (providers, models, timeouts)
  - Error handling section

- [x] T025: Code review and cleanup
  - Remove any code duplication
  - Ensure consistent error messages
  - Verify all error codes follow conventions
  - Check TypeScript types for correctness
  - Run linter and fix any issues

- [x] T026: Final test run
  - Run full test suite: `npm test actions/ai`
  - Verify 90% code coverage (100% for error paths)
  - Fix any failing tests
  - Verify all tests pass

## Dependencies

**Task Dependencies:**

- T001 (setup) must complete before all other tasks
- Tests (T002-T008) must be written before implementation (T009-T019)
- T009 (provider types) must complete before T010-T011, T015-T016
- T010 (action types) must complete before T011, T018
- T011 (errors) must complete before T012-T016, T018
- T012-T014 (utilities) must complete before T018 (action)
- T015 (mock provider) must complete before T016b (catalog generation)
- T016b (catalog generation) must complete before T016 (factory)
- T015-T016 (provider/factory) must complete before T018 (action)
- T017 (provider exports) must complete before T019 (public exports)
- T018 (action) must complete before T019 (exports)
- T019 (exports) blocks T020 (registration)
- T020 (registration) blocks T021 (integration)
- Implementation (T009-T021) must complete before polish (T022-T026)
- T022-T024 can run in parallel
- T025-T026 must run sequentially at the end
