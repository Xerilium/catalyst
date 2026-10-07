# Playbook: Sweep Pull Requests

Works every open PR that involves the user, routed by the user's role in each, then reports only what needs the user. Author PRs go through the update workflow; PRs awaiting the user's review go through the review workflow.

**CRITICAL**: Runs unsupervised. It applies only non-controversial fixes, never approves or merges, and stops when nothing dispatchable remains.

## Inputs

- **pr-numbers** (optional) — Limit the sweep to these PRs.
- **scope** (optional) — `author` or `reviews`. Defaults to both.
- **review-post** (optional) — `auto` (default) posts one `COMMENT` review per PR; `hold` prepares reviews and reports them without posting.
- **ai-platform** (optional) — AI platform name for comment prefixes. Defaults to "AI".

## Process

### Phase 1: Survey

One read-only pass, no subagents. Resolve the user with `gh api user --jq .login`, then list open PRs the user authored or was asked to review:

```bash
gh search prs --state open --author @me --json repository,number,title,author,isDraft,labels,updatedAt
gh search prs --state open --review-requested @me --json repository,number,title,author,isDraft,labels,updatedAt
```

For each candidate fetch once: `gh pr view {pr} --json title,author,isDraft,reviewDecision,mergeable,statusCheckRollup,headRefOid,isCrossRepository,labels`. Fetch unresolved threads only for author PRs.

Skip, and do not count as work:

- Drafts, PRs the user already approved, PRs labelled paused or work-in-progress by someone else, PRs the user names as owned by another session
- Repos or PRs already covered by another thread or session — check first, never re-sweep them

Order the queue: failing checks and conflicts, then unresolved threads, then reviews waiting longest.

### Phase 2: Route by role

Each PR takes exactly one pass.

- **Author, with unresolved threads, failing checks, or conflicts** → Phase 3
- **Review requested from the user** → Phase 4
- **Author, clean** → report as merge-ready (counts only)

### Phase 3: Author pass

Per PR, in its own worktree off the PR head (`git fetch` + `git worktree add`). Never `git stash`; never touch uncommitted work you did not create.

1. Skip any thread whose root comment contains 🔒. Skip threads whose last comment is the user's own deferral. Resolve pure confirmations.
2. Execute @node_modules/@xerilium/catalyst/playbooks/update-pull-request.md **autonomously** for genuine open asks: bypass its consultation and commit approvals, apply only non-controversial fixes, run tests in the **foreground**, then push.
3. For merge conflicts, merge the base branch in. Never rebase or force push.
4. Anything that changes scope, customer impact, security or legal posture, or is a design fork → do not apply. Put it in the report only. On an authored PR, a hand-back reply that leaves a question for the user carries 🧭 so the user keeps the ball.
5. Failing checks: root-cause and fix only if in code the PR touches. If the runner pool or infra is down, report it as a gap, not a PR failure.

Fork PRs: do not execute their code without confirmation. Unattended, treat that as declined and review by reading.

### Phase 4: Review pass

Execute @node_modules/@xerilium/catalyst/playbooks/review-pull-request.md **autonomously**: skip its consultation and post findings as if every group were approved. Post one cohesive review as `COMMENT`. Never `APPROVE`. A clean review is reported as approve-pending.

With `review-post` = `hold`, prepare the findings and report them without posting. The user acks, then post.

Verify each finding against the real code before it counts. Drop what you cannot reproduce.

### Phase 5: Converge

Re-survey only the PRs acted on. Repeat Phases 3–4 for new work. Stop when nothing dispatchable remains for the user, or a decision or permission block stops progress. Bound repeated rounds on one PR; two rounds without progress ends it as blocked.

### Phase 6: Report

Bullets only, no prose, decisions only. Everything not needing the user collapses to counts.

```markdown
**Needs you** ({count})

- "{PR title}" ({author}): {the ask}. Risk: {one line}. CI: {pass|fail|pending}.

**Approve-pending** ({count})

- "{PR title}" ({author}): {what changed, quantified}. CI: {status}.

**Done:** {n} PRs updated, {n} reviews posted, {n} merge-ready
**Gaps:** {each tool, permission, or environment gap once}
```

A PR number alone never identifies an item. An approval ask names what changed, the risk, and check status.

## Error Handling

- **PR not found / auth failure:** report once as a gap, continue with the rest
- **Merge conflict on update:** merge base in; if both sides changed the same logic, escalate
- **Test failure unfixable:** stop that PR as blocked, report the failing check
- **Subagent failure:** retry once, then report as blocked

## Success Criteria

- [ ] One read-only survey built the queue; no subagents spent surveying
- [ ] Each PR took exactly one pass by role
- [ ] Only non-controversial fixes applied; escalations in the report only
- [ ] Never approved, merged, rebased, force-pushed, or stashed
- [ ] Each PR isolated in its own worktree; tests ran in the foreground
- [ ] Converged until nothing dispatchable remained
- [ ] Report is bullets only, titled items, decisions only, gaps deduplicated
