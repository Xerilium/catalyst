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
  - catalyst-cli
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

- **FR:workflow.cli** (P1): Workflows MUST be exposed as slash commands invoked from the AI CLI (interface: `cli`); each command maps to an orchestration playbook composing the standard phase sequence
  - **FR:workflow.cli.create** (P1): `/catalyst:create` MUST invoke `src/resources/playbooks/create-feature.md` for new features (full spec-driven cycle: scope → spec → plan → implement → review)
    > - @req FR:context-storage/playbooks.framework
  - **FR:workflow.cli.change** (P1): `/catalyst:change` MUST invoke `src/resources/playbooks/update-feature.md` for changes to existing features (lighter spec updates focused on deltas)
    > - @req FR:context-storage/playbooks.framework
  - **FR:workflow.cli.fix** (P1): `/catalyst:fix` MUST invoke `src/resources/playbooks/repair-feature.md` for bug fixes (failing test first, validates expected behavior against existing specs)
    > - @req FR:context-storage/playbooks.framework
  - **FR:workflow.cli.explore** (P1): `/catalyst:explore` MUST invoke `src/resources/playbooks/explore-feature.md` for research (analyzes and investigates without modifying specs or code; presents findings, optionally saves to `.xe/rollouts/explore-{topic}.md`)
    > - @req FR:context-storage/playbooks.framework
    > - @req FR:feature-context/rollout.location
    > - @req FR:feedback-loop/playbook.routing.feature-file
- **FR:workflow.input** (P2): Workflows MUST accept the parsed user prompt and any referenced context as input, including optional issue numbers, feature IDs, and file paths; existing artifacts on disk MUST be read when referenced
  - Existing feature specs and design decisions read from `.xe/features/{feature-id}/`
  - Product-context (personas, vision) and engineering-context (principles, standards) read for grounding
  > - @req FR:feature-context/spec.template
  > - @req FR:feature-context/design-decisions.location
  > - @req FR:product-context/product.purpose
  > - @req FR:product-context/product.strategy
  > - @req FR:product-context/product.principles
  > - @req FR:product-context/product.personas
- **FR:workflow.discover** (P2): System MUST gather context from inputs before scoping
  - **FR:workflow.discover.parse-input** (P2): System MUST parse issue numbers, feature IDs, and context file references from user input
  - **FR:workflow.discover.read-specs** (P2): System MUST read existing feature specs, design decisions, and product/engineering context referenced in input
  - **FR:workflow.discover.resume** (P2): System MUST detect and resume from existing rollout plans at `.xe/rollouts/rollout-{id}.md`, using Phase 0 to route to the correct entry phase based on per-phase completeness rather than re-executing completed work
    > - @req FR:feature-context/rollout.template
    > - @req FR:feature-context/rollout.location
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
    > - @req FR:feature-context/rollout.location
  - **FR:workflow.scope.convention-check** (P2): Before deciding naming, placement, or ownership for new artifacts introduced by the work, System MUST read ONE existing instance of each new artifact type (action file, FR scenario, template section, test block) to match established Catalyst conventions; runs before traceability sweep so detected FR-ID collisions or location overlaps reshape the sweep
  - **FR:workflow.scope.traceability-sweep** (P2): During scope evaluation, System MUST surface existing same-scenario traceability warnings for affected features via AUQ as opt-in Boy Scout fixes, defaulting to defer
  - **FR:workflow.scope.dependency-impact** (P1): When work modifies existing FRs, System MUST identify downstream `@req` consumers and surface them in the scope AUQ for resolution by FR:workflow.spec.downstream-review
    > - @req FR:catalyst-cli/deps.execute
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
    > - @req FR:feature-context/design-decisions.location
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
    > - @req FR:feature-context/rollout.location
    > - @req FR:feature-context/rollout.template
  - **FR:workflow.implement.design-decisions** (P3): System MUST record design decisions in `.xe/features/{feature-id}/design-decisions.md` when implementation requires a significant change in approach (append to existing file; do not overwrite prior decisions; typical triggers: hitting a constraint that forces a pivot, discovering a library limitation, choosing between implementation patterns)
    > - @req FR:feature-context/design-decisions.location
    > - @req FR:feature-context/design-decisions.scope
  - **FR:workflow.implement.drift-protection** (P1): System MUST prevent requirements drift (never modify spec.md without user approval; if requirement cannot be met, STOP and ask user; never rename or remove FR/NFR IDs without updating `@req` references; semantic FR changes during implementation return to spec phase for FR:workflow.spec.downstream-review)
  - **FR:workflow.implement.boy-scout-log** (P2): System MUST log unplanned Boy Scout fixes to rollout Notes as `- Boy Scout: {what} — {why}` before executing them
    > - @req FR:feature-context/rollout.location
    > - @req FR:engineering-context/eng.principles
- **FR:workflow.review** (P2): System MUST present completed work and handle closure so changes are ready for merge and external issues are tracked
  - **FR:workflow.review.present** (P2): System MUST present work summary as formatted console output, then offer conversational review before final AUQ
    - Before presenting, system MUST audit completeness: read the rollout's source context (explore doc, linked issue, or original request) and verify all stated requirements are addressed in the implemented work. Report any gaps in the Remaining section.
    - Summary MUST include complete state context: what was done, what remains, current phase, and any blockers or notable findings
    - Summary MUST include the original request or issue that prompted the work so the user can immediately identify what's being reviewed
    - Summary MUST be visually distinguishable from normal conversation — a clear header at the start and an abbreviated recap at the end so the user can identify the review at a glance even after content has scrolled
    - Summary MUST omit sections with nothing to report in the detailed body (recap always includes all items)
    - Summary MUST end with an abbreviated status recap (one line per section) so the user doesn't need to scroll back to understand overall state
    - Recap is followed by a visual separator and a done prompt on its own line; system MUST loop on user input, re-prompting after each non-"done" response, until the user types "done"
    - Requests during review escalate by complexity: simple tweaks executed immediately, new tasks added to plan then executed, spec changes re-execute spec → plan → implement phases then return to review
    - When user confirms done, present final AUQ with external issue routing (if any) and closure options
    - Skip summary for `autonomous` mode (proceed directly to PR creation)
  - **FR:workflow.review.external-issues** (P3): System SHOULD route external issues to tracking mechanisms (issues discovered during implementation but outside scope; options: add to existing tracking file, create new tracking file, create GitHub issue, drop it; examples: bugs in other features, missing capabilities, framework limitations, spec gaps)
  - **FR:workflow.review.cleanup** (P3): System MUST clean up temporary files with user confirmation (context files noted during scoping; deprecated feature files at `.xe/features/{feature-id}/`; rollout plan deleted unless PR pending or continued work; never delete files outside repository without confirmation)
    > - @req FR:feature-context/rollout.location
    > - @req FR:feature-context/rollout.ephemeral
  - **FR:workflow.review.closure-routing** (P2): After cleanup, system MUST route by execution mode (`autonomous`: proceed to PR creation; `final-review`: post summary confirming work complete; `interactive` / `checkpoint-review`: MUST present AUQ with options to commit, create PR, or keep working)
  - **FR:workflow.review.pr-creation** (P3): System MAY create pull request when requested or in autonomous mode (verify current branch is not default branch, create feature branch if needed; PR title `[Catalyst][{type}] {feature-name}` where type is Feature or Bug; PR body includes requirements coverage summary, links to specs, summary of changes; link related issues with `Fixes #{id}` or `Related to #{id}`; assign reviewers per product-context team roles if defined)
    > - @req FR:product-context/product.team
  - **FR:workflow.review.celebrate** (P3): System MUST output an enthusiastic celebratory statement with at least one emoji when work completes successfully (appears as the final output after all closure steps; entertaining, creative, emphasizes the completed work; avoids common AI anti-patterns: no en dashes, no "I'm happy to", no "Great question!"; applies across all 4 slash commands)
  - **FR:workflow.review.feature-index** (P3): System MUST regenerate the feature index (`.xe/features/README.md`) during closure so the index stays current with spec changes (invokes `catalyst index` after cleanup and before celebration; applies across all 4 slash commands because any may have changed spec frontmatter; if regeneration fails, log the error but do not block closure)
    > - @req FR:feature-context/index.location
    > - @req FR:feature-context/index.generated
    > - @req FR:catalyst-cli/index.execute
- **FR:workflow.continuity** (P2): System MUST persist working state across compaction boundaries so post-compaction agents can resume efficiently
  - **FR:workflow.continuity.ritual** (P2): System MUST execute an Active State update at every orchestration STOP gate (every phase boundary; after any AUQ decision that changes scope, plan, or next action; before any long-running operation); ritual is a single action file, not duplicated per-phase instructions, so the format evolves in one place
    > - @req FR:feature-context/rollout.active-state
    > - @req FR:feature-context/rollout.active-state.overwrite
- **FR:workflow.auq-usage** (P1): System MUST invoke the AUQ action file at every AUQ call site using `Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to {imperative intent}` rather than inline AskUserQuestion directives, ensuring the call-time checklist is loaded into immediate context at the moment of action; when an action specifies AUQ patterns (option text, question structure), those patterns are authoritative and MUST be used exactly as written
  > - @req FR:context-storage/standards.auq.function
- **FR:workflow.distilled-writing** (P1): Action playbooks that direct AI to write content MUST reference the **Distilled Excellence** engineering principle before the Instructions section
  > - @req FR:engineering-context/eng.principles
- **FR:workflow.auq-self-check** (P1): Before submitting an AUQ, AI MUST read the question and each option in isolation and confirm a teammate seeing only that text could answer; if not, rewrite
- **FR:workflow.output** (P2): Workflows MUST produce feature artifacts following feature-context conventions: specs, code, tests, rollouts, and optional pull requests
  > - @req FR:feature-context/spec.location
  > - @req FR:feature-context/rollout.location
  > - @req FR:feature-context/design-decisions.location

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
