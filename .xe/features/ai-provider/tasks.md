---
id: ai-provider
title: AI Provider - Tasks
author: "@flanakin"
description: "Implementation tasks for AI provider infrastructure"
---

# Tasks: AI Provider

**Input**: Design documents from `.xe/features/ai-provider/`
**Prerequisites**: plan.md (required), spec.md

## Step 1: Setup

- [x] T001: Create feature documentation
  - @req FR:provider
  - Create `.xe/features/ai-provider/` directory
  - Create `spec.md` with provider interface requirements
  - Create `plan.md` with implementation approach
  - Create `tasks.md` (this file)

## Step 2: Core Implementation

- [x] T002: Create provider directory structure
  - @req FR:provider
  - Create `src/ai/` directory
  - Create `src/ai/providers/` directory

- [x] T003: Implement provider type definitions
  - @req FR:provider.interface
  - @req FR:provider.request
  - @req FR:provider.response
  - @req FR:provider.usage
  - Create `src/ai/types.ts` with AIProvider interface and related types

- [x] T004: Implement provider factory
  - @req FR:factory.create
  - @req FR:factory.list
  - Create `src/ai/providers/factory.ts`
  - Implement createAIProvider() and getAvailableAIProviders()

- [x] T005: Implement mock provider
  - @req FR:mock.provider
  - @req FR:mock.testing
  - Create `src/ai/providers/mock-provider.ts`
  - Implement MockAIProvider class for testing

- [x] T006: Implement provider errors
  - @req FR:errors.not-found
  - @req FR:errors.unavailable
  - Create `src/ai/errors.ts` with AIProviderErrors factory

- [x] T007: Create provider index exports
  - Create `src/ai/index.ts` with all public exports
  - Create `src/ai/providers/index.ts` for provider re-exports

- [x] T008: Implement provider catalog generation
  - @req FR:catalog.discovery
  - @req FR:catalog.generation
  - Update `scripts/generate-provider-registry.ts` to scan `src/ai/providers/`

## Step 3: Tests

- [x] T009: Create test directory structure
  - Create `tests/ai/` directory
  - Create `tests/ai/providers/` directory

- [x] T010: Implement mock provider tests
  - Create `tests/ai/providers/mock-provider.test.ts`

- [x] T011: Implement factory tests
  - Create `tests/ai/providers/factory.test.ts`

## Step 4: Integration

- [x] T012: Integrate with ai-prompt-action
  - Update `src/playbooks/actions/ai/ai-prompt-action.ts` to import from `@ai/`

- [x] T013: Update actions/ai exports
  - Re-export provider types from `@ai/` in `src/playbooks/actions/ai/index.ts`

- [x] T014: Update action tests
  - Update `tests/actions/ai/ai-prompt-action.test.ts` imports
  - Update `tests/actions/ai/integration.test.ts` imports

## Step 5: Documentation

- [x] T015: Update playbook-actions-ai spec
  - Add dependency on `ai-provider`
  - Reference provider interface from ai-provider spec

## Step 6: Validation

- [x] T016: Verify build succeeds
  - Run `npm run build`
  - Verify provider catalog generates correctly

- [x] T017: Verify all tests pass
  - Run `npm test`
  - All tests must pass

## Dependencies

**Task Dependencies:**

- T001 (setup) blocks T002-T008
- T002 (directory) blocks T003-T007
- T003 (types) blocks T004-T006
- T006 (errors) blocks T007 (index)
- T007 (index) blocks T012-T014 (integration)
- T009 (test directory) blocks T010-T011
- T010-T011 (tests) can run in parallel
- T012-T014 (integration) can run in parallel after T007
- T015 (docs) can run in parallel with T12-T14
- T016-T017 (validation) runs after all code changes
