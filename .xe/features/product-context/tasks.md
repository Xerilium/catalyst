---
id: product-context
title: Product Context Templates
author: "@flanakin"
description: "This document defines the tasks required to fully implement the Product Context Templates feature from scratch."
---

# Tasks: Product Context Templates

**Input**: Design documents from `.xe/features/product-context/`
**Prerequisites**: plan.md (required), research.md, spec.md

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

## Step 1: Setup

- [ ] T001: Create src/templates/specs/ directory if not exists
- [ ] T002: Read `.xe/standards/catalyst.md` to understand template conventions

## Step 2: Tests First (TDD)

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

Not applicable - this is a template feature with manual validation rather than automated tests.

## Step 3: Core Implementation

- [ ] T003: Create product.md template with 5 sections (System Overview, Product Strategy, Design Principles, Non-Goals, Team) per FR-1.2
- [ ] T004: Create competitive-analysis.md template with 5 sections (Should We Build This?, Competitive Landscape, Table-Stakes Features, Revolutionary Differentiation, Recommended Positioning) per FR-2.2

## Step 4: Integration

Not applicable - templates are standalone files with no integration dependencies.

## Step 5: Polish

- [ ] T005: Validate templates against FRs (sections, instruction blocks, token optimization)
