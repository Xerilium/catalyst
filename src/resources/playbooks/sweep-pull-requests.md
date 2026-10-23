# Playbook: Sweep Pull Requests

Works every open PR that involves the user, routed by the user's role in each, then reports only what needs the user. Authored PRs go through the update workflow; PRs awaiting the user's review go through the review workflow.

**CRITICAL**: Autonomous by default. Applies only non-controversial fixes, never approves, and stops when nothing dispatchable remains.

## Inputs

- **pr-numbers** (optional) — Limit the sweep to these PRs.
- **scope** (optional) — `update` or `review`, matching the update and review commands. Defaults to both.
- **execution-mode** (optional) — `autonomous` (default) or `interactive`. `interactive` keeps the delegated workflows' own consultation, like the review and update commands.
- **ai-platform** (optional) — AI platform name for comment prefixes. Defaults to "AI".

Label names (`wip`, `paused`) come from the repo's PR label convention: `npx catalyst labels resolve {id}`. Never hardcode them.

## Process

### Phase 1: Survey

One read-only pass, no subagents. The user is the current `gh` login (`gh api user --jq .login`). List open PRs the user authored or was asked to review:

```bash
gh search prs --state open --author @me --json repository,number,title,author,isDraft,labels,updatedAt
gh search prs --state open --review-requested @me --json repository,number,title,author,isDraft,labels,updatedAt
```

Per candidate, fetch once: `gh pr view {pr} --json title,author,isDraft,reviewDecision,mergeable,mergeStateStatus,statusCheckRollup,headRefOid,isCrossRepository,labels`. Fetch unresolved threads for authored PRs only.

Skip, and do not count as work:

- Draft PRs the user did not author (the user's own drafts are swept)
- PRs the user already approved
- PRs labelled paused, or work-in-progress by another actor (never reclaim by age)
- PRs the user names as owned by another session
- Repos already covered by another thread or session — check first, never re-sweep them

Order: release-priority labels first when they exist, then failing checks and conflicts, then unresolved threads, then longest waiting.

### Phase 2: Route by role

Each PR takes exactly one pass.

- **Authored, with unresolved threads, failing checks, or conflicts** → Phase 3
- **Review requested from the user** → Phase 4

Before changing a PR, label it work-in-progress and add it to this run's own list so later surveys do not read the label as another actor's. Remove the label before the run ends.

Run each PR's pass in its own subagent. Carry forward only the result summary, never the transcript.

### Phase 3: Update pass

Per PR, in its own worktree off the PR head (`git fetch` + `git worktree add`). If the PR's worktree holds another agent's uncommitted work, defer it. Never discard or overwrite uncommitted work you did not create.

1. Classify each unresolved thread:
   - Last comment only confirms a fix → resolve
   - The user's own last comment defers to the reviewer, or the last comment carries 🧭 → leave
   - Claims a fix is absent but the pushed head has it → resolve with evidence
   - Root comment carries 🔒 → never resolve or fix; respond only if it asks something actionable, leave unresolved
   - Reviewer request stands unanswered, or class unclear → address (step 2)
2. Verify each reviewer claim against the real code. Valid: implement the best fix, not just the literal suggestion. Wrong: refute in the thread with evidence.
3. Execute @node_modules/@xerilium/catalyst/playbooks/update-pull-request.md. In `autonomous` mode bypass its consultation and commit approvals. Run tests in the **foreground**. Push the fix before resolving its thread.
4. Merge conflicts: merge the base branch in. Never force push.
5. Escalate instead of applying anything that changes scope or design, affects customers or system reliability, changes a user interface, user experience, or public API, or changes security or legal posture. Escalate once when a review keeps widening a partly done set of changes. Put it in the report only, never as a PR comment. A reply that hands a question back to the user on an authored PR carries 🧭.
6. Failing checks: fix only code the PR touches. Down runner pool or infra is a gap, not a PR failure.

Stash only when sole use of the repo is confirmed: `git worktree list` shows a single worktree **and** no other sweep holds the repo lock. If either cannot be determined, treat the repo as shared and never stash. Use a WIP commit instead.

Fork PRs: never execute their code without confirmation. Unanswerable confirmation counts as declined. Do not run a different command to execute a declined head. Review by reading and report that checks were not run locally.

### Phase 4: Review pass

Execute @node_modules/@xerilium/catalyst/playbooks/review-pull-request.md. In `autonomous` mode skip its consultation and post findings as if every group were approved. Post one `COMMENT` review. Never `APPROVE`.

Verify each finding against the real code; drop what you cannot reproduce.

### Phase 5: Converge

Re-survey the PRs acted on and repeat Phases 3–4 for new work. For a PR you pushed to, wait for checks with a deadline; report one still pending at the deadline as testing.

Stop when nothing dispatchable remains for the user, a decision or permission block stops progress, a full pass makes no progress, or 10 iterations pass. Never end with a PR still assigned to the user for something you could do yourself.

Never work around a denied permission. Finish everything else, then report the denied command. Retry a failed bulk `gh` call once as individual per-PR calls.

### Phase 6: Report

Bullets only, no prose. Report only what needs the user; everything else collapses to counts.

```markdown
**Needs you** ({count})

- "{PR title}" ({author}): {the ask}. Risk: {one line}. CI: {pass|fail|pending}.

**Done:** {n} updated, {n} reviewed
**Gaps:** {each tool, permission, or environment gap once}
```

A PR number alone never identifies an item.

## Error Handling

- **PR not found / auth failure:** report once as a gap, continue with the rest
- **Merge conflict on update:** merge base in; if both sides changed the same logic, escalate
- **Test failure unfixable:** stop that PR as blocked, report the failing check
- **Subagent failure:** retry once, then report as blocked

## Success Criteria

- [ ] One read-only survey built the queue; no subagents spent surveying
- [ ] Each PR took exactly one pass by role, in its own worktree and subagent
- [ ] Only non-controversial fixes applied; escalations in the report only
- [ ] Never approved, force-pushed, or stashed in a shared repo
- [ ] Own work-in-progress labels removed before the run ended
- [ ] Converged until nothing dispatchable remained
- [ ] Report is bullets only, titled items, decisions only, gaps deduplicated
