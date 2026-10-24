# Playbook: Sweep Pull Requests

Works every open PR that involves the user, routed by the user's role in each, then reports only what needs the user. Authored PRs go through the update workflow; PRs awaiting the user's review go through the review workflow.

**CRITICAL**: Autonomous by default. Applies only non-controversial fixes, never approves, and keeps going until nothing dispatchable remains.

## Inputs

- **pr-numbers** (optional) — Limit the sweep to these PRs.
- **scope** (optional) — `update` or `review`, matching the update and review commands. Defaults to both.
- **execution-mode** (optional) — `autonomous` (default) or `interactive`. `interactive` keeps the delegated workflows' own consultation, like the review and update commands.
- **ai-platform** (optional) — AI platform name for comment prefixes. Defaults to "AI".

## Labels

Use the repo's label names, never hardcoded ones. Per label: `labels.names.{id}` in `.xe/config/catalyst.json` if set; else the simple name when `labels.style` is `simple`; else the standard name.

| Id                 | Standard name          | Simple name        |
| ------------------ | ---------------------- | ------------------ |
| `wip`              | `Status: WIP 🚧`       | `wip`              |
| `paused`           | `Status: Paused ⏸️`    | `paused`           |
| `release-blocker`  | `Release: Blocker ⛔`  | `release blocker`  |
| `release-priority` | `Release: Priority ⭐` | `release priority` |
| `release-stretch`  | `Release: Stretch 🍒`  | `release stretch`  |

Missing in the repo: create it with `gh label create` before first use. If that fails, report it as a gap and continue without it.

## Process

### Phase 1: Survey

One read-only pass, no subagents. The user is the current `gh` login. List open PRs the user authored or was asked to review, excluding WIP and paused PRs in the query:

```bash
gh search prs --state open --author @me -- -label:"{wip}" -label:"{paused}" --json repository,number,title,url,isDraft,labels,updatedAt
gh search prs --state open --review-requested @me --draft=false -- -label:"{wip}" -label:"{paused}" --json repository,number,title,url,labels,updatedAt
```

Per candidate, fetch once: `gh pr view {pr} --json title,url,author,isDraft,reviewDecision,mergeable,mergeStateStatus,statusCheckRollup,headRefOid,isCrossRepository,labels`. Fetch unresolved threads for authored PRs only. Skip PRs the user already approved.

Order the queue by release label: blocker, priority, none, stretch. Within each, reviews before updates, so others get unblocked before the user's own work. Then failing checks and conflicts, then unresolved threads, then longest waiting.

### Phase 2: Claim

The moment a PR is in scope, add the WIP label and add the PR to this run's own list. Before starting each PR's pass, re-read its labels: WIP that is not on this run's list means another actor took it; skip it. Never remove another actor's WIP, whatever its age.

### Phase 3: Work each PR

Each PR takes exactly one pass, in its own subagent and its own fresh worktree off the PR head (`git fetch` + `git worktree add`). NEVER recycle worktrees/folders! Carry forward only the result summary, never the transcript.

- **User authored it** → Execute @node_modules/@xerilium/catalyst/playbooks/update-pull-request.md (update pass)
- **User reviews it** → Execute @node_modules/@xerilium/catalyst/playbooks/review-pull-request.md (review pass)

In `autonomous` mode, bypass the delegated workflow's consultation and commit approvals.

#### Update pass

Only for PRs with unresolved threads, failing checks, or conflicts.

1. Classify each unresolved thread:
   - Last comment only confirms a fix → resolve
   - The user's own last comment defers to the reviewer, or the last comment carries 🧭 → leave
   - Claims a fix is absent but the pushed head has it → resolve with evidence
   - Root comment carries 🔒 → never resolve or fix; respond only if it asks something actionable, leave unresolved
   - Reviewer request stands unanswered, or class unclear → address (step 2)
2. Verify each reviewer claim against the real code. Valid: implement the best fix, not just the literal suggestion. Wrong: refute in the thread with evidence.
3. Run tests in the **foreground**. Push the fix before resolving its thread.
4. Behind or conflicting with the base branch: rebase onto it and push with `--force-with-lease`. Never merge the base branch in; it shows every merged file as changed in the PR.
5. Failing checks: fix only code the PR touches, unless a human reviewer explicitly asks for a boy-scout fix.
6. Escalate instead of applying anything that changes scope or design, affects customers or system reliability, changes a user interface, user experience, or public API, or changes security or legal posture. Escalate once when a review keeps widening a partly done set of changes. Put it in the report only, never as a PR comment. A reply that hands a question back to the user on an authored PR carries 🧭.

Never discard or overwrite uncommitted work you did not create. If the PR's branch is checked out in another worktree with uncommitted changes, defer the PR.

Stash only in this pass's own worktree, on a PR whose WIP label this run added. Never stash in the main repo folder.

Fork PRs from someone without write access to the repo: never execute their code without confirmation. If no one can answer (an unattended run), treat it as declined: review by reading only, never run the head another way, and report that checks were not run locally.

#### Review pass

Post one `COMMENT` review whose findings are inline comments on their lines. The body is a short summary and never repeats the inline comments. Never post findings as PR comments. Never `APPROVE`.

### Phase 4: Report and continue

Publish the report first, then keep going: re-survey (the query hides WIP PRs, so add this run's own list back in), and run Phases 2–3 again for any PR that needs a sweep, including ones that came in during the run. DO NOT STOP while PRs remain to sweep.

- **Checks running on a PR you pushed to:** wait in the background for the repo's usual check time (median duration of its last 10 successful runs from `gh run list`), then re-check. Still pending after two waits → report it as testing.
- **Stop when:** nothing dispatchable remains for the user, a decision or permission block stops progress, a full pass makes no progress, or 10 iterations pass. Never end with a PR still assigned to the user for something you could do yourself.
- **Permissions:** never work around a denied permission. Finish everything else, then report the denied command. Retry a failed bulk `gh` call once as individual per-PR calls.
- **Cleanup:** once every subagent is done, remove the WIP label from every PR on this run's list, including PRs whose subagent failed.

#### Report format

Re-read each PR's state before every report; never show status older than 10 minutes. One row per PR, decisions first. Link every PR as `[{number}]({url})`, with no `#`, and never mention a PR number without its link. In **Next**, link each thread awaiting the user's answer.

```markdown
| PR                | Title   | Status   | Next                             |
| ----------------- | ------- | -------- | -------------------------------- |
| [{number}]({url}) | {title} | {status} | {next action, with thread links} |

{n} PRs still to sweep · {n} in progress · next check {HH:MM}
**Gaps:** {each tool, permission, or environment gap once}
```

Statuses: `🧭 Decide` (your call), `👀 Review` (your approval), `⏳ Author` (waiting on the author), `⏳ Testing` (checks running), `✅ Ready` (ready to merge). Omit the progress line when nothing is left, and the gaps line when there are none.

## Error Handling

- **PR not found / auth failure:** report once as a gap, continue with the rest
- **Rebase conflict:** resolve when both sides' intent is clear; if both sides changed the same logic, escalate
- **Test failure unfixable:** stop that PR as blocked, report the failing check
- **Subagent failure:** retry once, then report as blocked

## Success Criteria

- [ ] One read-only survey built the queue; no subagents spent surveying
- [ ] Each PR claimed with WIP, then took exactly one pass by role, in its own fresh worktree and subagent
- [ ] Only non-controversial fixes applied; escalations in the report only
- [ ] Never approved, merged the base branch in, or stashed outside this run's own worktree
- [ ] Every WIP label this run added was removed
- [ ] Report published, then the sweep kept going until nothing dispatchable remained
