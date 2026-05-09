# Feedback: pull-request-workflow

## Scenario design

- Sharpen scenario actor naming. Scenarios are well-shaped (`FR:review`, `FR:update`) but the actor is implicit — clarifying "who does what with this feature, and through what surface" per FR:feature-context/spec.scenarios.external would make the scenarios self-documenting.
  - **Proposed**: name the persona explicitly — e.g., "AI Agent reviews a pull request" / "AI Agent updates a pull request based on feedback". No structural change; only the scenario name and actor clause.
  - **Why**: The new external-scenario rule (added 2026-05-04 in feature-context) prescribes that scenario names answer "who does what." This feature is a P4 straggler — small fix, easy win.
  - **Blast radius**: 2 scenarios. Likely no @req consumer churn since IDs would stay; only the human-readable names change.

## Review modes — holistic vs. targeted

- PR review has at least two distinct modes that aren't differentiated today: **holistic** (general code-quality review) vs. **targeted** (review against a specific source-of-truth document, e.g., "this PR was authored before the blueprint; flag misalignments with blueprint.md"). The default is holistic; the assistant defaults to that even when the human's framing was targeted.
  - **Source**: PR feedback at `allytehq/finops-hubs#6` — first review pass flagged PR description as drift, surfaced graph readability concerns, proposed style improvements; none matched the human's request, which was specifically "find content in this PR that contradicts the blueprint." Second pass after re-framing found actual misalignments (stale wave references, undefined Data Model entity, chart-library typo) more efficiently.
  - **Why**: Different acceptance criteria. Holistic review is open-ended quality assessment; targeted review is a constrained diff against a reference. Conflating them leads to noise (holistic findings the human didn't ask for) AND misses (targeted findings get diluted in the noise).
  - **How to apply**: Add a `mode` (or `against`) input to the review playbook. Modes: `holistic` (default), `against:{path-or-spec-id}` (targeted — only surface misalignments with the named reference). Targeted mode constrains findings to "contradicts X" / "missing from X" / "drifts from X." Update the slash command to accept the mode flag (e.g., `/catalyst:pr-review --against=.xe/features/blueprint.md`).

- Catalyst-as-bot identity for PR comments and reviews. Today PR comments are posted via the executing user's `gh` token, so the GitHub author field always shows the human even though the body marker `⚛️ [Catalyst][{ai-platform}]` signals AI origin. Commit-style `Co-authored-by` trailers do not apply to comments — only commits.
  - **Proposed**: support an optional dedicated identity (GitHub App or service-account bot — e.g., `catalyst-ai-bot`) for posting reviews, replies, and summary comments. Falls back to current behavior when no bot is configured.
  - **Why**: Clear AI vs human attribution at the GitHub UI level. Reviewers can filter / mute / weight bot comments differently from human ones. Body-marker prefix is a workaround that breaks down in notification emails, mobile views, and search.
  - **Open questions**: GitHub App vs PAT-backed service account; how the bot token gets configured (env var, settings file, OAuth flow); whether the bot also authors the commit (changes `extra-trailers` semantics in `workflow-commit`); per-repo install vs org-level.
  - **Blast radius**: New input on update-pull-request.md (or workflow-context-level config); new gh CLI auth path; documentation for setup. No spec FR change required if scoped as a future enhancement.
