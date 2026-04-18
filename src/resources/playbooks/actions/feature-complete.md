# Complete Work

Present completed work, route external issues to tracking, clean up temporary files, and close out the rollout with optional PR creation.

‼️ MUST follow **AskUserQuestion** patterns: @node_modules/@xerilium/catalyst/standards/auq.md

## Inputs

- `execution-mode`: `interactive`, `checkpoint-review`, `autonomous-local`, or `autonomous-branch`

## Instructions

### 1. Present work

**If execution mode is `autonomous-branch`**: skip to step 2.

**All other modes**:

**1a. Completeness audit:**

Before presenting, read the rollout's source context — the linked explore doc, GitHub issue, or original user request — and verify all stated requirements are addressed. Check the rollout plan for unchecked tasks. Any gaps found go into the **Remaining** section of the summary.

**1b. Output formatted console summary:**

Start with an HR and markdown H2 header so the review stands out from prior conversation:

`---`
`## Review: {rollout-id}`

{original request or issue that prompted the work — 1-2 sentences, plain text}

Then present detailed sections — **omit any section that has nothing to report**:

- **Completed**: features implemented, test results, traceability coverage
- **Remaining**: deferred tasks, known gaps
- **Findings**: issues discovered during implementation, recommendations, limitations
- **Cleanup**: rollout plan, temp files to delete
- **External issues**: bugs in other features, missing capabilities, spec gaps

After the detailed sections, output an HR followed by an abbreviated recap list (always include all items, even when N/A, so the user can see overall status without scrolling back — detailed sections above do NOT include empty items):

`---`

- **Completed**: {terse one-line}
- **Remaining**: {terse one-line}
- **Findings**: {terse one-line}
- **Cleanup**: {count} file(s) pending

End with an HR and the done prompt on its own line:

`---`
`Let me know if you have questions, or say **done** to wrap up.`

**1c. Conversational review:**

User may ask questions or request changes. Handle by complexity:

- **Simple tweaks** (rename, fix typo, small adjustment): Execute immediately.
- **New tasks** (add a test, update a file, non-trivial work): Add to the rollout plan, execute, mark complete.
- **Spec changes** (new requirements, changed behavior): Add a `## Review additions` section to the rollout plan, then re-execute the relevant phases in order:
  1. Update spec → Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-spec.md`
  2. Update plan → Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-plan.md`
  3. Implement → Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-test.md`, then `feature-code.md`
  4. Return here to step 1a (present updated summary)

End every response with an HR and the continuing prompt on its own line:

`---`
`Anything else, or **done** to wrap up?`

**1d. When user confirms done**, use **AskUserQuestion**:

- External issues (for each): "Create GitHub issue" / "Add to feature feedback" / "Skip it"
- Final action: "Proceed" (Recommended when all work complete and tests pass) / "Review changes" / "Request corrections"

### 2. Clean up and close out

Clean up temporary files:

- Context files noted during scope phase
- The rollout plan (`.xe/rollouts/rollout-{id}.md`)

**If execution mode is `autonomous-branch`**: Delete approved files and skip to step 3.

**For all other execution modes**: Delete approved files. Post summary confirming work complete, then MUST use **AskUserQuestion**:

- "Commit to current branch"
- "Create pull request"
- "Skip"

### 3. Create pull request (if requested or `autonomous-branch` mode)

1. Verify current branch is not default — if it is, create feature branch (`xe/{rollout-id}`)
2. Delete implementation plan at `.xe/rollouts/rollout-{id}.md` (cannot be merged)
3. Create pull request into default branch
4. Set title: `[Catalyst][{type}] {feature-name}` (type: "Feature" or "Bug") — prefer repo PR naming guidelines if defined
5. ALWAYS use PR template when available, include:
   - Requirements coverage summary (FR/NFR → test mapping)
   - Summary of changes by feature/FR
6. Link related issues with `Fixes #{id}` or `Related to #{id}`
7. Assign reviewers per `.xe/product.md` team roles if defined

### 4. Celebrate

Celebrate the completion of the work with an enthusiastic, feel-good, congratulatory message with a "we crushed it!" tone. Make it entertaining, be creative and playful, and use at least one emoji. Keep it short and fun - think dad jokes, puns, or witty one-liners that emphasize the completed work. Avoid canned phrases and common AI anti-patterns, like en dashes. Output message after a horizontal rule:

`---`
`{message}`

## Exit Criteria

- [ ] Work presented and user satisfied
- [ ] External issues routed to tracking
- [ ] Temporary files cleaned up
- [ ] Rollout closed out (committed, PR created, or kept for continued work)
- [ ] Celebration message output
