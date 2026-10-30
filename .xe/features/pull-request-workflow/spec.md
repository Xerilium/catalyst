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
  - ai-plugin
  - repo-labels
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
  - **FR:review.setup.pending-review** (P2): AI Agent MUST detect an unsubmitted review owned by the executing account and ask the user to submit or discard it, or cancel, since GitHub rejects a new review while one is pending
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
  - **FR:review.classify.verify** (P1): AI Agent MUST verify each finding against the real code and drop any it cannot reproduce
- **FR:review.consult** (P1): AI Agent MUST present findings to the user via AskUserQuestion before posting anything to GitHub
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
- **FR:review.lifecycle** (P1): AI Agent MUST reconcile the PR's labels and assignees after posting the review
  > - @req FR:lifecycle

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
    - **FR:update.execute.reply.annotations** (P2): MUST address check-run annotations by fixing the code (or implementing the agreed change) and MUST NOT attempt a threaded reply — annotations have no comment thread or `databaseId`; MUST confirm each fixed annotation in the PR summary comment
    - **FR:update.execute.reply.fallback** (P2): AI Agent MUST post all responses in one general comment when the user chooses to continue past a pending review, or a reply fails because of one
      - **FR:update.execute.reply.fallback.attribution** (P3): AI Agent MUST identify the thread each response answers
      - **FR:update.execute.reply.fallback.disclosure** (P3): AI Agent MUST state in the comment that responses are unthreaded because of an unsubmitted review
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
- **FR:update.lifecycle** (P1): AI Agent MUST reconcile the PR's labels and assignees after its last push or reply
  > - @req FR:lifecycle

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
  > - @req FR:lifecycle
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
  > - @req FR:repo-labels/$label
  - **FR:sweep.labels.no-create** (P1): Command MUST NOT create labels
  - **FR:sweep.labels.missing** (P1): Command MUST skip any step whose label is missing from the repository
    - **FR:sweep.labels.missing.wip** (P1): Command MUST warn that parallel agents may overlap when the WIP label is missing, and suggest running `npx catalyst init` to sync labels
    - **FR:sweep.labels.missing.ready** (P2): Command MUST NOT mark a PR signed off when the Ready label is missing
    - **FR:sweep.labels.missing.finalized** (P2): Command MUST NOT mark a PR finalized (checks passing and threads resolved) when the Finalized label is missing
    - **FR:sweep.labels.missing.autopilot** (P2): Command MUST NOT auto-merge a finalized PR, even when every gate passes, when the Autopilot label is missing
- **FR:sweep.survey** (P1): Command MUST build the work queue from one read-only survey before any analysis
  - **FR:sweep.survey.no-agents** (P1): Command MUST NOT spend subagents on the survey
  - **FR:sweep.survey.skip** (P2): Command MUST skip the search and fetch the given PRs directly when `pr-numbers` is given
  - **FR:sweep.survey.query** (P2): Command MUST exclude paused PRs, and drafts on PRs awaiting review, in the survey query
  - **FR:sweep.survey.filter** (P1): Command MUST filter the query results for what the query can't express
    - **FR:sweep.survey.filter.draft** (P1): Command MUST drop draft PRs the user did not author unless `pr-numbers` names them
    - **FR:sweep.survey.filter.approved** (P1): Command MUST drop PRs the user already approved
    - **FR:sweep.survey.filter.wip** (P1): Command MUST drop PRs another actor labelled WIP
  - **FR:sweep.survey.order** (P2): Command MUST order the queue by release label: blocker, then priority, then none, then stretch
    - **FR:sweep.survey.order.reviews-first** (P2): Command MUST work reviews before updates of the same priority
- **FR:sweep.wip** (P1): Command MUST add the WIP label to a PR as soon as it scopes the PR in
  - **FR:sweep.wip.check** (P1): Command MUST re-check the WIP label before starting each PR and skip it if another actor holds it
  - **FR:sweep.wip.no-timeout** (P1): Command MUST NOT remove another actor's WIP label, whatever its age
  - **FR:sweep.wip.stale** (P2): Command MUST check on another actor's WIP when the user authored the PR and it has had no activity for 24 hours, or when the user asks
    - **FR:sweep.wip.stale.find** (P2): Command MUST look for sessions and worktrees that have the PR's branch checked out
    - **FR:sweep.wip.stale.ping** (P2): Command MUST ask an active session it can reach for its status
    - **FR:sweep.wip.stale.folder** (P2): Command MUST name the folder holding the branch when it can't reach the session, so the user can find it
    - **FR:sweep.wip.stale.report** (P1): Command MUST report every WIP check in the final report
  - **FR:sweep.wip.release** (P1): Command MUST remove each WIP label it added once that PR's work is done
    - **FR:sweep.wip.release.retry** (P1): Command MUST re-run a failed subagent once before releasing its PR
    - **FR:sweep.wip.release.ci** (P1): Command MUST wait for the PR's checks to finish before releasing it
      > - @req FR:sweep.converge.ci-wait
    - **FR:sweep.wip.release.all** (P1): Command MUST NOT end the run with a WIP label it added still on a PR
- **FR:sweep.route** (P1): Command MUST route each PR by the user's role
  - **FR:sweep.route.one-pass** (P1): Command MUST give each PR exactly one pass
  - **FR:sweep.route.update** (P1): Command MUST run the update workflow on authored PRs with unresolved threads, failing checks, or conflicts
    - **FR:sweep.route.update.rebase** (P1): Command MUST rebase a PR onto its base branch only when the PR needs an already-merged commit to pass its gates, or when the rebase is the last step before the PR can be finalized
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
- **FR:sweep.lifecycle** (P1): Command MUST reconcile labels and assignees for every PR it posted on or changed, after its last change to that PR and before the report
  > - @req FR:lifecycle
- **FR:sweep.finalized** (P1): Command MUST certify a PR carrying the Autopilot label as done by applying the Finalized label only when all of these hold:
  > - @req FR:lifecycle.autopilot-merge
  - The Ready label is present and the Needs Attention label is absent
  - Every review thread is resolved, and no 🔒 thread is open
  - The PR's checks pass
  - No rebase is pending and no reply or push is left undone
  - The PR's head commit equals the one this run last confirmed
  - **FR:sweep.finalized.scope** (P1): Command MUST evaluate every Autopilot PR in scope, not only PRs it changed this run
  - **FR:sweep.finalized.start** (P1): Command MUST remove the Finalized label before it changes an Autopilot PR in any way
  - **FR:sweep.finalized.head-sha** (P1): Command MUST record the certified head commit in one PR comment it updates in place, in the same step it applies the Finalized label
  - **FR:sweep.finalized.sequence** (P1): Command MUST apply the Finalized label, then remove its WIP label, then reconcile the PR so the Autopilot merge can run
    > - @req FR:sweep.wip.release
  - **FR:sweep.finalized.owner** (P1): Command MUST be the only actor that applies the Finalized label
- **FR:sweep.health** (P2): Command MUST re-check every PR in scope for label defects before the report and report each one it finds
  - **FR:sweep.health.stale-finalized** (P1): Command MUST reconcile a Finalized PR that is a draft, needs attention, or lacks the Ready label, so the stale label is cleared
    > - @req FR:lifecycle.finalized-stale
  - **FR:sweep.health.missed-finalized** (P1): Command MUST run the Finalized check on a Ready Autopilot PR without WIP or Finalized that reads clean and mergeable
    > - @req FR:sweep.finalized
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
  - Health — each label defect found and what was done about it
  - WIP checks — each stale WIP checked, with the session's answer or the folder holding the branch
  - Progress — PRs still to sweep, PRs in progress
  - Gaps — deduplicated tool and environment gaps

### FR:lifecycle: Reconcile pull request labels and assignees

PR participants need each PR's labels and assignees to show its state and who acts next, so nobody has to read every PR to find what needs them, and Autopilot PRs merge once every gate passes.

- **FR:lifecycle.@playbook** (P1): Interface: `src/resources/playbooks/reconcile-pull-request.md`
- **FR:lifecycle.input** (P2):
  - `pr-number` (int) – the PR to reconcile
- **FR:lifecycle.labels** (P1): Playbook MUST use the repository's label names from the label config and skip any step whose label is missing
  > - @req FR:repo-labels/sync.config
  > - @req FR:repo-labels/$label
- **FR:lifecycle.paused** (P1): Playbook MUST make no label or assignee change on a paused PR
- **FR:lifecycle.draft** (P2): Playbook MUST remove the Needs Review, Needs Attention, Ready, and Finalized labels from a draft PR
- **FR:lifecycle.needs-attention** (P1): Playbook MUST apply the Needs Attention label to a non-draft PR when any of these is true:
  - An unresolved thread's last comment is not from the PR author
  - Every comment in an unresolved thread is from the PR author
  - An unresolved thread's last comment carries 🧭
  - A check on the head commit failed
  - **FR:lifecycle.needs-attention.no-conflict** (P1): Playbook MUST NOT apply the Needs Attention label for a merge conflict alone
  - **FR:lifecycle.needs-attention.threads** (P1): Playbook MUST read every review thread on the PR, never one page
- **FR:lifecycle.needs-review** (P1): Playbook MUST apply the Needs Review label to a non-draft PR when neither the Needs Attention nor the Ready label applies
- **FR:lifecycle.ready** (P1): Playbook MUST apply the Ready label to a non-draft PR when a human reviewer's latest review approves it and no reviewer's latest review requests changes
- **FR:lifecycle.assignment** (P1): Playbook MUST assign the PR to whoever acts next:
  - Draft or needs attention → the author only
  - Ready → the author plus every code owner who hasn't approved
  - Blocked → unchanged
  - Otherwise → every code owner who hasn't approved
- **FR:lifecycle.finalized-stale** (P1): Playbook MUST remove the Finalized label when the PR is a draft, needs attention, lacks the Ready label, or its head commit differs from the certified one
  - **FR:lifecycle.finalized-stale.no-add** (P1): Playbook MUST NOT apply the Finalized label
    > - @req FR:sweep.finalized.owner
- **FR:lifecycle.autopilot-merge** (P1): Playbook MUST squash-merge a PR when all of these hold:
  > - @req FR:sweep.finalized
  - The PR carries the Autopilot, Finalized, and Ready labels
  - The PR carries no Needs Attention, WIP, or Paused label
  - The head commit equals the certified one
  - Every review thread is resolved and every check passes
  - **FR:lifecycle.autopilot-merge.recheck** (P1): Playbook MUST re-read the PR's labels and mergeability right before merging, never reusing an earlier value
  - **FR:lifecycle.autopilot-merge.no-bypass** (P1): Playbook MUST NOT bypass branch protection or use admin merge
  - **FR:lifecycle.autopilot-merge.no-fail** (P1): Playbook MUST report a refused merge and leave the PR as is, without failing the calling workflow
- **FR:lifecycle.idempotent** (P2): Playbook MUST reach the same labels and assignees when run again on an unchanged PR

## Architecture Constraints

- **AC:markdown-playbooks**: Playbooks are standalone markdown instructions for AI agents, not YAML engine playbooks — no dependency on the playbook-engine runtime
- **AC:auq-standard**: All user interactions MUST follow the AUQ standard (`node_modules/@xerilium/catalyst/standards/auq.md`)
  > - @req FR:context-storage/standards.auq

## External Dependencies

- GitHub CLI (`gh`) — required for PR operations not covered by catalyst-github (e.g., `gh pr checkout`)
