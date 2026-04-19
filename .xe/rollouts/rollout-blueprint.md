---
features: [blueprint]
status: implementation
created: 2025-11-01
---

<!-- markdownlint-disable MD024 -->

# Rollout: Blueprint

This rollout builds the entire Catalyst product by implementing all features defined in the blueprint across 5 phases with clear dependencies, scope boundaries, and implementation priorities.

## Overview

The Catalyst product is built by implementing discrete features in dependency order across 5 strategic phases (POC, Mainstream, Innovation, Platform, Enterprise). Features are organized into phase-relative tiers where features within the same tier can be implemented in parallel.

**Phased rollout strategy:**

- Phase completion is strictly sequential: all features in Phase N must be complete before Phase N+1 begins
- Within a phase, features are implemented tier-by-tier; all features in a tier must complete before the next tier begins
- Features marked `[P]` within a tier can be implemented in parallel — they have no cross-dependencies
- After Phase 1 completes, run a phase transition checkpoint to review learnings and detail Phase 2 features before starting Phase 2 implementation
- Apply the same transition process between each subsequent phase

**Feature implementation command:** `/catalyst:create {feature-id}`

---

## Run 1: Phase 1, Tier 1.1 — Context Foundation

Features in this tier have no dependencies and can be implemented in parallel.

### Features

#### product-context

- [x] T001: [P] Implement product-context via `/catalyst:create product-context`
  - @req FR:blueprint/context.quality
  - @req FR:blueprint/features.planning

#### engineering-context

- [x] T002: [P] Implement engineering-context via `/catalyst:create engineering-context`
  - @req FR:blueprint/context.quality
  - @req FR:blueprint/workflows.execution

#### error-handling

- [x] T003: [P] Implement error-handling via `/catalyst:create error-handling`
  - @req NFR:blueprint/reliability

### Post-implementation

- [ ] Verify all Tier 1.1 features complete before proceeding to Tier 1.2
- [ ] Present work for review

---

## Run 2: Phase 1, Tier 1.2 — Feature Context

Depends on Tier 1.1 completion.

### Features

#### feature-context

- [x] T004: Implement feature-context via `/catalyst:create feature-context`
  - @req FR:blueprint/features.planning
  - @req FR:blueprint/features.progressive

### Post-implementation

- [ ] Verify Tier 1.2 complete before proceeding to Tier 1.3
- [ ] Present work for review

---

## Run 3: Phase 1, Tier 1.3 — Workflow Engine

Features in this tier can be implemented in parallel and depend on error-handling (Tier 1.1).

### Features

#### playbook-definition

- [x] T006a: [P] Implement playbook-definition via `/catalyst:create playbook-definition`
  - @req FR:blueprint/workflows.execution
  - @req NFR:blueprint/reliability

#### playbook-template-engine

- [x] T006b: [P] Implement playbook-template-engine via `/catalyst:create playbook-template-engine`
  - @req FR:blueprint/workflows.execution
  - @req NFR:blueprint/cost

#### playbook-engine

- [x] T006c: [P] Implement playbook-engine via `/catalyst:create playbook-engine`
  - @req FR:blueprint/workflows.execution
  - @req FR:blueprint/workflows.checkpoints
  - @req NFR:blueprint/observability

#### playbook-actions-scripts

- [x] T006d: [P] Implement playbook-actions-scripts via `/catalyst:create playbook-actions-scripts`
  - @req FR:blueprint/workflows.execution
  - @req NFR:blueprint/cost

#### playbook-actions-io

- [x] T006e: [P] Implement playbook-actions-io via `/catalyst:create playbook-actions-io`
  - @req FR:blueprint/workflows.execution

#### playbook-actions-github

- [x] T006f: [P] Implement playbook-actions-github via `/catalyst:create playbook-actions-github`
  - @req FR:blueprint/workflows.execution
  - @req FR:blueprint/workflows.checkpoints

#### playbook-actions-controls

- [x] T006g: [P] Implement playbook-actions-controls via `/catalyst:create playbook-actions-controls`
  - @req FR:blueprint/workflows.execution
  - @req FR:blueprint/workflows.checkpoints

#### playbook-actions-ai

- [x] T006h: [P] Implement playbook-actions-ai via `/catalyst:create playbook-actions-ai`
  - @req FR:blueprint/workflows.execution
  - @req FR:blueprint/extensibility

### Post-implementation

- [ ] Verify all Tier 1.3 features complete before proceeding to Tier 1.4
- [ ] Present work for review

---

## Run 4: Phase 1, Tier 1.4 — AI Integration

Depends on Tier 1.3 completion. Features can be implemented in parallel.

### Features

#### playbook-actions-claude

- [x] T007: [P] Implement playbook-actions-claude via `/catalyst:create playbook-actions-claude`
  - @req FR:blueprint/extensibility

#### playbook-actions-copilot

- [x] T008: [P] Implement playbook-actions-copilot via `/catalyst:create playbook-actions-copilot`
  - @req FR:blueprint/extensibility

### Post-implementation

- [ ] Verify all Tier 1.4 features complete before proceeding to Tier 1.5
- [ ] Present work for review

---

## Run 5: Phase 1, Tier 1.5 — Base Playbooks

Depends on prior tiers. Features can be implemented in parallel.

### Features

#### project-initialization

- [ ] T010: [P] Implement project-initialization via `/catalyst:create project-initialization`
  - @req FR:blueprint/context.setup
  - @req FR:blueprint/context.quality

#### blueprint-creation

- [ ] T011: [P] Implement blueprint-creation via `/catalyst:create blueprint-creation`
  - @req FR:blueprint/features.planning
  - @req FR:blueprint/features.dependencies

#### feature-changes

- [ ] T012: [P] Implement feature-changes via `/catalyst:create feature-changes`
  - @req FR:blueprint/features.progressive
  - @req FR:blueprint/workflows.checkpoints
  - @req FR:blueprint/features.tracking

### Post-implementation

- [ ] Verify all Tier 1.5 features complete before proceeding to Tier 1.6
- [ ] Present work for review

---

## Run 6: Phase 1, Tier 1.6 — Existing Code

Depends on Tier 1.5 completion. Features can be implemented in parallel.

### Features

#### extract-blueprint

- [ ] T013: [P] Implement extract-blueprint via `/catalyst:create extract-blueprint`
  - @req FR:blueprint/features.planning

#### extract-features

- [ ] T014: [P] Implement extract-features via `/catalyst:create extract-features`
  - @req FR:blueprint/features.progressive

#### slash-command-integration

- [ ] T009: Implement slash-command-integration via `/catalyst:create slash-command-integration`
  - @req FR:blueprint/context.setup

### Post-implementation

- [ ] Verify all Tier 1.6 features complete before proceeding to Tier 1.7
- [ ] Present work for review

---

## Run 7: Phase 1, Tier 1.7 — Distribution

Depends on prior tiers.

### Features

#### framework-distribution

- [ ] T015: Implement framework-distribution via `/catalyst:create framework-distribution`
  - @req FR:blueprint/distribution

### Post-implementation

- [ ] Verify Tier 1.7 complete
- [ ] Present work for review

---

## Run 8: Phase 1 Completion Validation

### Features

#### phase-1-validation

- [ ] T016: Verify all Phase 1 features complete (all Phase 1 checkboxes marked above)
  - @req FR:blueprint/features.tracking
- [ ] T017: Validate all Phase 1 tests passing
  - @req NFR:blueprint/reliability
- [ ] T018: Review Phase 1 for lessons learned and process improvements
  - @req NFR:blueprint/auditability

### Post-implementation

- [ ] Phase 1 transition checkpoint — document learnings before proceeding to Phase 2 planning

---

## Run 9: Phase 2 Planning

Before implementing Phase 2 features, detail them based on Phase 1 learnings.

### Features

#### phase-2-planning

- [ ] T019: Plan Phase 2 features via `/catalyst:blueprint` (details Phase 2 features in spec.md and adds Phase 2 implementation tasks to this rollout)
  - @req FR:blueprint/features.planning
  - @req FR:blueprint/features.progressive

> **Note:** Phase 2 implementation runs will be added here after Phase 2 planning completes. Expected features: role-based-subagents, config-management, model-selection, and autonomous-orchestration.

---

## Run 10: Phase 3 Planning

Before implementing Phase 3 features, detail them based on Phase 2 learnings.

### Features

#### phase-3-planning

- [ ] T020: Plan Phase 3 features via `/catalyst:blueprint` (details Phase 3 features in spec.md and adds Phase 3 implementation tasks to this rollout)
  - @req FR:blueprint/features.planning
  - @req FR:blueprint/features.progressive

> **Note:** Phase 3 implementation runs will be added here after Phase 3 planning completes. Expected features: autonomous review capabilities (PR, issue, discussion, architecture, product) and conversational agents.

---

## Run 11: Phase 4 Planning

Before implementing Phase 4 features, detail them based on Phase 3 learnings.

### Features

#### phase-4-planning

- [ ] T021: Plan Phase 4 features via `/catalyst:blueprint` (details Phase 4 features in spec.md and adds Phase 4 implementation tasks to this rollout)
  - @req FR:blueprint/features.planning
  - @req FR:blueprint/features.progressive

> **Note:** Phase 4 implementation runs will be added here after Phase 4 planning completes. Expected features: template-customization, custom-playbooks, and plugin-system.

---

## Run 12: Phase 5 Planning

Before implementing Phase 5 features, detail them based on Phase 4 learnings.

### Features

#### phase-5-planning

- [ ] T022: Plan Phase 5 features via `/catalyst:blueprint` (details Phase 5 features in spec.md and adds Phase 5 implementation tasks to this rollout)
  - @req FR:blueprint/features.planning
  - @req FR:blueprint/features.progressive

> **Note:** Phase 5 implementation runs will be added here after Phase 5 planning completes. Expected features: multi-repository-management, multi-team-coordination, and audit-logging.

---

## Notes

- Phase 2–5 implementation runs will be inserted above Final Review after each phase's planning run completes.
- Tasks marked [P] within the same run can be executed in parallel — no cross-dependencies within the tier.
- Dependency rules: features depend on ALL features in prior tiers; features in the same tier have no dependencies on each other; circular dependencies are not allowed.
- If parallel features conflict during implementation, serialize them and document the decision here.

## Final Review

- [ ] Verify all runs complete — no unchecked tasks, no unresolved blockers in Notes
- [ ] T023: Verify all features complete (count features in spec.md)
  - @req FR:blueprint/features.tracking
- [ ] T024: Validate entire product test suite passing
  - @req NFR:blueprint/reliability
- [ ] T025: Document Catalyst product as production-ready
  - @req FR:blueprint/context.quality
  - @req NFR:blueprint/auditability
- [ ] Clean up: delete rollout-blueprint.md and remove entry from `.xe/rollouts/README.md`
