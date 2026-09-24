# Commit Workflow Changes

Stage caller-listed files and create a commit with derived Conventional Commits format and Catalyst attribution.

‼️ Write for **Plain Language**: like a human explaining it to a teammate

## Inputs

- `feature-id` — primary feature ID, or `init` / `blueprint`; omit when unclear
- `files` — ONLY files changed for committed change; NO OTHERS
- `description` — what changed and why
- `extra-trailers` — additional git-trailer lines (e.g., `Co-authored-by: Name <email>`)

## Instructions

### 1. Derive type and subject

Read diff for `files`. Pick `type`:

- New/updated feature → `feat`
- Bug fix (test added/changed for incorrect behavior + code change) → `fix`
- Spec/doc-only edits → `docs`
- Structural rewrite, no behavior change → `refactor`
- Test-only change → `test`
- Otherwise → `chore`

Distill `description` into `subject`: imperative mood, Sentence case, ≤72 chars, no trailing period. Include body only when subject can't carry the why.

### 2. Detect staging conflicts

Run `git status --porcelain`. Partition `files` against the working tree:

- **Clean**: in `files`, dirty in working tree, no outside change → safe to stage
- **Missing**: in `files` but not dirty → workflow expected a change that isn't there; AUQ
- **Overlap**: in `files` AND also changed outside the workflow → AUQ (working tree mixes workflow + outside changes)

Also list **outside-only** paths (dirty/untracked but NOT in `files`) — these are never staged, but report them so the caller sees what's being left behind.

### 3. Resolve conflicts via AUQ

Skip when only Clean paths exist.

Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to confirm staging — present Missing and Overlap paths with options:

- "Commit the clean subset; skip Missing and Overlap" (Recommended) — clean, low-risk
- "Stop; let me stage manually" — abort; user runs `git add` and re-invokes
- "Stage everything in `files` anyway" — only when user confirms no parallel agent activity

### 4. Stage and commit

Stage the resolved set with explicit `git add <path>` per file (never `git add -A` / `git add .`). Build the message:

```text
{type}({feature-id}): {subject}

{body}

Co-authored-by: Catalyst AI <catalyst-noreply@xerilium.com>
{extra-trailers}
```

When `feature-id` is omitted, drop the parens entirely → `{type}: {subject}`. Omit the body block when empty. Append each `extra-trailers` entry on its own line directly under the Catalyst trailer (no blank line between trailers). Pass via HEREDOC to preserve formatting.

### 5. Output

- Commit SHA on current branch
- Skipped paths (Missing, Overlap declined, outside-only) — surface to caller for review

## Exit Criteria

- [ ] Subject line matches `{type}({feature-id}): {subject}` (or `{type}: {subject}` when feature-id omitted) and ≤72 chars
- [ ] Co-authored-by trailer present
- [ ] Only `files` (or user-confirmed subset) staged — never outside-only paths
- [ ] Skipped paths reported back to caller
