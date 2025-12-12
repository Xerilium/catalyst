---
id: ai-provider
title: AI Provider - Tasks
author: "@flanakin"
description: "Implementation tasks for AI provider infrastructure extraction"
---

# Tasks: AI Provider

**Input**: Design documents from `.xe/features/ai-provider/`
**Prerequisites**: plan.md (required), spec.md

## Step 1: Setup

- [x] T001: Create feature documentation
  - Create `.xe/features/ai-provider/` directory
  - Create `spec.md` with provider interface requirements
  - Create `plan.md` with extraction approach
  - Create `tasks.md` (this file)

## Step 2: Move Provider Code

- [ ] T002: Create new provider directory structure
  - @req FR:provider
  - Create `src/playbooks/scripts/ai/` directory
  - Create `src/playbooks/scripts/ai/providers/` directory

- [ ] T003: Move provider type definitions
  - @req FR:provider.interface
  - @req FR:provider.request
  - @req FR:provider.response
  - @req FR:provider.usage
  - Move `types.ts` to new location
  - No content changes, just move

- [ ] T004: Move provider factory
  - @req FR:factory.create
  - @req FR:factory.list
  - Move `factory.ts` to new location
  - Update import paths within file

- [ ] T005: Move mock provider
  - @req FR:mock.provider
  - @req FR:mock.testing
  - Move `mock-provider.ts` to new location
  - Update import paths within file

- [ ] T006: Create provider errors file
  - @req FR:errors.not-found
  - @req FR:errors.unavailable
  - Extract `AIProviderErrors` from `actions/ai/errors.ts`
  - Create `errors.ts` in new location

- [ ] T007: Create provider index
  - Create `index.ts` with all exports
  - Export types, factory, mock provider, errors

- [ ] T008: Update generate-provider-registry.ts
  - @req FR:catalog.discovery
  - @req FR:catalog.generation
  - Update scan path to new location

## Step 3: Move Provider Tests

- [ ] T009: Create test directory structure
  - Create `tests/ai/` directory
  - Create `tests/ai/providers/` directory

- [ ] T010: Move mock provider tests
  - Move `tests/actions/ai/providers/mock-provider.test.ts`
  - Update import paths

- [ ] T011: Move factory tests
  - Move `tests/actions/ai/providers/factory.test.ts`
  - Update import paths

## Step 4: Update Consuming Code

- [ ] T012: Update ai-prompt-action imports
  - Update `src/playbooks/scripts/playbooks/actions/ai/ai-prompt-action.ts`
  - Change provider imports to new location

- [ ] T013: Update actions/ai/index.ts exports
  - Re-export provider types from new location
  - Keep backward compatibility for existing consumers

- [ ] T014: Update actions/ai/errors.ts
  - Remove `AIProviderErrors` (now in provider errors.ts)
  - Keep `AIPromptErrors` only

- [ ] T015: Update action tests
  - Update `tests/actions/ai/ai-prompt-action.test.ts` imports
  - Update `tests/actions/ai/integration.test.ts` imports

## Step 5: Update Feature Documentation

- [ ] T016: Update playbook-actions-ai spec
  - Add dependency on `ai-provider`
  - Reference provider interface from ai-provider spec
  - Keep ai-prompt action requirements

## Step 6: Validation

- [ ] T017: Verify build succeeds
  - Run `npm run build`
  - Verify provider catalog generates in new location
  - Fix any TypeScript errors

- [ ] T018: Verify all tests pass
  - Run `npm test`
  - All 112+ tests must pass
  - Fix any import issues

- [ ] T019: Clean up old provider directory
  - Remove `src/playbooks/scripts/playbooks/actions/ai/providers/` directory
  - Verify no orphaned files

## Dependencies

**Task Dependencies:**

- T001 (setup) must complete before all other tasks
- T002 (directory) must complete before T003-T007
- T003 (types) must complete before T004-T006
- T006 (errors) must complete before T007 (index)
- T007 (index) must complete before T012-T015 (consumer updates)
- T008 (registry script) can run in parallel with T003-T007
- T009 (test directory) must complete before T010-T011
- T010-T011 (test moves) can run in parallel
- T012-T015 (updates) can run in parallel after T007
- T016 (docs) can run in parallel with T12-T15
- T017-T18 (validation) must run after all code changes
- T019 (cleanup) runs last after validation passes
