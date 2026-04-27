# Complete Work

Present completed work, route external issues to tracking, clean up temporary files, and close out the rollout with optional PR creation.

## Inputs

- `execution-mode`: `interactive`, `checkpoint-review`, `autonomous-local`, or `autonomous-branch`

## Instructions

### 1. Completeness audit

- Review rollout source context
- Verify all stated requirements are met
- Check rollout for unchecked tasks
- If there are gaps, determine if they are critical
  - If so, go back to previous phase to address the gap
  - If not, add to **Remaining** section of summary below

### 2. Present work

_If execution mode is `autonomous-branch`, skip to step 4_

Write summary to console (omit N/A details):

```markdown
---

## Review: {rollout-id}

{original request or issue that prompted the work, 1-2 sentences}

- **Completed**: {features implemented, test results, traceability coverage}
- **Remaining**: {deferred tasks, known gaps}
- **Findings**: {issues discovered during implementation, recommendations, limitations}
- **Cleanup**: {rollout plan, temp files to delete}
- **External issues**: {bugs in other features, missing capabilities, spec gaps}
```

After details, write concise takeaways (include all items, even when N/A; use "None"):

```markdown
---

- **Completed**: {terse one-line}
- **Remaining**: {terse one-line}
- **Findings**: {terse one-line}
- **Cleanup**: {count} file(s) pending

---

Anything else, or **done** to wrap up?
```

**STOP HERE**: Do NOT proceed until user responds with "done". User may ask questions or request changes — handle by complexity, then re-prompt and STOP again until "done":

- **Simple tweaks** (rename, fix typo, small adjustment): Execute immediately.
- **New tasks** (add a test, update a file, non-trivial work): Add to the rollout plan, execute, mark complete.
- **Spec changes** (new requirements, changed behavior): Add a `## Review additions` section to the rollout plan, then re-execute the relevant phases in order:
  1. Update spec → Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-spec.md`
  2. Update plan → Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-plan.md`
  3. Implement → Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-test.md`, then `feature-code.md`
  4. Restart this step (re-render summary, ask "Anything else, or **done** to wrap up?", STOP again)

After handling any non-"done" response, end with an HR and `Anything else, or **done** to wrap up?` on its own line, then STOP.

### 3. Clean up and close out

_If execution mode is `autonomous-branch`, skip to step 4_

**STOP HERE**: Do NOT proceed unless user confirmed "done" in step 2

1. Identify follow-on work to feed into Q3 below:
   - More runs queued in the rollout?
   - Skipped changes that were out of scope?
   - Friction or rough edges noted during execution?
2. Execute @node_modules/@xerilium/catalyst/playbooks/actions/auq.md to route external issues and confirm next steps:
   - Q1: Ready to save work?: "Commit to current branch" / "Create pull request" / "Skip"
   - Q2: For each external issue, summarize and ask how to address: "Create GitHub issue" / "Add to feature feedback" / "Add to rollout" / "Skip"
   - Q3a (if follow-on work identified): Summarize the items, then pick next action: "Start next run" / "Address friction now" / "Defer to GitHub issue" / "Stop here"
   - Q3b (if no follow-on work): Confirm close out: "Delete rollout" / "Keep rollout for reference" / "Stop here"
3. Clean up temporary files (if confirmed; skip if not):
   - Context files noted during scope phase
   - The rollout plan (`.xe/rollouts/rollout-{id}.md`)
4. If commit requested in Q1, commit to current branch

### 4. Create pull request (if requested or `autonomous-branch` mode)

_If PR not approved or execution mode is not `autonomous-branch`, skip to step 5_

1. Verify current branch is not default — if it is, create feature branch (`xe/{rollout-id}`)
2. If rollout is complete, delete rollout plan at `.xe/rollouts/rollout-{id}.md` (leave if incomplete)
3. Create pull request into default branch
4. Set title: `[Catalyst][{type}] {feature-name}` (type: "Feature" or "Bug") — prefer repo PR naming guidelines if defined
5. ALWAYS use PR template when available; for the PR body, generate a summary using the same structure as step 2 (Completed / Remaining / Findings) — in `autonomous-branch` mode step 2 was skipped, so generate fresh from the rollout
6. Link related issues with `Fixes #{id}` or `Related to #{id}`
7. Assign reviewers per `.xe/product.md` team roles if defined

### 5. Regenerate feature index

Run `npx catalyst index` to regenerate `.xe/features/README.md` – If command fails, log error and continue

### 6. Celebrate

Celebrate the completion of the work with an enthusiastic, feel-good, congratulatory message with a "we crushed it!" tone. Make it entertaining, be creative and playful, and use at least one emoji. Keep it short and fun - think dad jokes, puns, or witty one-liners that emphasize the completed work. Avoid canned phrases and common AI anti-patterns, like en dashes. Output message after a horizontal rule:

`---`
`{message}`

## Exit Criteria

- [ ] Work presented and user confirmed "done" (or `autonomous-branch` mode skipped presentation by design)
- [ ] External issues routed to tracking
- [ ] Temporary files cleaned up (if user approved)
- [ ] Feature index regenerated (`catalyst index`)
- [ ] Rollout closed out (committed, PR created, or kept for continued work)
- [ ] Celebration message output
