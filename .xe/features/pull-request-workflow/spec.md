---
id: pull-request-workflow
title: Pull Request Workflow
description: AI-assisted PR review, update, and autonomous loop workflows with severity-classified findings and threaded response posting.
dependencies:
  - ai-plugin
  - context-storage
  - engineering-context
  - feature-context
  - playbook-actions-git
  - product-context
  - repo-labels
  - workflow-context
---

<!-- markdownlint-disable single-title -->

# Feature: Pull Request Workflow

## Purpose

AI-assisted workflows that review, update, and shepherd GitHub pull requests to completion. Excludes branch and release management.

## Scenarios

### FR:review: Review pull request

AI Agent needs to review a pull request for quality, correctness, and project alignment so that reviewers get structured, severity-classified feedback before merge.

- **FR:review.@ai-skill** (P2): Interface: `/catalyst:pr-review` → `review-pull-request.md`
  > - @req FR:ai-plugin/skills.@ai-skill
  - **FR:review.@ai-skill.platform** (P3): Command automatically sets `ai-platform` based on the invoking AI platform
    > - @req FR:ai-plugin/skills.transform.platform-claude
    > - @req FR:ai-plugin/skills.transform.platform-portable
- **FR:review.@playbook** (P2): Interface: `src/resources/playbooks/review-pull-request.md`
- **FR:review.input** (P2): Command accepts optional `pr-number`; if omitted, MUST resolve before proceeding
  - **FR:review.input.discovery** (P2): Infer PR from session context — AUQ if multiple PRs were referenced; otherwise query the 4 most recent open PRs not authored by the user and present for selection
- **FR:review.setup** (P2): AI Agent MUST verify the PR exists and is accessible, fetch PR metadata and diff
  - **FR:review.setup.get** (P2): Verify PR exists via `npx catalyst-github pr get`
  - **FR:review.setup.uncommitted** (P2): MUST stop and ask the user for guidance if local checkout has uncommitted changes
  - **FR:review.setup.pending-review** (P1): On a pending review, AI Agent MUST offer: submit as comment, discard, add findings, or stop
  - **FR:review.setup.checkout** (P3): SHOULD check out the PR branch locally only when the PR is large enough that reading full source files locally would be more token-efficient or improve review quality
  - **FR:review.setup.todo** (P3): MUST create a tracking todo list for review progress
- **FR:review.context** (P2): AI Agent MUST read project conventions (CLAUDE.md, coding guidelines, or equivalent) to understand the repo's standards before analysis
  > - @req FR:product-context/product.template
  > - @req FR:engineering-context/eng.template
  - **FR:review.context.issue** (P3): SHOULD read linked issue context if the PR title references an issue
  - **FR:review.context.feature** (P3): SHOULD read feature context (`.xe/features/` or equivalent) when available
    > - @req FR:feature-context/spec.template
  - **FR:review.context.prior** (P4): MAY read prior work artifacts (research, plans) if they exist
- **FR:review.analyze** (P1): AI Agent MUST evaluate the PR against four dimensions
  - **FR:review.analyze.quality** (P1): Quality — code style, lint compliance, naming, comments/docs, test coverage, security
  - **FR:review.analyze.correctness** (P1): Functional correctness — logic, breaking changes, data flow, error handling, completeness
  - **FR:review.analyze.alignment** (P1): Project alignment — product framework, architecture fit, scope focus, changelog, documentation
  - **FR:review.analyze.spec-form** (P1): Spec form — each added or changed FR has one requirement, an implementing actor, no inline FR references, stated conditions and defaults, and no rationale
- **FR:review.classify** (P1): AI Agent MUST classify each finding into severity tiers
  - **FR:review.classify.blocker** (P1): Blocker — must fix before merge (bugs, security issues, breaking changes, data loss risks)
  - **FR:review.classify.should-fix** (P2): Should fix — strong recommendation (style violations, missing tests, incomplete docs, maintainability concerns)
  - **FR:review.classify.suggestion** (P3): Suggestion — nice to have (alternative approaches, minor improvements, optional optimizations)
  - **FR:review.classify.verify** (P1): AI Agent MUST verify each finding against the real code and drop any it cannot reproduce
- **FR:review.mode** (P2): Command MUST accept an execution mode from the request or project config
  > - @req FR:workflow-context/execution-modes.default
  - **FR:review.mode.unset** (P2): [deferred] When no mode is set, AI Agent MUST consult the user on every finding before posting, as in interactive mode
  - **FR:review.mode.autonomous** (P2): [deferred] Under `autonomous`, AI Agent MUST post only clear-cut findings without consulting, and MUST hold judgment findings (design, scope, architecture, anything the author could reasonably contest) for one user consultation before the review is posted
  - **FR:review.mode.gated** (P2): [deferred] Under every other mode, AI Agent MUST consult the user on every finding before posting
- **FR:review.consult** (P1): AI Agent MUST present findings to the user via AskUserQuestion before posting them to GitHub
  - **FR:review.consult.progressive** (P1): Uses progressive approval pattern — one question per severity group (blockers, should-fix, suggestions) with bulk approve / review individually / skip options
  - **FR:review.consult.individual** (P2): For individual review, present each finding with post / edit wording / downgrade severity / skip options
  - **FR:review.consult.grouping** (P3): Groups with 5+ items MAY be grouped by theme with review-by-category option
- **FR:review.post** (P1): AI Agent MUST submit a single cohesive review to GitHub
  - **FR:review.post.event** (P1): MUST use COMMENT event type by default; MAY use REQUEST_CHANGES or APPROVE only with explicit user direction, and approval MUST be visibly attributed to the user, not the AI
  - **FR:review.post.body** (P2): AI Agent MUST keep the review body to a short summary (no recap) with severity counts
    - **FR:review.post.body.no-repeat** (P2): AI Agent MUST NOT repeat line-level comments in the review body
  - **FR:review.post.line-comments** (P2): Line-level comments for blockers, should-fix, and suggestions
  - **FR:review.post.suggestion** (P1): Line-level comments MUST include a GitHub-formatted `suggestion` code block when suggesting specific code changes
  - **FR:review.post.suggestion-span** (P2): Suggestion comments MUST span all relevant lines when a suggestion is provided
  - **FR:review.post.prefix** (P1): Every comment (body and line-level) MUST be prefixed with the AI identifier
  - **FR:review.post.no-changes** (P1): MUST NOT make code changes, commits, or pushes
  - **FR:review.post.pending** (P1): AI Agent MUST add findings to the pending review when the user chooses that option
    - **FR:review.post.pending.no-reconcile** (P1): AI Agent MUST skip reconciliation while the review stays pending
- **FR:review.lifecycle** (P1): AI Agent MUST reconcile the PR's labels and assignees after posting the review
  > - @req FR:reconcile

### FR:update: Update pull request

AI Agent needs to analyze PR feedback and implement approved changes so that all review threads get responses and valid suggestions are implemented with reviewer attribution.

- **FR:update.@ai-skill** (P2): Interface: `/catalyst:pr-update` → `update-pull-request.md`
  > - @req FR:ai-plugin/skills.@ai-skill
  - **FR:update.@ai-skill.platform** (P3): Command automatically sets `ai-platform` based on the invoking AI platform
    > - @req FR:ai-plugin/skills.transform.platform-claude
    > - @req FR:ai-plugin/skills.transform.platform-portable
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
  - **FR:update.research.findings** (P1): MUST treat an unanswered Catalyst review finding (a prefixed comment with a severity label and no later Catalyst response) as needing a response, so pr-review findings reach pr-update
  - **FR:update.research.metadata** (P2): SHOULD track thread metadata including file/line, discussion topic, previous AI responses, and force-accept tags
  - **FR:update.research.context** (P2): MUST read project conventions (CLAUDE.md, coding guidelines, or equivalent) before analyzing feedback
    > - @req FR:product-context/product.template
    > - @req FR:engineering-context/eng.template
  - **FR:update.research.annotations** (P2): MUST fetch check-run annotations for the PR's head commit and track them as feedback items alongside threads — these are inline CI findings (e.g. lint/test errors) that GitHub displays on specific diff lines but that do not appear via thread or comment queries
  - **FR:update.research.pending-review** (P2): AI Agent MUST detect an unsubmitted review owned by the executing account and ask the user to submit or discard it, continue with unthreaded responses, or cancel
  - **FR:update.research.exit** (P3): If no threads need responses and no annotations are outstanding, MUST report and exit without changes
- **FR:update.classify** (P1): AI Agent MUST classify each thread into feedback tiers
  - **FR:update.classify.routine** (P2): Routine — high confidence, low risk, straightforward fixes (typos, whitespace, dead code, lint)
  - **FR:update.classify.targeted** (P2): Targeted — clear fix with nuance (logic bugs, missing guards, logging improvements)
  - **FR:update.classify.complex** (P2): Complex — judgment calls (push-backs, architecture decisions, scope questions, disagreements)
- **FR:update.mode** (P2): Command MUST accept an execution mode from the request or project config
  > - @req FR:workflow-context/execution-modes.default
  - **FR:update.mode.unset** (P2): [deferred] When no mode is set, AI Agent MUST consult the user before implementing changes and before committing, as in interactive mode
  - **FR:update.mode.autonomous** (P2): [deferred] Under `autonomous`, AI Agent MUST apply only non-controversial or quality-improving changes without consulting, commit and push without the approval gate, and hold controversial or unclear items for one user consultation at the end
    > - @req FR:loop.round.autonomy
    > - @req FR:loop.round.flag
  - **FR:update.mode.final-review** (P2): [deferred] Under `final-review`, AI Agent MUST apply the same non-controversial changes without consulting, then present the changes and held items for review before posting replies, committing, or pushing
  - **FR:update.mode.gated** (P2): [deferred] Under `interactive`, `checkpoint-review`, and `spec-review`, AI Agent MUST consult the user before implementing changes and before committing
- **FR:update.consult** (P1): AI Agent MUST present items via AskUserQuestion before implementing them
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
    - **FR:update.execute.reply.annotations** (P2): MUST address check-run annotations by fixing the code (or implementing the agreed change) and MUST NOT attempt a threaded reply — annotations have no comment thread or `databaseId`; MUST confirm each fixed annotation in the PR summary comment
    - **FR:update.execute.reply.fallback** (P2): AI Agent MUST post all responses in one general comment when the user chooses to continue past a pending review, or a reply fails because of one
      - **FR:update.execute.reply.fallback.attribution** (P3): AI Agent MUST identify the thread each response answers
      - **FR:update.execute.reply.fallback.disclosure** (P3): AI Agent MUST state in the comment that responses are unthreaded because of an unsubmitted review
  - **FR:update.execute.hold** (P1): AI Agent MUST add 🧭 to its reply when the PR author asks to hold the thread for their review
    > - @req FR:playbook-actions-git/github-pr-get.awaiting-author.marker
    - **FR:update.execute.hold.open** (P1): AI Agent MUST leave a held thread unresolved
  - **FR:update.execute.templates** (P2): Responses use standard templates: Implemented (`✅`), Needs discussion (`🤔`), Force-accepted (`✅`), Question (`❓`)
- **FR:update.validate** (P1): AI Agent MUST validate changes after implementation
  - **FR:update.validate.tests** (P1): MUST run relevant tests after implementing changes
  - **FR:update.validate.errors** (P1): MUST have no errors (boy scout rule)
  - **FR:update.validate.warnings** (P2): SHOULD have no warnings
  - **FR:update.validate.fix** (P2): If tests fail, fix before proceeding and update corresponding PR reply if fix changes approach
  - **FR:update.validate.check** (P1): MUST run `catalyst check` and fix its errors before pushing a change that touches a spec
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
- **FR:update.lifecycle** (P1): AI Agent MUST reconcile the PR's labels and assignees after its last push or reply
  > - @req FR:reconcile

### FR:loop: Run autonomous review-update loop

AI Agent needs to iterate review and update cycles without supervision so that a pull request converges to zero significant findings and the user gets one consolidated recap instead of per-round prompts.

- **FR:loop.@ai-skill** (P2): Interface: `/catalyst:pr-loop` → `loop-pull-request.md`
  > - @req FR:ai-plugin/skills.@ai-skill
  - **FR:loop.@ai-skill.platform** (P3): Command automatically sets `ai-platform` based on the invoking AI platform
    > - @req FR:ai-plugin/skills.transform.platform-claude
    > - @req FR:ai-plugin/skills.transform.platform-portable
- **FR:loop.@playbook** (P2): Interface: `src/resources/playbooks/loop-pull-request.md`
- **FR:loop.input** (P2):
  - `pr-number` (int?) – if missing, use the same discovery as the update workflow (most recent open PRs authored by the user)
  - `max-rounds` (int?) – Bounds total iterations; Default: 3
- **FR:loop.setup** (P2): Command MUST verify the PR exists, check out the PR branch, and stop if uncommitted changes exist
  - **FR:loop.setup.uncommitted** (P1): Command MUST stop before the first round if uncommitted changes exist; the loop MUST NOT discard user work
  - **FR:loop.setup.pending-review** (P2): Command MUST check for an unsubmitted review owned by the executing account before the first round and ask the user how to proceed, per FR:update.research.pending-review
    - **FR:loop.setup.pending-review.clear** (P1): Command MUST offer only submit, discard, or stop for a pending review
- **FR:loop.mode** (P2): [deferred] Command MUST always run autonomously; when the project config sets a different mode for `pr-loop`, command MUST say the setting is ignored and continue
  > - @req FR:workflow-context/execution-modes.default
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
- **FR:loop.lifecycle** (P1): Command MUST reconcile the PR's labels and assignees before the summary
  > - @req FR:reconcile
- **FR:loop.output** (P1): Terminal summary — TLDR, not verbose:
  - Per-round findings by severity with resolution
  - Aggregate totals: feedback applied, bugs fixed, improvements made
  - Flagged and unresolved items with the stop reason

### FR:sweep: Sweep pull requests

AI Agent needs to work every open PR that involves the user, routed by the user's role in each, so that nothing assigned to the user stays idle and the user sees only the decisions that need them.

- **FR:sweep.@ai-skill** (P2): Interface: `/catalyst:pr-sweep` → `sweep-pull-requests.md`
  > - @req FR:ai-plugin/skills.@ai-skill
- **FR:sweep.@playbook** (P2): Interface: `src/resources/playbooks/sweep-pull-requests.md`
- **FR:sweep.input** (P2):
  - `pr-numbers` (int[]?) – limit the sweep to these PRs
  - `scope` (`update`|`review`?) – run one role only, matching `/catalyst:pr-update` and `/catalyst:pr-review`; Default: both
  - `execution-mode` (`autonomous`|`interactive`?) – `interactive` keeps the update and review workflows' own consultation, like `/catalyst:pr-update` and `/catalyst:pr-review`; Default: `autonomous`
  - `ai-platform` (string?) – AI platform name for comment prefixes; Default: `AI`
- **FR:sweep.platform** (P3): Command MUST set `ai-platform` to the invoking AI platform
- **FR:sweep.actor** (P2): Command MUST resolve the user from the current `gh` login, never a hardcoded name
- **FR:sweep.labels** (P1): Command MUST use the repository's label names from the label config, never hardcoded names
  > - @req FR:repo-labels/sync.config
  > - @req FR:repo-labels/catalog
  - **FR:sweep.labels.no-create** (P1): Command MUST NOT create labels
  - **FR:sweep.labels.owner** (P1): Command MUST NOT add or remove any label but WIP
  - **FR:sweep.labels.missing** (P1): Command MUST skip any step whose label is missing from the repository
    - **FR:sweep.labels.missing.wip** (P1): Command MUST warn that parallel agents may overlap when the WIP label is missing, and suggest running `npx catalyst init` to sync labels
      > - @req FR:repo-labels/catalog.wip
- **FR:sweep.survey** (P1): Command MUST build the work queue from one survey before any analysis, changing nothing but what reconcile sets
  - **FR:sweep.survey.no-agents** (P1): Command MUST NOT spend subagents on the survey
  - **FR:sweep.survey.skip** (P2): Command MUST skip the search and fetch the given PRs directly when `pr-numbers` is given
  - **FR:sweep.survey.query** (P2): Command MUST exclude paused PRs, and drafts on PRs awaiting review, in the survey query
  - **FR:sweep.survey.filter** (P1): Command MUST filter the query results for what the query can't express
    - **FR:sweep.survey.filter.draft** (P1): Command MUST drop draft PRs the user did not author unless `pr-numbers` names them
    - **FR:sweep.survey.filter.approved** (P1): Command MUST drop PRs the user already approved
  - **FR:sweep.survey.order** (P2): Command MUST order the queue by release label: blocker, then priority, then none, then stretch
    - **FR:sweep.survey.order.reviews-first** (P2): Command MUST work reviews before updates of the same priority
- **FR:sweep.wip** (P1): Command MUST NOT update a PR being updated by another agent
  > - @req FR:repo-labels/catalog.wip
  - **FR:sweep.wip.stale** (P1): Command MUST remove WIP from a PR with no commit for 24 hours and no session on its worktree
    - Sessions include local and remote ones
  - **FR:sweep.wip.filter** (P1): Command MUST filter out any PR that has a WIP label it did not apply
  - **FR:sweep.wip.start** (P1): Command MUST apply the WIP label when starting to sweep a PR
  - **FR:sweep.wip.finish** (P1): Command MUST remove the WIP label when a PR's pass ends, whether it succeeds or fails, before reconciling the PR
- **FR:sweep.route** (P1): Command MUST route each PR by the user's role
  - **FR:sweep.route.one-pass** (P1): Command MUST give each PR exactly one pass
  - **FR:sweep.route.same** (P1): Command MUST work a PR the same way whether or not it has the Autopilot or Blocked label
  - **FR:sweep.route.update** (P1): Command MUST run the update workflow on authored PRs with unresolved threads, failing checks, or conflicts
    - **FR:sweep.route.update.rebase** (P1): Command MUST rebase a PR onto its base branch only when the PR needs an already-merged commit to pass its gates, or when the rebase is the last step before the PR can merge
      - **FR:sweep.route.update.rebase.no-eager** (P1): Command MUST NOT rebase a PR just because it is behind or conflicting
      - **FR:sweep.route.update.rebase.no-handoff** (P1): Command MUST NOT skip a required rebase when skipping it would leave the action on the author
      - **FR:sweep.route.update.rebase.lease** (P1): Command MUST push a rebase with a lease
    - **FR:sweep.route.update.no-merge-base** (P1): Command MUST NOT merge the base branch into a PR
    - **FR:sweep.route.update.push-first** (P1): Command MUST push the fix for a thread before resolving that thread
    - **FR:sweep.route.update.checks** (P2): Command MUST fix only code the PR touches when checks fail
      - **FR:sweep.route.update.checks.boy-scout** (P3): Command MAY fix code outside the PR when a human reviewer explicitly asks
  - **FR:sweep.route.review** (P1): Command MUST run the review workflow on PRs awaiting the user's review
    - **FR:sweep.route.review.post** (P1): Command MUST post one `COMMENT` review per reviewed PR, with findings as line-level or file-level comments
    - **FR:sweep.route.review.no-body-comments** (P1): Command MUST NOT post findings as PR comments
      > - @req FR:review.post.body.no-repeat
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
  - **FR:sweep.autonomy.ask** (P1): Command MUST ask the user about every escalation through AUQ once all other work is done, in every execution mode
    > - @req AC:auq-standard
    - **FR:sweep.autonomy.ask.unattended** (P1): Command MUST leave escalations in the report only when no one can answer
  - **FR:sweep.autonomy.no-approve** (P1): Command MUST NOT approve a PR
  - **FR:sweep.autonomy.no-merge** (P1): Command MUST NOT merge a PR
- **FR:sweep.safety** (P1): Command MUST isolate each PR in its own fresh worktree
  - **FR:sweep.safety.no-recycle** (P1): Command MUST NOT reuse a worktree or folder from an earlier pass
  - **FR:sweep.safety.busy** (P2): Command MUST defer a PR whose branch is checked out with uncommitted changes elsewhere
  - **FR:sweep.safety.preserve** (P1): Command MUST NOT discard or overwrite uncommitted work it did not create
  - **FR:sweep.safety.stash** (P1): Command MUST stash only in its own worktree for a PR whose WIP label this run added
    - **FR:sweep.safety.stash.main** (P1): Command MUST NOT stash in the main repository folder
  - **FR:sweep.safety.foreground** (P1): Command MUST run tests in the foreground
  - **FR:sweep.safety.fork** (P1): Command MUST NOT execute code from a fork PR by someone without write access to the repository unless the user confirms
    - **FR:sweep.safety.fork.unattended** (P1): Command MUST treat confirmation as declined when no one can answer
    - **FR:sweep.safety.fork.no-substitute** (P1): Command MUST NOT run a different command to execute a fork head whose confirmation was declined
    - **FR:sweep.safety.fork.report** (P2): Command MUST report that checks were not run locally when execution was declined
- **FR:sweep.agent** (P2): Command MUST run each PR's work in its own subagent
  - **FR:sweep.agent.carry** (P2): Command MUST carry forward only a PR's result summary, never its subagent transcript
- **FR:sweep.lifecycle** (P1): Command MUST reconcile every PR in scope before and after it works the PR
  > - @req FR:reconcile
  - **FR:sweep.lifecycle.before** (P1): Command MUST reconcile each PR the survey finds before reading its state
  - **FR:sweep.lifecycle.after** (P1): Command MUST reconcile each PR after its last change to that PR and before the report
- **FR:sweep.converge** (P1): Command MUST publish the report, then re-survey and sweep any PR that still needs it
  - **FR:sweep.converge.ci-wait** (P1): Command MUST wait for checks on a PR it pushed to before ending the run
    - **FR:sweep.converge.ci-wait.timer** (P1): Command MUST set a background timer that wakes it to re-check the PR's checks, rather than blocking
    - **FR:sweep.converge.ci-wait.duration** (P2): Command MUST base the wait on how long the repository's recent successful checks took
    - **FR:sweep.converge.ci-wait.bound** (P1): Command MUST report a PR still pending after two waits as testing
  - **FR:sweep.converge.stall** (P1): Command MUST stop when a full pass makes no progress
  - **FR:sweep.converge.ceiling** (P1): Command MUST stop at 10 iterations
  - **FR:sweep.converge.stop** (P1): Command MUST stop only when nothing dispatchable remains for the user or a decision or permission block stops it
  - **FR:sweep.converge.no-stranded** (P1): Command MUST NOT end with a PR still assigned to the user for an action it could do itself
  - **FR:sweep.converge.permissions** (P1): Command MUST declare every command it needs in its allowed tools, so no sweep step is blocked by a permission prompt
    - **FR:sweep.converge.permissions.fail** (P1): Command MUST report a permission denial as a sweep failure, naming the exact command and the allowed-tools entry that would permit it
    - **FR:sweep.converge.permissions.no-bypass** (P1): Command MUST NOT work around a permission denial
  - **FR:sweep.converge.retry** (P2): Command MUST retry a denied or failed bulk `gh` call once as individual per-PR calls
- **FR:sweep.report** (P1): Command MUST report one table row per PR, decisions first
  - **FR:sweep.report.columns** (P1): Command MUST use the columns PR, Title, Status, and Next action
  - **FR:sweep.report.link** (P1): Command MUST link every PR number to the PR, without `#`
  - **FR:sweep.report.threads** (P1): Command MUST link each thread awaiting the user's answer in the PR's Next action
  - **FR:sweep.report.fresh** (P1): Command MUST refresh the status of any PR whose status is older than 10 minutes before reporting
  - **FR:sweep.report.remaining** (P2): Command MUST report how many PRs remain to sweep and how many are in progress
  - **FR:sweep.report.gaps** (P2): Command MUST list each tool, permission, or environment gap once
- **FR:sweep.output** (P1): Sweep report
  - PR table — one row per PR: linked number, title, status (`🧭 Decide`, `👀 Review`, `⏳ Author`, `⏳ Testing`, `✅ Ready`), next action
  - Progress — PRs still to sweep, PRs in progress
  - Gaps — deduplicated tool and environment gaps

### FR:labels: Get the repository's pull request label names

Playbook author needs the repository's name for each pull request lifecycle label, so a playbook reads and sets the labels the repository uses.

- **FR:labels.@playbook** (P2): Interface: `src/resources/playbooks/get-pull-request-labels.yaml`
- **FR:labels.config** (P1): Playbook MUST use the repository's label names from the label config
  > - @req FR:repo-labels/sync.config
  > - @req FR:repo-labels/catalog
- **FR:labels.missing** (P1): Playbook MUST return an empty name for a label the repository doesn't have

### FR:reconcile: Reconcile pull request labels and assignees

PR participants need each PR's labels and assignees to show its state and who acts next, so nobody has to read every PR to find what needs them.

- **FR:reconcile.@playbook** (P1): Interface: `src/resources/playbooks/reconcile-pull-request.yaml`
- **FR:reconcile.input** (P2):
  - `pr-number` (int) – the PR to reconcile
- **FR:reconcile.yaml** (P1): Playbook MUST decide in YAML steps, with no script or AI step
  > - @req FR:playbook-actions-git/github-pr-get.derived
- **FR:reconcile.labels** (P1): Playbook MUST skip any step whose label the repository doesn't have
  > - @req FR:labels
- **FR:reconcile.paused** (P1): Playbook MUST make no label or assignee change on a paused PR
  > - @req FR:repo-labels/catalog.paused
- **FR:reconcile.sync** (P1): Playbook MUST add each label below when its rule holds and remove it when its rule doesn't
  - **FR:reconcile.sync.needs-attention** (P1): Playbook MUST apply Needs Attention to a non-draft PR with a failed check or a thread waiting on the author
    > - @req FR:repo-labels/catalog.needs-attention
    > - @req FR:playbook-actions-git/github-pr-get.awaiting-author
    - **FR:reconcile.sync.needs-attention.info** (P2): Playbook MUST apply Needs Attention to a non-draft PR with an open request for information
      > - @req FR:reconcile.hash-commands.needs-info
    - **FR:reconcile.sync.needs-attention.no-conflict** (P1): Playbook MUST NOT apply the Needs Attention label for a merge conflict alone
  - **FR:reconcile.sync.ready** (P1): Playbook MUST apply the Ready label to a non-draft PR whose approvals meet the repository's review rules
    > - @req FR:repo-labels/catalog.ready
    > - @req FR:playbook-actions-git/github-pr-get.approved
  - **FR:reconcile.sync.needs-review** (P1): Playbook MUST apply Needs Review to a non-draft PR that gets neither Needs Attention nor Ready
    > - @req FR:repo-labels/catalog.needs-review
- **FR:reconcile.assignment** (P1): Playbook MUST assign the PR to whoever acts next
  > - @req FR:playbook-actions-git/github-pr-edit.assignees
  - **FR:reconcile.assignment.author** (P1): Playbook MUST assign only the author to a draft PR or one that needs attention
  - **FR:reconcile.assignment.ready** (P1): Playbook MUST assign the author and every pending code owner to a ready PR
    > - @req FR:playbook-actions-git/github-pr-get.pending-code-owners
  - **FR:reconcile.assignment.blocked** (P1): Playbook MUST leave a blocked PR's assignees unchanged, whatever else its state
    > - @req FR:repo-labels/catalog.blocked
  - **FR:reconcile.assignment.review** (P1): Playbook MUST assign every pending code owner to any other PR
    > - @req FR:playbook-actions-git/github-pr-get.pending-code-owners
- **FR:reconcile.hash-commands** (P2): Playbook MUST act on hash commands, in any letter case
  > - @req FR:playbook-actions-git/github-pr-get.hash-commands
  - **FR:reconcile.hash-commands.revert** (P1): Playbook MUST NOT make a hash command's label change again after someone undoes it
    > - @req FR:playbook-actions-git/github-pr-get.labels-removed
  - **FR:reconcile.hash-commands.report** (P2): Playbook MUST show the link to the comment behind each label change a hash command makes
  - **FR:reconcile.hash-commands.autopilot** (P2): Playbook MUST apply the Autopilot label when the PR author writes `#autopilot`
    > - @req FR:repo-labels/catalog.autopilot
  - **FR:reconcile.hash-commands.needs-info** (P2): Playbook MUST open a request for information when someone other than the author writes `#needs-info`
    - `#needs-attn` and `#needs-attention` are the same command
    - **FR:reconcile.hash-commands.needs-info.answer** (P2): Playbook MUST close the request when the author next comments
      > - @req FR:playbook-actions-git/github-pr-get.author-commented
    - **FR:reconcile.hash-commands.needs-info.triage** (P2): Playbook MUST remove Needs Triage from a PR with an open request for information
      > - @req FR:repo-labels/catalog.needs-triage
- **FR:reconcile.autopilot** (P1): Playbook MUST run the Autopilot playbook on a PR with the Autopilot label, after it sets labels and assignees
  > - @req FR:autopilot.@playbook
  - **FR:reconcile.autopilot.finalized** (P1): Playbook MUST remove Finalized from a PR without the Autopilot label
    > - @req FR:repo-labels/catalog.finalized
- **FR:reconcile.idempotent** (P2): Playbook MUST reach the same labels and assignees when run again on an unchanged PR
  > - @req FR:playbook-actions-git/github-pr-edit.idempotent

### FR:autopilot: Merge Autopilot pull requests

PR participants need an Autopilot PR merged as soon as it meets every merge gate, so it lands without anyone watching it.

- **FR:autopilot.@playbook** (P1): Interface: `src/resources/playbooks/autopilot-pull-request.yaml`
- **FR:autopilot.input** (P2):
  - `pr-number` (int) – the PR to check and merge
- **FR:autopilot.yaml** (P1): Playbook MUST decide in YAML steps, with no script or AI step
  > - @req FR:playbook-actions-git/github-pr-get.derived
- **FR:autopilot.gates** (P1): Playbook MUST treat a PR as meeting its merge gates only when every gate below passes at its head
  - **FR:autopilot.gates.order** (P2): Playbook MUST check the gates in the order below and name the first one that fails
  - **FR:autopilot.gates.autopilot** (P1): Playbook MUST refuse a PR without the Autopilot label
    > - @req FR:repo-labels/catalog.autopilot
  - **FR:autopilot.gates.paused** (P1): Playbook MUST refuse a PR with the Paused label
    > - @req FR:repo-labels/catalog.paused
  - **FR:autopilot.gates.blocked** (P1): Playbook MUST refuse a PR with the Blocked label
    > - @req FR:repo-labels/catalog.blocked
  - **FR:autopilot.gates.wip** (P1): Playbook MUST refuse a PR with the WIP label
    > - @req FR:repo-labels/catalog.wip
  - **FR:autopilot.gates.draft** (P1): Playbook MUST refuse a draft PR
  - **FR:autopilot.gates.merge-state** (P1): Playbook MUST refuse a PR unless GitHub reports its merge state as `CLEAN`, `HAS_HOOKS`, or `UNSTABLE`
  - **FR:autopilot.gates.checks** (P1): Playbook MUST refuse a PR with a check that failed or is still running
    > - @req FR:playbook-actions-git/github-pr-get.checks-passed
  - **FR:autopilot.gates.changes-requested** (P1): Playbook MUST refuse a PR when a reviewer's latest review requests changes
    > - @req FR:playbook-actions-git/github-pr-get.changes-requested
  - **FR:autopilot.gates.approval** (P1): Playbook MUST refuse a PR whose approvals don't meet the review rules the repository sets for the base branch
    > - @req FR:playbook-actions-git/github-pr-get.approved
    > - @req FR:playbook-actions-git/github-pr-get.review-required
  - **FR:autopilot.gates.code-owner** (P1): Playbook MUST refuse a PR when a changed file has a code owner but none of its owners approved
    > - @req FR:playbook-actions-git/github-pr-get.code-owner-approved
  - **FR:autopilot.gates.threads** (P1): Playbook MUST refuse a PR with an unresolved review thread
- **FR:autopilot.finalized** (P1): Playbook MUST apply Finalized to a PR that meets its merge gates and remove it from any other PR
  > - @req FR:repo-labels/catalog.finalized
- **FR:autopilot.merge** (P1): Playbook MUST merge a PR that meets its merge gates, using the merge playbook
  > - @req FR:merge.@playbook
  - **FR:autopilot.merge.author** (P1): Playbook MUST merge only a PR the signed-in GitHub user authored
    > - @req FR:playbook-actions-git/$pull-request
  - **FR:autopilot.merge.head-sha** (P1): Playbook MUST merge only the head commit it read
    > - @req FR:merge.input
  - **FR:autopilot.merge.hold** (P2): Playbook MUST display and return why an Autopilot PR doesn't merge: its first refused gate, or another user opened it
- **FR:autopilot.result** (P2): Playbook MUST return a code and message that say whether it merged the PR and, if not, why
  > - @req FR:merge.result
  - Each gate has its own code: `PullRequestNotAutopilot`, `PullRequestPaused`, `PullRequestBlocked`, `PullRequestBusy`, `PullRequestNotPublished`, `PullRequestNotMergeable`, `PullRequestChecksNotPassing`, `PullRequestChangesRequested`, `PullRequestNotApproved`, `PullRequestNotCodeOwnerApproved`, `PullRequestHasUnresolvedThreads`
  - `NotPullRequestAuthor` when another user opened the PR; otherwise the merge playbook's code

### FR:merge: Merge a pull request

PR participants need a ready pull request merged by a script under the standard merge rules, so a merge never depends on AI judgment and never skips a rule.

- **FR:merge.@playbook** (P1): Interface: `src/resources/playbooks/merge-pull-request.yaml`
- **FR:merge.input** (P2):
  - `pr-number` (int) – the PR to merge
  - `sha` (string?) – the head commit the caller checked; the merge is refused when the PR has moved past it
- **FR:merge.squash** (P1): Playbook MUST squash-merge the PR when every standard merge rule holds
  > - @req FR:playbook-actions-git/github-pr-merge.gates
  > - @req FR:playbook-actions-git/github-pr-merge.head-sha
  > - @req FR:playbook-actions-git/github-pr-merge.no-bypass
  > - @req FR:playbook-actions-git/github-pr-merge.trailers
- **FR:merge.no-fail** (P1): Playbook MUST NOT fail the calling workflow when a merge is refused
  > - @req FR:playbook-actions-git/github-pr-merge.refused
  - **FR:merge.no-fail.comment** (P1): Playbook MUST post the reason and code of a merge GitHub rejects as a PR comment
- **FR:merge.result** (P2): Playbook MUST return a code and message that say whether it merged the PR and, if not, why
  > - @req FR:playbook-actions-git/$pr-merge-result
  - `PullRequestMerged` when it merged the PR; otherwise the code `github-pr-merge` or its error gives

## Architecture Constraints

- **AC:markdown-playbooks**: Playbooks are standalone markdown instructions for AI agents, not YAML engine playbooks — no dependency on the playbook-engine runtime
- **AC:auq-standard**: All user interactions MUST follow the AUQ standard (`node_modules/@xerilium/catalyst/standards/auq.md`)
  > - @req FR:context-storage/standards.auq

## External Dependencies

- GitHub CLI (`gh`) — required for PR operations not covered by catalyst-github (e.g., `gh pr checkout`)
