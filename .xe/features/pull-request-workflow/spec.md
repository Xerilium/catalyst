---
id: pull-request-workflow
title: Pull Request Workflow
description: AI-assisted PR review and update workflows with severity-classified findings and threaded response posting.
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

Structured AI-assisted workflows for reviewing and updating GitHub pull requests. Review evaluates PRs for quality, correctness, and project alignment with severity-classified findings. Update analyzes feedback threads, implements approved changes, and posts threaded responses with reviewer attribution. Both workflows enforce user consultation before any GitHub-visible action.

## Scenarios

### FR:review: Review pull request

AI Agent needs to review a pull request for quality, correctness, and project alignment so that reviewers get structured, severity-classified feedback before merge.

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
- **FR:review.command** (P2): AI Agent needs a `/catalyst:pr-review` slash command to invoke the review workflow
  - **FR:review.command.input** (P2): Command accepts `pr-number` as required argument
  - **FR:review.command.platform** (P3): Command automatically sets `ai-platform` based on the invoking AI platform

### FR:update: Update pull request

AI Agent needs to analyze PR feedback and implement approved changes so that all review threads get responses and valid suggestions are implemented with reviewer attribution.

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
- **FR:update.command** (P2): AI Agent needs a `/catalyst:pr-update` slash command to invoke the update workflow
  - **FR:update.command.input** (P2): Command accepts `pr-number` as required argument
  - **FR:update.command.platform** (P3): Command automatically sets `ai-platform` based on the invoking AI platform

## Architecture Constraints

- **AC:markdown-playbooks**: Playbooks are standalone markdown instructions for AI agents, not YAML engine playbooks — no dependency on the playbook-engine runtime
- **AC:auq-standard**: All user interactions MUST follow the AUQ standard (`node_modules/@xerilium/catalyst/standards/auq.md`)
  > - @req FR:context-storage/standards.auq

## External Dependencies

- GitHub CLI (`gh`) — required for PR operations not covered by catalyst-github (e.g., `gh pr checkout`)
