---
id: blueprint-workflow
title: Blueprint Workflow
description: Orchestrates blueprint creation and maintenance through interactive Q&A or autonomous execution.
dependencies:
  - ai-plugin
  - blueprint-context
  - context-storage
  - engineering-context
  - feature-context
  - feedback-loop
  - product-context
  - workflow-context
traceability:
  code: disable
---

<!-- markdownlint-disable single-title -->

# Feature: Blueprint Workflow

## Purpose

Orchestrate reliable, token-efficient blueprint creation and maintenance from initial discovery through implementation and review, aligned with product vision and engineering principles.

## Scenarios

### FR:workflow: Blueprint workflow

**Product Manager** needs to document and evolve the product architecture, data model, and roadmap aligned with the product strategy so that humans and AI remain aligned as the product evolves.

- **FR:workflow.@ai-skill** (P1): Interface: `/catalyst:blueprint`
  > - @req FR:ai-plugin/skills.@ai-skill
- **FR:workflow.@playbook** (P1): Interface: `src/resources/playbooks/start-blueprint.md`
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
- **FR:workflow.format** (P2): Workflow MUST execute the blueprint-format action before any other phase when legacy multi-file blueprint structure is detected
  - Legacy structure: `.xe/features/blueprint/` with `spec.md`, `plan.md`, `tasks.md`, or `research.md`; the action migrates the artifacts to the current shape
  - Rationale: Later phases then operate only on current-shape artifacts.
- **FR:workflow.scope** (P1): Workflow MUST gather context and present work scope for approval in a `Scope` phase
  - **FR:workflow.scope.execution-mode** (P1): Workflow MUST present ALL standard execution modes as AUQ options during scope, recommend 1 based on complexity and user preference
    > - @req FR:workflow-context/execution-modes
  - **FR:workflow.scope.rollout** (P2): Workflow MUST create a multi-run rollout plan from `src/resources/templates/specs/rollout-blueprint.md`
    > - @req FR:feature-context/rollout.template
    > - @req FR:feature-context/rollout.@file
- **FR:workflow.plan** (P1): Workflow MUST draft the blueprint plan in a `Plan` phase
  > - @req FR:product-context/product
  > - @req FR:product-context/journey
  > - @req FR:product-context/product.strategy
  > - @req FR:blueprint-context/blueprint.arch
  > - @req FR:blueprint-context/blueprint.roadmap
  > - @req FR:blueprint-context/blueprint.roadmap.detail
  - **FR:workflow.plan.context** (P1): Workflow MUST draft any product-context expansions needed to support the blueprint (new personas, strategy phases, customer journeys)
  - **FR:workflow.plan.decomposition** (P1): Workflow MUST define the feature decomposition, dependency graph, and roadmap structure aligned with product strategy
  - **FR:workflow.plan.feature-fields** (P1): Each feature MUST identify id, complexity, one-sentence purpose, scope boundaries, and dependencies
  - **FR:workflow.plan.confirm** (P1): Workflow MUST confirm each draft with the user per the active execution mode
  - **FR:workflow.plan.plan-mode** (P1): In `interactive` and `checkpoint-review` modes, workflow MUST draft the plan in plan mode
  - **FR:workflow.plan.unattended** (P1): In `spec-review`, `final-review`, and `autonomous` modes, workflow MUST replace plan mode with a read-only planning pass
    > - @req FR:workflow-context/execution-modes.precedence.approve
    - **FR:workflow.plan.unattended.record** (P1): Workflow MUST record the planning pass in the rollout plan
    - **FR:workflow.plan.unattended.no-skip** (P1): Workflow MUST NOT present a skip AUQ for the planning pass
  - **FR:workflow.plan.populate-runs** (P1): After plan approval, workflow MUST populate Run 1+ entries in the rollout from the approved Roadmap
    - **FR:workflow.plan.populate-runs.grouping** (P1): Workflow MUST create one run per phase (Run N = Phase N), with feature tasks grouped under `### Wave {phase}.{wave}` H3s
    - **FR:workflow.plan.populate-runs.command** (P1): Each task MUST use `/catalyst:create {feature-id}` for a new feature or `/catalyst:change {feature-id}` for an expansion
    - **FR:workflow.plan.populate-runs.context** (P1): Each task MUST pass full feature context inline (purpose, scope, dependencies, open questions)
    - **FR:workflow.plan.populate-runs.parallel** (P1): Workflow MUST translate gantt `after` gates to `[P]` flags
    - **FR:workflow.plan.populate-runs.collapse** (P1): Workflow MUST collapse fully-completed prior runs (all tasks `[x]`) to a brief summary
  - **FR:workflow.plan.consistency** (P1): Workflow MUST apply blueprint-level changes (rename, scope, dependency, count) to every affected artifact in one pass
    - Affected artifacts: diagram nodes and edges, gantt tasks and `after` refs, dependency declarations, rollout Wave checklists, Active State, design-decisions, prose
    - **FR:workflow.plan.consistency.no-partial** (P1): Workflow MUST NOT apply partial updates
  - **FR:workflow.plan.decision-routing** (P2): Workflow MUST route every `Decision:` note during plan
    > - @req FR:blueprint-context/design-decisions.location
    - **FR:workflow.plan.decision-routing.project-wide** (P2): Workflow MUST promote project-wide decisions to `.xe/features/design-decisions.md`
    - **FR:workflow.plan.decision-routing.feature-internal** (P2): Workflow MUST keep feature-internal decisions inline
    - **FR:workflow.plan.decision-routing.duplicate** (P2): Workflow MUST delete duplicate decisions
    - **FR:workflow.plan.decision-routing.revalidate** (P2): Workflow MUST re-validate existing design-decisions wave, phase, and feature references against the current structure
- **FR:workflow.implement** (P1): Workflow MUST author the blueprint per blueprint-context conventions and record product-architecture decisions in design-decisions.md when made in an `Implement` phase
  > - @req FR:blueprint-context/blueprint.template
  > - @req FR:blueprint-context/blueprint.location
  > - @req FR:blueprint-context/blueprint.arch
  > - @req FR:blueprint-context/blueprint.data-model
  > - @req FR:blueprint-context/blueprint.roadmap
  > - @req FR:blueprint-context/design-decisions.location
  > - @req FR:blueprint-context/design-decisions.format
- **FR:workflow.review** (P2): Workflow MUST close out the blueprint in a `Review` phase
  > - @req FR:blueprint-context/blueprint.arch
  > - @req FR:blueprint-context/blueprint.data-model
  > - @req FR:blueprint-context/blueprint.roadmap
  > - @req FR:feature-context/rollout.ephemeral
  > - @req FR:feedback-loop/playbook.routing.feature-file
  - **FR:workflow.review.validate** (P2): Workflow MUST validate blueprint completeness against blueprint-context conventions
  - **FR:workflow.review.summary** (P2): Workflow MUST present a summary for review
  - **FR:workflow.review.route** (P2): Workflow MUST route external issues
  - **FR:workflow.review.cleanup** (P2): Workflow MUST clean up temporary files
  - **FR:workflow.review.rollout** (P2): Workflow MUST close out the rollout
- **FR:workflow.continuity** (P2): Workflow MUST execute Active State updates at every STOP gate
  > - @req FR:feature-context/rollout.active-state
  > - @req FR:feature-context/rollout.active-state.overwrite
- **FR:workflow.auq-usage** (P1): Workflow MUST invoke the AUQ action file at every AUQ call site
  > - @req FR:context-storage/standards.auq.function
  - **FR:workflow.auq-usage.form** (P1): Workflow MUST write each call site as `Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to {imperative intent}`
  - **FR:workflow.auq-usage.no-inline** (P1): Workflow MUST NOT use inline AskUserQuestion directives
- **FR:workflow.output** (P2):
  - Blueprint (markdown)
    > - @req FR:blueprint-context/blueprint.location
  - Design decisions (markdown?)
    > - @req FR:blueprint-context/design-decisions.location
  - Rollout plan (markdown) — transient
    > - @req FR:feature-context/rollout.@file
    > - @req FR:feature-context/rollout.ephemeral

### Non-functional Requirements

**NFR:reliability**: Execution Reliability

- **NFR:reliability.sequential-execution** (P1): Workflow MUST execute phases sequentially
  - **NFR:reliability.sequential-execution.stop-gate** (P1): Workflow MUST honor a STOP gate after every phase
  - **NFR:reliability.sequential-execution.exit-criteria** (P1): STOP gate MUST validate ALL exit criteria, including any required user confirmation, before any subsequent action runs
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
