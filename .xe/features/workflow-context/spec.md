---
id: workflow-context
title: Workflow Context
description: Common workflow conventions and shared actions (execution modes, closure, active state) for orchestration playbooks.
dependencies:
  - autonomy
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

Define the common conventions and shared actions every Catalyst orchestration workflow relies on, so workflow behavior stays consistent and lives in one authoritative place.

## Scenarios

### FR:execution-modes: Execution Mode Support

Developer needs to choose execution mode so that workflow autonomy aligns with project complexity and personal preferences.

- **FR:execution-modes.scope** (P1): Workflows MUST honor the selected mode at every phase
  - Cadence, gate behavior, and git-operation constraints come from the mode; phases never redefine them
- **FR:execution-modes.precedence** (P1): Workflows MUST treat the selected execution mode as authoritative over any agent or harness autonomy signal
  - **FR:execution-modes.precedence.verify** (P1): Workflows MUST run STOP-gate verification at every phase boundary regardless of any autonomy signal
  - **FR:execution-modes.precedence.approve** (P1): Workflows MUST issue the AUQ approval prompt at each gate unless the selected mode auto-approves that gate
    - **FR:execution-modes.precedence.approve.all** (P1): Modes `final-review` and `autonomous` MUST auto-approve every gate
    - **FR:execution-modes.precedence.approve.spec-review** (P1): Mode `spec-review` MUST auto-approve every gate except spec
- **FR:execution-modes.enum** (P1): Output:
  - Execution mode (@req FR:$execution-mode) – execution guardrails
- **FR:execution-modes.interactive** (P2): Workflows MUST support `interactive` mode with progressive collaboration
  - Progressive AskUserQuestion prompts to build spec collaboratively
  - User approval required at phase gates (scope, spec, plan)
  - No state-changing git operations (stash/stage/commit) by AI without explicit user approval
- **FR:execution-modes.checkpoint-review** (P2): Workflows MUST support `checkpoint-review` mode with autonomous execution and review gates
  - Run autonomously to phase checkpoints
  - User approval required at phase gates (scope, spec, plan)
  - No state-changing git operations (stash/stage/commit) by AI
- **FR:execution-modes.spec-review** (P2): Workflows MUST support `spec-review` mode with a human approval gate at the spec phase and autonomous execution thereafter
  - User approval required at the spec phase gate
  - Auto-approved plan and implementation phase gates
  - Run autonomously to completion on current branch after spec approval
  - No state-changing git operations (stash/stage/commit) by AI
- **FR:execution-modes.final-review** (P2): Workflows MUST support `final-review` mode with autonomous execution to completion and a single end-of-run review
  - Run autonomously to completion on current branch
  - Auto-approved phase gates
  - No state-changing git operations (stash/stage/commit) by AI
  - Present completed work for human review at the end
- **FR:execution-modes.autonomous** (P2): Workflows MUST support `autonomous` mode with feature branch and PR creation
  - Run autonomously to completion in a feature branch with PR creation
  - Auto-approved phase gates
  - Create feature branch with naming pattern `xe/{rollout-id}`
- **FR:execution-modes.default** (P2): Workflows MUST read the default execution mode from the project config `execution-mode` setting
  - **FR:execution-modes.default.global** (P2): [deferred] The `default` key MUST apply to every command without its own key
  - **FR:execution-modes.default.command** (P2): [deferred] A key named for the command (e.g., `pr-review`) MUST take precedence over `default`
  - **FR:execution-modes.default.ask** (P2): [deferred] The value `ask` MUST make the workflow ask the user to pick a mode
    - Same behavior as when no key is set.
  - **FR:execution-modes.default.request** (P2): [deferred] A mode named in the user request MUST take precedence over config
  - **FR:execution-modes.default.unset** (P2): [deferred] When no mode is requested or configured, workflows MUST ask the user to pick a mode
    - **FR:execution-modes.default.unset.invalid** (P2): [deferred] When the configured value is not a known mode, workflows MUST ask the user to pick a mode
  - **FR:execution-modes.default.announce** (P2): [deferred] When a mode comes from config, workflows MUST use it without asking and state it in the scope summary
- **FR:execution-modes.coverage** (P2): Every workflow with an approval gate or an outward-facing action MUST accept an execution mode
  - **FR:execution-modes.coverage.exempt** (P3): [deferred] Read-only and dispatch workflows (explore, sitrep, rollout) MAY ignore execution mode

### FR:scope: Workflow Scope Setup

Playbook Engine needs a shared scope action so context gathering, scope approval, and rollout setup behave consistently across workflows.

- **FR:scope.action** (P2): Scope MUST be exposed as playbook action `src/resources/playbooks/actions/workflow-scope.md`
  > - @req FR:context-storage/playbooks.framework
- **FR:scope.input** (P2):
  - `issue` (string?) — GitHub issue number
  - `context-files` (string[]?) — referenced files
  - `artifacts` (string[]?) — artifact identifiers the calling playbook is operating on (feature IDs, `blueprint`, etc.)
- **FR:scope.gather** (P2): Action MUST gather context from inputs, blueprint, product vision, and related features
  > - @req FR:product-context/product.purpose
  > - @req FR:blueprint-context/blueprint.location
  - **FR:scope.gather.clarify** (P2): Action MUST ask 1-4 clarifying questions via AUQ only when critical context is missing
    > - @req FR:context-storage/standards.auq.function
- **FR:scope.convention-check** (P2): Action MUST read ONE existing instance of each new artifact type to match naming, placement, and ownership
- **FR:scope.approve** (P2): Action MUST present scope for approval via AUQ with at least one recommended option per question
  - **FR:scope.approve.overview** (P2): [deferred] Action MUST present a succinct effort overview
  - **FR:scope.approve.impact** (P2): [deferred] Action MUST present impacted scope with a recommended split when the effort is too large for one run
  - **FR:scope.approve.mode** (P2): [deferred] Action MUST ask for the execution mode only when neither the request nor config sets one
    > - @req FR:execution-modes.default
    > - @req FR:$execution-mode
  > - @req FR:context-storage/standards.auq.function
- **FR:scope.setup** (P2): Action MUST determine a kebab-cased rollout ID
  - **FR:scope.setup.plan** (P2): Action MUST create the rollout plan from the template
    > - @req FR:feature-context/rollout.template
    > - @req FR:feature-context/rollout.@file
  - **FR:scope.setup.branch** (P2): Action MUST create and push an `xe/{rollout-id}` branch only under `autonomous` mode
    > - @req FR:commit.trailer
  - **FR:scope.setup.fresh-base** (P1): Under `autonomous` mode, action MUST create each new rollout branch from the fresh remote default branch
  - **FR:scope.setup.fresh-base.resume** (P1): Action MUST keep the existing commits on a resumed rollout branch
- **FR:scope.output** (P2): Output:
  - `rollout-id` (string) – propagated to subsequent phases
  - `execution-mode` (@req FR:$execution-mode) – propagated to subsequent phases
  - Rollout plan – placeholder at `.xe/rollouts/rollout-{rollout-id}.md`
  - Feature branch – created only under `autonomous` mode

### FR:audit: Workflow Completeness Audit

Playbook Engine needs a shared audit action so completeness checks against the rollout's source context behave consistently across workflows.

- **FR:audit.action** (P2): Audit MUST be exposed as playbook action `src/resources/playbooks/actions/workflow-audit.md`
  > - @req FR:context-storage/playbooks.framework
- **FR:audit.input** (P2): `rollout-id` (string)
- **FR:audit.identify** (P2): Action MUST identify completeness gaps against the rollout's source context
  > - @req FR:feature-context/rollout.@file
  - **FR:audit.identify.requirements** (P2): Action MUST review stated requirements
  - **FR:audit.identify.unchecked** (P2): Action MUST flag unchecked tasks
  - **FR:audit.identify.classify** (P2): Action MUST classify each gap as critical or non-critical
  - **FR:audit.identify.verify** (P2): Action MUST confirm each unchecked task against disk before treating it as incomplete
    - Rationale: Work done but never marked must not block closure with a false gap.
- **FR:audit.resolve** (P2): For critical gaps, action MUST route back to the previous phase
  - Rationale: Closure does not continue past a critical gap.
  - **FR:audit.resolve.surface** (P2): Action MUST surface gaps to the orchestration playbook, not fix them in place
- **FR:audit.boy-scout** (P2): For each pre-existing issue to fix during closure, action MUST append `- Boy Scout: {what} — {why}` to the rollout's `## Notes`
  - **FR:audit.boy-scout.timing** (P2): Action MUST append the entry before the fix runs
  - **FR:audit.boy-scout.owner** (P2): Calling playbook MUST run the fix, not audit
  > - @req FR:engineering-context/eng.principles
- **FR:audit.output** (P2): Output:
  - Critical gaps – routed back to prior phase
  - Non-critical gaps – itemized for the review action's Remaining list
  - Boy Scout entries – appended to rollout Notes

### FR:review: Workflow Review Presentation

Playbook Engine needs a shared review action so the present-work summary and conversational loop behave consistently across workflows.

- **FR:review.action** (P2): Review MUST be exposed as playbook action `src/resources/playbooks/actions/workflow-review.md`
  > - @req FR:context-storage/playbooks.framework
- **FR:review.input** (P2):
  - `rollout-id` (string)
  - `execution-mode` (@req FR:$execution-mode)
- **FR:review.modes** (P2): Action MUST present a review under EVERY execution mode
- **FR:review.present** (P2): Action MUST write a formatted summary with an HR (`---`) and H2 `## Review: {rollout-id}`
  - **FR:review.present.request** (P2): Action MUST follow the heading with the original request or issue that prompted the work
  - **FR:review.present.body** (P2): Action MUST follow the request with the detailed body
    - Sections: Completed, Remaining, Findings, Blockers, Files, Next, Cleanup, External issues.
    - **FR:review.present.body.omit-empty** (P2): Action MUST omit body sections with nothing to report
  - **FR:review.present.closing** (P2): Action MUST end the summary with a closing recap
- **FR:review.recap** (P2): Action MUST close presentation with an abbreviated recap (one line per section) for at-a-glance state after the body has scrolled
  - Recap MUST include every section using "None" for empty
  - Recap MUST be preceded by a horizontal rule and followed by a horizontal rule and the prompt `Anything else, or **done** to wrap up?` on its own line
- **FR:review.loop** (P2): Action MUST loop on user input until the user signals done
  > - @req FR:context-storage/standards.auq.function
  - **FR:review.loop.simple** (P2): Action MUST execute simple tweaks directly
  - **FR:review.loop.new-task** (P2): Action MUST add new tasks to the plan and execute them
  - **FR:review.loop.spec-change** (P2): Calling playbook, not the action, MUST own spec-change recovery
  - **FR:review.loop.finalize-intent** (P2): Action MUST treat a user finalize/commit request ("commit", "ship it", "lgtm", "looks good") as the done signal
    - The literal word "done" also signals done.
    - Rationale: The natural finalize moment routes into closure instead of leaving the rollout unclosed.
- **FR:review.output** (P2): Output:
  - User confirmation – done signaled by the user, literally or via finalize-intent (or skipped under `autonomous`)
  - Rollout state – ready for closure (no presentation deltas pending)

### FR:closure: Workflow Cleanup and Closure

Playbook Engine needs a shared closure action so external-issue routing, cleanup, commit, and PR creation behave consistently across workflows.

- **FR:closure.action** (P2): Closure MUST be exposed as playbook action `src/resources/playbooks/actions/workflow-closure.md`
  > - @req FR:context-storage/playbooks.framework
- **FR:closure.input** (P2): Action accepts the rollout being closed, the active mode, and the caller's PR vocabulary
  - `rollout-id` (string)
  - `execution-mode` (@req FR:$execution-mode)
  - `pr-type` (string) — caller-supplied PR title type (Feature, Bug, Blueprint)
- **FR:closure.save** (P2): Action MUST present the user with options to persist work via AUQ
  - Options: commit to current branch, create pull request, or skip.
  > - @req FR:context-storage/standards.auq.function
- **FR:closure.sequence** (P2): Under `autonomous` execution mode, action MUST commit and open the pull request BEFORE the review action runs
  - **FR:closure.sequence.review-first** (P2): Under `interactive`, `checkpoint-review`, `spec-review`, and `final-review` modes, action MUST offer commit/PR ONLY AFTER the review action runs
- **FR:closure.external-issues** (P2): Action MUST surface external issues discovered during implementation
  - **FR:closure.external-issues.route** (P2): Action MUST route each external issue via AUQ
    - Options: GitHub issue, feature feedback file, rollout note, or skip.
    > - @req FR:context-storage/standards.auq.function
    > - @req FR:feedback-loop/playbook.routing.feature-file
- **FR:closure.follow-on** (P2): Action MUST identify follow-on work (queued runs, skipped scope, friction noted during execution)
  - **FR:closure.follow-on.route** (P2): Action MUST route follow-on work via AUQ
    - Options: start next run, address now, defer to GitHub issue, or stop here.
    > - @req FR:context-storage/standards.auq.function
- **FR:closure.cleanup** (P2): Action MUST clean up temporary files (rollout plan, scope context files) on user confirmation
  - Interim cleanup is a hard `rm`; recoverable cleanup via a session-scoped recycle bin is a planned feature.
  - **FR:closure.cleanup.scope** (P2): Action MUST NOT delete files outside the repository
  > - @req FR:feature-context/rollout.ephemeral
  > - @req FR:feature-context/rollout.@file
- **FR:closure.commit** (P2): Action MUST commit to the current branch when requested via the closure AUQ using commit standards
  > - @req FR:commit.trailer
- **FR:closure.pr** (P2): Action MUST create a pull request when requested or under `autonomous` mode, using the repo PR template, if available
  - Title MUST follow Conventional Commits: `{type}({feature-id}): {change-description}`; for init/blueprint, set `feature-id` to `init` or `blueprint`; for multi-feature PRs, use the primary feature ID, or drop `({feature-id})` when none applies
  - Body: Use Completed/Remaining/Findings structure from review summary
  - **FR:closure.pr.foreign-commits** (P1): Action MUST NOT open a pull request whose branch holds commits from outside the rollout
- **FR:closure.autonomy** (P1): Under full autonomy, action MUST chain each pull request it opens toward Autopilot
  > - @req FR:autonomy/config
  - Every workflow that opens a pull request through this action gets the chain: create, change, fix, blueprint, and init.
  - Without full autonomy, a person adds Autopilot. With it, the author agent adds Autopilot, so the human gate is the reviewed commit that turned autonomy on.
  - **FR:closure.autonomy.action** (P1): Chain MUST run as playbook action `src/resources/playbooks/actions/autonomy-chain.md`
    > - @req FR:context-storage/playbooks.framework
  - **FR:closure.autonomy.off** (P1): Action MUST skip the chain when `catalyst autonomy status` reports autonomy off
    > - @req FR:autonomy/status.@cli
  - **FR:closure.autonomy.order** (P1): Chain MUST run `pr-loop`, then the Autopilot command, then `pr-sweep` on the pull request
    > - @req FR:autonomy/autopilot.@cli
  - **FR:closure.autonomy.loop-budget** (P2): Chain MUST cap `pr-loop` rounds at the configured `loop-rounds` budget
    > - @req FR:autonomy/budget.rounds
  - **FR:closure.autonomy.clean** (P1): Chain MUST pass `clean` to the Autopilot command only when the last `pr-loop` round met its resolved exit
  - **FR:closure.autonomy.separate-review** (P1): Chain MUST run every review step in a context separate from the authoring agent
  - **FR:closure.autonomy.stop** (P1): Chain MUST stop before each step while a STOP file exists
    > - @req FR:autonomy/stop.files
  - **FR:closure.autonomy.never** (P1): Chain MUST NOT run a command that `catalyst autonomy guard` blocks
    > - @req FR:autonomy/never.@cli
  - **FR:closure.autonomy.escalate** (P1): Chain MUST skip `pr-sweep` when the Autopilot command escalates
    - **FR:closure.autonomy.escalate.ask** (P1): Chain MUST ask the user about each escalation reason via AUQ when someone can answer
    - **FR:closure.autonomy.escalate.report** (P1): Chain MUST list each escalation reason in its report when no one can answer
  - **FR:closure.autonomy.ledger** (P2): Chain MUST record each step with `catalyst autonomy record`
    > - @req FR:autonomy/ledger.@cli
  - **FR:closure.autonomy.no-merge** (P1): Chain MUST NOT merge the pull request
    - The Autopilot gates (`catalyst pr <n>`) decide the merge.
- **FR:closure.output** (P2): Output:
  - Rollout state – deleted on confirmed completion, retained when continued work is queued
  - Persisted work – commit, pull request, or none (per user selection)
  - External issues – routed to chosen tracking destinations
  - Workflow – ready for celebration

### FR:commit: Commit Authoring

Playbook Engine needs a shared commit action so message format, attribution, and staging behave consistently — and safely under multi-agent setups — across workflows.

- **FR:commit.action** (P2): Commit MUST be exposed as playbook action `src/resources/playbooks/actions/workflow-commit.md`
  > - @req FR:context-storage/playbooks.framework
  - **FR:commit.action.sole** (P2): Workflows MUST invoke this action for every commit
    - Rationale: No commit runs `git commit` inline.
- **FR:commit.input** (P2):
  - `feature-id` (string?) — primary feature ID being committed, or `init` / `blueprint` for those datasets; omit when not related to specific features
  - `files` (string[]) — paths the workflow touched in this commit; the staging set
  - `description` (string) — what changed and why, in caller's words; action distills it into subject and body
  - `extra-trailers` (string[]?) — additional `Co-authored-by` (or other git-trailer) lines appended after the Catalyst trailer; preserves co-author semantics GitHub recognizes (avatars, contribution credit) for reviewers, AI platforms, etc.
- **FR:commit.derive** (P2): Action MUST derive the Conventional Commits `type` from the change shape
  - Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
  - **FR:commit.derive.feat** (P2): Action MUST use `feat` for new spec or code
  - **FR:commit.derive.fix** (P2): Action MUST use `fix` for a bug fix
  - **FR:commit.derive.docs** (P2): Action MUST use `docs` for spec or doc edits only
  - **FR:commit.derive.refactor** (P2): Action MUST use `refactor` for a structural rewrite without behavior change
  - **FR:commit.derive.test** (P2): Action MUST use `test` for test-only changes
  - **FR:commit.derive.chore** (P2): Action MUST use `chore` for any other change
  - **FR:commit.derive.subject** (P2): Action MUST derive a Sentence case imperative subject (≤72 chars, no trailing period) from `description`
- **FR:commit.format** (P2): Subject line MUST be `{type}({feature-id}): {subject}` per Conventional Commits when `feature-id` is provided, else `{type}: {subject}`
  - **FR:commit.format.body** (P2): Body, when included, MUST be separated from the subject by a blank line
    - **FR:commit.format.body.plain** (P2): Body MUST follow **Plain Language**
    - **FR:commit.format.body.omit** (P2): Action MUST omit the body when the subject is self-explanatory
- **FR:commit.trailer** (P2): EVERY commit MUST include `Co-authored-by: Catalyst AI <catalyst-noreply@xerilium.com>`
  - **FR:commit.trailer.extra** (P2): When `extra-trailers` is provided, those trailer lines MUST appear after the Catalyst trailer in the same trailer block
- **FR:commit.staging** (P2): Action MUST stage only the `files` it received
  - **FR:commit.staging.others** (P2): Action MUST NOT stage other dirty paths in the working tree
  - **FR:commit.staging.confirm** (P2): On overlap, action MUST AUQ the user to confirm handling
    - Overlap: a `files` path was also changed outside the workflow.
  - **FR:commit.staging.missing** (P2): When `files` paths are missing from the working tree, action MUST AUQ the user to confirm handling
  - **FR:commit.staging.prefer** (P2): Action SHOULD prefer clean, low-risk commits when handling overlap or missing paths
- **FR:commit.output** (P2):
  - Commit SHA – the new commit on the current branch
  - Skipped paths – files left unstaged due to staging-safety rules

### FR:celebrate: Workflow Closing Statement

Playbook Engine needs a shared celebration action so closing tone is consistent and recognizable across workflows.

- **FR:celebrate.action** (P3): Celebration MUST be exposed as playbook action `src/resources/playbooks/actions/workflow-celebrate.md`
  > - @req FR:context-storage/playbooks.framework
- **FR:celebrate.input** (P3): Action consumes the immediate session/workflow context to ground tone and content
- **FR:celebrate.message** (P3): Action MUST output an enthusiastic congratulatory closing message
  - **FR:celebrate.message.emoji** (P3): Message MUST include at least one emoji
  - **FR:celebrate.message.anti-patterns** (P3): Message MUST avoid common AI anti-patterns
    - **FR:celebrate.message.anti-patterns.dashes** (P3): Message MUST NOT use en dashes
    - **FR:celebrate.message.anti-patterns.happy** (P3): Message MUST NOT say "I'm happy to"
    - **FR:celebrate.message.anti-patterns.question** (P3): Message MUST NOT say "Great question!"
- **FR:celebrate.format** (P3): Message MUST be preceded by a horizontal rule

### FR:auq: AUQ Usage

Playbook Engine needs the AUQ action invoked consistently and self-checked before submission so the call-time checklist loads into immediate context and questions/options stand on their own.

- **FR:auq.action** (P1): AUQ MUST be exposed as playbook action `node_modules/@xerilium/catalyst/playbooks/actions/auq.md`
  > - @req FR:context-storage/standards.auq.function
  - **FR:auq.action.inline** (P1): Call sites MUST NOT invoke the AskUserQuestion tool inline
    - Rationale: Every AUQ call site invokes the action instead.
- **FR:auq.input** (P2):
  - `imperative-intent` (string) — short phrase describing what the AUQ resolves
- **FR:auq.invoke** (P1): Action playbooks MUST invoke the AUQ action at every call site using `Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to {imperative-intent}`
- **FR:auq.patterns** (P2): When an action specifies AUQ patterns, AI MUST use them exactly as written
  - Patterns cover option text and question structure.
  - Specified patterns are authoritative.
- **FR:auq.self-check** (P1): Before submitting an AUQ, AI MUST read the question and each option in isolation
  > - @req FR:context-storage/standards.auq.function
  - **FR:auq.self-check.confirm** (P1): AI MUST confirm a teammate seeing only that text could answer
  - **FR:auq.self-check.rewrite** (P1): AI MUST rewrite the question or option when a teammate could not answer
- **FR:auq.output** (P2): Output:
  - User answer(s) — one or more selected options or free-text response per question, returned to the calling playbook for routing

### FR:state: Active State Update

Playbook Engine needs a shared Active State update so post-compaction agents can resume any workflow without re-deriving context.

- **FR:state.action** (P1): Update MUST be exposed as playbook action `src/resources/playbooks/actions/workflow-state.md`
  > - @req FR:context-storage/playbooks.framework
- **FR:state.input** (P2): Action accepts the rollout being updated
  - `rollout-id` (string)
- **FR:state.invocation** (P1): Orchestration playbooks MUST invoke the action at every STOP gate (every phase boundary)
  - **FR:state.invocation.auq** (P1): Orchestration playbooks MUST invoke the action after any AUQ that changes scope, plan, or next action
  - **FR:state.invocation.long-running** (P1): Orchestration playbooks MUST invoke the action before any long-running operation that risks compaction
- **FR:state.overwrite** (P2): Action MUST overwrite the `## Active State` section in full
  > - @req FR:feature-context/rollout.active-state.overwrite
  - Rationale: Appending leaves stale state behind.
  - **FR:state.overwrite.stale** (P2): Action MUST remove stale fields on overwrite
    - **FR:state.overwrite.stale.empty** (P2): Action MUST write `- None` under headings with nothing to report
      - Rationale: Headings stay visible.
- **FR:state.fields** (P2): Action MUST capture six fields: Model, Decisions, Open, Next, Pins, and Assumptions
  > - @req FR:feature-context/rollout.active-state
  - **FR:state.fields.terse** (P2): Action SHOULD populate each field tersely with current state
    - One line per entry is usually enough.
- **FR:state.output** (P2): Output:
  - `## Active State` section – overwritten with current state across all six fields
  - `last_updated` frontmatter – set to today's date

### Non-functional Requirements

**NFR:authoring**: Action Playbook Authoring Quality

- **NFR:authoring.plain-language** (P1): Action playbooks under `src/resources/playbooks/actions/` that direct AI to write content MUST reference `**Plain Language**` before the `## Instructions` section
  > - @req FR:engineering-context/eng.principles
  - **NFR:authoring.plain-language.opt-out** (P3): Action playbooks that exist for non-content-generation purposes MAY opt out by omitting writing directives
    - Examples: data utilities, scripts.
    - **NFR:authoring.plain-language.opt-out.scanner** (P3): Test suite scanner MUST list the files it checks
      - Rationale: Opt-outs show up at the test level instead of hiding in metadata.

## Data Model

- **FR:$execution-mode** (P1): **`execution-mode`** — Workflow autonomy and collaboration cadence selected during workflow scoping; applied to every phase
  - `value` (string) – Allowed: `interactive`, `checkpoint-review`, `spec-review`, `final-review`, `autonomous`. Default: from the request or project config, else chosen by the user during scoping.

## Architecture Constraints

None

## External Dependencies

None
