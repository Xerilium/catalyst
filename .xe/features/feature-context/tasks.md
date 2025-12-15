---
id: feature-context
title: Feature Context Templates
author: "@flanakin"
description: "This document defines the tasks required to fully implement the Feature Context Templates feature."
---

# Tasks: Feature Context Templates

**Input**: Design documents from `.xe/features/feature-context/`
**Prerequisites**: plan.md (required), research.md, spec.md

## Step 1: Setup

None - templates already exist in `src/resources/templates/specs/`

## Step 2: Tests First (TDD)

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [x] T001: Create validation test for spec.md template validating FR-1.1 through FR-1.12 (sections exist, FR/NFR structure, 10 NFR categories, token-optimized)
  - @req FR:spec.template.standard
  - @req FR:spec.template.problem
  - @req FR:spec.template.goals
  - @req FR:spec.template.scenario
  - @req FR:spec.template.success
  - @req FR:spec.template.principles
  - @req FR:spec.template.fr
  - @req FR:spec.template.nfr
  - @req FR:spec.template.entities
  - @req FR:spec.template.dependencies
  - @req FR:spec.template.architecture
  - @req FR:spec.template.optimized
  - @req NFR:testability.validation
- [x] T002: Create validation test for plan.md template validating FR-2.1 through FR-2.9 (sections exist, 8 Implementation Approach subsections, token-optimized)
  - @req FR:plan.template.standard
  - @req FR:plan.template.summary
  - @req FR:plan.template.context
  - @req FR:plan.template.structure
  - @req FR:plan.template.datamodel
  - @req FR:plan.template.contracts
  - @req FR:plan.template.approach
  - @req FR:plan.template.usage
  - @req FR:plan.template.optimized
  - @req NFR:testability.validation
- [x] T003: Create validation test for tasks.md template validating FR-3.1 through FR-3.9 (sections exist, 5 steps, checklist format, token-optimized)
  - @req FR:tasks.template.standard
  - @req FR:tasks.template.input
  - @req FR:tasks.template.setup
  - @req FR:tasks.template.tdd
  - @req FR:tasks.template.core
  - @req FR:tasks.template.integration
  - @req FR:tasks.template.polish
  - @req FR:tasks.template.dependencies
  - @req FR:tasks.template.optimized
  - @req NFR:testability.validation
- [x] T004: Create validation test for research.md template validating FR-4.1 through FR-4.7 (sections exist, design decisions structure, token-optimized)
  - @req FR:research.template.standard
  - @req FR:research.template.overview
  - @req FR:research.template.findings
  - @req FR:research.template.decisions
  - @req FR:research.template.recommendations
  - @req FR:research.template.references
  - @req FR:research.template.optimized
  - @req NFR:testability.validation
- [x] T005: Create validation test for rollout.md template validating FR-5.1 through FR-5.8 (sections exist, status tracking, token-optimized)
  - @req FR:rollout.template.standard
  - @req FR:rollout.template.context
  - @req FR:rollout.template.status
  - @req FR:rollout.template.pre
  - @req FR:rollout.template.implementation
  - @req FR:rollout.template.post
  - @req FR:rollout.template.cleanup
  - @req FR:rollout.template.optimized
  - @req NFR:testability.validation

## Step 3: Core Implementation

- [x] T006: Update spec.md template to meet FR-1 requirements (FR/NFR separation, 10 NFR categories, hierarchical numbering guidance, circular dependency warning)
  - @req FR:spec.template.standard
  - @req FR:spec.template.problem
  - @req FR:spec.template.goals
  - @req FR:spec.template.scenario
  - @req FR:spec.template.success
  - @req FR:spec.template.principles
  - @req FR:spec.template.fr
  - @req FR:spec.template.nfr
  - @req FR:spec.template.entities
  - @req FR:spec.template.dependencies
  - @req FR:spec.template.architecture
  - @req FR:spec.template.optimized
  - @req NFR:cost.tokens
  - @req NFR:reliability.markdown
  - @req NFR:reliability.structure
- [x] T007: Update plan.md template to meet FR-2 requirements (8 Implementation Approach subsections, numbered H3 format, code example guidance)
  - @req FR:plan.template.standard
  - @req FR:plan.template.summary
  - @req FR:plan.template.context
  - @req FR:plan.template.structure
  - @req FR:plan.template.datamodel
  - @req FR:plan.template.contracts
  - @req FR:plan.template.approach
  - @req FR:plan.template.approach.numbered
  - @req FR:plan.template.approach.datastructures
  - @req FR:plan.template.approach.algorithms
  - @req FR:plan.template.approach.integration
  - @req FR:plan.template.approach.errors
  - @req FR:plan.template.approach.validation
  - @req FR:plan.template.approach.performance
  - @req FR:plan.template.approach.testing
  - @req FR:plan.template.approach.examples
  - @req FR:plan.template.usage
  - @req FR:plan.template.optimized
  - @req NFR:cost.tokens
  - @req NFR:reliability.markdown
  - @req NFR:reliability.structure
- [x] T008: Verify tasks.md template meets FR-3 requirements (5 steps, checklist format)
  - @req FR:tasks.template.standard
  - @req FR:tasks.template.input
  - @req FR:tasks.template.setup
  - @req FR:tasks.template.tdd
  - @req FR:tasks.template.core
  - @req FR:tasks.template.integration
  - @req FR:tasks.template.polish
  - @req FR:tasks.template.dependencies
  - @req FR:tasks.template.optimized
  - @req NFR:cost.tokens
  - @req NFR:reliability.markdown
  - @req NFR:reliability.structure
- [x] T009: Verify research.md template meets FR-4 requirements (design decisions with alternatives)
  - @req FR:research.template.standard
  - @req FR:research.template.overview
  - @req FR:research.template.findings
  - @req FR:research.template.decisions
  - @req FR:research.template.recommendations
  - @req FR:research.template.references
  - @req FR:research.template.optimized
  - @req NFR:cost.tokens
  - @req NFR:reliability.markdown
  - @req NFR:reliability.structure
- [x] T010: Verify rollout.md template meets FR-5 requirements (status tracking, pre/post actions)
  - @req FR:rollout.template.standard
  - @req FR:rollout.template.context
  - @req FR:rollout.template.status
  - @req FR:rollout.template.pre
  - @req FR:rollout.template.implementation
  - @req FR:rollout.template.post
  - @req FR:rollout.template.cleanup
  - @req FR:rollout.template.optimized
  - @req NFR:cost.tokens
  - @req NFR:reliability.markdown
  - @req NFR:reliability.structure

## Step 4: Integration

None - templates are standalone files

## Step 5: Polish

- [x] T011: Run all validation tests and ensure they pass
  - @req NFR:testability.validation
- [x] T012: Verify all templates follow `.xe/standards/catalyst.md`
  - @req FR:spec.template.standard
  - @req FR:plan.template.standard
  - @req FR:tasks.template.standard
  - @req FR:research.template.standard
  - @req FR:rollout.template.standard
  - @req NFR:reliability.markdown
  - @req NFR:reliability.structure
- [x] T013: Ensure templates are token-optimized (concise yet complete)
  - @req FR:spec.template.optimized
  - @req FR:plan.template.optimized
  - @req FR:tasks.template.optimized
  - @req FR:research.template.optimized
  - @req FR:rollout.template.optimized
  - @req NFR:cost.tokens
  - @req NFR:cost.instructions

## Dependencies

- Step 2 (Tests) must complete before Step 3 (Implementation)
- Step 3 (Implementation) must complete before Step 5 (Polish)
- All tasks depend on product-context and engineering-context features being complete
