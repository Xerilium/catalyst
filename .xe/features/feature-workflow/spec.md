---
id: feature-workflow
title: Feature Development Workflow
description: Orchestrates feature development from discovery through implementation and review across execution modes.
dependencies:
  - ai-plugin
  - cli-engine
  - context-storage
  - engineering-context
  - feature-context
  - feedback-loop
  - product-context
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

- **FR:workflow.@ai-skill** (P1): Interface: AI skills
  > - @req FR:ai-plugin/skills.@ai-skill
  - **FR:workflow.@ai-skill.create** (P1): Interface: `/catalyst:create` → `create-feature.md` — new features
    > - @req FR:context-storage/playbooks.framework
  - **FR:workflow.@ai-skill.change** (P1): Interface: `/catalyst:change` → `update-feature.md` — updates existing features
    > - @req FR:context-storage/playbooks.framework
  - **FR:workflow.@ai-skill.fix** (P1): Interface: `/catalyst:fix` → `repair-feature.md` — bug fixes
    > - @req FR:context-storage/playbooks.framework
  - **FR:workflow.@ai-skill.explore** (P1): Interface: `/catalyst:explore` → `explore-feature.md` — research
    > - @req FR:context-storage/playbooks.framework
    > - @req FR:feature-context/rollout.@file
    > - @req FR:feedback-loop/playbook.routing.feature-file
  - **FR:workflow.@ai-skill.rollout** (P2): Interface: `/catalyst:rollout` → `start-rollout.md` — orient and dispatch any rollout
    > - @req FR:context-storage/playbooks.framework
    > - @req FR:feature-context/rollout.@file
- **FR:workflow.@playbook** (P1): Interface: orchestration playbooks invoked by AI slash commands
  - **FR:workflow.@playbook.create** (P1): Interface: `src/resources/playbooks/create-feature.md`
    > - @req FR:context-storage/playbooks.framework
  - **FR:workflow.@playbook.change** (P1): Interface: `src/resources/playbooks/update-feature.md`
    > - @req FR:context-storage/playbooks.framework
  - **FR:workflow.@playbook.fix** (P1): Interface: `src/resources/playbooks/repair-feature.md`
    > - @req FR:context-storage/playbooks.framework
  - **FR:workflow.@playbook.explore** (P1): Interface: `src/resources/playbooks/explore-feature.md`
    > - @req FR:context-storage/playbooks.framework
  - **FR:workflow.@playbook.rollout** (P2): Interface: `src/resources/playbooks/start-rollout.md`
    > - @req FR:context-storage/playbooks.framework
- **FR:workflow.input** (P2):
  > - @req FR:feature-context/spec.template
  > - @req FR:feature-context/design-decisions.@file
  > - @req FR:product-context/product.purpose
  > - @req FR:product-context/product.strategy
  > - @req FR:product-context/product.principles
  > - @req FR:product-context/product.personas
  - Prompt (string) — parsed user request
  - Issue number (string?) — optional GitHub issue
  - Feature IDs (string[]?) — optional features to update
  - Context file paths (string[]?) — optional referenced files, read from disk
  - Feature artifacts (string[]?) — existing specs and design decisions under `.xe/features/{feature-id}/`
  - Grounding context (string[]?) — product-context (personas, vision) and engineering-context (principles, standards)
- **FR:workflow.discover** (P2): Workflow MUST gather context from inputs before scoping
  - **FR:workflow.discover.parse-input** (P2): Workflow MUST parse issue numbers, feature IDs, and context file references from user input
  - **FR:workflow.discover.read-specs** (P2): Workflow MUST read existing feature specs, design decisions, and product/engineering context referenced in input
  - **FR:workflow.discover.resume** (P2): Workflow MUST resume from an existing rollout plan at `.xe/rollouts/rollout-{id}.md`
    > - @req FR:feature-context/rollout.template
    > - @req FR:feature-context/rollout.@file
    - `/catalyst:rollout` is the continuation entry point for multi-run rollouts.
    - **FR:workflow.discover.resume.route** (P2): Workflow MUST use Phase 0 to route to the entry phase based on per-phase completeness
      - Rationale: Completed work is not re-executed.
    - **FR:workflow.discover.resume.entry-question** (P2): Scope AUQ MUST include a resume-entry-phase question when resuming
      - **FR:workflow.discover.resume.entry-question.recommend** (P2): Scope AUQ MUST recommend the lowest incomplete phase
      - **FR:workflow.discover.resume.entry-question.alternate** (P2): Scope AUQ MUST offer at least one alternate phase
    - **FR:workflow.discover.resume.completed** (P2): Workflow MUST confirm completed phases without rewriting them
    - **FR:workflow.discover.resume.incomplete** (P2): Workflow MUST execute incomplete phases normally, with existing artifacts as starting points
    - **FR:workflow.discover.resume.gaps** (P2): Workflow MUST flag gaps, contradictions, or stale assumptions found during assessment
      - **FR:workflow.discover.resume.gaps.reopen** (P2): Workflow MUST re-open the affected phase
    - **FR:workflow.discover.resume.run-skip** (P2): Workflow MUST skip a run whose tasks are all `[x]` with verified implementation
      - **FR:workflow.discover.resume.run-skip.target** (P2): Workflow MUST resume at the first incomplete run in a multi-run rollout
    - **FR:workflow.discover.resume.closeout** (P2): Workflow MUST confirm via AUQ that work was complete when all implementation tasks are `[x]` and closeout tasks are unchecked
      - **FR:workflow.discover.resume.closeout.acknowledge** (P2): Workflow MUST acknowledge closeout and the next step (next run or done)
  - **FR:workflow.discover.clarify** (P3): Workflow SHOULD ask clarifying questions only when context is insufficient
    - **FR:workflow.discover.clarify.limit** (P3): Workflow SHOULD ask 1-4 questions
    - **FR:workflow.discover.clarify.focus** (P3): Workflow SHOULD ask only about what scoping needs
- **FR:workflow.scope** (P2): Workflow MUST evaluate work scope before proceeding to spec
  - **FR:workflow.scope.evaluate** (P2): Workflow MUST evaluate impacted features (added, updated, deleted) by scanning `.xe/features/` for existing specs
  - **FR:workflow.scope.dependencies** (P2): Workflow MUST identify dependency ordering for impacted features (most-upstream-first based on dependency declarations)
  - **FR:workflow.scope.mode-selection** (P1): Workflow MUST present every defined execution mode as an AUQ option during scope evaluation
    > - @req FR:workflow-context/execution-modes
    - **FR:workflow.scope.mode-selection.recommend** (P1): Workflow MUST recommend at least one mode based on context
  - **FR:workflow.scope.rollout-plan** (P2): Workflow MUST create a rollout plan at `.xe/rollouts/rollout-{id}.md`
    > - @req FR:feature-context/rollout.template
    > - @req FR:feature-context/rollout.@file
    - **FR:workflow.scope.rollout-plan.id** (P2): Workflow MUST derive the rollout ID from the feature ID for one feature
    - **FR:workflow.scope.rollout-plan.id-multi** (P2): Workflow MUST derive the rollout ID from a logical description for multiple features
    - **FR:workflow.scope.rollout-plan.content** (P2): Rollout plan MUST include an overview, feature sections, and notes for context resumption
  - **FR:workflow.scope.convention-check** (P2): Workflow MUST read ONE existing instance of each new artifact type before deciding its naming, placement, or ownership
    - Artifact types include action file, FR scenario, template section, and test block.
    - Rationale: New artifacts match established Catalyst conventions.
    - **FR:workflow.scope.convention-check.order** (P2): Workflow MUST run the convention check before the traceability sweep
      - Rationale: Detected FR-ID collisions or location overlaps reshape the sweep.
  - **FR:workflow.scope.traceability-sweep** (P2): Workflow MUST surface existing same-scenario traceability warnings for affected features via AUQ during scope evaluation
    - **FR:workflow.scope.traceability-sweep.opt-in** (P2): Workflow MUST offer each fix as an opt-in Boy Scout fix
    - **FR:workflow.scope.traceability-sweep.default** (P2): Workflow MUST default the choice to defer
  - **FR:workflow.scope.dependency-impact** (P1): When work modifies existing FRs, Workflow MUST identify downstream `@req` consumers
    > - @req FR:cli-engine/deps.execute
    - **FR:workflow.scope.dependency-impact.surface** (P1): Workflow MUST surface identified consumers in the scope AUQ for resolution during spec review
- **FR:workflow.spec** (P1): Workflow MUST collaboratively define feature specifications before planning
  - **FR:workflow.spec.interactive** (P1): Workflow MUST support interactive spec generation in `interactive` mode
    - **FR:workflow.spec.interactive.prompts** (P1): Workflow MUST build the spec collaboratively through progressive AskUserQuestion prompts
  - **FR:workflow.spec.autonomous** (P1): Workflow MUST generate a complete spec without user prompts in `final-review` and `autonomous` modes
  - **FR:workflow.spec.approval** (P2): AI Agent MUST present the full spec for approval before proceeding
    - **FR:workflow.spec.approval.ask** (P2): AI Agent MUST request user approval via AskUserQuestion in `interactive`, `checkpoint-review`, and `spec-review` modes
    - **FR:workflow.spec.approval.auto** (P2): AI Agent MUST auto-approve in `final-review` and `autonomous` modes
  - **FR:workflow.spec.downstream-review** (P1): When an FR's contract changes, Workflow MUST classify impact for each downstream consumer surfaced during scope
    > - @req FR:workflow.scope.dependency-impact
    - **FR:workflow.spec.downstream-review.exit** (P1): Workflow MUST NOT exit the spec phase until every consumer has a recorded outcome
  - **FR:workflow.spec.purpose-stable** (P2): Workflow MUST leave an existing Purpose unchanged unless its scope or vision changes
    > - @req FR:feature-context/spec.purpose.mission-only
    > - @req FR:feature-context/spec.purpose.vision-stable
    - **FR:workflow.spec.purpose-stable.specific** (P2): Workflow MAY rewrite a Purpose that restates scenarios or FRs
  - **FR:workflow.spec.scenario-reqs** (P2): Workflow MUST author scenario FRs and interfaces ordered outside-in
    - Order: interfaces (outer to inner), input, behaviors, output.
    - **FR:workflow.spec.scenario-reqs.structure** (P2): Workflow MUST structure scenarios per the feature-context scenario conventions
      > - @req FR:feature-context/spec.scenarios.external
      > - @req FR:feature-context/spec.scenarios.patterns
      > - @req FR:feature-context/spec.scenarios.structure
      > - @req FR:feature-context/spec.scenarios.structure.data-model
  - **FR:workflow.spec.ste** (P2): AI Agent MUST write FR prose that follows the feature-context STE rules.
    > - @req FR:feature-context/spec.ste
  - **FR:workflow.spec.ste-check** (P2): AI Agent MUST check each new or changed FR against the STE rules before presenting the spec for approval.
    > - @req FR:feature-context/spec.ste.sentence
    > - @req FR:feature-context/spec.ste.rationale
    > - @req FR:feature-context/spec.ste.terms
- **FR:workflow.plan** (P1): AI Agent MUST design implementation approach before writing code
  - **FR:workflow.plan.plan-mode** (P1): AI Agent MUST design the implementation approach in plan mode or the unattended planning pass
    > - @req FR:engineering-context/eng.principles
    > - @req FR:engineering-context/eng.standards
    > - @req FR:engineering-context/arch.patterns
    > - @req FR:product-context/product.strategy
    > - @req FR:product-context/product.principles
    - **FR:workflow.plan.plan-mode.context** (P1): Workflow MUST give planning all approved specs and the rollout plan as context
    - **FR:workflow.plan.plan-mode.specs-final** (P1): AI Agent MUST NOT modify specifications during planning
    - **FR:workflow.plan.plan-mode.alignment** (P1): AI Agent MUST align the approach with engineering and product constraints
    - **FR:workflow.plan.plan-mode.architecture-review** (P1): AI Agent MUST review architecture for pattern and tech-stack consistency
    - **FR:workflow.plan.plan-mode.traceability** (P1): AI Agent MUST verify the plan covers all FRs and `@req` dependency annotations from approved specs
    - **FR:workflow.plan.plan-mode.tdd** (P1): AI Agent MUST include a TDD approach in the plan
      - Write failing tests before implementation.
  - **FR:workflow.plan.mandatory** (P1): AI Agent MUST enter plan mode before task breakdown or architecture work in `interactive` and `checkpoint-review` modes
    - **FR:workflow.plan.mandatory.skip** (P1): AI Agent MAY skip plan mode only with explicit AUQ approval
    - **FR:workflow.plan.mandatory.skip-limit** (P1): AI Agent MUST limit skipping to small, single-file bug fixes
  - **FR:workflow.plan.unattended** (P1): AI Agent MUST replace plan mode with an unattended planning pass in `spec-review`, `final-review`, and `autonomous` modes
    > - @req FR:workflow-context/execution-modes.precedence.approve
    - **FR:workflow.plan.unattended.follow** (P1): AI Agent MUST follow plan mode instructions during the pass
    - **FR:workflow.plan.unattended.no-skip** (P1): AI Agent MUST NOT ask a skip AUQ
    - **FR:workflow.plan.unattended.read-only** (P1): AI Agent MUST NOT edit source or test files until the planning pass is recorded in the rollout plan
    - **FR:workflow.plan.unattended.record** (P1): AI Agent MUST record the architecture approach, task breakdown, and traceability check in the rollout plan
  - **FR:workflow.plan.design-decisions** (P3): AI Agent MUST record planning decisions that meet the recording criteria in the feature's design-decisions file
    > - @req FR:feature-context/design-decisions.@file
    > - @req FR:feature-context/design-decisions.criteria
    > - @req FR:feature-context/design-decisions.active
    > - @req FR:feature-context/design-decisions.scope
    > - @req FR:feature-context/design-decisions.template
  - **FR:workflow.plan.downstream-tasks** (P1): AI Agent MUST add update tasks to the rollout plan for each impacted downstream consumer recorded during spec review
    > - @req FR:workflow.spec.downstream-review
    - **FR:workflow.plan.downstream-tasks.group** (P1): AI Agent MUST group each task under the affected downstream feature ID
  - **FR:workflow.plan.task-breakdown** (P2): AI Agent MUST break down work into executable tasks
    > - @req FR:feature-context/rollout.template
    - **FR:workflow.plan.task-breakdown.order** (P2): AI Agent MUST group tasks by feature in dependency order
    - **FR:workflow.plan.task-breakdown.format** (P2): AI Agent MUST write tasks in checkbox format, with nested details where needed
    - **FR:workflow.plan.task-breakdown.level** (P2): AI Agent MUST keep tasks high-level, leaving detail to the spec and codebase
  - **FR:workflow.plan.approval** (P2): AI Agent MUST get plan approval before proceeding to implementation
    - **FR:workflow.plan.approval.ask** (P2): AI Agent MUST request user approval via AskUserQuestion in `interactive` and `checkpoint-review` modes
    - **FR:workflow.plan.approval.auto** (P2): AI Agent MUST auto-approve in `spec-review`, `final-review`, and `autonomous` modes
    - **FR:workflow.plan.approval.spec-change** (P2): AI Agent MUST return to the spec phase when spec changes are required
      - **FR:workflow.plan.approval.spec-change.exit** (P2): AI Agent MUST exit plan mode first when in it
- **FR:workflow.implement** (P1): AI Agent MUST deliver traceable features
  - Rationale: Code meets requirements and is traceable to specifications.
  - **FR:workflow.implement.tdd** (P1): AI Agent MUST write failing tests with `@req` annotations before implementation
    - **FR:workflow.implement.tdd.coverage** (P1): AI Agent MUST give each FR and NFR a test annotated with `@req FR:{id}`
    - **FR:workflow.implement.tdd.fail-first** (P1): AI Agent MUST confirm each new test fails before implementing
    - **FR:workflow.implement.tdd.untestable** (P1): AI Agent MUST mark an untestable requirement with test framework skip/pending and `// @req FR:{id} — cannot be automated: [reason]`
  - **FR:workflow.implement.tdd-gate** (P1): AI Agent MUST NOT exit the test-writing step while any in-scope FR lacks a test `@req` annotation
    - **FR:workflow.implement.tdd-gate.required** (P1): AI Agent MUST NOT waive tests for P1-P3 FRs
    - **FR:workflow.implement.tdd-gate.waiver** (P1): AI Agent MAY waive tests for P4-P5 FRs when automation is infeasible
      - **FR:workflow.implement.tdd-gate.waiver.log** (P1): AI Agent MUST log each waiver in rollout Notes
  - **FR:workflow.implement.code** (P1): AI Agent MUST implement features to make tests pass
    - **FR:workflow.implement.code.source** (P1): AI Agent MUST follow spec.md for WHAT and the rollout plan for HOW and WHEN
    - **FR:workflow.implement.code.yagni** (P1): AI Agent MUST write only the code the task requires
    - **FR:workflow.implement.code.scope** (P1): AI Agent MUST scope changes to a single responsibility
  - **FR:workflow.implement.validate** (P2): AI Agent MUST run validation per engineering-context requirements
    > - @req FR:engineering-context/arch.structure
    > - @req FR:engineering-context/eng.standards
    > - @req FR:engineering-context/eng.quality
    - Validation covers formatting, linting, and testing as engineering-context specifies.
    - **FR:workflow.implement.validate.traceability** (P2): AI Agent MUST run `npx catalyst traceability {feature-id}` for each feature
  - **FR:workflow.implement.track-progress** (P2): AI Agent MUST mark completed tasks in the rollout plan as each finishes
    > - @req FR:feature-context/rollout.@file
    > - @req FR:feature-context/rollout.template
    > - @req FR:workflow-context/audit.identify.verify
    - Rationale: Closure audit verifies these marks against disk, so a checkbox is a claim to keep truthful.
    - **FR:workflow.implement.track-progress.immediate** (P2): AI Agent MUST mark `[x]` immediately on completion
    - **FR:workflow.implement.track-progress.no-batch** (P2): AI Agent MUST NOT batch multiple tasks before updating
    - **FR:workflow.implement.track-progress.notes** (P2): AI Agent MUST update Notes for blockers or approach changes
  - **FR:workflow.implement.design-decisions** (P3): AI Agent MUST record implementation decisions that meet the recording criteria in the feature's design-decisions file
    > - @req FR:feature-context/design-decisions.@file
    > - @req FR:feature-context/design-decisions.criteria
    > - @req FR:feature-context/design-decisions.active
    > - @req FR:feature-context/design-decisions.scope
  - **FR:workflow.implement.drift-protection** (P1): AI Agent MUST prevent requirements drift
    - **FR:workflow.implement.drift-protection.spec-edit** (P1): AI Agent MUST NOT modify spec.md without user approval
    - **FR:workflow.implement.drift-protection.blocked** (P1): AI Agent MUST STOP and ask the user when a requirement cannot be met
    - **FR:workflow.implement.drift-protection.ids** (P1): AI Agent MUST NOT rename or remove FR/NFR IDs without updating `@req` references
    - **FR:workflow.implement.drift-protection.semantic** (P1): AI Agent MUST return to the spec phase when an FR changes semantically during implementation
      > - @req FR:workflow.spec.downstream-review
  - **FR:workflow.implement.boy-scout-log** (P2): AI Agent MUST log unplanned Boy Scout fixes to rollout Notes
    > - @req FR:feature-context/rollout.@file
    > - @req FR:engineering-context/eng.principles
    - **FR:workflow.implement.boy-scout-log.format** (P2): AI Agent MUST format each entry as `- Boy Scout: {what} — {why}`
    - **FR:workflow.implement.boy-scout-log.before** (P2): AI Agent MUST log each fix before executing it
- **FR:workflow.review** (P2): Feature workflow Review phase MUST compose the workflow-context closure actions (audit → review → closure → celebrate) with `pr-type: Feature`
  > - @req FR:workflow-context/audit
  > - @req FR:workflow-context/review
  > - @req FR:workflow-context/closure
  > - @req FR:workflow-context/celebrate
  > - @req FR:product-context/product.team
  - **FR:workflow.review.index** (P2): Feature workflow MUST regenerate the feature index between closure and celebration
    > - @req FR:feature-context/index.@file
    > - @req FR:feature-context/index.generated
    > - @req FR:cli-engine/index.execute
  - **FR:workflow.review.no-bare-done** (P2): Feature workflow MUST surface the completion signal through the review action
    - Rationale: A bare console "done" would skip the loop that drives audit → closure to a terminal state.
  - **FR:workflow.review.pre-pr** (P1): Workflow MUST pass the spec gate before creating a pull request
    - **FR:workflow.review.pre-pr.check** (P1): Workflow MUST run `npx catalyst check {feature-id}` for each feature in scope and fix every finding on touched FRs
    - **FR:workflow.review.pre-pr.decisions** (P1): Workflow MUST merge overlapping or contradicting entries in each touched design-decisions file into one active entry
      > - @req FR:feature-context/design-decisions.active.supersede
    - **FR:workflow.review.pre-pr.purpose** (P2): Workflow MUST revert any unjustified Purpose change
      > - @req FR:feature-context/spec.purpose.vision-stable
      - A Purpose change is justified by a scope or vision change, or by fixing an overly specific Purpose.
- **FR:workflow.continuity** (P2): Feature workflow MUST invoke the workflow-context Active State action at every orchestration STOP gate
  > - @req FR:workflow-context/state
  > - @req FR:feature-context/rollout.active-state
  > - @req FR:feature-context/rollout.active-state.overwrite
  - Rationale: Post-compaction agents resume efficiently.
- **FR:workflow.auq-usage** (P1): Feature workflow MUST follow the workflow-context AUQ invocation pattern at every AUQ call site
  > - @req FR:workflow-context/auq.invoke
  > - @req FR:workflow-context/auq.patterns
- **FR:workflow.plain-language** (P1): Feature workflow action playbooks MUST follow the workflow-context Plain Language reference rule
  > - @req NFR:workflow-context/authoring.plain-language
- **FR:workflow.auq-self-check** (P1): Feature workflow MUST execute the workflow-context AUQ pre-submit teammate-test gate before submitting any AUQ
  > - @req FR:workflow-context/auq.self-check
- **FR:workflow.execute** (P2): Workflow MUST read the target rollout's next incomplete run when invoked via `/catalyst:rollout`
  > - @req FR:feature-context/rollout.@file
  > - @req FR:feature-context/rollout.runs
  - **FR:workflow.execute.command** (P2): Workflow MUST read the run's declared `> **Execute**:` command
  - **FR:workflow.execute.dispatch** (P2): Workflow MUST execute the corresponding playbook directly
- **FR:workflow.output** (P2):
  > - @req FR:feature-context/spec.@file
  > - @req FR:feature-context/rollout.@file
  > - @req FR:feature-context/design-decisions.@file
  - Specs (string[]) — feature specs following feature-context conventions
  - Code (string[]) — implementation traceable to specs
  - Tests (string[]) — tests annotated with `@req`
  - Rollouts (string[]) — rollout plans
  - Pull request (string?) — optional

### Non-functional Requirements

**NFR:reliability**: Execution Reliability

- **NFR:reliability.sequential-execution** (P1): Workflow MUST execute phases sequentially
  - Validated via test suite
  - **NFR:reliability.sequential-execution.stop-gate** (P1): Workflow MUST honor a STOP gate after every phase
  - **NFR:reliability.sequential-execution.exit-criteria** (P1): Workflow MUST validate all exit criteria, including required user confirmation, before any subsequent action runs
  - **NFR:reliability.sequential-execution.challenge** (P1): Workflow MUST remain in the current phase when a user questions or challenges a phase result
    - **NFR:reliability.sequential-execution.challenge.resolve** (P1): Workflow MUST resolve the concern before re-evaluating exit criteria
- **NFR:reliability.informed-judgment** (P1): Workflow MUST form and present recommended options with rationale grounded in product vision (`product.md`) and engineering principles (`engineering.md`)
  > - @req FR:product-context/product.strategy
  > - @req FR:product-context/product.principles
  > - @req FR:engineering-context/eng.principles
  - Workflow acts as technical authority (CTO posture) while deferring final decisions to human oversight (CEO posture).
  - **NFR:reliability.informed-judgment.no-defer** (P1): Workflow MUST NOT passively defer decisions or present options without a recommendation

## Data Model

None

## Architecture Constraints

**Playbook Structure**

Orchestration playbooks compose micro-playbooks for modular, phase-based execution. Micro-playbooks are separate files in `actions/` subdirectory. This enables token efficiency (load one phase at a time) and reusability (micro-playbooks shared across work types).

## External Dependencies

None
