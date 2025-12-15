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

- [x] T001: Create provider directory structure
  - @req FR:ai-provider/provider
  - Create `src/ai/` directory
  - Create `src/ai/providers/` directory

## Step 2: Core Implementation

- [x] T002: Implement provider type definitions
  - @req FR:ai-provider/provider.interface
  - @req FR:ai-provider/provider.capability
  - @req FR:ai-provider/provider.request
  - @req FR:ai-provider/provider.response
  - @req FR:ai-provider/provider.usage
  - Create `src/ai/types.ts` with AIProvider interface and related types

- [x] T003: Implement provider factory
  - @req FR:ai-provider/factory.create
  - @req FR:ai-provider/factory.list
  - @req FR:ai-provider/factory.headless
  - Create `src/ai/providers/factory.ts`
  - Implement createAIProvider() and getAvailableAIProviders()

- [x] T004: Implement mock provider
  - @req FR:ai-provider/mock.provider
  - @req FR:ai-provider/mock.testing
  - Create `src/ai/providers/mock-provider.ts`
  - Implement MockAIProvider class for testing

- [x] T005: Implement provider errors
  - @req FR:ai-provider/errors.not-found
  - @req FR:ai-provider/errors.unavailable
  - Create `src/ai/errors.ts` with AIProviderErrors factory

- [x] T006: Create provider index exports
  - @req FR:ai-provider/provider
  - Create `src/ai/index.ts` with all public exports
  - Create `src/ai/providers/index.ts` for provider re-exports

- [x] T007: Implement provider catalog generation
  - @req FR:ai-provider/catalog.discovery
  - @req FR:ai-provider/catalog.generation
  - @req FR:ai-provider/catalog.integration
  - Update `scripts/generate-provider-registry.ts` to scan `src/ai/providers/`

## Step 3: Tests

- [x] T008: Create test directory structure
  - @req FR:ai-provider/mock.testing
  - Create `tests/ai/` directory
  - Create `tests/ai/providers/` directory

- [x] T009: Implement mock provider tests
  - @req FR:ai-provider/mock.provider
  - @req FR:ai-provider/mock.testing
  - Create `tests/ai/providers/mock-provider.test.ts`

- [x] T010: Implement factory tests
  - @req FR:ai-provider/factory.create
  - @req FR:ai-provider/factory.list
  - @req FR:ai-provider/factory.headless
  - @req FR:ai-provider/errors.not-found
  - Create `tests/ai/providers/factory.test.ts`

## Step 4: Integration

- [x] T011: Integrate with ai-prompt-action
  - @req FR:ai-provider/provider
  - Update `src/playbooks/actions/ai/ai-prompt-action.ts` to import from `@ai/`

- [x] T012: Update actions/ai exports
  - @req FR:ai-provider/provider
  - Re-export provider types from `@ai/` in `src/playbooks/actions/ai/index.ts`

- [x] T013: Update action tests
  - @req FR:ai-provider/provider
  - @req FR:ai-provider/mock.testing
  - Update `tests/actions/ai/ai-prompt-action.test.ts` imports
  - Update `tests/actions/ai/integration.test.ts` imports

## Step 5: Documentation

- [x] T014: Update playbook-actions-ai spec
  - @req FR:ai-provider/provider
  - Add dependency on `ai-provider`
  - Reference provider interface from ai-provider spec

## Step 6: Validation

- [x] T015: Verify build succeeds
  - @req FR:ai-provider/catalog.integration
  - @req NFR:ai-provider/performance.instantiation
  - @req NFR:ai-provider/performance.factory
  - Run `npm run build`
  - Verify provider catalog generates correctly

- [x] T016: Verify all tests pass
  - @req FR:ai-provider/provider
  - @req FR:ai-provider/factory
  - @req FR:ai-provider/mock
  - @req FR:ai-provider/errors
  - Run `npm test`
  - All tests must pass

## Dependencies

**Task Dependencies:**

- T001 (directory) blocks T002-T007
- T002 (types) blocks T003-T005
- T005 (errors) blocks T006 (index)
- T006 (index) blocks T011-T013 (integration)
- T008 (test directory) blocks T009-T010
- T009-T010 (tests) can run in parallel
- T011-T013 (integration) can run in parallel after T006
- T014 (docs) can run in parallel with T011-T013
- T015-T016 (validation) runs after all code changes
