---
id: [feature-id]
title: [feature-name]
author: [engineer]
description: "This document defines the tasks required to fully implement the {feature-name} feature from scratch."
---

# Tasks: {feature-name}

**Input**: Design documents from `.xe/features/{feature-id}/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

> [INSTRUCTIONS]
> This is a "living specification" task list, meaning all tasks in this file assume this feature is being implemented for the first time.
>
> **Task Execution Rules:**
>
> - All task lists follow standard markdown checkbox format (`- [ ]`).
> - Tasks execute sequentially unless flagged for parallel execution with `[P]`.
> - Parallel tasks run together in batches. Non-parallel tasks after a parallel batch wait for ALL parallel tasks to complete.
> - Each step waits for all tasks in the previous step to complete.
> - Each task should be committed independently within the rollout branch.
>
> **Parallelization Example:**
>
> ```markdown
> - [ ] T001: Setup project         # Runs alone (sequential)
> - [ ] T002: [P] Create Model A    # ┐
> - [ ] T003: [P] Create Model B    # ├─ Run in parallel
> - [ ] T004: [P] Create Model C    # ┘
> - [ ] T005: Create Service        # Runs after T002-T004 complete (depends on models)
> - [ ] T006: [P] Test Service      # ┐
> - [ ] T007: [P] Update Docs       # ┘ Run in parallel
> ```
>
> Use the following steps to define the tasks:
>
> 1. **From Contracts**:
>    - Each contract file → contract test task [P]
>    - Each endpoint → implementation task
> 2. **From Data Model**:
>    - Each entity → model creation task [P]
>    - Relationships → service layer tasks
> 3. **From User Stories**:
>    - Each story → integration test [P]
>    - Quickstart scenarios → validation tasks

## Step 1: Setup

> [INSTRUCTIONS]
> Task list of setup instructions. Examples:
>
> - [ ] T001: Create project structure per implementation plan
> - [ ] T002: Initialize [language] project with [framework] dependencies
> - [ ] T003: [P] Configure linting and formatting tools

## Step 2: Tests First (TDD)

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

> [INSTRUCTIONS]
> Task list of any tests that should be created to follow a test-driven development process where tests are placeholders that fail before implementation and are expected to pass without changes as the implementation is completed. Examples:
>
> - [ ] T004 [P] Contract test POST /api/users in tests/contract/test_users_post.py
> - [ ] T005 [P] Contract test GET /api/users/{id} in tests/contract/test_users_get.py
> - [ ] T006 [P] Integration test user registration in tests/integration/test_registration.py
> - [ ] T007 [P] Integration test auth flow in tests/integration/test_auth.py

## Step 3: Core Implementation

> [INSTRUCTIONS]
> Task list of the core feature implementation steps. Examples:
>
> - [ ] T008 [P] User model in src/models/user.py
> - [ ] T009 [P] UserService CRUD in src/services/user_service.py
> - [ ] T010 [P] CLI --create-user in src/cli/user_commands.py
> - [ ] T011 POST /api/users endpoint
> - [ ] T012 GET /api/users/{id} endpoint
> - [ ] T013 Input validation
> - [ ] T014 Error handling and logging

## Step 4: Integration

> [INSTRUCTIONS]
> Task list of any integration points with internal or external dependencies. Examples:
>
> - [ ] T015 Connect UserService to DB
> - [ ] T016 Auth middleware
> - [ ] T017 Request/response logging
> - [ ] T018 CORS and security headers

## Step 5: Polish

> [INSTRUCTIONS]
> Task list of any finalization tasks. Examples:
>
> - [ ] T019 [P] Unit tests for validation in tests/unit/test_validation.py
> - [ ] T020 Performance tests (<200ms)
> - [ ] T021 [P] Update docs/api.md
> - [ ] T022 Remove duplication
> - [ ] T023 Run manual-testing.md

## Dependencies

> [INSTRUCTIONS]
> Document any task dependencies to ensure tasks are run sequentially when needed. Examples:
>
> - Tests (T004-T007) before implementation (T008-T014)
> - T008 blocks T009, T015
> - T016 blocks T018
> - Implementation before polish (T019-T023)
