# Close Out Workflow

Route external issues, identify follow-on work, clean up temporary files, and optionally commit or open a pull request.

‼️ Write for **Distilled Excellence**: Highest signal per character

## Inputs

- `rollout-id`: In-progress rollout ID; rollout file at `.xe/rollouts/rollout-{rollout-id}.md`
- `execution-mode`: `interactive`, `checkpoint-review`, `final-review`, or `autonomous`
- `pr-type`: PR title type (`Feature`, `Bug`, `Blueprint`, etc.) — caller-supplied vocabulary

## Instructions

### 1. Identify follow-on work

Scan the rollout for:

- More runs queued
- Skipped changes that were out of scope
- Friction or rough edges noted during execution

### 2. Route closure decisions

_Skip steps 2-3 when `execution-mode` is `autonomous` — proceed directly to step 4._

⏸️ **STOP HERE** (non-`autonomous` only): Do NOT proceed unless the review action confirmed user "done"

Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to route external issues and confirm next steps:

- **Q1 — Save work**: indicate run/rollout name. Options: "Commit to current branch" / "Create pull request" / "Skip"
- **Q2 — External issues** (one Q per issue): summarize and ask how to address. Options: "Create GitHub issue" / "Add to feature feedback" / "Add to rollout" / "Skip"
- **Q3a — Follow-on work** (when identified): summarize items, then pick next action. Options: "Start next run" / "Address friction now" / "Defer to GitHub issue" / "Stop here"
  - **"Start next run"**: Read the rollout's next queued `## Run N` section. Name it, then tell the user to continue with `/catalyst:rollout {rollout-id}`. STOP — do NOT continue into Run N+1 in this invocation.
- **Q3b — No follow-on work**: confirm rollout closeout (by name). Options: "Delete rollout" / "Keep rollout for reference" / "Stop here"

### 3. Clean up temporary files

Only delete files the user confirmed; never delete files outside the repository:

- Context files noted during scope phase
- The rollout plan (`.xe/rollouts/rollout-{rollout-id}.md`)

### 4. Commit (if requested in Q1)

‼️▶️ **MUST EXECUTE** @node_modules/@xerilium/catalyst/playbooks/actions/workflow-commit.md with `feature-id` = primary feature ID (or `init` / `blueprint`; omit when unclear), `files` = every path touched during rollout, `description` summarizing what changed and why.

### 5. Create pull request (if requested or `autonomous` mode)

_If PR not approved and execution mode is not `autonomous`, skip this step._

1. Verify current branch is not the default branch — if it is, create feature branch (`xe/{rollout-id}`)
2. If rollout is complete, delete rollout plan at `.xe/rollouts/rollout-{rollout-id}.md` (leave if incomplete)
3. Create pull request into default branch
4. Set title using Conventional Commits: `{type}({feature-id}): {change-description}` — prefer repo PR naming guidelines if defined
   - For init/blueprint PRs, set `feature-id` to `init` or `blueprint`
   - For multi-feature PRs, use primary feature ID; if none, remove `({feature-id})`
5. ALWAYS use the repo PR template when available; for the PR body, generate a Completed/Remaining/Findings summary from the rollout (under `autonomous`, review presents AFTER this step so its summary is not yet available; generate fresh from rollout state)
6. Link related issues with `Fixes #{id}` or `Related to #{id}`
7. Assign reviewers per `.xe/product.md` team roles if defined

## Exit Criteria

- [ ] External issues routed to chosen tracking destinations
- [ ] Follow-on work routed (next run started, addressed now, deferred, or stopped)
- [ ] Temporary files cleaned up per user confirmation
- [ ] Work persisted as requested (commit, pull request, or none)
- [ ] Rollout in terminal state (deleted on confirmed completion, retained when continued work queued)
