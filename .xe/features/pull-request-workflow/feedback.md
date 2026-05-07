# Feedback: pull-request-workflow

## Scenario design

- Sharpen scenario actor naming. Scenarios are well-shaped (`FR:review`, `FR:update`) but the actor is implicit — clarifying "who does what with this feature, and through what surface" per FR:feature-context/spec.scenarios.external would make the scenarios self-documenting.
  - **Proposed**: name the persona explicitly — e.g., "AI Agent reviews a pull request" / "AI Agent updates a pull request based on feedback". No structural change; only the scenario name and actor clause.
  - **Why**: The new external-scenario rule (added 2026-05-04 in feature-context) prescribes that scenario names answer "who does what." This feature is a P4 straggler — small fix, easy win.
  - **Blast radius**: 2 scenarios. Likely no @req consumer churn since IDs would stay; only the human-readable names change.

## Attribution

- Catalyst-as-bot identity for PR comments and reviews. Today PR comments are posted via the executing user's `gh` token, so the GitHub author field always shows the human even though the body marker `⚛️ [Catalyst][{ai-platform}]` signals AI origin. Commit-style `Co-authored-by` trailers do not apply to comments — only commits.
  - **Proposed**: support an optional dedicated identity (GitHub App or service-account bot — e.g., `catalyst-ai-bot`) for posting reviews, replies, and summary comments. Falls back to current behavior when no bot is configured.
  - **Why**: Clear AI vs human attribution at the GitHub UI level. Reviewers can filter / mute / weight bot comments differently from human ones. Body-marker prefix is a workaround that breaks down in notification emails, mobile views, and search.
  - **Open questions**: GitHub App vs PAT-backed service account; how the bot token gets configured (env var, settings file, OAuth flow); whether the bot also authors the commit (changes `extra-trailers` semantics in `workflow-commit`); per-repo install vs org-level.
  - **Blast radius**: New input on update-pull-request.md (or workflow-context-level config); new gh CLI auth path; documentation for setup. No spec FR change required if scoped as a future enhancement.
