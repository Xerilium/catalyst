---
id: workflow-context
title: Workflow Context
description: Common workflow conventions and shared actions (execution modes, closure, active state) used across orchestration playbooks.
dependencies:
  - blueprint-context
  - context-storage
  - engineering-context
  - feature-context
  - feedback-loop
  - product-context
traceability:
  code: disable
---

<!-- markdownlint-disable single-title -->

# Feature: Workflow Context

## Purpose

Common workflow conventions and shared actions used across orchestration playbooks (feature, blueprint, init, future) so closure and state-tracking behavior live in one place rather than duplicating per workflow.

## Scenarios

### FR:execution-modes: Execution Mode Support

Developer needs to choose execution mode so that workflow autonomy aligns with project complexity and personal preferences.

- **FR:execution-modes.scope** (P1): Workflows MUST honor the selected mode at every phase — collaboration cadence, gate behavior, and git-operation constraints all derive from the mode rather than being redefined per phase
- **FR:execution-modes.enum** (P1): Output:
  - Execution mode (@req FR:$execution-mode) – execution guardrails
- **FR:execution-modes.interactive** (P2): System MUST support `interactive` mode with progressive collaboration
  - Progressive AskUserQuestion prompts to build spec collaboratively
  - User approval required at phase gates (scope, spec, plan)
  - No state-changing git operations by AI without explicit user approval
- **FR:execution-modes.checkpoint-review** (P2): System MUST support `checkpoint-review` mode with autonomous execution and review gates
  - Run autonomously until checkpoints
  - User approval required at phase gates (scope, spec, plan)
  - No state-changing git operations by AI
- **FR:execution-modes.final-review** (P2): System MUST support `final-review` mode with autonomous execution to completion and a single end-of-run review
  - Run autonomously to completion on current branch
  - Auto-approved phase gates
  - No state-changing git operations by AI
  - Present completed work for human review at the end
- **FR:execution-modes.autonomous** (P2): System MUST support `autonomous` mode with feature branch and PR creation
  - Run autonomously to completion in a feature branch with PR creation
  - Auto-approved phase gates
  - Create feature branch with naming pattern `xe/{rollout-id}`

### FR:scope: Workflow Scope Setup

Orchestration playbook needs a shared scope action so context gathering, scope approval, and rollout setup behave consistently across workflows.

- **FR:scope.action** (P2): Scope MUST be exposed as playbook action `src/resources/playbooks/actions/workflow-scope.md`
  > - @req FR:context-storage/playbooks.framework
- **FR:scope.input** (P2):
  - `issue` (string?) — GitHub issue number
  - `context-files` (string[]?) — referenced files
  - `artifacts` (string[]?) — artifact identifiers the calling playbook is operating on (feature IDs, `blueprint`, etc.)
- **FR:scope.gather** (P2): Action MUST gather context from inputs, blueprint, product vision, and related features; ask 1-4 clarifying questions via AUQ only when critical context is missing
  > - @req FR:context-storage/standards.auq.function
  > - @req FR:product-context/product.purpose
  > - @req FR:blueprint-context/blueprint.location
- **FR:scope.convention-check** (P2): Action MUST read ONE existing instance of each new artifact type to match naming, placement, and ownership
- **FR:scope.approve** (P2): Action MUST present effort overview, impacted scope, and execution mode via AUQ with at least one recommended option per question
  > - @req FR:context-storage/standards.auq.function
  > - @req FR:$execution-mode
- **FR:scope.setup** (P2): Action MUST determine a kebab-cased rollout ID, create the rollout plan from the template, and create + push an `xe/{rollout-id}` branch only under `autonomous` mode
  > - @req FR:feature-context/rollout.template
  > - @req FR:feature-context/rollout.location
  > - @req FR:commit.trailer
- **FR:scope.output** (P2): Output:
  - `rollout-id` (string) – propagated to subsequent phases
  - `execution-mode` (@req FR:$execution-mode) – propagated to subsequent phases
  - Rollout plan – placeholder at `.xe/rollouts/rollout-{rollout-id}.md`
  - Feature branch – created only under `autonomous` mode

### FR:audit: Workflow Completeness Audit

Orchestration playbook needs a shared audit action so completeness checks against the rollout's source context behave consistently across workflows.

- **FR:audit.action** (P2): Audit MUST be exposed as playbook action `src/resources/playbooks/actions/workflow-audit.md`
  > - @req FR:context-storage/playbooks.framework
- **FR:audit.input** (P2): `rollout-id` (string)
- **FR:audit.identify** (P2): Action MUST identify completeness gaps against the rollout's source context — review stated requirements, flag unchecked tasks, classify each gap as critical or non-critical
  > - @req FR:feature-context/rollout.location
- **FR:audit.resolve** (P2): For critical gaps, action MUST route back to the previous phase rather than continuing closure; gaps are surfaced to the orchestration playbook, not fixed in-place
- **FR:audit.boy-scout** (P2): For pre-existing issues the action surfaces and intends to fix during closure (rather than defer), action MUST append `- Boy Scout: {what} — {why}` to the rollout's `## Notes` before the fix runs; the fix itself happens in the calling playbook, not in audit
  > - @req FR:engineering-context/eng.principles
- **FR:audit.output** (P2): Output:
  - Critical gaps – routed back to prior phase
  - Non-critical gaps – itemized for the review action's Remaining list
  - Boy Scout entries – appended to rollout Notes

### FR:review: Workflow Review Presentation

Orchestration playbook needs a shared review action so the present-work summary and conversational loop behave consistently across workflows.

- **FR:review.action** (P2): Review MUST be exposed as playbook action `src/resources/playbooks/actions/workflow-review.md`
  > - @req FR:context-storage/playbooks.framework
- **FR:review.input** (P2):
  - `rollout-id` (string)
  - `execution-mode` (@req FR:$execution-mode)
- **FR:review.skip** (P2): Action MUST skip presentation when `execution-mode` is `autonomous`
- **FR:review.present** (P2): Action MUST write a formatted summary with an HR (`---`) and H2 `## Review: {rollout-id}`, followed by the original request or issue that prompted the work, then the detailed body, then a closing recap
  - Detailed body sections: Completed, Remaining, Findings, Blockers, Files, Next, Cleanup, External issues; sections with nothing to report MUST be omitted from the body
- **FR:review.recap** (P2): Action MUST close presentation with an abbreviated recap (one line per section) for at-a-glance state after the body has scrolled
  - Recap MUST include every section using "None" for empty
  - Recap MUST be preceded by a horizontal rule and followed by a horizontal rule and the prompt `Anything else, or **done** to wrap up?` on its own line
- **FR:review.loop** (P2): Action MUST loop on user input until the user types "done", handling responses by complexity (simple tweaks → execute; new tasks → add to plan + execute); spec-change recovery is the calling playbook's responsibility, not the action's
  > - @req FR:context-storage/standards.auq.function
- **FR:review.output** (P2): Output:
  - User confirmation – `done` typed by the user (or skipped under `autonomous`)
  - Rollout state – ready for closure (no presentation deltas pending)

### FR:closure: Workflow Cleanup and Closure

Orchestration playbook needs a shared closure action so external-issue routing, cleanup, commit, and PR creation behave consistently across workflows.

- **FR:closure.action** (P2): Closure MUST be exposed as playbook action `src/resources/playbooks/actions/workflow-closure.md`
  > - @req FR:context-storage/playbooks.framework
- **FR:closure.input** (P2): Action accepts the rollout being closed, the active mode, and the caller's PR vocabulary
  - `rollout-id` (string)
  - `execution-mode` (@req FR:$execution-mode)
  - `pr-type` (string) — caller-supplied PR title type (Feature, Bug, Blueprint)
- **FR:closure.save** (P2): Action MUST present the user with options to persist work — commit to current branch, create pull request, or skip — via AUQ
  > - @req FR:context-storage/standards.auq.function
- **FR:closure.external-issues** (P2): Action MUST surface external issues discovered during implementation and route each to GitHub issue, feature feedback file, rollout note, or skip via AUQ
  > - @req FR:context-storage/standards.auq.function
  > - @req FR:feedback-loop/playbook.routing.feature-file
- **FR:closure.follow-on** (P2): Action MUST identify follow-on work (queued runs, skipped scope, friction noted during execution) and route via AUQ to start next run, address now, defer to GitHub issue, or stop here
  > - @req FR:context-storage/standards.auq.function
- **FR:closure.cleanup** (P2): Action MUST clean up temporary files (rollout plan, scope context files) on user confirmation; MUST NOT delete files outside the repository
  > - @req FR:feature-context/rollout.ephemeral
  > - @req FR:feature-context/rollout.location
- **FR:closure.commit** (P2): Action MUST commit to the current branch when requested via the closure AUQ using commit standards
  > - @req FR:commit.trailer
- **FR:closure.pr** (P2): Action MUST create a pull request when requested or under `autonomous` mode, using the repo PR template, if available
  - Title: `[Catalyst][{pr-type}] {name}`
  - Body: Use Completed/Remaining/Findings structure from review summary
- **FR:closure.output** (P2): Output:
  - Rollout state – deleted on confirmed completion, retained when continued work is queued
  - Persisted work – commit, pull request, or none (per user selection)
  - External issues – routed to chosen tracking destinations
  - Workflow – ready for celebration

### FR:commit: Commit Authoring

Every workflow needs a shared commit action so message format, attribution, and staging behave consistently — and safely under multi-agent setups — across workflows.

- **FR:commit.action** (P2): Commit MUST be exposed as playbook action `src/resources/playbooks/actions/workflow-commit.md`; every commit invokes this action rather than `git commit` inline
  > - @req FR:context-storage/playbooks.framework
- **FR:commit.input** (P2):
  - `feature-id` (string?) — primary feature ID being committed, or `init` / `blueprint` for those datasets; omit when not related to specific features
  - `files` (string[]) — paths the workflow touched in this commit; the staging set
  - `description` (string) — what changed and why, in caller's words; action distills it into subject and body
  - `extra-trailers` (string[]?) — additional `Co-authored-by` (or other git-trailer) lines appended after the Catalyst trailer; preserves co-author semantics GitHub recognizes (avatars, contribution credit) for reviewers, AI platforms, etc.
- **FR:commit.derive** (P2): Action MUST derive Conventional Commits `type` (`feat` / `fix` / `chore` / `docs` / `refactor` / `test`) from the change shape (new spec/code → `feat`; bug fix → `fix`; spec/doc edits only → `docs`; structural rewrite without behavior change → `refactor`; test-only → `test`; otherwise → `chore`) and a Sentence case imperative subject (≤72 chars, no trailing period) from `description`
- **FR:commit.format** (P2): Subject line MUST be `{type}({feature-id}): {subject}` per Conventional Commits when `feature-id` is provided, else `{type}: {subject}`; body (when included) MUST be separated from subject by a blank line and stay distilled — omit when subject is self-explanatory
- **FR:commit.trailer** (P2): EVERY commit MUST include `Co-authored-by: Catalyst AI <catalyst-noreply@xerilium.com>`; when `extra-trailers` is provided, those trailer lines MUST appear after the Catalyst trailer in the same trailer block
- **FR:commit.staging** (P2): Action MUST stage only the `files` it received — never files changed outside that set, even when the working tree shows other dirty paths; on overlap (a path in `files` was also changed outside the workflow) or when `files` paths are missing from the working tree, action MUST AUQ the user to confirm handling, preferring clean low-risk commits
- **FR:commit.output** (P2):
  - Commit SHA – the new commit on the current branch
  - Skipped paths – files left unstaged due to staging-safety rules

### FR:celebrate: Workflow Closing Statement

Orchestration playbook needs a shared celebration action so closing tone is consistent and recognizable across workflows.

- **FR:celebrate.action** (P3): Celebration MUST be exposed as playbook action `src/resources/playbooks/actions/workflow-celebrate.md`
  > - @req FR:context-storage/playbooks.framework
- **FR:celebrate.input** (P3): Action consumes the immediate session/workflow context to ground tone and content
- **FR:celebrate.message** (P3): Action MUST output an enthusiastic congratulatory closing message with at least one emoji, avoiding common AI anti-patterns (no en dashes, no "I'm happy to", no "Great question!")
- **FR:celebrate.format** (P3): Message MUST be preceded by a horizontal rule

### FR:auq: AUQ Usage

Every workflow needs the AUQ action invoked consistently and self-checked before submission so the call-time checklist loads into immediate context and questions/options stand on their own.

- **FR:auq.action** (P1): AUQ MUST be exposed as playbook action `node_modules/@xerilium/catalyst/playbooks/actions/auq.md`; every AUQ call site invokes this action rather than the AskUserQuestion tool inline
  > - @req FR:context-storage/standards.auq.function
- **FR:auq.input** (P2):
  - `imperative-intent` (string) — short phrase describing what the AUQ resolves
- **FR:auq.invoke** (P1): Action playbooks MUST invoke the AUQ action at every call site using `Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to {imperative-intent}`
- **FR:auq.patterns** (P2): When an action specifies AUQ patterns (option text, question structure), those patterns are authoritative and MUST be used exactly as written
- **FR:auq.self-check** (P1): Before submitting an AUQ, AI MUST read the question and each option in isolation and confirm a teammate seeing only that text could answer; if not, rewrite
  > - @req FR:context-storage/standards.auq.function
- **FR:auq.output** (P2): Output:
  - User answer(s) — one or more selected options or free-text response per question, returned to the calling playbook for routing

### FR:state: Active State Update

Orchestration playbook needs a shared Active State update so post-compaction agents can resume any workflow without re-deriving context.

- **FR:state.action** (P1): Update MUST be exposed as playbook action `src/resources/playbooks/actions/workflow-state.md`
  > - @req FR:context-storage/playbooks.framework
- **FR:state.input** (P2): Action accepts the rollout being updated
  - `rollout-id` (string)
- **FR:state.invocation** (P1): Orchestration playbooks MUST invoke the action at every STOP gate (every phase boundary), after any AUQ that changes scope/plan/next action, and before any long-running operation that risks compaction
- **FR:state.overwrite** (P2): Action MUST overwrite the `## Active State` section in full rather than appending; stale fields MUST be removed and headings with nothing to report MUST read `- None` rather than disappearing
  > - @req FR:feature-context/rollout.active-state.overwrite
- **FR:state.fields** (P2): Action MUST capture six fields — Model, Decisions, Open, Next, Pins, Assumptions — populated terse with current state; one line per entry is usually enough
  > - @req FR:feature-context/rollout.active-state
- **FR:state.output** (P2): Output:
  - `## Active State` section – overwritten with current state across all six fields
  - `last_updated` frontmatter – set to today's date

### Non-functional Requirements

**NFR:authoring**: Action Playbook Authoring Quality

- **NFR:authoring.distilled-writing** (P1): Action playbooks under `src/resources/playbooks/actions/` that direct AI to write content MUST reference `**Distilled Excellence**` before the `## Instructions` section
  > - @req FR:engineering-context/eng.principles
- **NFR:authoring.distilled-writing.opt-out** (P3): Action playbooks that exist for non-content-generation purposes (data utilities, scripts) MAY opt out by omitting writing directives; the test suite scanner enumerates included files explicitly so opt-outs are visible at the test level rather than hidden in metadata

## Data Model

- **FR:$execution-mode** (P1): **`execution-mode`** — Workflow autonomy and collaboration cadence selected during workflow scoping; applied to every phase
  - `value` (string) – Allowed: `interactive`, `checkpoint-review`, `final-review`, `autonomous`. Default: none (set during scoping).

## Architecture Constraints

None

## External Dependencies

None
