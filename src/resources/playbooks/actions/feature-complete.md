# Complete Work

Present completed work, route external issues to tracking, clean up temporary files, and close out the plan with optional PR creation.

‼️ MUST follow **AskUserQuestion** patterns: @node_modules/@xerilium/catalyst/standards/auq.md

## Inputs

- `execution-mode`: `interactive`, `checkpoint-review`, `autonomous-local`, or `autonomous-branch`

## Instructions

### 1. Present work and resolve external issues

**If execution mode is `autonomous-branch`**: commit, push, create PR (see step 3), then proceed to step 2.

**All other modes**: Use **AskUserQuestion** with complete state context:

- **What was completed**: features implemented, test results, traceability coverage
- **What remains**: deferred tasks, known gaps, or "nothing — all work complete"
- **Blockers or notable findings**: issues discovered during implementation, recommendations, limitations
- List pending cleanup: plan file, temp files
- Surface any external issues discovered (bugs in other features, missing capabilities, framework limitations, spec gaps):
  - For each: "Create GitHub issue" / "Add to feature feedback" / "Skip it"
- Options: "Proceed to closure" (Recommended when all work complete and tests pass) / "Review changes" / "Request corrections"

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
