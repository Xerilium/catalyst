---
id: pull-request-workflow
title: Pull Request Workflow
description: AI-assisted PR review, update, and autonomous loop workflows with severity-classified findings and threaded response posting.
dependencies:
  - context-storage
  - product-context
  - engineering-context
  - feature-context
  - workflow-context
---

<!-- markdownlint-disable single-title -->

# Feature: Pull Request Workflow

## Purpose

AI-assisted workflows that review, update, and shepherd GitHub pull requests to completion. Excludes branch and release management.

## Scenarios

### FR:review: Review pull request

AI Agent needs to review a pull request for quality, correctness, and project alignment so that reviewers get structured, severity-classified feedback before merge.

- **FR:review.@ai-command** (P2): Interface: `/catalyst:pr-review` → `review-pull-request.md`
  - **FR:review.@ai-command.platform** (P3): Command automatically sets `ai-platform` based on the invoking AI platform
- **FR:review.@playbook** (P2): Interface: `src/resources/playbooks/review-pull-request.md`
- **FR:review.input** (P2): Command accepts optional `pr-number`; if omitted, MUST resolve before proceeding
  - **FR:review.input.discovery** (P2): Infer PR from session context — AUQ if multiple PRs were referenced; otherwise query the 4 most recent open PRs not authored by the user and present for selection
- **FR:review.setup** (P2): AI Agent MUST verify the PR exists and is accessible, fetch PR metadata and diff
  - **FR:review.setup.get** (P2): Verify PR exists via `npx catalyst-github pr get`
  - **FR:review.setup.uncommitted** (P2): MUST stop and ask the user for guidance if local checkout has uncommitted changes
  - **FR:review.setup.checkout** (P3): SHOULD check out the PR branch locally only when the PR is large enough that reading full source files locally would be more token-efficient or improve review quality
  - **FR:review.setup.todo** (P3): MUST create a tracking todo list for review progress
- **FR:review.context** (P2): AI Agent MUST read project conventions (CLAUDE.md, coding guidelines, or equivalent) to understand the repo's standards before analysis
  > - @req FR:product-context/product.template
  > - @req FR:engineering-context/eng.template
  - **FR:review.context.issue** (P3): SHOULD read linked issue context if the PR title references an issue
  - **FR:review.context.feature** (P3): SHOULD read feature context (`.xe/features/` or equivalent) when available
    > - @req FR:feature-context/spec.template
  - **FR:review.context.prior** (P4): MAY read prior work artifacts (research, plans) if they exist
- **FR:review.analyze** (P1): AI Agent MUST evaluate the PR against three dimensions
  - **FR:review.analyze.quality** (P1): Quality — code style, lint compliance, naming, comments/docs, test coverage, security
  - **FR:review.analyze.correctness** (P1): Functional correctness — logic, breaking changes, data flow, error handling, completeness
  - **FR:review.analyze.alignment** (P1): Project alignment — product framework, architecture fit, scope focus, changelog, documentation
- **FR:review.classify** (P1): AI Agent MUST classify each finding into severity tiers
  - **FR:review.classify.blocker** (P1): Blocker — must fix before merge (bugs, security issues, breaking changes, data loss risks)
  - **FR:review.classify.should-fix** (P2): Should fix — strong recommendation (style violations, missing tests, incomplete docs, maintainability concerns)
  - **FR:review.classify.suggestion** (P3): Suggestion — nice to have (alternative approaches, minor improvements, optional optimizations)
- **FR:review.consult** (P1): AI Agent MUST present findings to the user via AskUserQuestion before posting anything to GitHub
  - **FR:review.consult.progressive** (P1): Uses progressive approval pattern — one question per severity group (blockers, should-fix, suggestions) with bulk approve / review individually / skip options
  - **FR:review.consult.individual** (P2): For individual review, present each finding with post / edit wording / downgrade severity / skip options
  - **FR:review.consult.grouping** (P3): Groups with 5+ items MAY be grouped by theme with review-by-category option
- **FR:review.post** (P1): AI Agent MUST submit a single cohesive review to GitHub
  - **FR:review.post.event** (P1): MUST use COMMENT event type by default; MAY use REQUEST_CHANGES or APPROVE only with explicit user direction, and approval MUST be visibly attributed to the user, not the AI
  - **FR:review.post.body** (P2): Review body MUST include structured summary with severity counts and brief descriptions per group
  - **FR:review.post.line-comments** (P2): Line-level comments for blockers, should-fix, and suggestions
  - **FR:review.post.suggestion** (P1): Line-level comments MUST include a GitHub-formatted `suggestion` code block when suggesting specific code changes
  - **FR:review.post.suggestion-span** (P2): Suggestion comments MUST span all relevant lines when a suggestion is provided
  - **FR:review.post.prefix** (P1): Every comment (body and line-level) MUST be prefixed with the AI identifier
  - **FR:review.post.no-changes** (P1): MUST NOT make code changes, commits, or pushes

### FR:update: Update pull request

AI Agent needs to analyze PR feedback and implement approved changes so that all review threads get responses and valid suggestions are implemented with reviewer attribution.

- **FR:update.@ai-command** (P2): Interface: `/catalyst:pr-update` → `update-pull-request.md`
  - **FR:update.@ai-command.platform** (P3): Command automatically sets `ai-platform` based on the invoking AI platform
- **FR:update.@playbook** (P2): Interface: `src/resources/playbooks/update-pull-request.md`
- **FR:update.input** (P2): Command accepts optional `pr-number`; if omitted, MUST resolve before proceeding
  - **FR:update.input.discovery** (P2): Infer PR from session context — AUQ if multiple PRs were referenced; otherwise query the 4 most recent open PRs authored by the user and present for selection
- **FR:update.setup** (P2): AI Agent MUST verify the PR exists, check out the PR branch, verify the branch switched correctly, and stop with guidance if uncommitted changes exist
  - **FR:update.setup.get** (P2): Verify PR exists via `npx catalyst-github pr get`
  - **FR:update.setup.uncommitted** (P2): MUST stop and ask the user for guidance if uncommitted changes exist
  - **FR:update.setup.checkout** (P1): Check out the PR branch via `gh pr checkout`
  - **FR:update.setup.branch** (P1): MUST verify the checked-out branch matches the PR's head ref; committing on the wrong branch can cause serious problems
  - **FR:update.setup.todo** (P3): MUST create a tracking todo list for all feedback items
- **FR:update.research** (P1): AI Agent MUST fetch all PR threads and identify threads not yet replied to by the AI
  - **FR:update.research.threads** (P1): Fetch threads via `npx catalyst-github pr threads`
  - **FR:update.research.metadata** (P2): SHOULD track thread metadata including file/line, discussion topic, previous AI responses, and force-accept tags
  - **FR:update.research.context** (P2): MUST read project conventions (CLAUDE.md, coding guidelines, or equivalent) before analyzing feedback
    > - @req FR:product-context/product.template
    > - @req FR:engineering-context/eng.template
  - **FR:update.research.exit** (P3): If no threads need responses, report and exit
- **FR:update.classify** (P1): AI Agent MUST classify each thread into feedback tiers
  - **FR:update.classify.routine** (P2): Routine — high confidence, low risk, straightforward fixes (typos, whitespace, dead code, lint)
  - **FR:update.classify.targeted** (P2): Targeted — clear fix with nuance (logic bugs, missing guards, logging improvements)
  - **FR:update.classify.complex** (P2): Complex — judgment calls (push-backs, architecture decisions, scope questions, disagreements)
- **FR:update.consult** (P1): AI Agent MUST present items via AskUserQuestion before implementing changes
  - **FR:update.consult.routine** (P2): Routine items batched into one question with bulk approve option
  - **FR:update.consult.individual** (P2): Targeted and complex items get individual questions with a recommended action
  - **FR:update.consult.escalation** (P3): Escalation paths: "Need more context" provides additional detail then re-presents decision; "Defer to Q&A" pauses AUQ for freeform conversation
  - **FR:update.consult.small** (P3): When 4 or fewer total items, present all directly in a single AUQ call
  - **FR:update.consult.large** (P3): When 8+ items, start with a summary round per tier before drilling down
- **FR:update.execute** (P1): AI Agent MUST implement approved changes and post threaded responses
  - **FR:update.execute.implement** (P1): Implement approved changes following project conventions
  - **FR:update.execute.pushback** (P1): If AI disagrees with feedback, push back firmly once with reasoning and include force-accept instructions for override
  - **FR:update.execute.force-accept** (P1): Force-accept tag overrides AI judgment; implement with a note recording the original concern
  - **FR:update.execute.autonomous** (P2): Discussion and question responses MAY be posted autonomously without user approval
  - **FR:update.execute.action** (P1): Every response MUST result in action — implement, push back, or ask for clarification; never acknowledge without acting
  - **FR:update.execute.reply** (P1): Post threaded replies via `npx catalyst-github pr reply`
  - **FR:update.execute.templates** (P2): Responses use standard templates: Implemented (`✅`), Needs discussion (`🤔`), Force-accepted (`✅`), Question (`❓`)
- **FR:update.validate** (P1): AI Agent MUST validate changes after implementation
  - **FR:update.validate.tests** (P1): MUST run relevant tests after implementing changes
  - **FR:update.validate.errors** (P1): MUST have no errors (boy scout rule)
  - **FR:update.validate.warnings** (P2): SHOULD have no warnings
  - **FR:update.validate.fix** (P2): If tests fail, fix before proceeding and update corresponding PR reply if fix changes approach
- **FR:update.commit** (P1): AI Agent MUST get user approval before committing and pushing, then push using workflow-commit
  > - @req FR:workflow-context/commit.action
  - **FR:update.commit.review** (P1): Summarize all file changes and ask user to review before committing
  - **FR:update.commit.attribution** (P1): Commits MUST include Co-Authored-By trailers for every reviewer whose feedback was addressed, plus Co-Authored-By Catalyst and the AI platform, passed via the workflow-commit action's `extra-trailers` input
    > - @req FR:workflow-context/commit.trailer
  - **FR:update.commit.summary** (P2): MUST post a summary comment on the PR listing addressed threads with counts by response type (implemented, needs discussion, question)
- **FR:update.body-review** (P2): After pushing, AI Agent MUST review the PR body for accuracy and update it if needed
  - **FR:update.body-review.accuracy** (P2): Review the current PR body against the actual state of the branch and address any inaccuracies
  - **FR:update.body-review.succinct** (P2): Prefer succinct, high-level PR bodies — remove detail that isn't needed; avoid adding context beyond what is necessary to understand the change
  - **FR:update.body-review.no-update** (P3): If the PR body is already accurate, MUST skip the update without prompting the user

### FR:loop: Run autonomous review-update loop

AI Agent needs to iterate review and update cycles without supervision so that a pull request converges to zero significant findings and the user gets one consolidated recap instead of per-round prompts.

- **FR:loop.@ai-command** (P2): Interface: `/catalyst:pr-loop` → `loop-pull-request.md`
  - **FR:loop.@ai-command.platform** (P3): Command automatically sets `ai-platform` based on the invoking AI platform
- **FR:loop.@playbook** (P2): Interface: `src/resources/playbooks/loop-pull-request.md`
- **FR:loop.input** (P2):
  - `pr-number` (int?) – if missing, use the same discovery as the update workflow (most recent open PRs authored by the user)
  - `max-rounds` (int?) – Bounds total iterations; Default: 3
- **FR:loop.setup** (P2): Command MUST verify the PR exists, check out the PR branch, and stop if uncommitted changes exist
  - **FR:loop.setup.uncommitted** (P1): Command MUST stop before the first round if uncommitted changes exist; the loop MUST NOT discard user work
- **FR:loop.round** (P1): Command MUST execute each round as a review step followed by an update step
  - **FR:loop.round.review** (P1): Command MUST run the review step in a subagent so each round evaluates the PR without inheriting the update step's reasoning
    - **FR:loop.round.review.materiality** (P2): Review step MUST mark each should-fix finding as material or polish so the loop can detect diminishing returns
  - **FR:loop.round.update** (P1): Command MUST run the update step in the primary agent so round history accumulates for the final summary
  - **FR:loop.round.autonomy** (P1): Command MUST autonomously apply only non-controversial fixes and changes that improve quality or usability
  - **FR:loop.round.flag** (P1): Command MUST leave a comment describing the risk and flag for user review when a recommendation is controversial or its correctness is unclear, rather than applying it
  - **FR:loop.round.record** (P2): Command MUST record per-round findings by severity, changes applied, and flagged items
- **FR:loop.exit** (P1): Command MUST stop iterating when any exit condition is met
  - **FR:loop.exit.resolved** (P1): Command MUST stop when a review round finds no blockers and no material should-fix findings
  - **FR:loop.exit.diminishing** (P1): Command MUST stop when a round's findings are only polish, or when two consecutive rounds surface only newly-invented should-fix without resolving pre-existing ones, to avoid chasing low-value nits
  - **FR:loop.exit.round-limit** (P1): Command MUST stop when the round limit is reached, reporting unresolved findings
  - **FR:loop.exit.no-progress** (P1): Command MUST stop when a round resolves no findings and applies no changes, to prevent a loop that never converges
  - **FR:loop.exit.blocked** (P1): Command MUST stop and surface to the user when a step fails or a merge conflict occurs
- **FR:loop.consult** (P1): Command MUST consult the user via AUQ on all flagged items once, at the end of the loop after every other finding is resolved
- **FR:loop.output** (P1): Terminal summary — TLDR, not verbose:
  - Per-round findings by severity with resolution
  - Aggregate totals: feedback applied, bugs fixed, improvements made
  - Flagged and unresolved items with the stop reason

### FR:sweep: Sweep pull requests

AI Agent needs to work every open PR that involves the user, routed by the user's role in each, so that nothing assigned to the user stays idle and the user sees only the decisions that need them.

- **FR:sweep.@ai-command** (P2): Interface: `/catalyst:pr-sweep` → `sweep-pull-requests.md`
- **FR:sweep.@playbook** (P2): Interface: `src/resources/playbooks/sweep-pull-requests.md`
- **FR:sweep.input** (P2):
  - `pr-numbers` (int[]?) – limit the sweep to these PRs
  - `scope` (`update`|`review`?) – run one role only, matching `/catalyst:pr-update` and `/catalyst:pr-review`; Default: both
  - `execution-mode` (`autonomous`|`interactive`?) – `interactive` keeps the update and review workflows' own consultation, like `/catalyst:pr-update` and `/catalyst:pr-review`; Default: `autonomous`
- **FR:sweep.platform** (P3): Command MUST set `ai-platform` to the invoking AI platform
- **FR:sweep.actor** (P2): Command MUST resolve the user from the current `gh` login, never a hardcoded name
- **FR:sweep.survey** (P1): Command MUST build the work queue from one read-only survey before any analysis
  - **FR:sweep.survey.no-agents** (P1): Command MUST NOT spend subagents on the survey
  - **FR:sweep.survey.prior** (P2): Command SHOULD check whether another session already covers the repo before sweeping it
    - **FR:sweep.survey.prior.skip** (P2): Command MUST NOT re-sweep a repo another session already covers
  - **FR:sweep.survey.order** (P2): Command MUST work PRs in release-priority order when release labels exist, then failing checks and conflicts, then unresolved threads, then longest waiting
- **FR:sweep.skip** (P1): Command MUST exclude PRs that need no action from the user
  - **FR:sweep.skip.draft** (P1): Command MUST skip draft PRs the user did not author
  - **FR:sweep.skip.approved** (P1): Command MUST skip PRs the user already approved
  - **FR:sweep.skip.paused** (P1): Command MUST skip PRs labelled paused
  - **FR:sweep.skip.wip** (P1): Command MUST skip PRs labelled work-in-progress by another actor
    - **FR:sweep.skip.wip.no-timeout** (P1): Command MUST NOT reclaim a work-in-progress label by age
  - **FR:sweep.skip.owned** (P2): Command MUST skip PRs the user names as owned by another session
- **FR:sweep.wip** (P1): Command MUST label each PR work-in-progress before changing it
  - **FR:sweep.wip.own** (P1): Command MUST NOT treat a work-in-progress label it applied itself as another actor's
  - **FR:sweep.wip.release** (P1): Command MUST remove its work-in-progress label before ending the run
- **FR:sweep.route** (P1): Command MUST route each PR by the user's role
  - **FR:sweep.route.one-pass** (P1): Command MUST give each PR exactly one pass
  - **FR:sweep.route.update** (P1): Command MUST run the update workflow on authored PRs with unresolved threads, failing checks, or conflicts
    - **FR:sweep.route.update.conflict** (P1): Command MUST merge the base branch into the PR to resolve conflicts
    - **FR:sweep.route.update.no-force** (P1): Command MUST NOT force push
    - **FR:sweep.route.update.push-first** (P1): Command MUST push the fix for a thread before resolving that thread
  - **FR:sweep.route.review** (P1): Command MUST run the review workflow on PRs awaiting the user's review
    - **FR:sweep.route.review.post** (P1): Command MUST post one `COMMENT` review per reviewed PR
- **FR:sweep.thread** (P1): Command MUST classify each unresolved thread before acting on it
  - **FR:sweep.thread.confirmation** (P1): Command MUST resolve a thread whose last comment only confirms a fix
  - **FR:sweep.thread.closed** (P1): Command MUST leave a thread untouched when the user's own last comment defers to the reviewer
  - **FR:sweep.thread.escalated** (P1): Command MUST leave a thread untouched when its last comment carries 🧭
  - **FR:sweep.thread.stale** (P2): Command MUST resolve with evidence a thread that claims a fix is absent when the pushed head contains it
  - **FR:sweep.thread.open** (P1): Command MUST address a thread whose reviewer request stands unanswered
  - **FR:sweep.thread.default** (P2): Command MUST treat a thread of unclear class as an open request
  - **FR:sweep.thread.verify** (P1): Command MUST verify a reviewer's claim against the real code before acting on it
    - **FR:sweep.thread.verify.fix** (P2): Command MUST implement the best fix for a claim it verifies as valid
    - **FR:sweep.thread.verify.refute** (P2): Command MUST refute a claim it verifies as wrong in the thread with evidence
  - **FR:sweep.thread.gate** (P1): Command MUST NOT resolve or fix a thread whose root comment carries 🔒
    - **FR:sweep.thread.gate.respond** (P2): Command MUST respond to a 🔒 thread that asks something actionable and leave it unresolved
- **FR:sweep.autonomy** (P1): Command MUST apply only non-controversial fixes
  - **FR:sweep.autonomy.escalate** (P1): Command MUST escalate scope changes and design forks instead of guessing
    - **FR:sweep.autonomy.escalate.scope-creep** (P2): Command MUST escalate once a review keeps widening a partly done set of changes instead of absorbing each batch
    - **FR:sweep.autonomy.escalate.customer** (P1): Command MUST escalate changes that affect customers or system reliability
    - **FR:sweep.autonomy.escalate.interface** (P1): Command MUST escalate changes to a user interface, user experience, or public API
    - **FR:sweep.autonomy.escalate.risk** (P1): Command MUST escalate changes to security or legal posture
  - **FR:sweep.autonomy.report-only** (P1): Command MUST NOT post an escalation as a PR comment
    - **FR:sweep.autonomy.report-only.hand-back** (P2): Command MUST mark with 🧭 a reply on an authored PR that hands a question back to the user
  - **FR:sweep.autonomy.no-approve** (P1): Command MUST NOT approve a PR
- **FR:sweep.safety** (P1): Command MUST isolate each PR in its own worktree
  - **FR:sweep.safety.busy** (P2): Command MUST defer a PR whose worktree holds another agent's uncommitted work
  - **FR:sweep.safety.preserve** (P1): Command MUST NOT discard or overwrite uncommitted work it did not create
  - **FR:sweep.safety.stash** (P1): Command MUST NOT stash changes unless sole use of the repository is confirmed
    - **FR:sweep.safety.stash.sole-use** (P1): Command MUST confirm sole use only when the repository has a single worktree and no other sweep holds its lock
    - **FR:sweep.safety.stash.cautious** (P1): Command MUST treat sole use as unconfirmed when it cannot be determined
  - **FR:sweep.safety.foreground** (P1): Command MUST run tests in the foreground
  - **FR:sweep.safety.fork** (P1): Command MUST NOT execute fork code without confirmation
    - **FR:sweep.safety.fork.unattended** (P1): Command MUST treat an unanswerable confirmation as declined
    - **FR:sweep.safety.fork.no-substitute** (P1): Command MUST NOT run a different command to execute a fork head whose confirmation was declined
    - **FR:sweep.safety.fork.report** (P2): Command MUST report that checks were not run locally when execution was declined
- **FR:sweep.agent** (P2): Command MUST run each PR's work in its own subagent
  - **FR:sweep.agent.carry** (P2): Command MUST carry forward only a PR's result summary, never its subagent transcript
- **FR:sweep.converge** (P1): Command MUST re-survey after acting
  - **FR:sweep.converge.ci-wait** (P1): Command MUST wait for checks on a PR it pushed to before ending the run
    - **FR:sweep.converge.ci-wait.bound** (P1): Command MUST bound the wait with a deadline and report a PR still pending at the bound as testing
  - **FR:sweep.converge.stall** (P1): Command MUST stop when a full pass makes no progress
  - **FR:sweep.converge.ceiling** (P1): Command MUST stop at 10 iterations
  - **FR:sweep.converge.stop** (P1): Command MUST stop only when nothing dispatchable remains for the user or a decision or permission block stops it
  - **FR:sweep.converge.no-stranded** (P1): Command MUST NOT end with a PR still assigned to the user for an action it could do itself
  - **FR:sweep.converge.no-bypass** (P1): Command MUST NOT work around a permission denial and MUST report the denied command
  - **FR:sweep.converge.retry** (P2): Command MUST retry a denied or failed bulk `gh` call once as individual per-PR calls
- **FR:sweep.report** (P1): Command MUST report only what needs the user
  - **FR:sweep.report.title** (P1): Command MUST identify each reported PR by title, not number alone
  - **FR:sweep.report.bullets** (P1): Command MUST write the report as bullets without prose
  - **FR:sweep.report.counts** (P2): Command MUST collapse everything that needs nothing from the user into counts
  - **FR:sweep.report.gaps** (P2): Command MUST list each tool, permission, or environment gap once
- **FR:sweep.output** (P1): Report of decisions needing the user
  - **FR:sweep.output.item** (P1): Decision item (bullet) — PR title, author, the ask, the risk, check status
  - **FR:sweep.output.counts** (P2): Counts (bullet) — updated and reviewed PRs
  - **FR:sweep.output.gaps** (P2): Gaps (bullet) — deduplicated tool, permission, and environment gaps

## Architecture Constraints

- **AC:markdown-playbooks**: Playbooks are standalone markdown instructions for AI agents, not YAML engine playbooks — no dependency on the playbook-engine runtime
- **AC:auq-standard**: All user interactions MUST follow the AUQ standard (`node_modules/@xerilium/catalyst/standards/auq.md`)
  > - @req FR:context-storage/standards.auq

## External Dependencies

- GitHub CLI (`gh`) — required for PR operations not covered by catalyst-github (e.g., `gh pr checkout`)
