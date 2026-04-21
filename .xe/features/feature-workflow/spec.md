---
id: feature-workflow
title: Feature Development Workflow
dependencies:
  - context-storage
  - product-context
  - engineering-context
  - feature-context
traceability:
  code: disabled
---

<!-- markdownlint-disable single-title -->

# Feature: Feature Development Workflow

## Purpose

Orchestrate reliable, token-efficient feature development from initial discovery through implementation and review, aligned with product vision and engineering principles.

## Scenarios

### FR:discover: Context Discovery

**Developer** needs to provide initial context for feature work so that AI can understand what to build without repeated clarification.

- **FR:discover.parse-input** (P2): System MUST parse issue numbers, feature IDs, and context file references from user input
  - Input: User prompt containing optional issue number, feature ID, file paths
  - Output: Structured context with extracted parameters
- **FR:discover.read-specs** (P2): System MUST read existing feature specs referenced in input
  > - @req FR:feature-context/spec.template
  > - @req FR:feature-context/design-decisions.location
  > - @req FR:product-context/product.purpose
  > - @req FR:product-context/product.strategy
  > - @req FR:product-context/product.principles
  > - @req FR:product-context/product.personas
  - Uses feature-context templates to locate specs at `.xe/features/{feature-id}/spec.md`
  - Reads design decisions at `.xe/features/{feature-id}/design-decisions.md` if present
  - Reads product-context for personas and product vision
- **FR:discover.resume** (P2): System MUST detect and resume from existing rollout plans, using the rollout as scoping input rather than a pre-approved plan
  > - @req FR:feature-context/rollout.template
  > - @req FR:feature-context/rollout.location
  - Rollout plans located at `.xe/rollouts/rollout-{id}.md`
  - Phase 0 (Scope) always runs on resume — rollout content and per-phase completeness of existing artifacts (spec, plan, tests, implementation) are assessed during scoping
  - Scope AUQ MUST include a resume-entry-phase question when resuming, with the lowest incomplete phase recommended and at least one alternate offered
  - After scope approval, phases walk in order from the approved entry phase; earlier phases are skipped only when Phase 0 verified their artifacts complete
  - Run-level skip: in multi-run rollouts, a run with all tasks `[x]` and verified implementation is skipped entirely; resume targets the first incomplete run
  - Abandoned-closeout handling: when implementation tasks are all `[x]` but closeout tasks are unchecked, system MUST confirm via AUQ that work was complete, acknowledge closeout, and acknowledge next step (next run or done)
- **FR:discover.clarify** (P3): System SHOULD ask targeted clarifying questions only when necessary
  - Prefer asking NO questions if context is sufficient
  - Limit to 1-4 questions covering only what's needed for scoping

### FR:execution-modes: Execution Mode Support

**Developer** needs to choose execution mode so that workflow autonomy aligns with project complexity and personal preferences.

- **FR:execution-modes.interactive** (P2): System MUST support interactive mode with progressive collaboration
  - Progressive AskUserQuestion prompts to build spec collaboratively
  - User approval required at phase gates (scope, spec, plan)
  - Nothing staged/committed by AI without explicit user approval
- **FR:execution-modes.checkpoint-review** (P2): System MUST support checkpoint-review mode with autonomous execution and review gates
  - Run autonomously until checkpoints
  - User approval required at phase gates (scope, spec, plan)
  - Nothing staged/committed by AI
- **FR:execution-modes.autonomous-local** (P2): System MUST support autonomous-local mode with full autonomy on current branch
  - Full autonomy on local/current branch
  - Auto-approved phase gates
  - Nothing staged/committed by AI
- **FR:execution-modes.autonomous-branch** (P2): System MUST support autonomous-branch mode with feature branch and PR creation
  - Full autonomy in a feature branch with PR creation
  - Auto-approved phase gates
  - Create feature branch with naming pattern `xe/{rollout-id}`

### FR:scope: Work Scope Evaluation

**Developer** needs AI to evaluate work scope so that implementation complexity is understood before proceeding.

- **FR:scope.evaluate** (P2): System MUST evaluate impacted features (added, updated, deleted)
  - Scans `.xe/features/` for existing specs
  - Identifies which features are created, modified, or removed
- **FR:scope.dependencies** (P2): System MUST identify dependency ordering for impacted features
  - Features implemented most-upstream-first based on dependency declarations
  - Prevents implementing dependent features before dependencies exist
- **FR:scope.mode-selection** (P1): System MUST present all defined execution modes as AUQ options during scope evaluation, with at least one mode recommended based on context
- **FR:scope.rollout-plan** (P2): System MUST create rollout plan at `.xe/rollouts/rollout-{id}.md`
  > - @req FR:feature-context/rollout.template
  > - @req FR:feature-context/rollout.location
  - Rollout ID derived from feature ID (single feature) or logical description (multi-feature)
  - Includes overview, feature sections, and notes for context resumption
- **FR:scope.convention-check** (P2): Before deciding naming, placement, or ownership for new artifacts introduced by the work, System MUST read ONE existing instance of each new artifact type (action file, FR scenario, template section, test block) to match established Catalyst conventions; runs before traceability sweep so detected FR-ID collisions or location overlaps reshape the sweep
- **FR:scope.traceability-sweep** (P2): During scope evaluation, System MUST surface existing same-scenario traceability warnings for affected features via AUQ as opt-in Boy Scout fixes, defaulting to defer
- ~~**FR:scope.plan-doc**~~: [deprecated: FR:scope.rollout-plan]

### FR:spec: Specification Generation

**Developer** needs AI to collaboratively define feature specifications so that requirements are precise, testable, and aligned with product vision before implementation begins.

> - @req FR:feature-context/spec.template
> - @req FR:feature-context/data-model.template
> - @req FR:product-context/product.personas

- **FR:spec.interactive** (P1): System MUST support interactive spec generation for interactive mode
  - Progressive AskUserQuestion prompts to build spec collaboratively
  - Request user approval via AskUserQuestion before proceeding
- **FR:spec.autonomous** (P1): System MUST support autonomous spec generation for autonomous modes
  - Generate complete spec without user prompts
  - Auto-approved for autonomous-local and autonomous-branch modes
- **FR:spec.approval** (P2): System MUST present full spec for approval before proceeding
  - Generate complete spec.md and optional data-model.md
  - Request user approval via AskUserQuestion (interactive mode)
  - Auto-approved for autonomous-local and autonomous-branch modes

### FR:plan: Implementation Planning

**Developer** needs AI to design implementation approach so that technical decisions are reviewed before code is written.

> - @req FR:engineering-context/eng.principles
> - @req FR:engineering-context/eng.standards
> - @req FR:engineering-context/arch.patterns
> - @req FR:product-context/product.strategy
> - @req FR:product-context/product.principles
> - @req FR:feature-context/rollout.template

- **FR:plan.plan-mode** (P1): System MUST use plan mode to design implementation approach
  - Plan mode receives all approved specs and rollout plan as context
  - Specs are final - plan mode does NOT modify specifications
  - Design implementation approach aligned with engineering and product constraints
  - Architecture review for patterns and tech stack consistency
  - Traceability verification: confirm plan covers all FRs and `@req` dependency annotations from approved specs
  - Plan includes TDD approach: write failing tests before implementation
- **FR:plan.design-decisions** (P3): System MUST record significant design decisions in `.xe/features/{feature-id}/design-decisions.md` during planning
  > - @req FR:feature-context/design-decisions.location
  > - @req FR:feature-context/design-decisions.scope
  > - @req FR:feature-context/design-decisions.template
  - Create the file if it doesn't exist; append if it does
  - A decision is significant when alternatives were considered and a tradeoff was made
  - Trivial or obvious choices (e.g., naming conventions, file locations) do not need to be recorded
- **FR:plan.mandatory** (P1): System MUST NOT skip plan mode without explicit user approval
  - Plan mode is required for all create-feature and update-feature workflows
  - Bug fixes MAY skip plan mode for small, single-file fixes
  - If AI determines plan mode is unnecessary, it MUST present an AUQ with options to proceed with or skip plan mode — never skip silently
- **FR:plan.task-breakdown** (P2): System MUST break down work into executable tasks
  - Tasks grouped by feature in dependency order
  - Checkbox format with nested details where needed
  - High-level tasks that can be figured out from spec and codebase
- **FR:plan.approval** (P2): System MUST get plan approval before proceeding to implementation
  - Plan approval gate prevents implementation before design review
  - Request user approval via AskUserQuestion (interactive and checkpoint-review modes)
  - Auto-approved for autonomous-local and autonomous-branch modes
  - If spec changes required, exit plan mode and return to spec phase

### FR:implement: Feature Implementation

**Developer** needs AI to write tests and implement features so that code meets requirements and is traceable to specifications.

- **FR:implement.tdd** (P1): System MUST write failing tests with @req annotations before implementation
  - Each FR and NFR gets a test annotated with `@req FR:{id}`
  - Tests MUST fail initially (no implementation yet)
  - Use test framework skip/pending for untestable requirements with `// @req FR:{id} — cannot be automated: [reason]`
- **FR:implement.tdd-gate** (P1): System MUST NOT exit the test-writing step while any in-scope FR lacks a test `@req` annotation
  - P1-P3 FRs MUST have tests — no exceptions
  - P4-P5 FRs MAY be waived when automation is infeasible; waivers MUST be logged in rollout Notes
- **FR:implement.code** (P1): System MUST implement features to make tests pass
  - Follow spec.md for WHAT, rollout plan for HOW and WHEN
  - Focus only on code required for this task (YAGNI)
  - Keep changes scoped to single responsibility
- **FR:implement.validate** (P2): System MUST run validation per engineering-context requirements
  > - @req FR:engineering-context/arch.structure
  > - @req FR:engineering-context/eng.standards
  > - @req FR:engineering-context/eng.quality
  - Formatting, linting, and testing as specified in engineering-context
  - Run `npx catalyst traceability {feature-id}` for each feature
- **FR:implement.track-progress** (P2): System MUST mark completed tasks in rollout plan as each finishes
  > - @req FR:feature-context/rollout.location
  > - @req FR:feature-context/rollout.template
  - Mark with `[x]` immediately upon completion
  - Do not batch multiple tasks before updating
  - Update Notes section for blockers or approach changes
- **FR:implement.design-decisions** (P3): System MUST record design decisions in `.xe/features/{feature-id}/design-decisions.md` when implementation requires a significant change in approach
  > - @req FR:feature-context/design-decisions.location
  > - @req FR:feature-context/design-decisions.scope
  - Append to existing file; do not overwrite prior decisions
  - Typical triggers: hitting a constraint that forces a pivot, discovering a library limitation, choosing between implementation patterns
- **FR:implement.drift-protection** (P1): System MUST prevent requirements drift
  - Never modify spec.md without user approval
  - If requirement cannot be met, STOP and ask user
  - Never rename or remove FR/NFR IDs without updating @req references

### FR:review: Work Review and Closure

**Developer** needs AI to present completed work and handle closure so that changes are ready for merge and external issues are tracked.

- **FR:review.present** (P2): System MUST present work summary as formatted console output, then offer conversational review before final AUQ
  - Before presenting, system MUST audit completeness: read the rollout's source context (explore doc, linked issue, or original request) and verify all stated requirements are addressed in the implemented work. Report any gaps in the Remaining section.
  - Summary MUST include complete state context: what was done, what remains, current phase, and any blockers or notable findings
  - Summary MUST include the original request or issue that prompted the work so the user can immediately identify what's being reviewed
  - Summary MUST be visually distinguishable from normal conversation — a clear header at the start and an abbreviated recap at the end so the user can identify the review at a glance even after content has scrolled
  - Summary MUST omit sections with nothing to report in the detailed body (recap always includes all items)
  - Summary MUST end with an abbreviated status recap (one line per section) so the user doesn't need to scroll back to understand overall state
  - Recap is followed by a visual separator and the done prompt on its own line: `"Let me know if you have questions, or say **done** to wrap up."`
  - User may engage conversationally; every response ends with a visual separator and `"Anything else, or **done** to wrap up?"` on its own line
  - Requests during review escalate by complexity: simple tweaks executed immediately, new tasks added to plan then executed, spec changes re-execute spec → plan → implement phases then return to review
  - When user confirms done, present final AUQ with external issue routing (if any) and closure options
  - Skip summary for autonomous-branch mode (proceed directly to PR creation)
- **FR:review.external-issues** (P3): System SHOULD route external issues to tracking mechanisms
  - Issues discovered during implementation but outside scope
  - Options: Add to existing tracking file, create new tracking file, create GitHub issue, drop it
  - Examples: Bugs in other features, missing capabilities, framework limitations, spec gaps
- **FR:review.cleanup** (P3): System MUST clean up temporary files with user confirmation
  > - @req FR:feature-context/rollout.location
  > - @req FR:feature-context/rollout.ephemeral
  - Context files noted during scoping
  - Deprecated feature files (plan.md, research.md, tasks.md in `.xe/features/{feature-id}/`)
  - Rollout plan (`.xe/rollouts/rollout-{id}.md`) deleted unless PR pending or continued work
  - Never delete files outside repository without confirmation
- **FR:review.closure-routing** (P2): After cleanup, system MUST route by execution mode:
  - `autonomous-branch`: proceed to PR creation
  - `autonomous-local`: post summary confirming work complete
  - `interactive` / `checkpoint-review`: MUST present AUQ with options to commit, create PR, or keep working
- **FR:review.pr-creation** (P3): System MAY create pull request when requested or in autonomous-branch mode
  > - @req FR:product-context/product.team
  - Verify current branch is not default branch (create feature branch if needed)
  - PR title: `[Catalyst][{type}] {feature-name}` where type is Feature or Bug
  - PR body includes: Requirements coverage summary, links to specs, summary of changes
  - Link related issues with `Fixes #{id}` or `Related to #{id}`
  - Assign reviewers per product-context team roles if defined
- **FR:review.celebrate** (P3): System MUST output an enthusiastic celebratory statement with at least one emoji when work completes successfully
  - Celebration appears as the final output after all closure steps (cleanup, commit/PR routing) are done
  - Message should be entertaining, creative, and emphasize the completed work (not a canned phrase)
  - Avoid common AI anti-patterns (no en dashes, no "I'm happy to", no "Great question!")
  - Applies to all 4 workflow types: create-feature, update-feature, repair-feature, explore-feature

### FR:continuity: Active State Maintenance Across Compaction

**Developer** needs AI to persist working state across compaction boundaries so that post-compaction agents can resume efficiently without re-deriving context.

- **FR:continuity.ritual** (P2): System MUST execute an Active State update at every orchestration STOP gate
  > - @req FR:feature-context/rollout.active-state
  > - @req FR:feature-context/rollout.active-state.overwrite
  - Each orchestration playbook (create-feature, update-feature, repair-feature, explore-feature) MUST reference the shared Active State update action in every STOP gate
  - Update cadence: every phase boundary; after any AUQ decision that changes scope, plan, or next action; before any long-running operation
  - Ritual is a single action file, not duplicated per-phase instructions, so the format evolves in one place

### FR:orchestrate: Work-Type Orchestration

**Developer** needs work-type-specific orchestration playbooks so that workflow behavior adapts to whether they are creating new features, updating existing features, fixing bugs, or exploring ideas.

- **FR:orchestrate.create-feature** (P1): System MUST provide create-feature markdown playbook orchestration for new features
  - Playbook: `src/resources/playbooks/create-feature.md`
    > - @req FR:context-storage/playbooks.framework
  - Command: `/catalyst:create` → references playbook
  - Composes micro-playbooks for full spec-driven cycle
  - All phases: scope → spec → plan → implement → review
  - TDD workflow with failing tests before implementation
- **FR:orchestrate.update-feature** (P1): System MUST provide update-feature markdown playbook orchestration for changes
  - Playbook: `src/resources/playbooks/update-feature.md`
    > - @req FR:context-storage/playbooks.framework
  - Command: `/catalyst:change` → references playbook
  - Adapts spec phase for targeted updates to existing features
  - Lighter spec updates focusing on what's changing
  - Foundation exists; focuses on deltas
- **FR:orchestrate.repair-feature** (P1): System MUST provide repair-feature markdown playbook orchestration for bug fixes
  - Playbook: `src/resources/playbooks/repair-feature.md`
    > - @req FR:context-storage/playbooks.framework
  - Command: `/catalyst:fix` → references playbook
  - Validates expected behavior against existing specs
  - Focuses on bug reproduction with failing test FIRST
  - If spec wrong/incomplete, proposes spec updates before fixing
  - If spec correct, proceeds to fix
- **FR:orchestrate.explore-feature** (P1): System MUST provide explore-feature markdown playbook orchestration for research
  - Playbook: `src/resources/playbooks/explore-feature.md`
    > - @req FR:context-storage/playbooks.framework
    > - @req FR:feature-context/rollout.location
    > - @req FR:feature-context/feedback.location
    > - @req FR:feature-context/feedback.template
  - Command: `/catalyst:explore` → references playbook
  - Reads existing specs for context
  - Analyzes and investigates without modifying specs or code
  - Presents findings and offers to save to `.xe/rollouts/explore-{topic}.md` for later use with create/update/repair
- **FR:orchestrate.auq-usage** (P1): System MUST follow AUQ standard (`standards/auq.md`) for all user-facing prompts during workflow execution
  > - @req FR:context-storage/standards.framework
  - When an action specifies AUQ patterns (option text, question structure), those patterns are authoritative and MUST be used exactly as written

### Non-functional Requirements

**NFR:reliability**: Execution Reliability

- **NFR:reliability.sequential-execution** (P1): System MUST execute workflow phases sequentially, honoring STOP guards in orchestration playbooks and validating ALL exit criteria before proceeding to the next phase
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
