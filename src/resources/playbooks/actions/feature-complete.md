# Complete Work

Present completed work, route external issues to tracking, clean up temporary files, and close out the plan with optional PR creation.

‼️ MUST follow **AskUserQuestion** patterns: @node_modules/@xerilium/catalyst/standards/auq.md

## Inputs

- `execution-mode`: `interactive`, `checkpoint-review`, `autonomous-local`, or `autonomous-branch`

## Instructions

### 1. Present work

**If execution mode is `autonomous-branch`**: skip to step 2.

**All other modes**:

**1a. Output formatted console summary:**

Start with an HR and markdown H2 header so the review stands out from prior conversation:

`---`
`## Review: {plan-id}`

{original request or issue that prompted the work — 1-2 sentences, plain text}

Then present detailed sections — **omit any section that has nothing to report**:

- **Completed**: features implemented, test results, traceability coverage
- **Remaining**: deferred tasks, known gaps
- **Findings**: issues discovered during implementation, recommendations, limitations
- **Cleanup**: plan file, temp files to delete
- **External issues**: bugs in other features, missing capabilities, spec gaps

After the detailed sections, output an HR followed by an abbreviated recap list (always include all items so the user can see overall status without scrolling back):

`---`

- **Completed**: {terse one-line}
- **Remaining**: {terse one-line}
- **Findings**: {terse one-line}
- **Cleanup**: {count} file(s) pending

End with an HR and the done prompt on its own line:

`---`
`Let me know if you have questions, or say **done** to wrap up.`

**1b. Conversational review:**

User may ask questions or request changes. Handle by complexity:

- **Simple tweaks** (rename, fix typo, small adjustment): Execute immediately.
- **New tasks** (add a test, update a file, non-trivial work): Add to the plan doc, execute, mark complete.
- **Spec changes** (new requirements, changed behavior): Add a `## Review additions` section to the plan doc, then re-execute the relevant phases in order:
  1. Update spec → Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-spec.md`
  2. Update plan → Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-plan.md`
  3. Implement → Execute `node_modules/@xerilium/catalyst/playbooks/actions/feature-test.md`, then `feature-code.md`
  4. Return here to step 1a (present updated summary)

End every response with: `"Anything else, or **done** to wrap up?"`

**1c. When user confirms done**, use **AskUserQuestion**:

- External issues (for each): "Create GitHub issue" / "Add to feature feedback" / "Skip it"
- Final action: "Proceed" (Recommended when all work complete and tests pass) / "Review changes" / "Request corrections"

### 2. Clean up and close out

Clean up temporary files:

- Context files noted during scope phase
- The plan file (`.xe/sessions/plan-{id}.md`)

**If execution mode is `autonomous-branch` or `autonomous-local`**: Delete approved files to clean up and skip to step 3.

**If next actions exist**: Use **AskUserQuestion**:

- "Commit to current branch"
- "Create pull request"
- "Keep working (plan stays open)"

**If no next actions**: Post summary confirming work complete and cleanup done.

### 3. Create pull request (if requested or `autonomous-branch` mode)

1. Verify current branch is not default — if it is, create feature branch (`xe/{plan-id}`)
2. Delete implementation plan at `.xe/sessions/plan-{id}.md` (cannot be merged)
3. Create pull request into default branch
4. Set title: `[Catalyst][{type}] {feature-name}` (type: "Feature" or "Bug") — prefer repo PR naming guidelines if defined
5. ALWAYS use PR template when available, include:
   - Requirements coverage summary (FR/NFR → test mapping)
   - Summary of changes by feature/FR
6. Link related issues with `Fixes #{id}` or `Related to #{id}`
7. Assign reviewers per `.xe/product.md` team roles if defined

## Exit Criteria

- [ ] Work presented and user satisfied
- [ ] External issues routed to tracking
- [ ] Temporary files cleaned up
- [ ] Plan closed out (committed, PR created, or kept for continued work)
