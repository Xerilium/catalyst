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
> **Living Specification**: Define tasks as if implementing from scratch. Do not reference existing files or current state. Each task must produce concrete output (files, code, tests).
>
> **Task Granularity**: Each task should represent a substantive, logically complete unit of work worthy of a PR. Tasks vary in size, but all should:
>
> - Produce concrete output (files, code, tests, docs)
> - Be independently executable with clear success criteria
> - Reference plan.md sections for complex implementation logic (e.g., "Implement authentication flow per plan.md § Authentication Strategy")
>
> **What NOT to include as tasks** (implicit or belong elsewhere):
>
> - Setup tasks ("Create directory", "Install dependency") - implicit when creating files
> - Verification tasks ("Run tests", "Verify build", "Check coverage") - implicit in Phase 5 Validation
> - Test fixtures as standalone tasks - include as sub-bullets under test tasks
> - Pure implementation sub-steps ("Export from barrel", "Update if needed") - not traceable to requirements
>
> **Requirement References:** Link tasks to requirements using `@req` tags:
>
> - Add `@req {TYPE}:{path}` on indented bullets under each task; one per line for readability
> - Use short-form IDs (without feature scope) for same-feature requirements
> - Use fully-qualified IDs (`FR:other-feature/path.to.req`) for cross-feature references
> - Reference the most specific requirement that applies (prefer leaf nodes over parent groupings)
>
> **Example:**
>
> ```markdown
> - [ ] T003: [P] Unit tests for session expiry
>   - @req FR:auth.session.expiry
>   - @req FR:auth.session.validation
>   - Test expired sessions are rejected
>   - Test valid sessions pass through
> ```
>
> **Task Execution Rules:**
>
> - Task lists use markdown checkbox format (`- [ ]`)
> - Tasks execute sequentially unless flagged for parallel execution with `[P]`
> - Parallel tasks run together in batches
> - Non-parallel tasks after a parallel batch wait for ALL parallel tasks to complete
> - Each step waits for all tasks in the previous step to complete
> - Each task should be committed independently within the rollout branch
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

## Step 1: Tests First (TDD)

**CRITICAL: Tests MUST be written and MUST FAIL before ANY implementation**

> [INSTRUCTIONS]
> Task list of any tests that should be created to follow a test-driven development process where tests are placeholders that fail before implementation and are expected to pass without changes as the implementation is completed. Examples:
>
> - [ ] T001 [P] Contract test POST /api/users in tests/contract/test_users_post.py
> - [ ] T002 [P] Contract test GET /api/users/{id} in tests/contract/test_users_get.py
> - [ ] T003 [P] Integration test user registration in tests/integration/test_registration.py
> - [ ] T004 [P] Integration test auth flow in tests/integration/test_auth.py

## Step 2: Core Implementation

> [INSTRUCTIONS]
> Task list of the core feature implementation steps. Examples:
>
> - [ ] T005 [P] User model in src/models/user.py
> - [ ] T006 [P] UserService CRUD in src/services/user_service.py
> - [ ] T007 [P] CLI --create-user in src/cli/user_commands.py
> - [ ] T008 POST /api/users endpoint
> - [ ] T009 GET /api/users/{id} endpoint
> - [ ] T010 Input validation
> - [ ] T011 Error handling and logging

## Step 3: Integration

> [INSTRUCTIONS]
> Task list of any integration points with internal or external dependencies. Examples:
>
> - [ ] T012 Connect UserService to DB
> - [ ] T013 Auth middleware
> - [ ] T014 Request/response logging
> - [ ] T015 CORS and security headers

## Step 4: Documentation

> [INSTRUCTIONS]
> Documentation tasks for customer-facing features per the Documentation Plan from plan.md. Examples:
>
> - [ ] T016 [P] Write user guide in docs/{feature-name}.md (overview, examples, API reference, troubleshooting)
> - [ ] T017 [P] Add inline code documentation (JSDoc/docstrings)

## Dependencies

> [INSTRUCTIONS]
> Document any task dependencies to ensure tasks are run sequentially when needed. Examples:
>
> - Tests (T004-T007) before implementation (T008-T014)
> - T008 blocks T009, T015
> - T016 blocks T018
> - Implementation before polish (T019-T023)
