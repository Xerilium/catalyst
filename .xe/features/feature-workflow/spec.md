---
id: feature-workflow
title: Feature Development Workflow
description: Orchestrates feature development from discovery through implementation and review across execution modes.
dependencies:
  - context-storage
  - product-context
  - engineering-context
  - feature-context
  - feedback-loop
  - cli-engine
  - workflow-context
traceability:
  code: disabled
---

<!-- markdownlint-disable single-title -->

# Feature: Feature Development Workflow

## Purpose

Orchestrate reliable, token-efficient feature development from initial discovery through implementation and review, aligned with product vision and engineering principles.

## Scenarios

### FR:workflow: Feature development workflow

**Developer** needs AI-orchestrated feature development workflows so that they can build, update, fix, or explore features through standardized slash commands without re-deriving the process each time.

> - @req FR:feature-context/spec.template
> - @req FR:product-context/product.personas

- **FR:workflow.@ai-command** (P1): Interface: AI slash commands
  - **FR:workflow.@ai-command.create** (P1): Interface: `/catalyst:create` → `create-feature.md` — new features
    > - @req FR:context-storage/playbooks.framework
  - **FR:workflow.@ai-command.change** (P1): Interface: `/catalyst:change` → `update-feature.md` — updates existing features
    > - @req FR:context-storage/playbooks.framework
  - **FR:workflow.@ai-command.fix** (P1): Interface: `/catalyst:fix` → `repair-feature.md` — bug fixes
    > - @req FR:context-storage/playbooks.framework
  - **FR:workflow.@ai-command.explore** (P1): Interface: `/catalyst:explore` → `explore-feature.md` — research
    > - @req FR:context-storage/playbooks.framework
    > - @req FR:feature-context/rollout.@file
    > - @req FR:feedback-loop/playbook.routing.feature-file
- **FR:workflow.@playbook** (P1): Interface: orchestration playbooks invoked by AI slash commands
  - **FR:workflow.@playbook.create** (P1): Interface: `src/resources/playbooks/create-feature.md`
    > - @req FR:context-storage/playbooks.framework
  - **FR:workflow.@playbook.change** (P1): Interface: `src/resources/playbooks/update-feature.md`
    > - @req FR:context-storage/playbooks.framework
  - **FR:workflow.@playbook.fix** (P1): Interface: `src/resources/playbooks/repair-feature.md`
    > - @req FR:context-storage/playbooks.framework
  - **FR:workflow.@playbook.explore** (P1): Interface: `src/resources/playbooks/explore-feature.md`
    > - @req FR:context-storage/playbooks.framework
- **FR:workflow.input** (P2): Workflows MUST accept the parsed user prompt and any referenced context as input, including optional issue numbers, feature IDs, and file paths; existing artifacts on disk MUST be read when referenced
  > - @req FR:feature-context/spec.template
  > - @req FR:feature-context/design-decisions.@file
  > - @req FR:product-context/product.purpose
  > - @req FR:product-context/product.strategy
  > - @req FR:product-context/product.principles
  > - @req FR:product-context/product.personas
  - Existing feature specs and design decisions read from `.xe/features/{feature-id}/`
  - Product-context (personas, vision) and engineering-context (principles, standards) read for grounding
- **FR:workflow.discover** (P2): System MUST gather context from inputs before scoping
  - **FR:workflow.discover.parse-input** (P2): System MUST parse issue numbers, feature IDs, and context file references from user input
  - **FR:workflow.discover.read-specs** (P2): System MUST read existing feature specs, design decisions, and product/engineering context referenced in input
  - **FR:workflow.discover.resume** (P2): System MUST detect and resume from existing rollout plans at `.xe/rollouts/rollout-{id}.md`, using Phase 0 to route to the correct entry phase based on per-phase completeness rather than re-executing completed work
    > - @req FR:feature-context/rollout.template
    > - @req FR:feature-context/rollout.@file
    - Scope AUQ MUST include a resume-entry-phase question when resuming, with the lowest incomplete phase recommended and at least one alternate offered
    - Completed phases are confirmed, not rewritten; incomplete phases execute normally with existing artifacts as starting points
    - System MUST flag gaps, contradictions, or stale assumptions found during assessment and re-open the affected phase
    - Run-level skip: in multi-run rollouts, a run with all tasks `[x]` and verified implementation is skipped entirely; resume targets the first incomplete run
    - Abandoned-closeout handling: when implementation tasks are all `[x]` but closeout tasks are unchecked, system MUST confirm via AUQ that work was complete, acknowledge closeout, and acknowledge next step (next run or done)
  - **FR:workflow.discover.clarify** (P3): System SHOULD ask targeted clarifying questions only when necessary; prefer asking NO questions if context is sufficient; limit to 1-4 questions covering only what's needed for scoping
- **FR:workflow.scope** (P2): System MUST evaluate work scope before proceeding to spec
  - **FR:workflow.scope.evaluate** (P2): System MUST evaluate impacted features (added, updated, deleted) by scanning `.xe/features/` for existing specs
  - **FR:workflow.scope.dependencies** (P2): System MUST identify dependency ordering for impacted features (most-upstream-first based on dependency declarations)
  - **FR:workflow.scope.mode-selection** (P1): System MUST present ALL defined execution modes as AUQ options during scope evaluation, with at least one mode recommended based on context
    > - @req FR:workflow-context/execution-modes
  - **FR:workflow.scope.rollout-plan** (P2): System MUST create rollout plan at `.xe/rollouts/rollout-{id}.md` (rollout ID derived from feature ID for single feature, or logical description for multi-feature; includes overview, feature sections, and notes for context resumption)
    > - @req FR:feature-context/rollout.template
    > - @req FR:feature-context/rollout.@file
  - **FR:workflow.scope.convention-check** (P2): Before deciding naming, placement, or ownership for new artifacts introduced by the work, System MUST read ONE existing instance of each new artifact type (action file, FR scenario, template section, test block) to match established Catalyst conventions; runs before traceability sweep so detected FR-ID collisions or location overlaps reshape the sweep
  - **FR:workflow.scope.traceability-sweep** (P2): During scope evaluation, System MUST surface existing same-scenario traceability warnings for affected features via AUQ as opt-in Boy Scout fixes, defaulting to defer
  - **FR:workflow.scope.dependency-impact** (P1): When work modifies existing FRs, System MUST identify downstream `@req` consumers and surface them in the scope AUQ for resolution by FR:workflow.spec.downstream-review
    > - @req FR:cli-engine/deps.execute
- **FR:workflow.spec** (P1): System MUST collaboratively define feature specifications before planning
  - **FR:workflow.spec.interactive** (P1): System MUST support interactive spec generation for `interactive` mode (progressive AskUserQuestion prompts to build spec collaboratively; request user approval via AskUserQuestion before proceeding)
  - **FR:workflow.spec.autonomous** (P1): System MUST support autonomous spec generation for `autonomous` modes (generate complete spec without user prompts; auto-approved for `final-review` and `autonomous` modes)
  - **FR:workflow.spec.approval** (P2): System MUST present full spec for approval before proceeding (request user approval via AskUserQuestion in `interactive` mode; auto-approved for `final-review` and `autonomous` modes)
  - **FR:workflow.spec.downstream-review** (P1): When an FR's contract changes, System MUST classify impact for each downstream consumer surfaced by FR:workflow.scope.dependency-impact and not exit the spec phase until all consumers have a recorded outcome
  - **FR:workflow.spec.scenario-reqs** (P2): System MUST author scenario FRs and interfaces ordered outside-in (interfaces [outer → inner] → input → behaviors → output) and structured per the feature-context scenario conventions
    > - @req FR:feature-context/spec.scenarios.external
    > - @req FR:feature-context/spec.scenarios.patterns
    > - @req FR:feature-context/spec.scenarios.structure
    > - @req FR:feature-context/spec.scenarios.structure.data-model
- **FR:workflow.plan** (P1): System MUST design implementation approach before writing code
  - **FR:workflow.plan.plan-mode** (P1): System MUST use plan mode to design implementation approach (plan mode receives all approved specs and rollout plan as context; specs are final — plan mode does NOT modify specifications; design implementation approach aligned with engineering and product constraints; architecture review for patterns and tech stack consistency; traceability verification confirms plan covers all FRs and `@req` dependency annotations from approved specs; plan includes TDD approach — write failing tests before implementation)
    > - @req FR:engineering-context/eng.principles
    > - @req FR:engineering-context/eng.standards
    > - @req FR:engineering-context/arch.patterns
    > - @req FR:product-context/product.strategy
    > - @req FR:product-context/product.principles
  - **FR:workflow.plan.mandatory** (P1): System MUST enter plan mode BEFORE task breakdown or architecture work; skipping requires explicit AUQ approval; bug fixes MAY skip plan mode for small, single-file fixes
  - **FR:workflow.plan.design-decisions** (P3): System MUST record significant design decisions in `.xe/features/{feature-id}/design-decisions.md` during planning (create the file if it doesn't exist; append if it does; a decision is significant when alternatives were considered and a tradeoff was made; trivial or obvious choices do not need to be recorded)
    > - @req FR:feature-context/design-decisions.@file
    > - @req FR:feature-context/design-decisions.scope
    > - @req FR:feature-context/design-decisions.template
  - **FR:workflow.plan.downstream-tasks** (P1): When FR:workflow.spec.downstream-review records impacted consumers, plan MUST include update tasks grouped under the affected downstream feature ID in the rollout plan
  - **FR:workflow.plan.task-breakdown** (P2): System MUST break down work into executable tasks (grouped by feature in dependency order; checkbox format with nested details where needed; high-level tasks that can be figured out from spec and codebase)
    > - @req FR:feature-context/rollout.template
  - **FR:workflow.plan.approval** (P2): System MUST get plan approval before proceeding to implementation (request user approval via AskUserQuestion in `interactive` and `checkpoint-review` modes; auto-approved for `final-review` and `autonomous` modes; if spec changes required, exit plan mode and return to spec phase)
- **FR:workflow.implement** (P1): System MUST write tests and implement features so code meets requirements and is traceable to specifications
  - **FR:workflow.implement.tdd** (P1): System MUST write failing tests with `@req` annotations before implementation (each FR and NFR gets a test annotated with `@req FR:{id}`; tests MUST fail initially; use test framework skip/pending for untestable requirements with `// @req FR:{id} — cannot be automated: [reason]`)
  - **FR:workflow.implement.tdd-gate** (P1): System MUST NOT exit the test-writing step while any in-scope FR lacks a test `@req` annotation (P1-P3 FRs MUST have tests — no exceptions; P4-P5 FRs MAY be waived when automation is infeasible; waivers MUST be logged in rollout Notes)
  - **FR:workflow.implement.code** (P1): System MUST implement features to make tests pass (follow spec.md for WHAT, rollout plan for HOW and WHEN; focus only on code required for this task — YAGNI; keep changes scoped to single responsibility)
  - **FR:workflow.implement.validate** (P2): System MUST run validation per engineering-context requirements (formatting, linting, and testing as specified in engineering-context; run `npx catalyst traceability {feature-id}` for each feature)
    > - @req FR:engineering-context/arch.structure
    > - @req FR:engineering-context/eng.standards
    > - @req FR:engineering-context/eng.quality
  - **FR:workflow.implement.track-progress** (P2): System MUST mark completed tasks in rollout plan as each finishes (mark with `[x]` immediately upon completion; do not batch multiple tasks before updating; update Notes section for blockers or approach changes)
    > - @req FR:feature-context/rollout.@file
    > - @req FR:feature-context/rollout.template
  - **FR:workflow.implement.design-decisions** (P3): System MUST record design decisions in `.xe/features/{feature-id}/design-decisions.md` when implementation requires a significant change in approach (append to existing file; do not overwrite prior decisions; typical triggers: hitting a constraint that forces a pivot, discovering a library limitation, choosing between implementation patterns)
    > - @req FR:feature-context/design-decisions.@file
    > - @req FR:feature-context/design-decisions.scope
  - **FR:workflow.implement.drift-protection** (P1): System MUST prevent requirements drift (never modify spec.md without user approval; if requirement cannot be met, STOP and ask user; never rename or remove FR/NFR IDs without updating `@req` references; semantic FR changes during implementation return to spec phase for FR:workflow.spec.downstream-review)
  - **FR:workflow.implement.boy-scout-log** (P2): System MUST log unplanned Boy Scout fixes to rollout Notes as `- Boy Scout: {what} — {why}` before executing them
    > - @req FR:feature-context/rollout.@file
    > - @req FR:engineering-context/eng.principles
- **FR:workflow.review** (P2): Feature workflow Review phase MUST compose the workflow-context closure actions (audit → review → closure → celebrate) with `pr-type: Feature`, and MUST regenerate the feature index between closure and celebration
  > - @req FR:workflow-context/audit
  > - @req FR:workflow-context/review
  > - @req FR:workflow-context/closure
  > - @req FR:workflow-context/celebrate
  > - @req FR:feature-context/index.@file
  > - @req FR:feature-context/index.generated
  > - @req FR:cli-engine/index.execute
  > - @req FR:product-context/product.team
- **FR:workflow.continuity** (P2): Feature workflow MUST invoke the workflow-context Active State action at every orchestration STOP gate so post-compaction agents can resume efficiently
  > - @req FR:workflow-context/state
  > - @req FR:feature-context/rollout.active-state
  > - @req FR:feature-context/rollout.active-state.overwrite
- **FR:workflow.auq-usage** (P1): Feature workflow MUST follow the workflow-context AUQ invocation pattern at every AUQ call site
  > - @req FR:workflow-context/auq.invoke
  > - @req FR:workflow-context/auq.patterns
- **FR:workflow.distilled-writing** (P1): Feature workflow action playbooks MUST follow the workflow-context Distilled Excellence reference rule
  > - @req NFR:workflow-context/authoring.distilled-writing
- **FR:workflow.auq-self-check** (P1): Feature workflow MUST execute the workflow-context AUQ pre-submit teammate-test gate before submitting any AUQ
  > - @req FR:workflow-context/auq.self-check
- **FR:workflow.output** (P2): Workflows MUST produce feature artifacts following feature-context conventions: specs, code, tests, rollouts, and optional pull requests
  > - @req FR:feature-context/spec.@file
  > - @req FR:feature-context/rollout.@file
  > - @req FR:feature-context/design-decisions.@file

### Non-functional Requirements

**NFR:reliability**: Execution Reliability

- **NFR:reliability.sequential-execution** (P1): System MUST execute workflow phases sequentially, honoring a STOP gate after every phase that validates ALL exit criteria — including any required user confirmation — before any subsequent action runs
  - When a user questions or challenges a phase result, system MUST remain in the current phase and resolve the concern before re-evaluating exit criteria
  - Validated via test suite
- **NFR:reliability.informed-judgment** (P1): System MUST form and present recommended options with rationale grounded in product vision (`product.md`) and engineering principles (`engineering.md`)
  > - @req FR:product-context/product.strategy
  > - @req FR:product-context/product.principles
  > - @req FR:engineering-context/eng.principles
  - System acts as technical authority (CTO posture) while deferring final decisions to human oversight (CEO posture)
  - System MUST NOT passively defer decisions or present options without a recommendation

## Architecture Constraints

**AC:playbook-composition**: Playbook Structure

Orchestration playbooks compose micro-playbooks for modular, phase-based execution. Micro-playbooks are separate files in `actions/` subdirectory. This enables token efficiency (load one phase at a time) and reusability (micro-playbooks shared across work types).

## External Dependencies

None
