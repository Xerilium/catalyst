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

- [ ] T003: Create product.md template in src/templates/specs/
  - [ ] T003.1: Add frontmatter with placeholders (project-name, product-manager, architect, engineer, ai-reviewer)
  - [ ] T003.2: Add H1 title: `# {project-name} Product Context`
  - [ ] T003.3: Add instruction block at top explaining purpose
  - [ ] T003.4: Create System Overview section with instruction block
  - [ ] T003.5: Create Product Strategy section with instruction block
  - [ ] T003.6: Create Target Personas section with instruction block
  - [ ] T003.7: Create High-Level Scenarios section with instruction block
  - [ ] T003.8: Create Design Principles section with instruction block
  - [ ] T003.9: Create Technical Requirements section with instruction block
  - [ ] T003.10: Create Success Metrics section with instruction block
  - [ ] T003.11: Create Non-Goals section with instruction block
  - [ ] T003.12: Create Team section with instruction block

- [ ] T004: Create competitive-analysis.md template in src/templates/specs/
  - [ ] T004.1: Add frontmatter with placeholders (project-name, author, date)
  - [ ] T004.2: Add H1 title: `# {project-name} Competitive Analysis`
  - [ ] T004.3: Add instruction block at top explaining purpose
  - [ ] T004.4: Create Market Overview section with H3 subsections (Market Size, Key Trends)
  - [ ] T004.5: Create Competitor Analysis section with instruction block for table/list
  - [ ] T004.6: Create Competitive Advantages section with instruction block
  - [ ] T004.7: Create Market Gaps section with instruction block
  - [ ] T004.8: Create Positioning Strategy section with instruction block

- [ ] T005: Create go-to-market.md template in src/templates/specs/
  - [ ] T005.1: Add frontmatter with placeholders (project-name, author, date)
  - [ ] T005.2: Add H1 title: `# {project-name} Go-to-Market Strategy`
  - [ ] T005.3: Add instruction block at top explaining progressive approach
  - [ ] T005.4: Create GTM Strategy Overview section with instruction block
  - [ ] T005.5: Create Target Market & Personas section with H3 per persona
  - [ ] T005.6: Create Value Proposition & Positioning section with instruction block
  - [ ] T005.7: Create Marketing & Sales Channels section with H3 subsections
  - [ ] T005.8: Create Pricing Strategy section with instruction block
  - [ ] T005.9: Create Success Metrics section with instruction block (CAC, conversion, retention)
  - [ ] T005.10: Create Launch Timing section with H3 per phase

## Step 4: Integration

Not applicable - templates are standalone files with no integration dependencies.

## Step 5: Polish

- [ ] T006: Validate product.md template
  - [ ] T006.1: Verify all 9 required sections present (FR-1.2)
  - [ ] T006.2: Check placeholder format uses `{kebab-case}`
  - [ ] T006.3: Verify instruction blocks use `> [INSTRUCTIONS]` prefix
  - [ ] T006.4: Ensure heading hierarchy (H1 title, H2 sections, H3 subsections)
  - [ ] T006.5: Confirm concise yet comprehensive (token optimization)

- [ ] T007: Validate competitive-analysis.md template
  - [ ] T007.1: Verify all 5 required sections present (FR-2.2)
  - [ ] T007.2: Check placeholder format uses `{kebab-case}`
  - [ ] T007.3: Verify instruction blocks use `> [INSTRUCTIONS]` prefix
  - [ ] T007.4: Ensure heading hierarchy (H1 title, H2 sections, H3 subsections)
  - [ ] T007.5: Confirm concise yet comprehensive (token optimization)

- [ ] T008: Validate go-to-market.md template
  - [ ] T008.1: Verify all 7 required sections present (FR-3.2)
  - [ ] T008.2: Check placeholder format uses `{kebab-case}`
  - [ ] T008.3: Verify instruction blocks use `> [INSTRUCTIONS]` prefix
  - [ ] T008.4: Ensure heading hierarchy (H1 title, H2 sections, H3 subsections)
  - [ ] T008.5: Confirm concise yet comprehensive (token optimization)

- [ ] T009: Test template instantiation with sample values
  - [ ] T009.1: Create test instantiation of product.md
  - [ ] T009.2: Create test instantiation of competitive-analysis.md
  - [ ] T009.3: Create test instantiation of go-to-market.md
  - [ ] T009.4: Verify instantiated docs are complete and usable

## Dependencies

- T001 blocks T003, T004, T005
- T002 blocks T003, T004, T005
- T003 blocks T006
- T004 blocks T007
- T005 blocks T008
- T006, T007, T008 block T009
