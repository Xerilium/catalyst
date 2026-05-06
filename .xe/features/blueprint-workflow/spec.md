---
id: blueprint-workflow
title: Blueprint Workflow
description: Orchestrates blueprint creation and maintenance through interactive Q&A or autonomous execution.
dependencies:
  - context-storage
  - product-context
  - engineering-context
  - blueprint-context
  - workflow-context
  - feature-context
  - feedback-loop
traceability:
  code: disable
---

<!-- markdownlint-disable single-title -->

# Feature: Blueprint Workflow

## Purpose

Orchestrate reliable, token-efficient blueprint creation and maintenance from initial discovery through implementation and review, aligned with product vision and engineering principles.

## Scenarios

### FR:workflow: Blueprint workflow

**Product Manager** needs to document and evolve the product architecture, data model, and roadmap aligned with the product strategy to ensure humans and AI remain aligned as the product evolves.

- **FR:workflow.ai-command** (P1): Interface: Workflow MUST be exposed as `/catalyst:blueprint` slash command
- **FR:workflow.playbook** (P1): Interface: Workflow MUST be implemented as `src/resources/playbooks/start-blueprint.md`
  > - @req FR:context-storage/playbooks.framework
- **FR:workflow.input** (P2):
  - GitHub issue number (string?) — context input
  - Product context (string) — informs what the product is and how it should be built
    > - @req FR:product-context/product
    > - @req FR:product-context/journey
  - Engineering context (string) — informs what engineering practices should be applied
    > - @req FR:engineering-context/eng
    > - @req FR:engineering-context/arch
  - Existing blueprint (string?) — branches workflow between create and update
    > - @req FR:blueprint-context/blueprint.location
- **FR:workflow.scope** (P1): Workflow MUST gather context and present work scope for approval in a `Scope` phase
  - **FR:workflow.scope.legacy-detection** (P2): Workflow MUST detect legacy multi-file blueprint structure (`.xe/features/blueprint/` with `spec.md`/`plan.md`/`tasks.md`/`research.md`) at scope time and STOP without attempting in-place migration; surface the gap to the user
  - **FR:workflow.scope.execution-mode** (P1): Workflow MUST present ALL standard execution modes as AUQ options during scope, recommend 1 based on complexity and user preference
    > - @req FR:workflow-context/execution-modes
  - **FR:workflow.scope.rollout** (P2): Workflow MUST create a multi-run rollout plan from `src/resources/templates/specs/rollout-blueprint.md`
    > - @req FR:feature-context/rollout.template
    > - @req FR:feature-context/rollout.location
- **FR:workflow.plan** (P1): Workflow MUST draft any product-context expansions needed to support the blueprint (new personas, strategy phases, customer journeys) and define the feature decomposition, dependency graph, and roadmap structure aligned with product strategy in a `Plan` phase; each feature MUST identify id, complexity, one-sentence purpose, scope boundaries, and dependencies; each draft MUST be confirmed with the user per the active execution mode
  > - @req FR:product-context/product
  > - @req FR:product-context/journey
  > - @req FR:product-context/product.strategy
  > - @req FR:blueprint-context/blueprint.arch
  > - @req FR:blueprint-context/blueprint.roadmap
  > - @req FR:blueprint-context/blueprint.roadmap.detail
  - **FR:workflow.plan.populate-runs** (P1): After plan approval, workflow MUST populate Run 1+ entries in the rollout from the approved Roadmap — one run per phase (Run N = Phase N), feature tasks grouped by `### Wave {phase}.{wave}` H3, with `/catalyst:create {feature-id}` (new) or `/catalyst:change {feature-id}` (expansion); each task passes full feature context inline (purpose, scope, dependencies, open questions). Translate gantt `after` gates to `[P]` flags. Collapse fully-completed prior runs (all tasks `[x]`) to a brief summary.
  - **FR:workflow.plan.consistency** (P1): Blueprint-level changes (rename, scope, dependency, count) MUST be applied consistently across every affected artifact in one pass — diagram nodes/edges, gantt tasks/`after` refs, dependency declarations, rollout Wave checklists, Active State, design-decisions, prose. Partial updates are not acceptable.
  - **FR:workflow.plan.decision-routing** (P2): Every `Decision:` note MUST be routed during plan: project-wide → promote to `.xe/features/design-decisions.md`; feature-internal → keep inline; duplicate → delete. Existing design-decisions wave/phase/feature references MUST be re-validated against the current structure.
    > - @req FR:blueprint-context/design-decisions.location
- **FR:workflow.implement** (P1): Workflow MUST author the blueprint per blueprint-context conventions and append product-architecture decisions to design-decisions.md when made in an `Implement` phase
  > - @req FR:blueprint-context/blueprint.template
  > - @req FR:blueprint-context/blueprint.location
  > - @req FR:blueprint-context/blueprint.arch
  > - @req FR:blueprint-context/blueprint.data-model
  > - @req FR:blueprint-context/blueprint.roadmap
  > - @req FR:blueprint-context/design-decisions.location
  > - @req FR:blueprint-context/design-decisions.format
- **FR:workflow.review** (P2): Workflow MUST validate blueprint completeness against blueprint-context conventions, present a summary for review, route external issues, clean up temporary files, and close out the rollout in a `Review` phase
  > - @req FR:blueprint-context/blueprint.arch
  > - @req FR:blueprint-context/blueprint.data-model
  > - @req FR:blueprint-context/blueprint.roadmap
  > - @req FR:feature-context/rollout.ephemeral
  > - @req FR:feedback-loop/playbook.routing.feature-file
- **FR:workflow.continuity** (P2): Workflow MUST execute Active State updates at every STOP gate
  > - @req FR:feature-context/rollout.active-state
  > - @req FR:feature-context/rollout.active-state.overwrite
- **FR:workflow.auq-usage** (P1): Workflow MUST invoke the AUQ action file at every AUQ call site using `Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to {imperative intent}` rather than inline AskUserQuestion directives
  > - @req FR:context-storage/standards.auq.function
- **FR:workflow.output** (P2):
  - Blueprint (markdown)
    > - @req FR:blueprint-context/blueprint.location
  - Design decisions (markdown?)
    > - @req FR:blueprint-context/design-decisions.location
  - Rollout plan (markdown) — transient
    > - @req FR:feature-context/rollout.location
    > - @req FR:feature-context/rollout.ephemeral

### Non-functional Requirements

**NFR:reliability**: Execution Reliability

- **NFR:reliability.sequential-execution** (P1): Workflow MUST execute phases sequentially, honoring a STOP gate after every phase that validates ALL exit criteria — including any required user confirmation — before any subsequent action runs
- **NFR:reliability.informed-judgment** (P1): Workflow MUST form and present recommended options with rationale grounded in product vision and engineering principles
  > - @req FR:product-context/product.strategy
  > - @req FR:product-context/product.principles
  > - @req FR:engineering-context/eng.principles

## Data Model

None

## Architecture Constraints

None

## External Dependencies

None
